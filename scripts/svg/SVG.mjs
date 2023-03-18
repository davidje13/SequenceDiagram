import {SVGTextBlock, TextSizer} from './SVGTextBlock.mjs';
import PatternedLine from './PatternedLine.mjs';

const NS = 'http://www.w3.org/2000/svg';

function calculateAnchor(x, attrs, padding) {
	let shift = 0;
	let anchorX = x;
	switch(attrs['text-anchor']) {
	case 'middle':
		shift = 0.5;
		anchorX += (padding.left - padding.right) / 2;
		break;
	case 'end':
		shift = 1;
		anchorX -= padding.right;
		break;
	default:
		shift = 0;
		anchorX += padding.left;
		break;
	}
	return {anchorX, shift};
}

const defaultTextSizerFactory = (svg) => new TextSizer(svg);

class TextSizerWrapper {
	constructor(sizer) {
		this.sizer = sizer;
		this.cache = new Map();
		this.active = null;
	}

	_expectMeasure({attrs, formatted}) {
		if(!formatted.length) {
			return null;
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

	_measureLine(attrCache, line) {
		if(!line.length) {
			return 0;
		}

		const labelKey = JSON.stringify(line);
		const cache = attrCache.lines.get(labelKey);
		if(cache.width === null) {
			throw new Error('Unexpected measurement of ' + line);
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
		const result = {attrs, formatted};
		if(!formatted) {
			if(attrs.textBlock) {
				result.attrs = attrs.textBlock.state.attrs;
				result.formatted = attrs.textBlock.state.formatted;
			} else if(attrs.state) {
				result.attrs = attrs.state.attrs;
				result.formatted = attrs.state.formatted;
			}
			result.formatted = result.formatted || [];
		}
		if(!Array.isArray(result.formatted)) {
			throw new Error('Invalid formatted text: ' + result.formatted);
		}
		return result;
	}

	expectMeasure(attrs, formatted) {
		const opts = this._getMeasurementOpts(attrs, formatted);
		this._expectMeasure(opts);
	}

	performMeasurementsPre() {
		this.active = [];
		this.cache.forEach(({attrs, lines}) => {
			lines.forEach((cacheLine) => {
				if(cacheLine.width === null) {
					this.active.push({
						cacheLine,
						data: this.sizer.prepMeasurement(
							attrs,
							cacheLine.formatted,
						),
					});
				}
			});
		});

		if(this.active.length) {
			this.sizer.prepComplete();
		}
	}

	performMeasurementsAct() {
		this.active.forEach(({data, cacheLine}) => {
			cacheLine.width = this.sizer.performMeasurement(data);
		});
	}

	performMeasurementsPost() {
		if(this.active.length) {
			this.sizer.teardown();
		}
		this.active = null;
	}

	performMeasurements() {
		/*
		 * Batch as many measurements as possible into a single DOM
		 * change, since getComputedTextLength forces a reflow.
		 */

		try {
			this.performMeasurementsPre();
			this.performMeasurementsAct();
		} finally {
			this.performMeasurementsPost();
		}
	}

	measure(attrs, formatted) {
		const opts = this._getMeasurementOpts(attrs, formatted);
		return {
			height: this.sizer.measureHeight(opts),
			width: this._measureWidth(opts),
		};
	}

	baseline(attrs, formatted) {
		const opts = this._getMeasurementOpts(attrs, formatted);
		return this.sizer.baseline(opts);
	}

	measureHeight(attrs, formatted) {
		const opts = this._getMeasurementOpts(attrs, formatted);
		return this.sizer.measureHeight(opts);
	}

	resetCache() {
		this.cache.clear();
	}
}

export default class SVG {
	constructor(domWrapper, textSizerFactory = null) {
		this.dom = domWrapper;
		this.body = this.el('svg').attr('xmlns', NS).attr('version', '1.1');
		const fn = (textSizerFactory || defaultTextSizerFactory);
		this.textFilters = new Map();
		this.textSizer = new TextSizerWrapper(fn(this));

		this.txt = this.txt.bind(this);
		this.el = this.el.bind(this);
	}

	resetTextFilters() {
		this.textFilters.clear();
	}

	registerTextFilter(name, id) {
		this.textFilters.set(name, {id, used: false});
	}

	getTextFilter(name) {
		const filter = this.textFilters.get(name);
		if(!filter) {
			return 'none';
		}
		filter.used = true;
		return 'url(#' + filter.id + ')';
	}

	getUsedTextFilterNames() {
		const used = [];
		for(const [name, filter] of this.textFilters) {
			if(filter.used) {
				used.push(name);
			}
		}
		return used;
	}

	linearGradient(attrs, stops) {
		return this.el('linearGradient')
			.attrs(attrs)
			.add(stops.map((stop) => this.el('stop').attrs(stop)));
	}

	patternedLine(pattern = null, phase = 0) {
		return new PatternedLine(pattern, phase);
	}

	txt(content) {
		return this.dom.txt(content);
	}

	el(tag, namespace = NS) {
		return this.dom.el(tag, namespace);
	}

	box(attrs, {height, width, x, y}) {
		return this.el('rect').attrs(attrs).attrs({height, width, x, y});
	}

	boxFactory(attrs) {
		return this.box.bind(this, attrs);
	}

	line(attrs, {x1, x2, y1, y2}) {
		return this.el('line').attrs(attrs).attrs({x1, x2, y1, y2});
	}

	lineFactory(attrs) {
		return this.line.bind(this, attrs);
	}

	circle(attrs, {x, y, radius}) {
		return this.el('circle')
			.attrs({
				'cx': x,
				'cy': y,
				'r': radius,
			})
			.attrs(attrs);
	}

	circleFactory(attrs) {
		return this.circle.bind(this, attrs);
	}

	cross(attrs, {x, y, radius}) {
		return this.el('path')
			.attr('d', (
				'M' + (x - radius) + ' ' + (y - radius) +
				'l' + (radius * 2) + ' ' + (radius * 2) +
				'm0 ' + (-radius * 2) +
				'l' + (-radius * 2) + ' ' + (radius * 2)
			))
			.attrs(attrs);
	}

	crossFactory(attrs) {
		return this.cross.bind(this, attrs);
	}

	note(attrs, flickAttrs, {height, width, x, y}) {
		const x0 = x;
		const x1 = x + width;
		const y0 = y;
		const y1 = y + height;
		const flick = 7;

		return this.el('g').add(
			this.el('polygon')
				.attr('points', (
					x0 + ' ' + y0 + ' ' +
					(x1 - flick) + ' ' + y0 + ' ' +
					x1 + ' ' + (y0 + flick) + ' ' +
					x1 + ' ' + y1 + ' ' +
					x0 + ' ' + y1
				))
				.attrs(attrs),
			this.el('polyline')
				.attr('points', (
					(x1 - flick) + ' ' + y0 + ' ' +
					(x1 - flick) + ' ' + (y0 + flick) + ' ' +
					x1 + ' ' + (y0 + flick)
				))
				.attrs(flickAttrs),
		);
	}

	noteFactory(attrs, flickAttrs) {
		return this.note.bind(this, attrs, flickAttrs);
	}

	formattedText(attrs = {}, formatted = [], {x, y} = {}) {
		const container = this.el('g');
		const txt = new SVGTextBlock(container, this, {
			attrs,
			formatted,
			x,
			y,
		});
		return Object.assign(container, {
			set: (state) => txt.set(state),
			textBlock: txt,
		});
	}

	formattedTextFactory(attrs) {
		return this.formattedText.bind(this, attrs);
	}

	boxedText({
		padding,
		labelAttrs,
		boxAttrs = {},
		boxRenderer = null,
	}, formatted, {x, y}) {
		if(!formatted || !formatted.length) {
			return Object.assign(this.el('g'), {
				box: null,
				height: 0,
				label: null,
				width: 0,
			});
		}

		const {shift, anchorX} = calculateAnchor(x, labelAttrs, padding);

		const label = this.formattedText(labelAttrs, formatted, {
			x: anchorX,
			y: y + padding.top,
		});

		const size = this.textSizer.measure(label);
		const width = (size.width + padding.left + padding.right);
		const height = (size.height + padding.top + padding.bottom);

		const boxFn = boxRenderer || this.boxFactory(boxAttrs);
		const box = boxFn({
			height,
			width,
			x: anchorX - size.width * shift - padding.left,
			y,
		});

		return Object.assign(this.el('g').add(box, label), {
			box,
			height,
			label,
			width,
		});
	}

	boxedTextFactory(options) {
		return this.boxedText.bind(this, options);
	}
}
