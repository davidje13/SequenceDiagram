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
					svg.empty(ln.node);
					populateSvgTextLine(ln.node, formatted[i]);
					ln.latest = id;
				}
			});
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
			this.nodes = null;
		}

		_expectMeasure({attrs, formatted}) {
			if(!formatted.length) {
				return;
			}

			const attrKey = JSON.stringify(attrs);
			let attrCache = this.cache.get(attrKey);
			if(!attrCache) {
				attrCache = {
					attrs,
					lines: new Map(),
				};
				this.cache.set(attrKey, attrCache);
			}

			formatted.forEach((line) => {
				if(!line.length) {
					return;
				}

				const labelKey = JSON.stringify(line);
				if(!attrCache.lines.has(labelKey)) {
					attrCache.lines.set(labelKey, {
						formatted: line,
						width: null,
					});
				}
			});

			return attrCache;
		}

		_measureHeight({attrs, formatted}) {
			return formatted.length * fontDetails(attrs).lineHeight;
		}

		_measureLine(attrCache, line) {
			if(!line.length) {
				return 0;
			}

			const labelKey = JSON.stringify(line);
			const cache = attrCache.lines.get(labelKey);
			if(cache.width === null) {
				window.console.warn('Performing unexpected measurement', line);
				this.performMeasurements();
			}
			return cache.width;
		}

		_measureWidth(opts) {
			if(!opts.formatted.length) {
				return 0;
			}

			const attrCache = this._expectMeasure(opts);

			return (opts.formatted
				.map((line) => this._measureLine(attrCache, line))
				.reduce((a, b) => Math.max(a, b), 0)
			);
		}

		_getMeasurementOpts(attrs, formatted) {
			if(!formatted) {
				if(typeof attrs === 'object' && attrs.state) {
					formatted = attrs.state.formatted || [];
					attrs = attrs.state.attrs;
				} else {
					formatted = [];
				}
			} else if(!Array.isArray(formatted)) {
				throw new Error('Invalid formatted text: ' + formatted);
			}
			return {attrs, formatted};
		}

		expectMeasure(attrs, formatted) {
			const opts = this._getMeasurementOpts(attrs, formatted);
			this._expectMeasure(opts);
		}

		performMeasurementsPre() {
			this.nodes = [];
			this.cache.forEach(({attrs, lines}) => {
				lines.forEach((cacheLine) => {
					if(cacheLine.width === null) {
						const node = svg.make('text', attrs);
						populateSvgTextLine(node, cacheLine.formatted);
						this.testers.appendChild(node);
						this.nodes.push({node, cacheLine});
					}
				});
			});

			if(this.nodes.length) {
				this.container.appendChild(this.testers);
			}
		}

		performMeasurementsAct() {
			this.nodes.forEach(({node, cacheLine}) => {
				cacheLine.width = node.getComputedTextLength();
			});
		}

		performMeasurementsPost() {
			if(this.nodes.length) {
				this.container.removeChild(this.testers);
				svg.empty(this.testers);
			}
			this.nodes = null;
		}

		performMeasurements() {
			// getComputedTextLength forces a reflow, so we try to batch as
			// many measurements as possible into a single DOM change

			this.performMeasurementsPre();
			this.performMeasurementsAct();
			this.performMeasurementsPost();
		}

		measure(attrs, formatted) {
			const opts = this._getMeasurementOpts(attrs, formatted);
			return {
				width: this._measureWidth(opts),
				height: this._measureHeight(opts),
			};
		}

		measureHeight(attrs, formatted) {
			const opts = this._getMeasurementOpts(attrs, formatted);
			return this._measureHeight(opts);
		}

		resetCache() {
			this.cache.clear();
		}
	}

	SVGTextBlock.SizeTester = SizeTester;

	return SVGTextBlock;
});
