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
		for(const k in state) {
			if(state.hasOwnProperty(k)) {
				if(newState[k] !== null && newState[k] !== undefined) {
					state[k] = newState[k];
				}
			}
		}
	}

	function populateSvgTextLine(node, formattedLine) {
		if(!Array.isArray(formattedLine)) {
			throw new Error('Invalid formatted text line: ' + formattedLine);
		}
		formattedLine.forEach(({text, attrs}) => {
			const textNode = svg.makeText(text);
			if(attrs) {
				const span = svg.make('tspan', attrs, [textNode]);
				node.appendChild(span);
			} else {
				node.appendChild(textNode);
			}
		});
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
			this.width = 0;
			this.height = 0;
			this.lines = [];
			this.set(initialState);
		}

		_rebuildLines(count) {
			if(count > this.lines.length) {
				const attrs = Object.assign({
					'x': this.state.x,
				}, this.state.attrs);

				while(this.lines.length < count) {
					const node = svg.make('text', attrs);
					this.container.appendChild(node);
					this.lines.push({node, latest: ''});
				}
			} else {
				while(this.lines.length > count) {
					const {node} = this.lines.pop();
					this.container.removeChild(node);
				}
			}
		}

		_reset() {
			this._rebuildLines(0);
			this.width = 0;
			this.height = 0;
		}

		_renderText() {
			const {formatted} = this.state;

			if(!formatted || !formatted.length) {
				this._reset();
				return;
			}
			if(!Array.isArray(formatted)) {
				throw new Error('Invalid formatted text: ' + formatted);
			}

			this._rebuildLines(formatted.length);

			let maxWidth = 0;
			this.lines.forEach((ln, i) => {
				const id = JSON.stringify(formatted[i]);
				if(id !== ln.latest) {
					svg.empty(ln.node);
					populateSvgTextLine(ln.node, formatted[i]);
					ln.latest = id;
				}
				maxWidth = Math.max(maxWidth, ln.node.getComputedTextLength());
			});
			this.width = maxWidth;
		}

		_updateX() {
			this.lines.forEach(({node}) => {
				node.setAttribute('x', this.state.x);
			});
		}

		_updateY() {
			const {size, lineHeight} = fontDetails(this.state.attrs);
			this.lines.forEach(({node}, i) => {
				node.setAttribute('y', this.state.y + i * lineHeight + size);
			});
			this.height = lineHeight * this.lines.length;
		}

		firstLine() {
			if(this.lines.length > 0) {
				return this.lines[0].node;
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

			const oldLines = this.lines.length;

			if(this.state.formatted !== oldState.formatted) {
				this._renderText();
			}

			if(this.state.x !== oldState.x) {
				this._updateX();
			}

			if(this.state.y !== oldState.y || this.lines.length !== oldLines) {
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

		measure(attrs, formatted) {
			if(!formatted || !formatted.length) {
				return {width: 0, height: 0};
			}
			if(!Array.isArray(formatted)) {
				throw new Error('Invalid formatted text: ' + formatted);
			}

			let tester = this.cache.get(attrs);
			if(!tester) {
				tester = svg.make('text', attrs);
				this.testers.appendChild(tester);
				this.cache.set(attrs, tester);
			}

			if(!this.testers.parentNode) {
				this.container.appendChild(this.testers);
			}

			let width = 0;
			formatted.forEach((line) => {
				svg.empty(tester);
				populateSvgTextLine(tester, line);
				width = Math.max(width, tester.getComputedTextLength());
			});

			return {
				width,
				height: formatted.length * fontDetails(attrs).lineHeight,
			};
		}

		measureHeight(attrs, formatted) {
			if(!formatted) {
				return 0;
			}
			if(!Array.isArray(formatted)) {
				throw new Error('Invalid formatted text: ' + formatted);
			}

			return formatted.length * fontDetails(attrs).lineHeight;
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
