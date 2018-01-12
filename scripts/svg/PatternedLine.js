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
			this.disconnect = false;
		}

		_link() {
			if(this.disconnect) {
				this.points.push(this.x + ' ' + this.y);
				this.disconnect = false;
			}
		}

		_nextDelta() {
			return this.pattern.getDelta(this.phase ++);
		}

		cap() {
			if(this.x !== null) {
				this.points.push(this.x + ' ' + this.y);
				this.x = null;
				this.y = null;
				this.disconnect = false;
			}
			return this;
		}

		move(x, y) {
			this.cap();
			this.x = x;
			this.y = y;
			this.disconnect = true;
			return this;
		}

		line(x, y) {
			this._link();

			if(this.pattern) {
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
			} else {
				this.disconnect = true;
			}

			this.x = x;
			this.y = y;
			return this;
		}

		arc(cx, cy, theta) {
			this._link();

			const radius = Math.sqrt(
				(cx - this.x) * (cx - this.x) +
				(cy - this.y) * (cy - this.y)
			);
			const theta1 = Math.atan2(cx - this.x, cy - this.y);
			this.x = cx + Math.sin(theta1 + theta) * radius;
			this.y = cy - Math.cos(theta1 + theta) * radius;

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
			} else {
				this.points.push(
					(cx + Math.sin(theta1) * radius) + ' ' +
					(cy - Math.cos(theta1) * radius) +
					'A' + radius + ' ' + radius + ' 0 ' +
					((theta < 0) ? '0 ' : '1 ') +
					'1 ' +
					this.x + ' ' + this.y
				);
			}

			return this;
		}

		asPath() {
			this._link();
			return 'M' + this.points.join('L');
		}
	};
});
