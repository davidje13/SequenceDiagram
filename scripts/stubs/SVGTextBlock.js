define(['svg/SVGUtilities'], (svg) => {
	'use strict';

	// Simplified text block renderer, which assumes all characters render as
	// 1x1 px squares for repeatable renders in all browsers

	function merge(state, newState) {
		for(const k in state) {
			if(state.hasOwnProperty(k)) {
				if(newState[k] !== null && newState[k] !== undefined) {
					state[k] = newState[k];
				}
			}
		}
	}

	const EMPTY = [];

	class SVGTextBlock {
		constructor(container, initialState = {}) {
			this.container = container;
			this.state = {
				attrs: {},
				formatted: EMPTY,
				x: 0,
				y: 0,
			};
			this.nodes = [];
			this.set(initialState);
		}

		_rebuildNodes(count) {
			if(count > this.nodes.length) {
				const attrs = Object.assign({
					'x': this.state.x,
				}, this.state.attrs);

				while(this.nodes.length < count) {
					const text = svg.makeText();
					const element = svg.make('text', attrs, [text]);
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
		}

		_renderText() {
			if(!this.state.formatted) {
				this._reset();
				return;
			}

			const formatted = this.state.formatted;
			this._rebuildNodes(formatted.length);

			this.nodes.forEach(({text, element}, i) => {
				const ln = formatted[i].reduce((v, pt) => v + pt.text, '');
				text.nodeValue = ln;
			});
		}

		_updateX() {
			this.nodes.forEach(({element}) => {
				element.setAttribute('x', this.state.x);
			});
		}

		_updateY() {
			this.nodes.forEach(({element}, i) => {
				element.setAttribute('y', this.state.y + i);
			});
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
				oldState.formatted = EMPTY;
			}

			const oldNodes = this.nodes.length;

			if(this.state.formatted !== oldState.formatted) {
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
		measure(attrs, formatted) {
			if(attrs.state) {
				formatted = attrs.state.formatted;
				attrs = attrs.state.attrs;
			}

			if(!formatted || !formatted.length) {
				return {width: 0, height: 0};
			}

			let width = 0;
			formatted.forEach((line) => {
				const length = line.reduce((v, pt) => v + pt.text.length, 0);
				width = Math.max(width, length);
			});

			return {
				width,
				height: formatted.length,
			};
		}

		measureHeight(attrs, formatted) {
			if(!formatted) {
				return 0;
			}

			return formatted.length;
		}

		resetCache() {
		}

		detach() {
		}
	}

	SVGTextBlock.SizeTester = SizeTester;

	return SVGTextBlock;
});
