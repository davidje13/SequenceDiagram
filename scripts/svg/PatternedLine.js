define(() => {
	'use strict';

	return class PatternedLine {
		constructor(pattern = null, phase = 0) {
			this.pattern = pattern;
			this.dw = pattern && pattern.partWidth;
			this.points = [];
			this.phase = phase;
			this.x = null;
			this.y = null;
			this.disconnect = 0;
		}

		_nextDelta() {
			return this.pattern.getDelta(this.phase ++);
		}

		_link() {
			if(this.disconnect === 2) {
				this.points.push(this.x + ' ' + this.y);
				this.disconnect = 0;
			}
		}

		cap() {
			if(this.disconnect > 0) {
				this.points.push(this.x + ' ' + this.y);
				this.disconnect = 0;
			}
			return this;
		}

		move(x, y) {
			this.cap();
			this.x = x;
			this.y = y;
			this.disconnect = 2;
			return this;
		}

		line(x, y, {patterned = true} = {}) {
			if(this.pattern && patterned) {
				const len = Math.sqrt(
					(x - this.x) * (x - this.x) +
					(y - this.y) * (y - this.y)
				);
				const dx1 = (x - this.x) / len;
				const dy1 = (y - this.y) / len;
				const dx2 = -dy1;
				const dy2 = dx1;

				for(let pos = 0; pos + this.dw <= len; pos += this.dw) {
					const delta = this._nextDelta();
					this.points.push(
						(this.x + pos * dx1 + delta * dx2) + ' ' +
						(this.y + pos * dy1 + delta * dy2)
					);
				}
				this.disconnect = 1;
			} else {
				this._link();
				this.disconnect = 2;
			}

			this.x = x;
			this.y = y;
			return this;
		}

		arc(cx, cy, theta) {
			const radius = Math.sqrt(
				(cx - this.x) * (cx - this.x) +
				(cy - this.y) * (cy - this.y)
			);
			const theta1 = Math.atan2(this.x - cx, cy - this.y);
			const nextX = cx + Math.sin(theta1 + theta) * radius;
			const nextY = cy - Math.cos(theta1 + theta) * radius;

			if(this.pattern) {
				const dir = (theta < 0 ? 1 : -1);
				const dt = this.dw / radius;

				for(let t = theta1; t + dt <= theta1 + theta; t += dt) {
					const delta = this._nextDelta() * dir;
					this.points.push(
						(cx + Math.sin(t) * (radius + delta)) + ' ' +
						(cy - Math.cos(t) * (radius + delta))
					);
				}
				this.disconnect = 1;
			} else {
				this.points.push(
					this.x + ' ' + this.y +
					'A' + radius + ' ' + radius + ' 0 ' +
					((Math.abs(theta) >= Math.PI) ? '1 ' : '0 ') +
					((theta < 0) ? '0 ' : '1 ') +
					nextX + ' ' + nextY
				);
				this.disconnect = 0;
			}

			this.x = nextX;
			this.y = nextY;

			return this;
		}

		asPath() {
			this._link();
			return 'M' + this.points.join('L');
		}
	};
});
