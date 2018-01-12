define(['svg/SVGUtilities', 'svg/PatternedLine'], (svg, PatternedLine) => {
	'use strict';

	function deepCopy(o) {
		if(typeof o !== 'object' || !o) {
			return o;
		}
		const r = {};
		for(let k in o) {
			if(o.hasOwnProperty(k)) {
				r[k] = deepCopy(o[k]);
			}
		}
		return r;
	}

	class BaseTheme {
		constructor({name, settings, blocks, notes}) {
			this.name = name;
			this.blocks = deepCopy(blocks);
			this.notes = deepCopy(notes);
			Object.assign(this, deepCopy(settings));
		}

		reset() {
		}

		addDefs() {
		}

		getBlock(type) {
			return this.blocks[type] || this.blocks[''];
		}

		getNote(type) {
			return this.notes[type] || this.notes[''];
		}

		renderAgentLine({x, y0, y1, width, className}) {
			if(width > 0) {
				return svg.make('rect', Object.assign({
					'x': x - width / 2,
					'y': y0,
					'width': width,
					'height': y1 - y0,
					'class': className,
				}, this.agentLineAttrs));
			} else {
				return svg.make('line', Object.assign({
					'x1': x,
					'y1': y0,
					'x2': x,
					'y2': y1,
					'class': className,
				}, this.agentLineAttrs));
			}
		}
	}

	BaseTheme.renderHorizArrowHead = (attrs, {x, y, dx, dy}) => {
		return svg.make(
			attrs.fill === 'none' ? 'polyline' : 'polygon',
			Object.assign({
				'points': (
					(x + dx) + ' ' + (y - dy) + ' ' +
					x + ' ' + y + ' ' +
					(x + dx) + ' ' + (y + dy)
				),
			}, attrs)
		);
	};

	BaseTheme.renderTag = (attrs, {x, y, width, height}) => {
		const {rx, ry} = attrs;
		const x2 = x + width;
		const y2 = y + height;

		const line = (
			'M' + x2 + ' ' + y +
			'L' + x2 + ' ' + (y2 - ry) +
			'L' + (x2 - rx) + ' ' + y2 +
			'L' + x + ' ' + y2
		);

		const g = svg.make('g');
		if(attrs.fill !== 'none') {
			g.appendChild(svg.make('path', Object.assign({
				'd': line + 'L' + x + ' ' + y,
			}, attrs, {'stroke': 'none'})));
		}

		if(attrs.stroke !== 'none') {
			g.appendChild(svg.make('path', Object.assign({
				'd': line,
			}, attrs, {'fill': 'none'})));
		}

		return g;
	};

	BaseTheme.renderCross = (attrs, {x, y, radius}) => {
		return svg.make('path', Object.assign({
			'd': (
				'M' + (x - radius) + ' ' + (y - radius) +
				'l' + (radius * 2) + ' ' + (radius * 2) +
				'm0 ' + (-radius * 2) +
				'l' + (-radius * 2) + ' ' + (radius * 2)
			),
		}, attrs));
	};

	BaseTheme.WavePattern = class WavePattern {
		constructor(width, height) {
			this.deltas = [
				0,
				-height * 2 / 3,
				-height,
				-height * 2 / 3,
				0,
				height * 2 / 3,
				height,
				height * 2 / 3,
			];
			this.partWidth = width / this.deltas.length;
		}

		getDelta(p) {
			return this.deltas[p % this.deltas.length];
		}
	};

	BaseTheme.renderFlatConnector = (pattern, attrs, {x1, dx1, x2, dx2, y}) => {
		return {
			shape: svg.make('path', Object.assign({
				d: new PatternedLine(pattern)
					.move(x1 + dx1, y)
					.line(x2 + dx2, y)
					.cap()
					.asPath(),
			}, attrs)),
			p1: {x: x1, y},
			p2: {x: x2, y},
		};
	};

	BaseTheme.renderRevConnector = (
		pattern,
		attrs,
		{xL, dx1, dx2, y1, y2, xR}
	) => {
		return {
			shape: svg.make('path', Object.assign({
				d: new PatternedLine(pattern)
					.move(xL + dx1, y1)
					.line(xR, y1)
					.arc(xR, (y1 + y2) / 2, Math.PI)
					.line(xL + dx2, y2)
					.cap()
					.asPath(),
			}, attrs)),
			p1: {x: xL, y: y1},
			p2: {x: xL, y: y2},
		};
	};

	return BaseTheme;
});
