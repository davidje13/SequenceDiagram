define([
	'svg/SVGUtilities',
	'svg/SVGShapes',
], (
	svg,
	SVGShapes
) => {
	'use strict';

	function deepCopy(o) {
		if(typeof o !== 'object' || !o) {
			return o;
		}
		const r = {};
		for(const k in o) {
			if(o.hasOwnProperty(k)) {
				r[k] = deepCopy(o[k]);
			}
		}
		return r;
	}

	function optionsAttributes(attributes, options) {
		let attrs = Object.assign({}, attributes['']);
		options.forEach((opt) => {
			Object.assign(attrs, attributes[opt] || {});
		});
		return attrs;
	}

	class BaseTheme {
		constructor({name, settings, blocks, notes, dividers}) {
			this.name = name;
			this.blocks = deepCopy(blocks);
			this.notes = deepCopy(notes);
			this.dividers = deepCopy(dividers);
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

		getDivider(type) {
			return this.dividers[type] || this.dividers[''];
		}

		optionsAttributes(attributes, options) {
			return optionsAttributes(attributes, options);
		}

		renderAgentLine({x, y0, y1, width, className, options}) {
			const attrs = this.optionsAttributes(this.agentLineAttrs, options);
			if(width > 0) {
				return svg.make('rect', Object.assign({
					'x': x - width / 2,
					'y': y0,
					'width': width,
					'height': y1 - y0,
					'class': className,
				}, attrs));
			} else {
				return svg.make('line', Object.assign({
					'x1': x,
					'y1': y0,
					'x2': x,
					'y2': y1,
					'class': className,
				}, attrs));
			}
		}
	}

	BaseTheme.renderArrowHead = (attrs, {x, y, width, height, dir}) => {
		const wx = width * dir.dx;
		const wy = width * dir.dy;
		const hy = height * 0.5 * dir.dx;
		const hx = -height * 0.5 * dir.dy;
		return svg.make(
			attrs.fill === 'none' ? 'polyline' : 'polygon',
			Object.assign({
				'points': (
					(x + wx - hx) + ' ' + (y + wy - hy) + ' ' +
					x + ' ' + y + ' ' +
					(x + wx + hx) + ' ' + (y + wy + hy)
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

	BaseTheme.renderDB = (attrs, {x, y, width, height}) => {
		const z = attrs['db-z'];
		return svg.make('g', {}, [
			svg.make('rect', Object.assign({
				'x': x,
				'y': y,
				'width': width,
				'height': height,
				'rx': width / 2,
				'ry': z,
			}, attrs)),
			svg.make('path', Object.assign({
				'd': (
					'M' + x + ' ' + (y + z) +
					'a' + (width / 2) + ' ' + z +
					' 0 0 0 ' + width + ' 0'
				),
			}, attrs, {'fill': 'none'})),
		]);
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

	BaseTheme.renderRef = (options, position) => {
		return {
			shape: SVGShapes.renderBox(Object.assign({}, options, {
				'fill': 'none',
			}), position),
			mask: SVGShapes.renderBox(Object.assign({}, options, {
				'fill': '#000000',
				'stroke': 'none',
			}), position),
			fill: SVGShapes.renderBox(Object.assign({}, options, {
				'stroke': 'none',
			}), position),
		};
	};

	BaseTheme.WavePattern = class WavePattern {
		constructor(width, height) {
			if(Array.isArray(height)) {
				this.deltas = height;
			} else {
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
			}
			this.partWidth = width / this.deltas.length;
		}

		getDelta(p) {
			return this.deltas[p % this.deltas.length];
		}
	};

	BaseTheme.renderFlatConnector = (
		pattern,
		attrs,
		{x1, y1, x2, y2}
	) => {
		return {
			shape: svg.make('path', Object.assign({
				d: new SVGShapes.PatternedLine(pattern)
					.move(x1, y1)
					.line(x2, y2)
					.cap()
					.asPath(),
			}, attrs)),
			p1: {x: x1, y: y1},
			p2: {x: x2, y: y2},
		};
	};

	BaseTheme.renderRevConnector = (
		pattern,
		attrs,
		{x1, y1, x2, y2, xR, rad}
	) => {
		const maxRad = (y2 - y1) / 2;
		const line = new SVGShapes.PatternedLine(pattern)
			.move(x1, y1)
			.line(xR, y1);
		if(rad < maxRad) {
			line
				.arc(xR, y1 + rad, Math.PI / 2)
				.line(xR + rad, y2 - rad)
				.arc(xR, y2 - rad, Math.PI / 2);
		} else {
			line.arc(xR, (y1 + y2) / 2, Math.PI);
		}
		return {
			shape: svg.make('path', Object.assign({
				d: line
					.line(x2, y2)
					.cap()
					.asPath(),
			}, attrs)),
			p1: {x: x1, y: y1},
			p2: {x: x2, y: y2},
		};
	};

	BaseTheme.renderLineDivider = (
		{lineAttrs},
		{x, y, labelWidth, width, height}
	) => {
		let shape = null;
		const yPos = y + height / 2;
		if(labelWidth > 0) {
			shape = svg.make('g', {}, [
				svg.make('line', Object.assign({
					'x1': x,
					'y1': yPos,
					'x2': x + (width - labelWidth) / 2,
					'y2': yPos,
					'fill': 'none',
				}, lineAttrs)),
				svg.make('line', Object.assign({
					'x1': x + (width + labelWidth) / 2,
					'y1': yPos,
					'x2': x + width,
					'y2': yPos,
					'fill': 'none',
				}, lineAttrs)),
			]);
		} else {
			shape = svg.make('line', Object.assign({
				'x1': x,
				'y1': yPos,
				'x2': x + width,
				'y2': yPos,
				'fill': 'none',
			}, lineAttrs));
		}
		return {shape};
	};

	BaseTheme.renderDelayDivider = (
		{dotSize, gapSize},
		{x, y, width, height}
	) => {
		const mask = svg.make('g');
		for(let i = 0; i + gapSize <= height; i += dotSize + gapSize) {
			mask.appendChild(svg.make('rect', {
				'x': x,
				'y': y + i,
				'width': width,
				'height': gapSize,
				'fill': '#000000',
			}));
		}
		return {mask};
	};

	BaseTheme.renderTearDivider = (
		{fadeBegin, fadeSize, pattern, zigWidth, zigHeight, lineAttrs},
		{x, y, labelWidth, labelHeight, width, height, env}
	) => {
		const maskGradID = env.addDef('tear-grad', () => {
			const px = 100 / width;
			return svg.make('linearGradient', {}, [
				svg.make('stop', {
					'offset': (fadeBegin * px) + '%',
					'stop-color': '#000000',
				}),
				svg.make('stop', {
					'offset': ((fadeBegin + fadeSize) * px) + '%',
					'stop-color': '#FFFFFF',
				}),
				svg.make('stop', {
					'offset': (100 - (fadeBegin + fadeSize) * px) + '%',
					'stop-color': '#FFFFFF',
				}),
				svg.make('stop', {
					'offset': (100 - fadeBegin * px) + '%',
					'stop-color': '#000000',
				}),
			]);
		});
		const shapeMask = svg.make('mask', {
			'maskUnits': 'userSpaceOnUse',
		}, [
			svg.make('rect', {
				'x': x,
				'y': y - 5,
				'width': width,
				'height': height + 10,
				'fill': 'url(#' + maskGradID + ')',
			}),
		]);
		const shapeMaskID = env.addDef(shapeMask);

		if(labelWidth > 0) {
			shapeMask.appendChild(svg.make('rect', {
				'x': x + (width - labelWidth) / 2,
				'y': y + (height - labelHeight) / 2 - 1,
				'width': labelWidth,
				'height': labelHeight + 2,
				'rx': 2,
				'ry': 2,
				'fill': '#000000',
			}));
		}

		if(!pattern) {
			pattern = new BaseTheme.WavePattern(
				zigWidth,
				[zigHeight, -zigHeight]
			);
		}
		let mask = null;

		const pathTop = new SVGShapes.PatternedLine(pattern)
			.move(x, y)
			.line(x + width, y);

		const shape = svg.make('g', {
			'mask': 'url(#' + shapeMaskID + ')',
		}, [
			svg.make('path', Object.assign({
				'd': pathTop.asPath(),
				'fill': 'none',
			}, lineAttrs)),
		]);

		if(height > 0) {
			const pathBase = new SVGShapes.PatternedLine(pattern)
				.move(x, y + height)
				.line(x + width, y + height);
			shape.appendChild(svg.make('path', Object.assign({
				'd': pathBase.asPath(),
				'fill': 'none',
			}, lineAttrs)));
			pathTop
				.line(pathBase.x, pathBase.y, {patterned: false})
				.cap();
			pathTop.points.push(...pathBase.points.reverse());
			mask = svg.make('path', {
				'd': pathTop.asPath(),
				'fill': '#000000',
			});
		}
		return {shape, mask};
	};

	return BaseTheme;
});
