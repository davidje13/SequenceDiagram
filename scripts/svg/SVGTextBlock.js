define(['./SVGUtilities'], (svg) => {
	'use strict';

	// Thanks, https://stackoverflow.com/a/9851769/1180785
	const firefox = (typeof window.InstallTrigger !== 'undefined');

	function fontDetails(attrs) {
		const size = Number(attrs['font-size']);
		const lineHeight = size * (Number(attrs['line-height']) || 1);
		return {
			size,
			lineHeight,
		};
	}

	function merge(state, newState) {
		for(let k in state) {
			if(state.hasOwnProperty(k)) {
				if(newState[k] !== null && newState[k] !== undefined) {
					state[k] = newState[k];
				}
			}
		}
	}

	class SVGTextBlock {
		constructor(container, initialState = {}) {
			this.container = container;
			this.state = {
				attrs: {},
				text: '',
				x: 0,
				y: 0,
			};
			this.width = 0;
			this.height = 0;
			this.nodes = [];
			this.set(initialState);
		}

		_rebuildNodes(count) {
			if(count > this.nodes.length) {
				const attrs = Object.assign({
					'x': this.state.x,
				}, this.state.attrs);

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
		}

		_reset() {
			this._rebuildNodes(0);
			this.width = 0;
			this.height = 0;
		}

		_renderText() {
			if(!this.state.text) {
				this._reset();
				return;
			}

			const lines = this.state.text.split('\n');
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

		_updateX() {
			this.nodes.forEach(({element}) => {
				element.setAttribute('x', this.state.x);
			});
		}

		_updateY() {
			const {size, lineHeight} = fontDetails(this.state.attrs);
			this.nodes.forEach(({element}, i) => {
				element.setAttribute('y', this.state.y + i * lineHeight + size);
			});
			this.height = lineHeight * this.nodes.length;
		}

		firstLine() {
			if(this.nodes.length > 0) {
				return this.nodes[0].element;
			} else {
				return null;
			}
		}

		set(newState) {
			const oldState = Object.assign({}, this.state);
			merge(this.state, newState);

			if(this.state.attrs !== oldState.attrs) {
				this._reset();
				oldState.text = '';
			}

			const oldNodes = this.nodes.length;

			if(this.state.text !== oldState.text) {
				this._renderText();
			}

			if(this.state.x !== oldState.x) {
				this._updateX();
			}

			if(this.state.y !== oldState.y || this.nodes.length !== oldNodes) {
				this._updateY();
			}
		}
	}

	class SizeTester {
		constructor(container) {
			this.testers = svg.make('g', {
				// Firefox fails to measure non-displayed text
				'display': firefox ? 'block' : 'none',
				'visibility': 'hidden',
			});
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
