define(['./SVGUtilities'], (svg) => {
	'use strict';

	return class SVGTextBlock {
		constructor(
			container,
			attrs,
			lineHeight,
			{text = '', x = 0, y = 0} = {}
		) {
			this.container = container;
			this.attrs = attrs;
			this.lineHeight = lineHeight;
			this.text = '';
			this.x = x;
			this.y = y;
			this.width = 0;
			this.height = 0;
			this.nodes = [];
			this.setText(text);
		}

		_updateY() {
			const sz = Number(this.attrs['font-size']);
			const space = sz * this.lineHeight;
			this.nodes.forEach(({element}, i) => {
				element.setAttribute('y', this.y + i * space + sz);
			});
			this.height = space * this.nodes.length;
		}

		_rebuildNodes(count) {
			if(count === this.nodes.length) {
				return;
			}
			if(count > this.nodes.length) {
				const attrs = Object.assign({'x': this.x}, this.attrs);
				while(this.nodes.length < count) {
					const element = svg.make('text', attrs);
					const text = svg.makeText();
					element.appendChild(text);
					this.container.appendChild(element);
					this.nodes.push({element, text});
				}
			} else {
				while(this.nodes.length > count) {
					const {element} = this.nodes.pop();
					this.container.removeChild(element);
				}
			}
			this._updateY();
		}

		setText(newText) {
			if(newText === this.text) {
				return;
			}
			if(!newText) {
				this.clear();
				return;
			}
			this.text = newText;
			const lines = this.text.split('\n');

			this._rebuildNodes(lines.length);
			let maxWidth = 0;
			this.nodes.forEach(({text, element}, i) => {
				if(text.nodeValue !== lines[i]) {
					text.nodeValue = lines[i];
				}
				maxWidth = Math.max(maxWidth, element.getComputedTextLength());
			});
			this.width = maxWidth;
		}

		reanchor(newX, newY) {
			if(newX !== this.x) {
				this.x = newX;
				this.nodes.forEach(({element}) => {
					element.setAttribute('x', this.x);
				});
			}

			if(newY !== this.y) {
				this.y = newY;
				this._updateY();
			}
		}

		clear() {
			this._rebuildNodes(0);
			this.text = '';
			this.width = 0;
			this.height = 0;
		}
	};
});
