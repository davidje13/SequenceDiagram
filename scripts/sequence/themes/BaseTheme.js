define(() => {
	'use strict';

	function optionsAttributes(attributes, options) {
		let attrs = Object.assign({}, attributes['']);
		options.forEach((opt) => {
			Object.assign(attrs, attributes[opt] || {});
		});
		return attrs;
	}

	class BaseTheme {
		constructor(svg) {
			this.svg = svg;
		}

		// PUBLIC API

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
				return this.svg.box(attrs, {
					'x': x - width / 2,
					'y': y0,
					'width': width,
					'height': y1 - y0,
				}).addClass(className);
			} else {
				return this.svg.line(attrs, {
					'x1': x,
					'y1': y0,
					'x2': x,
					'y2': y1,
				}).addClass(className);
			}
		}

		// INTERNAL HELPERS

		renderArrowHead(attrs, {x, y, width, height, dir}) {
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

		renderTag(attrs, {x, y, width, height}) {
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
					.attr('stroke', 'none')
				);
			}
			if(attrs.stroke !== 'none') {
				g.add(this.svg.el('path')
					.attr('d', line)
					.attrs(attrs)
					.attr('fill', 'none')
				);
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
				shape: this.svg.box(options, position).attrs({'fill': 'none'}),
				mask: this.svg.box(options, position).attrs({
					'fill': '#000000',
					'stroke': 'none',
				}),
				fill: this.svg.box(options, position).attrs({'stroke': 'none'}),
			};
		}

		renderFlatConnect(
			pattern,
			attrs,
			{x1, y1, x2, y2}
		) {
			return {
				shape: this.svg.el('path')
					.attr('d', this.svg.patternedLine(pattern)
						.move(x1, y1)
						.line(x2, y2)
						.cap()
						.asPath()
					)
					.attrs(attrs),
				p1: {x: x1, y: y1},
				p2: {x: x2, y: y2},
			};
		}

		renderRevConnect(
			pattern,
			attrs,
			{x1, y1, x2, y2, xR, rad}
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
				shape: this.svg.el('path')
					.attr('d', line
						.line(x2, y2)
						.cap()
						.asPath()
					)
					.attrs(attrs),
				p1: {x: x1, y: y1},
				p2: {x: x2, y: y2},
			};
		}

		renderLineDivider(
			{lineAttrs},
			{x, y, labelWidth, width, height}
		) {
			let shape = null;
			const yPos = y + height / 2;
			if(labelWidth > 0) {
				shape = this.svg.el('g').add(
					this.svg.line({'fill': 'none'}, {
						'x1': x,
						'y1': yPos,
						'x2': x + (width - labelWidth) / 2,
						'y2': yPos,
					}).attrs(lineAttrs),
					this.svg.line({'fill': 'none'}, {
						'x1': x + (width + labelWidth) / 2,
						'y1': yPos,
						'x2': x + width,
						'y2': yPos,
					}).attrs(lineAttrs)
				);
			} else {
				shape = this.svg.line({'fill': 'none'}, {
					'x1': x,
					'y1': yPos,
					'x2': x + width,
					'y2': yPos,
				}).attrs(lineAttrs);
			}
			return {shape};
		}

		renderDelayDivider(
			{dotSize, gapSize},
			{x, y, width, height}
		) {
			const mask = this.svg.el('g');
			for(let i = 0; i + gapSize <= height; i += dotSize + gapSize) {
				mask.add(this.svg.box({
					'fill': '#000000',
				}, {
					'x': x,
					'y': y + i,
					'width': width,
					'height': gapSize,
				}));
			}
			return {mask};
		}

		renderTearDivider(
			{fadeBegin, fadeSize, pattern, zigWidth, zigHeight, lineAttrs},
			{x, y, labelWidth, labelHeight, width, height, env}
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
						'x': x,
						'y': y - 5,
						'width': width,
						'height': height + 10,
					})
				);
			const shapeMaskID = env.addDef(shapeMask);

			if(labelWidth > 0) {
				shapeMask.add(this.svg.box({
					'rx': 2,
					'ry': 2,
					'fill': '#000000',
				}, {
					'x': x + (width - labelWidth) / 2,
					'y': y + (height - labelHeight) / 2 - 1,
					'width': labelWidth,
					'height': labelHeight + 2,
				}));
			}

			if(!pattern) {
				pattern = new BaseTheme.WavePattern(
					zigWidth,
					[zigHeight, -zigHeight]
				);
			}
			let mask = null;

			const pathTop = this.svg.patternedLine(pattern)
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
				const pathBase = this.svg.patternedLine(pattern)
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
			return {shape, mask};
		}
	}

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

	return BaseTheme;
});
