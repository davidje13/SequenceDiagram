define(() => {
	'use strict';

	// Thanks, https://stackoverflow.com/a/9851769/1180785
	const firefox = (typeof window.InstallTrigger !== 'undefined');

	function merge(state, newState) {
		for(const k in state) {
			if(state.hasOwnProperty(k)) {
				if(newState[k] !== null && newState[k] !== undefined) {
					state[k] = newState[k];
				}
			}
		}
	}

	function populateSvgTextLine(svg, node, formattedLine) {
		if(!Array.isArray(formattedLine)) {
			throw new Error('Invalid formatted text line: ' + formattedLine);
		}
		formattedLine.forEach(({text, attrs}) => {
			if(attrs) {
				node.add(svg.el('tspan').attrs(attrs).add(text));
			} else {
				node.add(text);
			}
		});
	}

	const EMPTY = [];

	class SVGTextBlock {
		constructor(container, svg, initialState = {}) {
			this.container = container;
			this.svg = svg;
			this.state = {
				attrs: {},
				formatted: EMPTY,
				x: 0,
				y: 0,
			};
			this.lines = [];
			this.set(initialState);
		}

		_rebuildLines(count) {
			if(count > this.lines.length) {
				while(this.lines.length < count) {
					this.lines.push({
						node: this.svg.el('text')
							.attr('x', this.state.x)
							.attrs(this.state.attrs)
							.attach(this.container),
						latest: '',
					});
				}
			} else {
				while(this.lines.length > count) {
					this.lines.pop().node.detach();
				}
			}
		}

		_reset() {
			this._rebuildLines(0);
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

			this.lines.forEach((ln, i) => {
				const id = JSON.stringify(formatted[i]);
				if(id !== ln.latest) {
					ln.node.empty();
					populateSvgTextLine(this.svg, ln.node, formatted[i]);
					ln.latest = id;
				}
			});
		}

		_updateX() {
			this.lines.forEach(({node}) => {
				node.attr('x', this.state.x);
			});
		}

		_updateY() {
			const sizer = this.svg.textSizer;
			let y = this.state.y;
			for(let i = 0; i < this.lines.length; ++ i) {
				const line = [this.state.formatted[i]];
				const baseline = sizer.baseline(this.state.attrs, line);
				this.lines[i].node.attr('y', y + baseline);
				y += sizer.measureHeight(this.state.attrs, line);
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

	SVGTextBlock.TextSizer = class TextSizer {
		constructor(svg) {
			this.svg = svg;
			this.testers = this.svg.el('g').attrs({
				// Firefox fails to measure non-displayed text
				'display': firefox ? 'block' : 'none',
				'visibility': 'hidden',
			});
			this.container = svg.body;
		}

		baseline({attrs}) {
			return Number(attrs['font-size']);
		}

		measureHeight({attrs, formatted}) {
			const size = this.baseline({attrs, formatted});
			const lineHeight = size * (Number(attrs['line-height']) || 1);
			return formatted.length * lineHeight;
		}

		prepMeasurement(attrs, formatted) {
			const node = this.svg.el('text')
				.attrs(attrs)
				.attach(this.testers);
			populateSvgTextLine(this.svg, node, formatted);
			return node;
		}

		prepComplete() {
			this.container.add(this.testers);
		}

		performMeasurement(node) {
			return node.element.getComputedTextLength();
		}

		teardown() {
			this.container.del(this.testers.empty());
		}
	};

	return SVGTextBlock;
});
