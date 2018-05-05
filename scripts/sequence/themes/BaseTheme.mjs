function optionsAttributes(attributes, options) {
	const attrs = Object.assign({}, attributes['']);
	options.forEach((opt) => {
		Object.assign(attrs, attributes[opt] || {});
	});
	return attrs;
}

export class WavePattern {
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
}

export default class BaseTheme {
	constructor(svg, baseFontAttrs) {
		this.svg = svg;
		this.baseFontAttrs = baseFontAttrs;
		this.fontSize = this.baseFontAttrs['font-size'];
		this.connectLines = new Map();
	}

	addConnectLine(type, {
		attrs = {},
		pattern = null,
	} = {}) {
		const base = this.connectLines.get('solid') || {attrs: {}};
		const fullAttrs = Object.assign({'fill': 'none'}, base.attrs, attrs);
		this.connectLines.set(type, {
			attrs: fullAttrs,
			renderFlat: this.renderFlatConnect.bind(this, pattern, fullAttrs),
			renderRev: this.renderRevConnect.bind(this, pattern, fullAttrs),
		});
	}

	// PUBLIC API

	reset() {
		// No-op
	}

	addDefs() {
		// No-op
	}

	getTitleAttrs() {
		return Object.assign({}, this.baseFontAttrs, {
			'font-size': this.fontSize * 2.5,
			'text-anchor': 'middle',
		});
	}

	getConnectLine(type) {
		const lines = this.connectLines;
		return lines.get(type) || lines.get('solid');
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

	renderAgentLine({className, options, width, x, y0, y1}) {
		const attrs = this.optionsAttributes(this.agentLineAttrs, options);
		if(width > 0) {
			return this.svg.box(attrs, {
				height: y1 - y0,
				width,
				x: x - width / 2,
				y: y0,
			}).addClass(className);
		} else {
			return this.svg.line(attrs, {
				'x1': x,
				'x2': x,
				'y1': y0,
				'y2': y1,
			}).addClass(className);
		}
	}

	// INTERNAL HELPERS

	renderArrowHead(attrs, {dir, height, width, x, y}) {
		const wx = width * dir.dx;
		const wy = width * dir.dy;
		const hy = height * 0.5 * dir.dx;
		const hx = -height * 0.5 * dir.dy;
		return this.svg.el(attrs.fill === 'none' ? 'polyline' : 'polygon')
			.attr('points', (
				(x + wx - hx) + ' ' + (y + wy - hy) + ' ' +
				x + ' ' + y + ' ' +
				(x + wx + hx) + ' ' + (y + wy + hy)
			))
			.attrs(attrs);
	}

	renderTag(attrs, {height, width, x, y}) {
		const {rx, ry} = attrs;
		const x2 = x + width;
		const y2 = y + height;

		const line = (
			'M' + x2 + ' ' + y +
			'L' + x2 + ' ' + (y2 - ry) +
			'L' + (x2 - rx) + ' ' + y2 +
			'L' + x + ' ' + y2
		);

		const g = this.svg.el('g');

		if(attrs.fill !== 'none') {
			g.add(this.svg.el('path')
				.attr('d', line + 'L' + x + ' ' + y)
				.attrs(attrs)
				.attr('stroke', 'none'));
		}
		if(attrs.stroke !== 'none') {
			g.add(this.svg.el('path')
				.attr('d', line)
				.attrs(attrs)
				.attr('fill', 'none'));
		}

		return g;
	}

	renderDB(attrs, position) {
		const z = attrs['db-z'];
		return this.svg.el('g').add(
			this.svg.box({
				'rx': position.width / 2,
				'ry': z,
			}, position).attrs(attrs),
			this.svg.el('path')
				.attr('d', (
					'M' + position.x + ' ' + (position.y + z) +
					'a' + (position.width / 2) + ' ' + z +
					' 0 0 0 ' + position.width + ' 0'
				))
				.attrs(attrs)
				.attr('fill', 'none')
		);
	}

	renderRef(options, position) {
		return {
			fill: this.svg.box(options, position).attrs({'stroke': 'none'}),
			mask: this.svg.box(options, position).attrs({
				'fill': '#000000',
				'stroke': 'none',
			}),
			shape: this.svg.box(options, position).attrs({'fill': 'none'}),
		};
	}

	renderFlatConnect(
		pattern,
		attrs,
		{x1, y1, x2, y2}
	) {
		return {
			p1: {x: x1, y: y1},
			p2: {x: x2, y: y2},
			shape: this.svg.el('path')
				.attr('d', this.svg.patternedLine(pattern)
					.move(x1, y1)
					.line(x2, y2)
					.cap()
					.asPath())
				.attrs(attrs),
		};
	}

	renderRevConnect(
		pattern,
		attrs,
		{rad, x1, x2, xR, y1, y2}
	) {
		const maxRad = (y2 - y1) / 2;
		const line = this.svg.patternedLine(pattern)
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
			p1: {x: x1, y: y1},
			p2: {x: x2, y: y2},
			shape: this.svg.el('path')
				.attr('d', line
					.line(x2, y2)
					.cap()
					.asPath())
				.attrs(attrs),
		};
	}

	renderLineDivider(
		{lineAttrs},
		{height, labelWidth, width, x, y}
	) {
		let shape = null;
		const yPos = y + height / 2;
		if(labelWidth > 0) {
			shape = this.svg.el('g').add(
				this.svg.line({'fill': 'none'}, {
					'x1': x,
					'x2': x + (width - labelWidth) / 2,
					'y1': yPos,
					'y2': yPos,
				}).attrs(lineAttrs),
				this.svg.line({'fill': 'none'}, {
					'x1': x + (width + labelWidth) / 2,
					'x2': x + width,
					'y1': yPos,
					'y2': yPos,
				}).attrs(lineAttrs)
			);
		} else {
			shape = this.svg.line({'fill': 'none'}, {
				'x1': x,
				'x2': x + width,
				'y1': yPos,
				'y2': yPos,
			}).attrs(lineAttrs);
		}
		return {shape};
	}

	renderDelayDivider(
		{dotSize, gapSize},
		{height, width, x, y}
	) {
		const mask = this.svg.el('g');
		for(let i = 0; i + gapSize <= height; i += dotSize + gapSize) {
			mask.add(this.svg.box({
				'fill': '#000000',
			}, {
				height: gapSize,
				width,
				x,
				y: y + i,
			}));
		}
		return {mask};
	}

	renderTearDivider(
		{fadeBegin, fadeSize, lineAttrs, pattern, zigHeight, zigWidth},
		{env, height, labelHeight, labelWidth, width, x, y}
	) {
		const maskGradID = env.addDef('tear-grad', () => {
			const px = 100 / width;
			return this.svg.linearGradient({}, [
				{
					'offset': (fadeBegin * px) + '%',
					'stop-color': '#000000',
				},
				{
					'offset': ((fadeBegin + fadeSize) * px) + '%',
					'stop-color': '#FFFFFF',
				},
				{
					'offset': (100 - (fadeBegin + fadeSize) * px) + '%',
					'stop-color': '#FFFFFF',
				},
				{
					'offset': (100 - fadeBegin * px) + '%',
					'stop-color': '#000000',
				},
			]);
		});
		const shapeMask = this.svg.el('mask')
			.attr('maskUnits', 'userSpaceOnUse')
			.add(
				this.svg.box({
					'fill': 'url(#' + maskGradID + ')',
				}, {
					height: height + 10,
					width,
					x,
					y: y - 5,
				})
			);
		const shapeMaskID = env.addDef(shapeMask);

		if(labelWidth > 0) {
			shapeMask.add(this.svg.box({
				'fill': '#000000',
				'rx': 2,
				'ry': 2,
			}, {
				'height': labelHeight + 2,
				'width': labelWidth,
				'x': x + (width - labelWidth) / 2,
				'y': y + (height - labelHeight) / 2 - 1,
			}));
		}

		const p = pattern || new WavePattern(zigWidth, [zigHeight, -zigHeight]);
		let mask = null;

		const pathTop = this.svg.patternedLine(p)
			.move(x, y)
			.line(x + width, y);

		const shape = this.svg.el('g')
			.attr('mask', 'url(#' + shapeMaskID + ')')
			.add(
				this.svg.el('path')
					.attrs({
						'd': pathTop.asPath(),
						'fill': 'none',
					})
					.attrs(lineAttrs)
			);

		if(height > 0) {
			const pathBase = this.svg.patternedLine(p)
				.move(x, y + height)
				.line(x + width, y + height);
			shape.add(
				this.svg.el('path')
					.attrs({
						'd': pathBase.asPath(),
						'fill': 'none',
					})
					.attrs(lineAttrs)
			);
			pathTop
				.line(pathBase.x, pathBase.y, {patterned: false})
				.cap();
			pathTop.points.push(...pathBase.points.reverse());
			mask = this.svg.el('path').attrs({
				'd': pathTop.asPath(),
				'fill': '#000000',
			});
		}
		return {mask, shape};
	}
}
