define(['./SVGUtilities'], (svg) => {
	'use strict';

	function fontDetails(attrs) {
		const size = Number(attrs['font-size']);
		const lineHeight = size * (Number(attrs['line-height']) || 1);
		return {
			size,
			lineHeight,
		};
	}

	class SVGTextBlock {
		constructor(
			container,
			attrs,
			{text = '', x = 0, y = 0} = {}
		) {
			this.container = container;
			this.attrs = attrs;
			this.text = '';
			this.x = x;
			this.y = y;
			this.width = 0;
			this.height = 0;
			this.nodes = [];
			this.setText(text);
		}

		_updateY() {
			const {size, lineHeight} = fontDetails(this.attrs);
			this.nodes.forEach(({element}, i) => {
				element.setAttribute('y', this.y + i * lineHeight + size);
			});
			this.height = lineHeight * this.nodes.length;
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

		firstLine() {
			if(this.nodes.length > 0) {
				return this.nodes[0].element;
			} else {
				return null;
			}
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
	}

	class SizeTester {
		constructor(container) {
			this.testers = svg.make('g', {'display': 'none'});
			this.container = container;
			this.cache = new Map();
		}

		measure(attrs, content) {
			if(!content) {
				return {width: 0, height: 0};
			}

			let tester = this.cache.get(attrs);
			if(!tester) {
				const text = svg.makeText();
				const node = svg.make('text', attrs);
				node.appendChild(text);
				this.testers.appendChild(node);
				tester = {text, node};
				this.cache.set(attrs, tester);
			}

			if(!this.testers.parentNode) {
				this.container.appendChild(this.testers);
			}

			const lines = content.split('\n');
			let width = 0;
			lines.forEach((line) => {
				tester.text.nodeValue = line;
				width = Math.max(width, tester.node.getComputedTextLength());
			});

			return {
				width,
				height: lines.length * fontDetails(attrs).lineHeight,
			};
		}

		measureHeight(attrs, content) {
			if(!content) {
				return 0;
			}

			const lines = content.split('\n');
			return lines.length * fontDetails(attrs).lineHeight;
		}

		resetCache() {
			svg.empty(this.testers);
			this.cache.clear();
		}

		detach() {
			if(this.testers.parentNode) {
				this.container.removeChild(this.testers);
			}
		}
	}

	SVGTextBlock.SizeTester = SizeTester;

	return SVGTextBlock;
});
