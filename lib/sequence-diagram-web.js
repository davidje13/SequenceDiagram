(function () {
	'use strict';

	function optionsAttributes(attributes, options) {
		const attrs = Object.assign({}, attributes['']);
		options.forEach((opt) => {
			Object.assign(attrs, attributes[opt] || {});
		});
		return attrs;
	}

	class WavePattern {
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

	class BaseTheme {
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

		addDefs(builder, textBuilder) {
			// Thanks, https://stackoverflow.com/a/12263962/1180785
			// https://bugs.chromium.org/p/chromium/issues/detail?id=603157
			// https://bugzilla.mozilla.org/show_bug.cgi?id=917766
			textBuilder('highlight', () => this.svg.el('filter')
				.add(
					// Morph makes characters consistent
					this.svg.el('feMorphology').attrs({
						'in': 'SourceAlpha',
						'operator': 'dilate',
						'radius': '4',
					}),
					// Blur+thresh makes edges smooth
					this.svg.el('feGaussianBlur').attrs({
						'edgeMode': 'none',
						'stdDeviation': '3, 1.5',
					}),
					this.svg.el('feComponentTransfer').add(
						this.svg.el('feFuncA').attrs({
							'intercept': -70,
							'slope': 100,
							'type': 'linear',
						})
					),
					// Add colour
					this.svg.el('feComponentTransfer').add(
						this.svg.el('feFuncR').attrs({
							'intercept': 1,
							'slope': 0,
							'type': 'linear',
						}),
						this.svg.el('feFuncG').attrs({
							'intercept': 0.875,
							'slope': 0,
							'type': 'linear',
						}),
						this.svg.el('feFuncB').attrs({
							'intercept': 0,
							'slope': 0,
							'type': 'linear',
						}),
						this.svg.el('feFuncA').attrs({
							'slope': 0.8,
							'type': 'linear',
						})
					),
					// Draw text on top
					this.svg.el('feMerge').add(
						this.svg.el('feMergeNode'),
						this.svg.el('feMergeNode').attr('in', 'SourceGraphic')
					)
				));
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

		renderPerson({iconHeight, iconWidth}, iconAttrs, boxAttrs, position) {
			const cx = position.x + position.width / 2;
			const sx = iconWidth / 2;
			const sy = iconHeight;

			return this.svg.el('g').add(
				this.svg.el('path')
					.attr('d', (
						'M' + (cx - sx) + ' ' + (position.y + iconHeight) +
						'a' + sx + ' ' + (sy * 0.3) + ' 0 0 1' +
						' ' + (sx * 2) + ' 0'
					))
					.attrs(iconAttrs),
				this.svg.el('path')
					.attr('d', (
						'M' + cx + ' ' + position.y +
						'c' + (sx * 0.224) + ' 0' +
						' ' + (sx * 0.4) + ' ' + (sy * 0.1) +
						' ' + (sx * 0.4) + ' ' + (sy * 0.275) +
						's' + (-sx * 0.176) + ' ' + (sy * 0.35) +
						' ' + (-sx * 0.4) + ' ' + (sy * 0.35) +
						's' + (-sx * 0.4) + ' ' + (-sy * 0.175) +
						' ' + (-sx * 0.4) + ' ' + (-sy * 0.35) +
						's' + (sx * 0.176) + ' ' + (-sy * 0.275) +
						' ' + (sx * 0.4) + ' ' + (-sy * 0.275)
					))
					.attrs(iconAttrs),
				this.svg.box(boxAttrs, {
					height: position.height - iconHeight,
					width: position.width,
					x: position.x,
					y: position.y + iconHeight,
				})
			);
		}

		renderDB({tilt}, attrs, position) {
			return this.svg.el('g').add(
				this.svg.box({
					'rx': position.width / 2,
					'ry': tilt,
				}, position).attrs(attrs),
				this.svg.el('path')
					.attr('d', (
						'M' + position.x + ' ' + (position.y + tilt) +
						'a' + (position.width / 2) + ' ' + tilt +
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

	/* eslint-disable sort-keys */ // Maybe later

	const FONT$3 = 'Helvetica,Arial,Liberation Sans,sans-serif';
	const LINE_HEIGHT$3 = 1.3;

	const NOTE_ATTRS$3 = {
		'font-family': FONT$3,
		'font-size': 8,
		'line-height': LINE_HEIGHT$3,
	};

	const DIVIDER_LABEL_ATTRS$3 = {
		'font-family': FONT$3,
		'font-size': 8,
		'line-height': LINE_HEIGHT$3,
		'text-anchor': 'middle',
	};

	class BasicTheme extends BaseTheme {
		constructor(svg) {
			super(svg, {
				'font-family': FONT$3,
				'font-size': 8,
				'line-height': LINE_HEIGHT$3,
			});

			const sharedBlockSection = {
				padding: {
					top: 3,
					bottom: 2,
				},
				tag: {
					padding: {
						top: 1,
						left: 3,
						right: 3,
						bottom: 0,
					},
					boxRenderer: this.renderTag.bind(this, {
						'fill': '#FFFFFF',
						'stroke': '#000000',
						'stroke-width': 1,
						'rx': 2,
						'ry': 2,
					}),
					labelAttrs: {
						'font-family': FONT$3,
						'font-weight': 'bold',
						'font-size': 9,
						'line-height': LINE_HEIGHT$3,
						'text-anchor': 'left',
					},
				},
				label: {
					minHeight: 4,
					padding: {
						top: 1,
						left: 5,
						right: 3,
						bottom: 1,
					},
					labelAttrs: {
						'font-family': FONT$3,
						'font-size': 8,
						'line-height': LINE_HEIGHT$3,
						'text-anchor': 'left',
					},
				},
			};

			Object.assign(this, {
				titleMargin: 10,
				outerMargin: 5,
				agentMargin: 10,
				actionMargin: 10,
				minActionMargin: 3,
				agentLineActivationRadius: 4,

				agentCap: {
					box: {
						padding: {
							top: 5,
							left: 10,
							right: 10,
							bottom: 5,
						},
						arrowBottom: 5 + 12 * 1.3 / 2,
						boxAttrs: {
							'fill': '#FFFFFF',
							'stroke': '#000000',
							'stroke-width': 1,
						},
						labelAttrs: {
							'font-family': FONT$3,
							'font-size': 12,
							'line-height': LINE_HEIGHT$3,
							'text-anchor': 'middle',
						},
					},
					person: {
						padding: {
							top: 20,
							left: 10,
							right: 10,
							bottom: 5,
						},
						arrowBottom: 5 + 12 * 1.3 / 2,
						boxRenderer: this.renderPerson.bind(this, {
							iconHeight: 15,
							iconWidth: 18,
						}, {
							'fill': '#000000',
						}, {
							'fill': '#FFFFFF',
							'stroke': '#000000',
							'stroke-width': 1,
						}),
						labelAttrs: {
							'font-family': FONT$3,
							'font-size': 12,
							'line-height': LINE_HEIGHT$3,
							'text-anchor': 'middle',
						},
					},
					database: {
						padding: {
							top: 12,
							left: 10,
							right: 10,
							bottom: 3,
						},
						arrowBottom: 5 + 12 * 1.3 / 2,
						boxRenderer: this.renderDB.bind(this, {tilt: 5}, {
							'fill': '#FFFFFF',
							'stroke': '#000000',
							'stroke-width': 1,
						}),
						labelAttrs: {
							'font-family': FONT$3,
							'font-size': 12,
							'line-height': LINE_HEIGHT$3,
							'text-anchor': 'middle',
						},
					},
					cross: {
						size: 20,
						render: svg.crossFactory({
							'fill': 'none',
							'stroke': '#000000',
							'stroke-width': 1,
						}),
					},
					bar: {
						height: 4,
						render: svg.boxFactory({
							'fill': '#000000',
							'stroke': '#000000',
							'stroke-width': 1,
						}),
					},
					fade: {
						width: 5,
						height: 6,
						extend: 1,
					},
					none: {
						height: 10,
					},
				},

				connect: {
					loopbackRadius: 6,
					arrow: {
						'single': {
							width: 5,
							height: 10,
							render: this.renderArrowHead.bind(this),
							attrs: {
								'fill': '#000000',
								'stroke-width': 0,
								'stroke-linejoin': 'miter',
							},
						},
						'double': {
							width: 4,
							height: 6,
							render: this.renderArrowHead.bind(this),
							attrs: {
								'fill': 'none',
								'stroke': '#000000',
								'stroke-width': 1,
								'stroke-linejoin': 'miter',
							},
						},
						'fade': {
							short: 2,
							size: 16,
						},
						'cross': {
							short: 7,
							radius: 3,
							render: svg.crossFactory({
								'fill': 'none',
								'stroke': '#000000',
								'stroke-width': 1,
							}),
						},
					},
					label: {
						padding: 6,
						margin: {top: 2, bottom: 1},
						attrs: {
							'font-family': FONT$3,
							'font-size': 8,
							'line-height': LINE_HEIGHT$3,
							'text-anchor': 'middle',
						},
						loopbackAttrs: {
							'font-family': FONT$3,
							'font-size': 8,
							'line-height': LINE_HEIGHT$3,
						},
					},
					source: {
						radius: 2,
						render: svg.circleFactory({
							'fill': '#000000',
							'stroke': '#000000',
							'stroke-width': 1,
						}),
					},
					mask: {
						padding: {
							top: 0,
							left: 3,
							right: 3,
							bottom: 1,
						},
					},
				},

				agentLineAttrs: {
					'': {
						'fill': 'none',
						'stroke': '#000000',
						'stroke-width': 1,
					},
					'red': {
						'stroke': '#CC0000',
					},
				},
				blocks: {
					'ref': {
						margin: {
							top: 0,
							bottom: 0,
						},
						boxRenderer: this.renderRef.bind(this, {
							'fill': '#FFFFFF',
							'stroke': '#000000',
							'stroke-width': 1.5,
							'rx': 2,
							'ry': 2,
						}),
						section: sharedBlockSection,
					},
					'': {
						margin: {
							top: 0,
							bottom: 0,
						},
						boxRenderer: svg.boxFactory({
							'fill': 'none',
							'stroke': '#000000',
							'stroke-width': 1.5,
							'rx': 2,
							'ry': 2,
						}),
						collapsedBoxRenderer: this.renderRef.bind(this, {
							'fill': '#FFFFFF',
							'stroke': '#000000',
							'stroke-width': 1.5,
							'rx': 2,
							'ry': 2,
						}),
						section: sharedBlockSection,
						sepRenderer: svg.lineFactory({
							'stroke': '#000000',
							'stroke-width': 1.5,
							'stroke-dasharray': '4, 2',
						}),
					},
				},
				notes: {
					'text': {
						margin: {top: 0, left: 2, right: 2, bottom: 0},
						padding: {top: 2, left: 2, right: 2, bottom: 2},
						overlap: {left: 10, right: 10},
						boxRenderer: svg.boxFactory({
							'fill': '#FFFFFF',
						}),
						labelAttrs: NOTE_ATTRS$3,
					},
					'note': {
						margin: {top: 0, left: 5, right: 5, bottom: 0},
						padding: {top: 5, left: 5, right: 10, bottom: 5},
						overlap: {left: 10, right: 10},
						boxRenderer: svg.noteFactory({
							'fill': '#FFFFFF',
							'stroke': '#000000',
							'stroke-width': 1,
						}, {
							'fill': 'none',
							'stroke': '#000000',
							'stroke-width': 1,
						}),
						labelAttrs: NOTE_ATTRS$3,
					},
					'state': {
						margin: {top: 0, left: 5, right: 5, bottom: 0},
						padding: {top: 7, left: 7, right: 7, bottom: 7},
						overlap: {left: 10, right: 10},
						boxRenderer: svg.boxFactory({
							'fill': '#FFFFFF',
							'stroke': '#000000',
							'stroke-width': 1,
							'rx': 10,
							'ry': 10,
						}),
						labelAttrs: NOTE_ATTRS$3,
					},
				},
				dividers: {
					'': {
						labelAttrs: DIVIDER_LABEL_ATTRS$3,
						padding: {top: 2, left: 5, right: 5, bottom: 2},
						extend: 0,
						margin: 0,
						render: () => ({}),
					},
					'line': {
						labelAttrs: DIVIDER_LABEL_ATTRS$3,
						padding: {top: 2, left: 5, right: 5, bottom: 2},
						extend: 10,
						margin: 0,
						render: this.renderLineDivider.bind(this, {
							lineAttrs: {
								'stroke': '#000000',
							},
						}),
					},
					'delay': {
						labelAttrs: DIVIDER_LABEL_ATTRS$3,
						padding: {top: 2, left: 5, right: 5, bottom: 2},
						extend: 0,
						margin: 0,
						render: this.renderDelayDivider.bind(this, {
							dotSize: 1,
							gapSize: 2,
						}),
					},
					'tear': {
						labelAttrs: DIVIDER_LABEL_ATTRS$3,
						padding: {top: 2, left: 5, right: 5, bottom: 2},
						extend: 10,
						margin: 10,
						render: this.renderTearDivider.bind(this, {
							fadeBegin: 5,
							fadeSize: 10,
							zigWidth: 6,
							zigHeight: 1,
							lineAttrs: {
								'stroke': '#000000',
							},
						}),
					},
				},
			});

			this.addConnectLine('solid', {attrs: {
				'stroke': '#000000',
				'stroke-width': 1,
			}});
			this.addConnectLine('dash', {attrs: {
				'stroke-dasharray': '4, 2',
			}});
			this.addConnectLine('wave', {
				attrs: {
					'stroke-linejoin': 'round',
					'stroke-linecap': 'round',
				},
				pattern: new WavePattern(6, 0.5),
			});
		}
	}

	class Factory$3 {
		constructor() {
			this.name = 'basic';
		}

		build(svg) {
			return new BasicTheme(svg);
		}
	}

	/* eslint-disable sort-keys */ // Maybe later

	const FONT$2 = 'Helvetica,Arial,Liberation Sans,sans-serif';
	const LINE_HEIGHT$2 = 1.3;

	const NOTE_ATTRS$2 = {
		'font-family': FONT$2,
		'font-size': 8,
		'line-height': LINE_HEIGHT$2,
	};

	const DIVIDER_LABEL_ATTRS$2 = {
		'font-family': FONT$2,
		'font-size': 8,
		'line-height': LINE_HEIGHT$2,
		'text-anchor': 'middle',
	};

	class ChunkyTheme extends BaseTheme {
		constructor(svg) {
			super(svg, {
				'font-family': FONT$2,
				'font-size': 8,
				'line-height': LINE_HEIGHT$2,
			});

			const sharedBlockSection = {
				padding: {
					top: 3,
					bottom: 4,
				},
				tag: {
					padding: {
						top: 2,
						left: 5,
						right: 5,
						bottom: 1,
					},
					boxRenderer: this.renderTag.bind(this, {
						'fill': '#FFFFFF',
						'stroke': '#000000',
						'stroke-width': 2,
						'rx': 3,
						'ry': 3,
					}),
					labelAttrs: {
						'font-family': FONT$2,
						'font-weight': 'bold',
						'font-size': 9,
						'line-height': LINE_HEIGHT$2,
						'text-anchor': 'left',
					},
				},
				label: {
					minHeight: 5,
					padding: {
						top: 2,
						left: 5,
						right: 3,
						bottom: 1,
					},
					labelAttrs: {
						'font-family': FONT$2,
						'font-size': 8,
						'line-height': LINE_HEIGHT$2,
						'text-anchor': 'left',
					},
				},
			};

			Object.assign(this, {
				titleMargin: 12,
				outerMargin: 5,
				agentMargin: 8,
				actionMargin: 5,
				minActionMargin: 5,
				agentLineActivationRadius: 4,

				agentCap: {
					box: {
						padding: {
							top: 1,
							left: 3,
							right: 3,
							bottom: 1,
						},
						arrowBottom: 2 + 14 * 1.3 / 2,
						boxAttrs: {
							'fill': '#FFFFFF',
							'stroke': '#000000',
							'stroke-width': 3,
							'rx': 4,
							'ry': 4,
						},
						labelAttrs: {
							'font-family': FONT$2,
							'font-weight': 'bold',
							'font-size': 14,
							'line-height': LINE_HEIGHT$2,
							'text-anchor': 'middle',
						},
					},
					person: {
						padding: {
							top: 16,
							left: 3,
							right: 3,
							bottom: 1,
						},
						arrowBottom: 2 + 14 * 1.3 / 2,
						boxRenderer: this.renderPerson.bind(this, {
							iconHeight: 15,
							iconWidth: 18,
						}, {
							'fill': '#000000',
						}, {
							'fill': '#FFFFFF',
							'stroke': '#000000',
							'stroke-width': 3,
							'rx': 4,
							'ry': 4,
						}),
						labelAttrs: {
							'font-family': FONT$2,
							'font-weight': 'bold',
							'font-size': 14,
							'line-height': LINE_HEIGHT$2,
							'text-anchor': 'middle',
						},
					},
					database: {
						padding: {
							top: 4,
							left: 3,
							right: 3,
							bottom: 0,
						},
						arrowBottom: 2 + 14 * 1.3 / 2,
						boxRenderer: this.renderDB.bind(this, {tilt: 2}, {
							'fill': '#FFFFFF',
							'stroke': '#000000',
							'stroke-width': 3,
						}),
						labelAttrs: {
							'font-family': FONT$2,
							'font-weight': 'bold',
							'font-size': 14,
							'line-height': LINE_HEIGHT$2,
							'text-anchor': 'middle',
						},
					},
					cross: {
						size: 20,
						render: svg.crossFactory({
							'fill': 'none',
							'stroke': '#000000',
							'stroke-width': 3,
							'stroke-linecap': 'round',
						}),
					},
					bar: {
						height: 4,
						render: svg.boxFactory({
							'fill': '#000000',
							'stroke': '#000000',
							'stroke-width': 3,
							'rx': 2,
							'ry': 2,
						}),
					},
					fade: {
						width: 5,
						height: 10,
						extend: 1,
					},
					none: {
						height: 10,
					},
				},

				connect: {
					loopbackRadius: 8,
					arrow: {
						'single': {
							width: 10,
							height: 12,
							render: this.renderArrowHead.bind(this),
							attrs: {
								'fill': '#000000',
								'stroke': '#000000',
								'stroke-width': 3,
								'stroke-linejoin': 'round',
							},
						},
						'double': {
							width: 10,
							height: 12,
							render: this.renderArrowHead.bind(this),
							attrs: {
								'fill': 'none',
								'stroke': '#000000',
								'stroke-width': 3,
								'stroke-linejoin': 'round',
								'stroke-linecap': 'round',
							},
						},
						'fade': {
							short: 3,
							size: 12,
						},
						'cross': {
							short: 10,
							radius: 5,
							render: svg.crossFactory({
								'fill': 'none',
								'stroke': '#000000',
								'stroke-width': 3,
								'stroke-linejoin': 'round',
								'stroke-linecap': 'round',
							}),
						},
					},
					label: {
						padding: 7,
						margin: {top: 2, bottom: 3},
						attrs: {
							'font-family': FONT$2,
							'font-size': 8,
							'line-height': LINE_HEIGHT$2,
							'text-anchor': 'middle',
						},
						loopbackAttrs: {
							'font-family': FONT$2,
							'font-size': 8,
							'line-height': LINE_HEIGHT$2,
						},
					},
					source: {
						radius: 5,
						render: svg.circleFactory({
							'fill': '#000000',
							'stroke': '#000000',
							'stroke-width': 3,
						}),
					},
					mask: {
						padding: {
							top: 1,
							left: 5,
							right: 5,
							bottom: 3,
						},
					},
				},

				agentLineAttrs: {
					'': {
						'fill': 'none',
						'stroke': '#000000',
						'stroke-width': 3,
					},
					'red': {
						'stroke': '#DD0000',
					},
				},
				blocks: {
					'ref': {
						margin: {
							top: 0,
							bottom: 0,
						},
						boxRenderer: this.renderRef.bind(this, {
							'fill': '#FFFFFF',
							'stroke': '#000000',
							'stroke-width': 4,
							'rx': 5,
							'ry': 5,
						}),
						section: sharedBlockSection,
					},
					'': {
						margin: {
							top: 0,
							bottom: 0,
						},
						boxRenderer: svg.boxFactory({
							'fill': 'none',
							'stroke': '#000000',
							'stroke-width': 4,
							'rx': 5,
							'ry': 5,
						}),
						collapsedBoxRenderer: this.renderRef.bind(this, {
							'fill': '#FFFFFF',
							'stroke': '#000000',
							'stroke-width': 4,
							'rx': 5,
							'ry': 5,
						}),
						section: sharedBlockSection,
						sepRenderer: svg.lineFactory({
							'stroke': '#000000',
							'stroke-width': 2,
							'stroke-dasharray': '5, 3',
						}),
					},
				},
				notes: {
					'text': {
						margin: {top: 0, left: 2, right: 2, bottom: 0},
						padding: {top: 2, left: 2, right: 2, bottom: 2},
						overlap: {left: 10, right: 10},
						boxRenderer: svg.boxFactory({
							'fill': '#FFFFFF',
						}),
						labelAttrs: NOTE_ATTRS$2,
					},
					'note': {
						margin: {top: 0, left: 5, right: 5, bottom: 0},
						padding: {top: 3, left: 3, right: 10, bottom: 3},
						overlap: {left: 10, right: 10},
						boxRenderer: svg.noteFactory({
							'fill': '#FFFFFF',
							'stroke': '#000000',
							'stroke-width': 2,
							'stroke-linejoin': 'round',
						}, {
							'fill': 'none',
							'stroke': '#000000',
							'stroke-width': 1,
						}),
						labelAttrs: NOTE_ATTRS$2,
					},
					'state': {
						margin: {top: 0, left: 5, right: 5, bottom: 0},
						padding: {top: 5, left: 7, right: 7, bottom: 5},
						overlap: {left: 10, right: 10},
						boxRenderer: svg.boxFactory({
							'fill': '#FFFFFF',
							'stroke': '#000000',
							'stroke-width': 3,
							'rx': 10,
							'ry': 10,
						}),
						labelAttrs: NOTE_ATTRS$2,
					},
				},
				dividers: {
					'': {
						labelAttrs: DIVIDER_LABEL_ATTRS$2,
						padding: {top: 2, left: 5, right: 5, bottom: 2},
						extend: 0,
						margin: 0,
						render: () => ({}),
					},
					'line': {
						labelAttrs: DIVIDER_LABEL_ATTRS$2,
						padding: {top: 2, left: 5, right: 5, bottom: 2},
						extend: 10,
						margin: 0,
						render: this.renderLineDivider.bind(this, {
							lineAttrs: {
								'stroke': '#000000',
								'stroke-width': 2,
								'stroke-linecap': 'round',
							},
						}),
					},
					'delay': {
						labelAttrs: DIVIDER_LABEL_ATTRS$2,
						padding: {top: 2, left: 5, right: 5, bottom: 2},
						extend: 0,
						margin: 0,
						render: this.renderDelayDivider.bind(this, {
							dotSize: 3,
							gapSize: 3,
						}),
					},
					'tear': {
						labelAttrs: DIVIDER_LABEL_ATTRS$2,
						padding: {top: 2, left: 5, right: 5, bottom: 2},
						extend: 10,
						margin: 10,
						render: this.renderTearDivider.bind(this, {
							fadeBegin: 5,
							fadeSize: 10,
							zigWidth: 6,
							zigHeight: 1,
							lineAttrs: {
								'stroke': '#000000',
								'stroke-width': 2,
								'stroke-linejoin': 'round',
							},
						}),
					},
				},
			});

			this.addConnectLine('solid', {attrs: {
				'stroke': '#000000',
				'stroke-width': 3,
			}});
			this.addConnectLine('dash', {attrs: {
				'stroke-dasharray': '10, 4',
			}});
			this.addConnectLine('wave', {
				attrs: {
					'stroke-linejoin': 'round',
					'stroke-linecap': 'round',
				},
				pattern: new WavePattern(10, 1),
			});
		}

		getTitleAttrs() {
			return Object.assign(super.getTitleAttrs(), {
				'font-weight': 'bolder',
			});
		}
	}

	class Factory$2 {
		constructor() {
			this.name = 'chunky';
		}

		build(svg) {
			return new ChunkyTheme(svg);
		}
	}

	class EventObject {
		constructor() {
			this.listeners = new Map();
			this.forwards = new Set();
		}

		addEventListener(type, callback) {
			const l = this.listeners.get(type);
			if(l) {
				l.push(callback);
			} else {
				this.listeners.set(type, [callback]);
			}
		}

		removeEventListener(type, fn) {
			const l = this.listeners.get(type);
			if(!l) {
				return;
			}
			const i = l.indexOf(fn);
			if(i !== -1) {
				l.splice(i, 1);
			}
		}

		on(type, fn) {
			this.addEventListener(type, fn);
			return this;
		}

		off(type, fn) {
			this.removeEventListener(type, fn);
			return this;
		}

		countEventListeners(type) {
			return (this.listeners.get(type) || []).length;
		}

		removeAllEventListeners(type) {
			if(type) {
				this.listeners.delete(type);
			} else {
				this.listeners.clear();
			}
		}

		addEventForwarding(target) {
			this.forwards.add(target);
		}

		removeEventForwarding(target) {
			this.forwards.delete(target);
		}

		removeAllEventForwardings() {
			this.forwards.clear();
		}

		trigger(type, params = []) {
			(this.listeners.get(type) || []).forEach(
				(listener) => listener(...params)
			);
			this.forwards.forEach((fwd) => fwd.trigger(type, params));
		}
	}

	const nodejs = (typeof window === 'undefined');

	// Thanks, https://stackoverflow.com/a/23522755/1180785
	const safari = (
		!nodejs &&
		(/^((?!chrome|android).)*safari/i).test(window.navigator.userAgent)
	);

	// Thanks, https://stackoverflow.com/a/9851769/1180785
	const firefox = (
		!nodejs &&
		typeof window.InstallTrigger !== 'undefined'
	);

	const FIRST_SVG_TAG = /<svg ?/;

	class Exporter {
		constructor() {
			this.latestSVG = null;
			this.latestInternalSVG = null;
			this.canvas = null;
			this.context = null;
			this.indexPNG = 0;
			this.latestPNGIndex = 0;
			this.latestPNG = null;
		}

		getSVGContent(renderer) {
			let code = renderer.dom().outerHTML;

			/*
			 * Firefox fails to render SVGs as <img> unless they have size
			 * attributes on the <svg> tag, so we must set this when
			 * exporting from any environment, in case it is opened in FireFox
			 */
			code = code.replace(
				FIRST_SVG_TAG,
				'<svg width="' + (renderer.width || 1) +
				'" height="' + (renderer.height || 1) + '" '
			);

			return '<?xml version="1.0" encoding="UTF-8" ?>' + code;
		}

		getSVGBlob(renderer) {
			return new Blob(
				[this.getSVGContent(renderer)],
				{type: 'image/svg+xml'}
			);
		}

		getSVGURL(renderer) {
			const blob = this.getSVGBlob(renderer);
			if(this.latestSVG) {
				URL.revokeObjectURL(this.latestSVG);
			}
			this.latestSVG = URL.createObjectURL(blob);
			return this.latestSVG;
		}

		getCanvas(renderer, resolution, callback) {
			if(!this.canvas) {
				window.devicePixelRatio = 1;
				this.canvas = document.createElement('canvas');
				this.context = this.canvas.getContext('2d');
			}

			const width = (renderer.width || 1) * resolution;
			const height = (renderer.height || 1) * resolution;
			const img = new Image(width, height);
			let safariHackaround = null;
			if(safari) {
				/*
				 * Safari fails to resize SVG images unless they are displayed
				 * on the page somewhere, so we must add it before drawing the
				 * image. For some reason, doing this inside the load listener
				 * is too late, so we do it here and do our best to ensure it
				 * doesn't change the page rendering (display:none fails too)
				 */
				safariHackaround = document.createElement('div');
				safariHackaround.style.position = 'absolute';
				safariHackaround.style.visibility = 'hidden';
				safariHackaround.appendChild(img);
				document.body.appendChild(safariHackaround);
			}

			const render = () => {
				this.canvas.width = width;
				this.canvas.height = height;
				this.context.drawImage(img, 0, 0, width, height);
				if(safariHackaround) {
					document.body.removeChild(safariHackaround);
				}
				callback(this.canvas);
			};

			img.addEventListener('load', () => {
				if(safariHackaround) {
					// Wait for custom fonts to load (Safari takes a moment)
					setTimeout(render, 50);
				} else {
					render();
				}
			}, {once: true});

			img.src = this.getSVGURL(renderer);
		}

		getPNGBlob(renderer, resolution, callback) {
			this.getCanvas(renderer, resolution, (canvas) => {
				canvas.toBlob(callback, 'image/png');
			});
		}

		getPNGURL(renderer, resolution, callback) {
			++ this.indexPNG;
			const index = this.indexPNG;

			this.getPNGBlob(renderer, resolution, (blob) => {
				const url = URL.createObjectURL(blob);
				const isLatest = index >= this.latestPNGIndex;
				if(isLatest) {
					if(this.latestPNG) {
						URL.revokeObjectURL(this.latestPNG);
					}
					this.latestPNG = url;
					this.latestPNGIndex = index;
					callback(url, true);
				} else {
					callback(url, false);
					URL.revokeObjectURL(url);
				}
			});
		}
	}

	function indexOf(list, element, equalityCheck = null) {
		if(equalityCheck === null) {
			return list.indexOf(element);
		}
		for(let i = 0; i < list.length; ++ i) {
			if(equalityCheck(list[i], element)) {
				return i;
			}
		}
		return -1;
	}

	function mergeSets(target, b = null, equalityCheck = null) {
		if(!b) {
			return;
		}
		for(let i = 0; i < b.length; ++ i) {
			if(indexOf(target, b[i], equalityCheck) === -1) {
				target.push(b[i]);
			}
		}
	}

	function hasIntersection(a, b, equalityCheck = null) {
		for(let i = 0; i < b.length; ++ i) {
			if(indexOf(a, b[i], equalityCheck) !== -1) {
				return true;
			}
		}
		return false;
	}

	function removeAll(target, b = null, equalityCheck = null) {
		if(!b) {
			return;
		}
		for(let i = 0; i < b.length; ++ i) {
			const p = indexOf(target, b[i], equalityCheck);
			if(p !== -1) {
				target.splice(p, 1);
			}
		}
	}

	function remove(list, item, equalityCheck = null) {
		const p = indexOf(list, item, equalityCheck);
		if(p !== -1) {
			list.splice(p, 1);
		}
	}

	function last(list) {
		return list[list.length - 1];
	}

	function combineRecur(parts, position, current, target) {
		if(position >= parts.length) {
			target.push(current.slice());
			return;
		}
		const choices = parts[position];
		if(!Array.isArray(choices)) {
			current.push(choices);
			combineRecur(parts, position + 1, current, target);
			current.pop();
			return;
		}
		for(let i = 0; i < choices.length; ++ i) {
			current.push(choices[i]);
			combineRecur(parts, position + 1, current, target);
			current.pop();
		}
	}

	function combine(parts) {
		const target = [];
		combineRecur(parts, 0, [], target);
		return target;
	}

	function flatMap(list, fn) {
		const result = [];
		list.forEach((item) => {
			result.push(...fn(item));
		});
		return result;
	}

	/* eslint-disable max-lines */

	class AgentState {
		constructor({
			blocked = false,
			covered = false,
			group = null,
			activated = false,
			locked = false,
			visible = false,
		} = {}) {
			this.blocked = blocked;
			this.covered = covered;
			this.group = group;
			this.activated = activated;
			this.locked = locked;
			this.visible = visible;
		}
	}
	AgentState.LOCKED = new AgentState({locked: true});
	AgentState.DEFAULT = new AgentState();

	// Agent from Parser: {name, flags}
	const PAgent = {
		equals: (a, b) => (a.name === b.name),
		hasFlag: (flag, has = true) => (pAgent) => (
			pAgent.flags.includes(flag) === has),
	};

	// Agent from Generator: {id, formattedLabel, anchorRight}
	const GAgent = {
		addNearby: (target, reference, item, offset) => {
			const p = indexOf(target, reference, GAgent.equals);
			if(p === -1) {
				target.push(item);
			} else {
				target.splice(p + offset, 0, item);
			}
		},
		equals: (a, b) => (a.id === b.id),
		hasIntersection: (a, b) => hasIntersection(a, b, GAgent.equals),
		indexOf: (list, gAgent) => indexOf(list, gAgent, GAgent.equals),
		make: (id, {anchorRight = false, isVirtualSource = false} = {}) => ({
			anchorRight,
			id,
			isVirtualSource,
			options: [],
		}),
	};

	function isExpiredGroupAlias(state) {
		return state.blocked && state.group === null;
	}

	function isReservedAgentName(name) {
		return name.startsWith('__');
	}

	const NOTE_DEFAULT_G_AGENTS = {
		'note left': [GAgent.make('[')],
		'note over': [GAgent.make('['), GAgent.make(']')],
		'note right': [GAgent.make(']')],
	};

	const SPECIAL_AGENT_IDS = ['[', ']'];

	const MERGABLE = {
		'agent activation': {
			check: ['activated'],
			merge: ['agentIDs'],
			siblings: new Set(['agent begin', 'agent end']),
		},
		'agent begin': {
			check: ['mode'],
			merge: ['agentIDs'],
			siblings: new Set(['agent activation']),
		},
		'agent end': {
			check: ['mode'],
			merge: ['agentIDs'],
			siblings: new Set(['agent activation']),
		},
	};

	function mergableParallel(target, copy) {
		const info = MERGABLE[target.type];
		if(!info || target.type !== copy.type) {
			return false;
		}
		if(info.check.some((c) => target[c] !== copy[c])) {
			return false;
		}
		return true;
	}

	function performMerge(target, copy) {
		const info = MERGABLE[target.type];
		info.merge.forEach((m) => {
			mergeSets(target[m], copy[m]);
		});
	}

	function iterateRemoval(list, fn) {
		for(let i = 0; i < list.length;) {
			const rm = fn(list[i], i);
			if(rm) {
				list.splice(i, 1);
			} else {
				++ i;
			}
		}
	}

	function performParallelMergers(stages) {
		iterateRemoval(stages, (stage, i) => {
			for(let j = 0; j < i; ++ j) {
				if(mergableParallel(stages[j], stage)) {
					performMerge(stages[j], stage);
					return true;
				}
			}
			return false;
		});
	}

	function findViableSequentialMergers(stages) {
		const mergers = new Set();
		const types = stages.map(({type}) => type);
		types.forEach((type) => {
			const info = MERGABLE[type];
			if(!info) {
				return;
			}
			if(types.every((t) => (type === t || info.siblings.has(t)))) {
				mergers.add(type);
			}
		});
		return mergers;
	}

	function performSequentialMergers(lastViable, viable, lastStages, stages) {
		iterateRemoval(stages, (stage) => {
			if(!lastViable.has(stage.type) || !viable.has(stage.type)) {
				return false;
			}
			for(let j = 0; j < lastStages.length; ++ j) {
				if(mergableParallel(lastStages[j], stage)) {
					performMerge(lastStages[j], stage);
					return true;
				}
			}
			return false;
		});
	}

	function optimiseStages(stages) {
		let lastStages = [];
		let lastViable = new Set();
		for(let i = 0; i < stages.length;) {
			const stage = stages[i];
			let subStages = null;
			if(stage.type === 'parallel') {
				subStages = stage.stages;
			} else {
				subStages = [stage];
			}

			performParallelMergers(subStages);
			const viable = findViableSequentialMergers(subStages);
			performSequentialMergers(lastViable, viable, lastStages, subStages);

			if(subStages.length === 0) {
				stages.splice(i, 1);
			} else {
				if(stage.type === 'parallel' && subStages.length === 1) {
					stages.splice(i, 1, subStages[0]);
				}
				lastViable = viable;
				lastStages = subStages;
				++ i;
			}
		}
	}

	function extractParallel(target, stages) {
		for(const stage of stages) {
			if(!stage) {
				continue;
			}
			if(stage.type === 'parallel') {
				extractParallel(target, stage.stages);
			} else {
				target.push(stage);
			}
		}
	}

	function checkAgentConflicts(allStages) {
		const createIDs = flatMap(
			allStages
				.filter((stage) => (stage.type === 'agent begin')),
			(stage) => stage.agentIDs
		);

		for(const stage of allStages) {
			if(stage.type !== 'agent end') {
				continue;
			}
			for(const id of stage.agentIDs) {
				if(createIDs.indexOf(id) !== -1) {
					return 'Cannot create and destroy ' + id + ' simultaneously';
				}
			}
		}
		return null;
	}

	function checkReferenceConflicts(allStages) {
		const count = allStages
			.filter((stage) => (
				stage.type === 'block begin' ||
				stage.type === 'block end'
			))
			.length;

		if(!count) {
			return null;
		} else if(count !== allStages.length) {
			return 'Cannot use parallel here';
		}

		const leftIDs = allStages
			.filter((stage) => (stage.type === 'block begin'))
			.map((stage) => stage.left);

		for(const stage of allStages) {
			if(stage.type !== 'block end') {
				continue;
			}
			if(leftIDs.indexOf(stage.left) !== -1) {
				return 'Cannot create and destroy reference simultaneously';
			}
		}
		return null;
	}

	function checkDelayedConflicts(allStages) {
		const tags = allStages
			.filter((stage) => (stage.type === 'connect-delay-begin'))
			.map((stage) => stage.tag);

		for(const stage of allStages) {
			if(stage.type !== 'connect-delay-end') {
				continue;
			}
			if(tags.indexOf(stage.tag) !== -1) {
				return 'Cannot start and finish delayed connection simultaneously';
			}
		}
		return null;
	}

	function checkActivationConflicts(allStages) {
		const seen = new Set();
		for(const stage of allStages) {
			if(stage.type !== 'agent activation') {
				continue;
			}
			for(const agentID of stage.agentIDs) {
				if(seen.has(agentID)) {
					return 'Conflicting agent activation';
				}
				seen.add(agentID);
			}
		}
		return null;
	}

	const PARALLEL_STAGES = [
		'agent begin',
		'agent end',
		'agent activation',
		'block begin',
		'block end',
		'connect',
		'connect-delay-begin',
		'connect-delay-end',
		'note over',
		'note right',
		'note left',
		'note between',
	];

	function errorForParallel(existing, latest) {
		if(!existing) {
			return 'Nothing to run statement in parallel with';
		}

		const allStages = [];
		extractParallel(allStages, [existing]);
		extractParallel(allStages, [latest]);

		if(allStages.some((stage) => !PARALLEL_STAGES.includes(stage.type))) {
			return 'Cannot use parallel here';
		}
		return (
			checkAgentConflicts(allStages) ||
			checkReferenceConflicts(allStages) ||
			checkDelayedConflicts(allStages) ||
			checkActivationConflicts(allStages)
		);
	}

	function swapBegin(stage, mode) {
		if(stage.type === 'agent begin') {
			stage.mode = mode;
			return true;
		}
		if(stage.type === 'parallel') {
			let any = false;
			stage.stages.forEach((subStage) => {
				if(subStage.type === 'agent begin') {
					subStage.mode = mode;
					any = true;
				}
			});
			return any;
		}
		return false;
	}

	function swapFirstBegin(stages, mode) {
		for(let i = 0; i < stages.length; ++ i) {
			if(swapBegin(stages[i], mode)) {
				break;
			}
		}
	}

	function addBounds(allGAgents, gAgentL, gAgentR, involvedGAgents = null) {
		remove(allGAgents, gAgentL, GAgent.equals);
		remove(allGAgents, gAgentR, GAgent.equals);

		let indexL = 0;
		let indexR = allGAgents.length;
		if(involvedGAgents) {
			const found = (involvedGAgents
				.map((gAgent) => GAgent.indexOf(allGAgents, gAgent))
				.filter((p) => (p !== -1))
			);
			indexL = found.reduce((a, b) => Math.min(a, b), allGAgents.length);
			indexR = found.reduce((a, b) => Math.max(a, b), indexL) + 1;
		}

		allGAgents.splice(indexL, 0, gAgentL);
		allGAgents.splice(indexR + 1, 0, gAgentR);

		return {indexL, indexR: indexR + 1};
	}

	class Generator {
		constructor() {
			this.agentStates = new Map();
			this.agentAliases = new Map();
			this.activeGroups = new Map();
			this.gAgents = [];
			this.labelPattern = null;
			this.nextID = 0;
			this.nesting = [];
			this.markers = new Set();
			this.currentSection = null;
			this.currentNest = null;

			this.stageHandlers = {
				'agent activation': this.handleAgentActivation.bind(this),
				'agent begin': this.handleAgentBegin.bind(this),
				'agent define': this.handleAgentDefine.bind(this),
				'agent end': this.handleAgentEnd.bind(this),
				'agent options': this.handleAgentOptions.bind(this),
				'async': this.handleAsync.bind(this),
				'block begin': this.handleBlockBegin.bind(this),
				'block end': this.handleBlockEnd.bind(this),
				'block split': this.handleBlockSplit.bind(this),
				'connect': this.handleConnect.bind(this),
				'connect-delay-begin': this.handleConnectDelayBegin.bind(this),
				'connect-delay-end': this.handleConnectDelayEnd.bind(this),
				'divider': this.handleDivider.bind(this),
				'group begin': this.handleGroupBegin.bind(this),
				'label pattern': this.handleLabelPattern.bind(this),
				'mark': this.handleMark.bind(this),
				'note between': this.handleNote.bind(this),
				'note left': this.handleNote.bind(this),
				'note over': this.handleNote.bind(this),
				'note right': this.handleNote.bind(this),
			};
			this.expandGroupedGAgent = this.expandGroupedGAgent.bind(this);
			this.handleStage = this.handleStage.bind(this);
			this.toGAgent = this.toGAgent.bind(this);
			this.endGroup = this.endGroup.bind(this);
		}

		_aliasInUse(alias) {
			const old = this.agentAliases.get(alias);
			if(old && old !== alias) {
				return true;
			}
			return this.gAgents.some((gAgent) => (gAgent.id === alias));
		}

		toGAgent({name, alias, flags}) {
			if(alias) {
				if(this.agentAliases.has(name)) {
					throw new Error(
						'Cannot alias ' + name + '; it is already an alias'
					);
				}
				if(this._aliasInUse(alias)) {
					throw new Error(
						'Cannot use ' + alias +
						' as an alias; it is already in use'
					);
				}
				this.agentAliases.set(alias, name);
			}
			return GAgent.make(this.agentAliases.get(name) || name, {
				isVirtualSource: flags.includes('source'),
			});
		}

		addStage(stage, {isVisible = true, parallel = false} = {}) {
			if(!stage) {
				return;
			}
			if(isVisible) {
				this.currentNest.hasContent = true;
			}
			if(typeof stage.ln === 'undefined') {
				stage.ln = this.latestLine;
			}
			const {stages} = this.currentSection;
			if(parallel) {
				const target = last(stages);
				const err = errorForParallel(target, stage);
				if(err) {
					throw new Error(err);
				}
				const pstage = this.makeParallel([target, stage]);
				pstage.ln = stage.ln;
				-- stages.length;
				stages.push(pstage);
			} else {
				stages.push(stage);
			}
		}

		addImpStage(stage, {parallel = false} = {}) {
			if(!stage) {
				return;
			}
			if(typeof stage.ln === 'undefined') {
				stage.ln = this.latestLine;
			}
			const {stages} = this.currentSection;
			if(parallel) {
				const target = stages[stages.length - 2];
				if(stages.length === 0) {
					throw new Error('Nothing to run statement in parallel with');
				}
				if(errorForParallel(target, stage)) {
					stages.splice(stages.length - 1, 0, stage);
				} else {
					const pstage = this.makeParallel([target, stage]);
					pstage.ln = stage.ln;
					stages.splice(stages.length - 2, 1, pstage);
				}
			} else {
				stages.push(stage);
			}
		}

		makeParallel(stages) {
			const viableStages = [];
			extractParallel(viableStages, stages);
			if(viableStages.length === 0) {
				return null;
			}
			if(viableStages.length === 1) {
				return viableStages[0];
			}
			viableStages.forEach((stage) => {
				if(typeof stage.ln === 'undefined') {
					stage.ln = this.latestLine;
				}
			});
			return {
				stages: viableStages,
				type: 'parallel',
			};
		}

		defineGAgents(gAgents) {
			mergeSets(
				this.currentNest.gAgents,
				gAgents.filter((gAgent) => !SPECIAL_AGENT_IDS.includes(gAgent.id)),
				GAgent.equals
			);
			mergeSets(this.gAgents, gAgents, GAgent.equals);
		}

		getGAgentState(gAgent) {
			return this.agentStates.get(gAgent.id) || AgentState.DEFAULT;
		}

		updateGAgentState(gAgent, change) {
			const state = this.agentStates.get(gAgent.id);
			if(state) {
				Object.assign(state, change);
			} else {
				this.agentStates.set(gAgent.id, new AgentState(change));
			}
		}

		replaceGAgentState(gAgent, state) {
			this.agentStates.set(gAgent.id, state);
		}

		validateGAgents(gAgents, {
			allowGrouped = false,
			allowCovered = false,
			allowVirtual = false,
		} = {}) {
			/* eslint-disable-next-line complexity */ // The checks are quite simple
			gAgents.forEach((gAgent) => {
				const state = this.getGAgentState(gAgent);
				const name = gAgent.id;

				if(isExpiredGroupAlias(state)) {
					// Used to be a group alias; can never be reused
					throw new Error('Duplicate agent name: ' + name);
				}
				if(!allowCovered && state.covered) {
					throw new Error('Agent ' + name + ' is hidden behind group');
				}
				if(!allowGrouped && state.group !== null) {
					throw new Error('Agent ' + name + ' is in a group');
				}
				if(!allowVirtual && gAgent.isVirtualSource) {
					throw new Error('Cannot use message source here');
				}
				if(isReservedAgentName(name)) {
					throw new Error(name + ' is a reserved name');
				}
			});
		}

		setGAgentVis(gAgents, visible, mode, checked = false) {
			const seen = new Set();
			const filteredGAgents = gAgents.filter((gAgent) => {
				if(seen.has(gAgent.id)) {
					return false;
				}
				seen.add(gAgent.id);
				const state = this.getGAgentState(gAgent);
				if(state.locked || state.blocked) {
					if(checked) {
						throw new Error('Cannot begin/end agent: ' + gAgent.id);
					} else {
						return false;
					}
				}
				return state.visible !== visible;
			});
			if(filteredGAgents.length === 0) {
				return null;
			}
			filteredGAgents.forEach((gAgent) => {
				this.updateGAgentState(gAgent, {visible});
			});
			this.defineGAgents(filteredGAgents);

			return {
				agentIDs: filteredGAgents.map((gAgent) => gAgent.id),
				mode,
				type: (visible ? 'agent begin' : 'agent end'),
			};
		}

		setGAgentActivation(gAgents, activated, checked = false) {
			const filteredGAgents = gAgents.filter((gAgent) => {
				const state = this.getGAgentState(gAgent);
				if(state.locked || state.blocked) {
					if(checked) {
						throw new Error('Cannot activate agent: ' + gAgent.id);
					} else {
						return false;
					}
				}
				return state.visible && (state.activated !== activated);
			});
			if(filteredGAgents.length === 0) {
				return null;
			}
			filteredGAgents.forEach((gAgent) => {
				this.updateGAgentState(gAgent, {activated});
			});

			return {
				activated,
				agentIDs: filteredGAgents.map((gAgent) => gAgent.id),
				type: 'agent activation',
			};
		}

		_makeSection(header, stages) {
			return {
				delayedConnections: new Map(),
				header,
				stages,
			};
		}

		_checkSectionEnd() {
			const dcs = this.currentSection.delayedConnections;
			if(dcs.size > 0) {
				const dc = dcs.values().next().value;
				throw new Error(
					'Unused delayed connection "' + dc.tag +
					'" at line ' + (dc.ln + 1)
				);
			}
		}

		beginNested(blockType, {tag, label, name, ln}) {
			const leftGAgent = GAgent.make(name + '[', {anchorRight: true});
			const rightGAgent = GAgent.make(name + ']');
			const gAgents = [leftGAgent, rightGAgent];
			const stages = [];
			this.currentSection = this._makeSection({
				blockType,
				canHide: true,
				label: this.textFormatter(label),
				left: leftGAgent.id,
				ln,
				right: rightGAgent.id,
				tag: this.textFormatter(tag),
				type: 'block begin',
			}, stages);
			this.currentNest = {
				blockType,
				gAgents,
				hasContent: false,
				leftGAgent,
				rightGAgent,
				sections: [this.currentSection],
			};
			this.replaceGAgentState(leftGAgent, AgentState.LOCKED);
			this.replaceGAgentState(rightGAgent, AgentState.LOCKED);
			this.nesting.push(this.currentNest);

			return {stages};
		}

		nextBlockName() {
			const name = '__BLOCK' + this.nextID;
			++ this.nextID;
			return name;
		}

		nextVirtualAgentName() {
			const name = '__' + this.nextID;
			++ this.nextID;
			return name;
		}

		handleBlockBegin({ln, blockType, tag, label, parallel}) {
			if(parallel) {
				throw new Error('Cannot use parallel here');
			}
			this.beginNested(blockType, {
				label,
				ln,
				name: this.nextBlockName(),
				tag,
			});
		}

		handleBlockSplit({ln, blockType, tag, label, parallel}) {
			if(parallel) {
				throw new Error('Cannot use parallel here');
			}
			if(this.currentNest.blockType !== 'if') {
				throw new Error(
					'Invalid block nesting ("else" inside ' +
					this.currentNest.blockType + ')'
				);
			}
			this._checkSectionEnd();
			this.currentSection = this._makeSection({
				blockType,
				label: this.textFormatter(label),
				left: this.currentNest.leftGAgent.id,
				ln,
				right: this.currentNest.rightGAgent.id,
				tag: this.textFormatter(tag),
				type: 'block split',
			}, []);
			this.currentNest.sections.push(this.currentSection);
		}

		handleBlockEnd({parallel}) {
			if(this.nesting.length <= 1) {
				throw new Error('Invalid block nesting (too many "end"s)');
			}
			this._checkSectionEnd();
			const nested = this.nesting.pop();
			this.currentNest = last(this.nesting);
			this.currentSection = last(this.currentNest.sections);

			if(!nested.hasContent) {
				throw new Error('Empty block');
			}

			this.defineGAgents(nested.gAgents);
			addBounds(
				this.gAgents,
				nested.leftGAgent,
				nested.rightGAgent,
				nested.gAgents
			);
			nested.sections.forEach((section) => {
				this.currentSection.stages.push(section.header);
				this.currentSection.stages.push(...section.stages);
			});
			this.addStage({
				left: nested.leftGAgent.id,
				right: nested.rightGAgent.id,
				type: 'block end',
			}, {parallel});
		}

		makeGroupDetails(pAgents, alias) {
			const gAgents = pAgents.map(this.toGAgent);
			this.validateGAgents(gAgents);
			if(this.agentStates.has(alias)) {
				throw new Error('Duplicate agent name: ' + alias);
			}
			const name = this.nextBlockName();
			const leftGAgent = GAgent.make(name + '[', {anchorRight: true});
			const rightGAgent = GAgent.make(name + ']');
			this.replaceGAgentState(leftGAgent, AgentState.LOCKED);
			this.replaceGAgentState(rightGAgent, AgentState.LOCKED);
			this.updateGAgentState(
				GAgent.make(alias),
				{blocked: true, group: alias}
			);
			this.defineGAgents([...gAgents, leftGAgent, rightGAgent]);
			const {indexL, indexR} = addBounds(
				this.gAgents,
				leftGAgent,
				rightGAgent,
				gAgents
			);

			const gAgentsCovered = [];
			const gAgentsContained = gAgents.slice();
			for(let i = indexL + 1; i < indexR; ++ i) {
				gAgentsCovered.push(this.gAgents[i]);
			}
			removeAll(gAgentsCovered, gAgentsContained, GAgent.equals);

			return {
				gAgents,
				gAgentsContained,
				gAgentsCovered,
				leftGAgent,
				rightGAgent,
			};
		}

		handleGroupBegin({agents, blockType, tag, label, alias, parallel}) {
			const details = this.makeGroupDetails(agents, alias);

			details.gAgentsContained.forEach((gAgent) => {
				this.updateGAgentState(gAgent, {group: alias});
			});
			details.gAgentsCovered.forEach((gAgent) => {
				this.updateGAgentState(gAgent, {covered: true});
			});
			this.activeGroups.set(alias, details);
			this.addImpStage(
				this.setGAgentVis(details.gAgents, true, 'box'),
				{parallel}
			);
			this.addStage({
				blockType,
				canHide: false,
				label: this.textFormatter(label),
				left: details.leftGAgent.id,
				right: details.rightGAgent.id,
				tag: this.textFormatter(tag),
				type: 'block begin',
			}, {parallel});
		}

		endGroup({name}) {
			const details = this.activeGroups.get(name);
			if(!details) {
				return null;
			}
			this.activeGroups.delete(name);

			details.gAgentsContained.forEach((gAgent) => {
				this.updateGAgentState(gAgent, {group: null});
			});
			details.gAgentsCovered.forEach((gAgent) => {
				this.updateGAgentState(gAgent, {covered: false});
			});
			this.updateGAgentState(GAgent.make(name), {group: null});

			return {
				left: details.leftGAgent.id,
				right: details.rightGAgent.id,
				type: 'block end',
			};
		}

		handleMark({name, parallel}) {
			this.markers.add(name);
			this.addStage({name, type: 'mark'}, {isVisible: false, parallel});
		}

		handleDivider({mode, height, label, parallel}) {
			this.addStage({
				formattedLabel: this.textFormatter(label),
				height,
				mode,
				type: 'divider',
			}, {isVisible: false, parallel});
		}

		handleAsync({target, parallel}) {
			if(target !== '' && !this.markers.has(target)) {
				throw new Error('Unknown marker: ' + target);
			}
			this.addStage({target, type: 'async'}, {isVisible: false, parallel});
		}

		handleLabelPattern({pattern}) {
			this.labelPattern = pattern.slice();
			for(let i = 0; i < this.labelPattern.length; ++ i) {
				const part = this.labelPattern[i];
				if(typeof part === 'object' && typeof part.start !== 'undefined') {
					this.labelPattern[i] = Object.assign({
						current: part.start,
					}, part);
				}
			}
		}

		applyLabelPattern(label) {
			let result = '';
			const tokens = {label};
			this.labelPattern.forEach((part) => {
				if(typeof part === 'string') {
					result += part;
				} else if(typeof part.token !== 'undefined') {
					result += tokens[part.token];
				} else if(typeof part.current !== 'undefined') {
					result += part.current.toFixed(part.dp);
					part.current += part.inc;
				}
			});
			return result;
		}

		expandGroupedGAgent(gAgent) {
			const {group} = this.getGAgentState(gAgent);
			if(!group) {
				return [gAgent];
			}
			const details = this.activeGroups.get(group);
			return [details.leftGAgent, details.rightGAgent];
		}

		expandGroupedGAgentConnection(gAgents) {
			const gAgents1 = this.expandGroupedGAgent(gAgents[0]);
			const gAgents2 = this.expandGroupedGAgent(gAgents[1]);
			let ind1 = GAgent.indexOf(this.gAgents, gAgents1[0]);
			let ind2 = GAgent.indexOf(this.gAgents, gAgents2[0]);
			if(ind1 === -1) {
				/*
				 * Virtual sources written as '* -> Ref' will spawn to the left,
				 * not the right (as non-virtual agents would)
				 */
				ind1 = gAgents1[0].isVirtualSource ? -1 : this.gAgents.length;
			}
			if(ind2 === -1) {
				/*
				 * Virtual and non-virtual agents written as 'Ref -> *' will
				 * spawn to the right
				 */
				ind2 = this.gAgents.length;
			}
			if(ind1 === ind2) {
				// Self-connection
				return [last(gAgents1), last(gAgents2)];
			} else if(ind1 < ind2) {
				return [last(gAgents1), gAgents2[0]];
			} else {
				return [gAgents1[0], last(gAgents2)];
			}
		}

		filterConnectFlags(pAgents) {
			const beginGAgents = (pAgents
				.filter(PAgent.hasFlag('begin'))
				.map(this.toGAgent)
			);
			const endGAgents = (pAgents
				.filter(PAgent.hasFlag('end'))
				.map(this.toGAgent)
			);
			if(GAgent.hasIntersection(beginGAgents, endGAgents)) {
				throw new Error('Cannot set agent visibility multiple times');
			}

			const startGAgents = (pAgents
				.filter(PAgent.hasFlag('start'))
				.map(this.toGAgent)
			);
			const stopGAgents = (pAgents
				.filter(PAgent.hasFlag('stop'))
				.map(this.toGAgent)
			);
			mergeSets(stopGAgents, endGAgents);
			if(GAgent.hasIntersection(startGAgents, stopGAgents)) {
				throw new Error('Cannot set agent activation multiple times');
			}

			this.validateGAgents(beginGAgents);
			this.validateGAgents(endGAgents);
			this.validateGAgents(startGAgents);
			this.validateGAgents(stopGAgents);

			return {beginGAgents, endGAgents, startGAgents, stopGAgents};
		}

		makeVirtualAgent(anchorRight) {
			const virtualGAgent = GAgent.make(this.nextVirtualAgentName(), {
				anchorRight,
				isVirtualSource: true,
			});
			this.replaceGAgentState(virtualGAgent, AgentState.LOCKED);
			return virtualGAgent;
		}

		addNearbyAgent(gAgentReference, gAgent, offset) {
			GAgent.addNearby(
				this.currentNest.gAgents,
				gAgentReference,
				gAgent,
				offset
			);
			GAgent.addNearby(
				this.gAgents,
				gAgentReference,
				gAgent,
				offset
			);
		}

		expandVirtualSourceAgents(gAgents) {
			if(gAgents[0].isVirtualSource) {
				if(gAgents[1].isVirtualSource) {
					throw new Error('Cannot connect found messages');
				}
				if(SPECIAL_AGENT_IDS.includes(gAgents[1].id)) {
					throw new Error(
						'Cannot connect found messages to special agents'
					);
				}
				const virtualGAgent = this.makeVirtualAgent(true);
				this.addNearbyAgent(gAgents[1], virtualGAgent, 0);
				return [virtualGAgent, gAgents[1]];
			}
			if(gAgents[1].isVirtualSource) {
				if(SPECIAL_AGENT_IDS.includes(gAgents[0].id)) {
					throw new Error(
						'Cannot connect found messages to special agents'
					);
				}
				const virtualGAgent = this.makeVirtualAgent(false);
				this.addNearbyAgent(gAgents[0], virtualGAgent, 1);
				return [gAgents[0], virtualGAgent];
			}
			return gAgents;
		}

		_handlePartialConnect(agents, parallel) {
			const flags = this.filterConnectFlags(agents);

			const gAgents = agents.map(this.toGAgent);
			this.validateGAgents(gAgents, {
				allowGrouped: true,
				allowVirtual: true,
			});

			this.defineGAgents(flatMap(gAgents, this.expandGroupedGAgent)
				.filter((gAgent) => !gAgent.isVirtualSource));

			const implicitBeginGAgents = (agents
				.filter(PAgent.hasFlag('begin', false))
				.map(this.toGAgent)
				.filter((gAgent) => !gAgent.isVirtualSource)
			);
			this.addImpStage(
				this.setGAgentVis(implicitBeginGAgents, true, 'box'),
				{parallel}
			);

			return {flags, gAgents};
		}

		_makeConnectParallelStages(flags, connectStage) {
			return this.makeParallel([
				this.setGAgentVis(flags.beginGAgents, true, 'box', true),
				this.setGAgentActivation(flags.startGAgents, true, true),
				connectStage,
				this.setGAgentActivation(flags.stopGAgents, false, true),
				this.setGAgentVis(flags.endGAgents, false, 'cross', true),
			]);
		}

		_isSelfConnect(agents) {
			const gAgents = agents.map(this.toGAgent);
			const expandedGAgents = this.expandGroupedGAgentConnection(gAgents);
			if(expandedGAgents[0].id !== expandedGAgents[1].id) {
				return false;
			}
			if(expandedGAgents.some((gAgent) => gAgent.isVirtualSource)) {
				return false;
			}
			return true;
		}

		handleConnect({agents, label, options, parallel}) {
			if(this._isSelfConnect(agents)) {
				const tag = {};
				this.handleConnectDelayBegin({
					agent: agents[0],
					ln: 0,
					options,
					parallel,
					tag,
				});
				this.handleConnectDelayEnd({
					agent: agents[1],
					label,
					options,
					tag,
				});
				return;
			}

			let {flags, gAgents} = this._handlePartialConnect(agents, parallel);

			gAgents = this.expandGroupedGAgentConnection(gAgents);
			gAgents = this.expandVirtualSourceAgents(gAgents);

			const connectStage = {
				agentIDs: gAgents.map((gAgent) => gAgent.id),
				label: this.textFormatter(this.applyLabelPattern(label)),
				options,
				type: 'connect',
			};

			this.addStage(
				this._makeConnectParallelStages(flags, connectStage),
				{parallel}
			);
		}

		handleConnectDelayBegin({agent, tag, options, ln, parallel}) {
			const dcs = this.currentSection.delayedConnections;
			if(dcs.has(tag)) {
				throw new Error('Duplicate delayed connection "' + tag + '"');
			}

			const {flags, gAgents} = this._handlePartialConnect([agent], parallel);
			const uniqueTag = this.nextVirtualAgentName();

			const connectStage = {
				agentIDs: null,
				label: null,
				options,
				tag: uniqueTag,
				type: 'connect-delay-begin',
			};

			dcs.set(tag, {connectStage, gAgents, ln, tag, uniqueTag});

			this.addStage(
				this._makeConnectParallelStages(flags, connectStage),
				{parallel}
			);
		}

		handleConnectDelayEnd({agent, tag, label, options, parallel}) {
			const dcs = this.currentSection.delayedConnections;
			const dcInfo = dcs.get(tag);
			if(!dcInfo) {
				throw new Error('Unknown delayed connection "' + tag + '"');
			}

			let {flags, gAgents} = this._handlePartialConnect([agent], parallel);

			gAgents = this.expandGroupedGAgentConnection([
				...dcInfo.gAgents,
				...gAgents,
			]);
			gAgents = this.expandVirtualSourceAgents(gAgents);

			let combinedOptions = dcInfo.connectStage.options;
			if(combinedOptions.line !== options.line) {
				throw new Error('Mismatched delayed connection arrows');
			}
			if(options.right) {
				combinedOptions = Object.assign({}, combinedOptions, {
					right: options.right,
				});
			}

			Object.assign(dcInfo.connectStage, {
				agentIDs: gAgents.map((gAgent) => gAgent.id),
				label: this.textFormatter(this.applyLabelPattern(label)),
				options: combinedOptions,
			});

			const connectEndStage = {
				tag: dcInfo.uniqueTag,
				type: 'connect-delay-end',
			};

			this.addStage(
				this._makeConnectParallelStages(flags, connectEndStage),
				{parallel}
			);

			dcs.delete(tag);
		}

		handleNote({type, agents, mode, label, parallel}) {
			let gAgents = null;
			if(agents.length === 0) {
				gAgents = NOTE_DEFAULT_G_AGENTS[type] || [];
			} else {
				gAgents = agents.map(this.toGAgent);
			}

			this.validateGAgents(gAgents, {allowGrouped: true});
			gAgents = flatMap(gAgents, this.expandGroupedGAgent);
			const agentIDs = gAgents.map((gAgent) => gAgent.id);
			const uniqueAgents = new Set(agentIDs).size;
			if(type === 'note between' && uniqueAgents < 2) {
				throw new Error('note between requires at least 2 agents');
			}

			this.defineGAgents(gAgents);
			this.addImpStage(this.setGAgentVis(gAgents, true, 'box'), {parallel});
			this.addStage({
				agentIDs,
				label: this.textFormatter(label),
				mode,
				type,
			}, {parallel});
		}

		handleAgentDefine({agents}) {
			const gAgents = agents.map(this.toGAgent);
			this.validateGAgents(gAgents, {
				allowCovered: true,
				allowGrouped: true,
			});
			mergeSets(this.gAgents, gAgents, GAgent.equals);
		}

		handleAgentOptions({agent, options}) {
			const gAgent = this.toGAgent(agent);
			const gAgents = [gAgent];
			this.validateGAgents(gAgents, {
				allowCovered: true,
				allowGrouped: true,
			});
			mergeSets(this.gAgents, gAgents, GAgent.equals);

			this.gAgents
				.filter(({id}) => (id === gAgent.id))
				.forEach((storedGAgent) => {
					mergeSets(storedGAgent.options, options);
				});
		}

		handleAgentActivation({agents, activated, parallel}) {
			const gAgents = agents.map(this.toGAgent);
			this.validateGAgents(gAgents);
			this.defineGAgents(gAgents);
			this.addImpStage(this.setGAgentVis(gAgents, true, 'box'), {parallel});
			this.addStage(this.setGAgentActivation(gAgents, activated), {parallel});
		}

		handleAgentBegin({agents, mode, parallel}) {
			const gAgents = agents.map(this.toGAgent);
			this.validateGAgents(gAgents);
			this.addStage(this.setGAgentVis(gAgents, true, mode, true), {parallel});
		}

		handleAgentEnd({agents, mode, parallel}) {
			const groupPAgents = (agents
				.filter((pAgent) => this.activeGroups.has(pAgent.name))
			);
			const gAgents = (agents
				.filter((pAgent) => !this.activeGroups.has(pAgent.name))
				.map(this.toGAgent)
			);
			this.validateGAgents(gAgents);
			this.addStage(this.makeParallel([
				this.setGAgentActivation(gAgents, false),
				this.setGAgentVis(gAgents, false, mode, true),
				...groupPAgents.map(this.endGroup),
			]), {parallel});
		}

		handleStage(stage) {
			this.latestLine = stage.ln;
			try {
				const handler = this.stageHandlers[stage.type];
				if(!handler) {
					throw new Error('Unknown command: ' + stage.type);
				}
				handler(stage);
			} catch(e) {
				if(typeof e === 'object' && e.message) {
					e.message += ' at line ' + (stage.ln + 1);
					throw e;
				}
			}
		}

		_reset() {
			this.agentStates.clear();
			this.markers.clear();
			this.agentAliases.clear();
			this.activeGroups.clear();
			this.gAgents.length = 0;
			this.nextID = 0;
			this.nesting.length = 0;
			this.labelPattern = [{token: 'label'}];
		}

		_finalise(globals) {
			addBounds(
				this.gAgents,
				this.currentNest.leftGAgent,
				this.currentNest.rightGAgent
			);
			optimiseStages(globals.stages);

			this.gAgents.forEach((gAgent) => {
				gAgent.formattedLabel = this.textFormatter(gAgent.id);
			});
		}

		generate({stages, meta = {}}) {
			this._reset();

			this.textFormatter = meta.textFormatter;
			const globals = this.beginNested('global', {
				label: '',
				ln: 0,
				name: '',
				tag: '',
			});

			stages.forEach(this.handleStage);

			if(this.nesting.length !== 1) {
				throw new Error(
					'Unterminated section at line ' +
					(this.currentSection.header.ln + 1)
				);
			}
			if(this.activeGroups.size > 0) {
				throw new Error('Unterminated group');
			}

			this._checkSectionEnd();

			const terminators = meta.terminators || 'none';
			this.addStage(this.makeParallel([
				this.setGAgentActivation(this.gAgents, false),
				this.setGAgentVis(this.gAgents, false, terminators),
			]));

			this._finalise(globals);

			swapFirstBegin(globals.stages, meta.headers || 'box');

			return {
				agents: this.gAgents.slice(),
				meta: {
					code: meta.code,
					theme: meta.theme,
					title: this.textFormatter(meta.title),
				},
				stages: globals.stages,
			};
		}
	}

	/* eslint-disable sort-keys */ // Maybe later

	const FONT$1 = 'Courier New,Liberation Mono,monospace';
	const LINE_HEIGHT$1 = 1.3;

	const NOTE_ATTRS$1 = {
		'font-family': FONT$1,
		'font-size': 8,
		'line-height': LINE_HEIGHT$1,
	};

	const DIVIDER_LABEL_ATTRS$1 = {
		'font-family': FONT$1,
		'font-size': 8,
		'line-height': LINE_HEIGHT$1,
		'text-anchor': 'middle',
	};

	class MonospaceTheme extends BaseTheme {
		constructor(svg) {
			super(svg, {
				'font-family': FONT$1,
				'font-size': 8,
				'line-height': LINE_HEIGHT$1,
			});

			const sharedBlockSection = {
				padding: {
					top: 3,
					bottom: 2,
				},
				tag: {
					padding: {
						top: 2,
						left: 4,
						right: 4,
						bottom: 2,
					},
					boxRenderer: this.renderTag.bind(this, {
						'fill': '#FFFFFF',
						'stroke': '#000000',
						'stroke-width': 1,
						'rx': 3,
						'ry': 3,
					}),
					labelAttrs: {
						'font-family': FONT$1,
						'font-weight': 'bold',
						'font-size': 9,
						'line-height': LINE_HEIGHT$1,
						'text-anchor': 'left',
					},
				},
				label: {
					minHeight: 8,
					padding: {
						top: 2,
						left: 8,
						right: 8,
						bottom: 2,
					},
					labelAttrs: {
						'font-family': FONT$1,
						'font-size': 8,
						'line-height': LINE_HEIGHT$1,
						'text-anchor': 'left',
					},
				},
			};

			Object.assign(this, {
				titleMargin: 8,
				outerMargin: 4,
				agentMargin: 12,
				actionMargin: 12,
				minActionMargin: 4,
				agentLineActivationRadius: 4,

				agentCap: {
					box: {
						padding: {
							top: 4,
							left: 8,
							right: 8,
							bottom: 4,
						},
						arrowBottom: 12,
						boxAttrs: {
							'fill': '#FFFFFF',
							'stroke': '#000000',
							'stroke-width': 1,
						},
						labelAttrs: {
							'font-family': FONT$1,
							'font-size': 12,
							'line-height': LINE_HEIGHT$1,
							'text-anchor': 'middle',
						},
					},
					person: {
						padding: {
							top: 16,
							left: 8,
							right: 8,
							bottom: 4,
						},
						arrowBottom: 12,
						boxRenderer: this.renderPerson.bind(this, {
							iconHeight: 12,
							iconWidth: 14,
						}, {
							'fill': '#000000',
						}, {
							'fill': '#FFFFFF',
							'stroke': '#000000',
							'stroke-width': 1,
						}),
						labelAttrs: {
							'font-family': FONT$1,
							'font-size': 12,
							'line-height': LINE_HEIGHT$1,
							'text-anchor': 'middle',
						},
					},
					database: {
						padding: {
							top: 9,
							left: 8,
							right: 8,
							bottom: 3,
						},
						arrowBottom: 12,
						boxRenderer: this.renderDB.bind(this, {tilt: 4}, {
							'fill': '#FFFFFF',
							'stroke': '#000000',
							'stroke-width': 1,
						}),
						labelAttrs: {
							'font-family': FONT$1,
							'font-size': 12,
							'line-height': LINE_HEIGHT$1,
							'text-anchor': 'middle',
						},
					},
					cross: {
						size: 16,
						render: svg.crossFactory({
							'fill': 'none',
							'stroke': '#000000',
							'stroke-width': 1,
						}),
					},
					bar: {
						height: 4,
						render: svg.boxFactory({
							'fill': '#000000',
							'stroke': '#000000',
							'stroke-width': 1,
						}),
					},
					fade: {
						width: 5,
						height: 8,
						extend: 1,
					},
					none: {
						height: 8,
					},
				},

				connect: {
					loopbackRadius: 4,
					arrow: {
						'single': {
							width: 4,
							height: 8,
							render: this.renderArrowHead.bind(this),
							attrs: {
								'fill': '#000000',
								'stroke-width': 0,
								'stroke-linejoin': 'miter',
							},
						},
						'double': {
							width: 3,
							height: 6,
							render: this.renderArrowHead.bind(this),
							attrs: {
								'fill': 'none',
								'stroke': '#000000',
								'stroke-width': 1,
								'stroke-linejoin': 'miter',
							},
						},
						'fade': {
							short: 2,
							size: 10,
						},
						'cross': {
							short: 8,
							radius: 4,
							render: svg.crossFactory({
								'fill': 'none',
								'stroke': '#000000',
								'stroke-width': 1,
							}),
						},
					},
					label: {
						padding: 4,
						margin: {top: 2, bottom: 1},
						attrs: {
							'font-family': FONT$1,
							'font-size': 8,
							'line-height': LINE_HEIGHT$1,
							'text-anchor': 'middle',
						},
						loopbackAttrs: {
							'font-family': FONT$1,
							'font-size': 8,
							'line-height': LINE_HEIGHT$1,
						},
					},
					source: {
						radius: 2,
						render: svg.circleFactory({
							'fill': '#000000',
							'stroke': '#000000',
							'stroke-width': 1,
						}),
					},
					mask: {
						padding: {
							top: 0,
							left: 3,
							right: 3,
							bottom: 1,
						},
					},
				},

				agentLineAttrs: {
					'': {
						'fill': 'none',
						'stroke': '#000000',
						'stroke-width': 1,
					},
					'red': {
						'stroke': '#AA0000',
					},
				},
				blocks: {
					'ref': {
						margin: {
							top: 0,
							bottom: 0,
						},
						boxRenderer: this.renderRef.bind(this, {
							'fill': '#FFFFFF',
							'stroke': '#000000',
							'stroke-width': 2,
						}),
						section: sharedBlockSection,
					},
					'': {
						margin: {
							top: 0,
							bottom: 0,
						},
						boxRenderer: svg.boxFactory({
							'fill': 'none',
							'stroke': '#000000',
							'stroke-width': 2,
						}),
						collapsedBoxRenderer: this.renderRef.bind(this, {
							'fill': '#FFFFFF',
							'stroke': '#000000',
							'stroke-width': 2,
						}),
						section: sharedBlockSection,
						sepRenderer: svg.lineFactory({
							'stroke': '#000000',
							'stroke-width': 2,
							'stroke-dasharray': '8, 4',
						}),
					},
				},
				notes: {
					'text': {
						margin: {top: 0, left: 8, right: 8, bottom: 0},
						padding: {top: 4, left: 4, right: 4, bottom: 4},
						overlap: {left: 8, right: 8},
						boxRenderer: svg.boxFactory({
							'fill': '#FFFFFF',
						}),
						labelAttrs: NOTE_ATTRS$1,
					},
					'note': {
						margin: {top: 0, left: 8, right: 8, bottom: 0},
						padding: {top: 8, left: 8, right: 8, bottom: 8},
						overlap: {left: 8, right: 8},
						boxRenderer: svg.noteFactory({
							'fill': '#FFFFFF',
							'stroke': '#000000',
							'stroke-width': 1,
						}, {
							'fill': 'none',
							'stroke': '#000000',
							'stroke-width': 1,
						}),
						labelAttrs: NOTE_ATTRS$1,
					},
					'state': {
						margin: {top: 0, left: 8, right: 8, bottom: 0},
						padding: {top: 8, left: 8, right: 8, bottom: 8},
						overlap: {left: 8, right: 8},
						boxRenderer: svg.boxFactory({
							'fill': '#FFFFFF',
							'stroke': '#000000',
							'stroke-width': 1,
							'rx': 8,
							'ry': 8,
						}),
						labelAttrs: NOTE_ATTRS$1,
					},
				},
				dividers: {
					'': {
						labelAttrs: DIVIDER_LABEL_ATTRS$1,
						padding: {top: 2, left: 5, right: 5, bottom: 2},
						extend: 0,
						margin: 0,
						render: () => ({}),
					},
					'line': {
						labelAttrs: DIVIDER_LABEL_ATTRS$1,
						padding: {top: 2, left: 5, right: 5, bottom: 2},
						extend: 8,
						margin: 0,
						render: this.renderLineDivider.bind(this, {
							lineAttrs: {
								'stroke': '#000000',
							},
						}),
					},
					'delay': {
						labelAttrs: DIVIDER_LABEL_ATTRS$1,
						padding: {top: 2, left: 5, right: 5, bottom: 2},
						extend: 0,
						margin: 0,
						render: this.renderDelayDivider.bind(this, {
							dotSize: 2,
							gapSize: 2,
						}),
					},
					'tear': {
						labelAttrs: DIVIDER_LABEL_ATTRS$1,
						padding: {top: 2, left: 5, right: 5, bottom: 2},
						extend: 8,
						margin: 8,
						render: this.renderTearDivider.bind(this, {
							fadeBegin: 4,
							fadeSize: 4,
							zigWidth: 4,
							zigHeight: 1,
							lineAttrs: {
								'stroke': '#000000',
							},
						}),
					},
				},
			});

			this.addConnectLine('solid', {attrs: {
				'stroke': '#000000',
				'stroke-width': 1,
			}});
			this.addConnectLine('dash', {attrs: {
				'stroke-dasharray': '4, 4',
			}});
			this.addConnectLine('wave', {
				pattern: new WavePattern(6, [
					+0,
					-0.25,
					-0.5,
					-0.25,
					+0,
					+0.25,
					+0.5,
					+0.25,
				]),
			});
		}
	}

	class Factory$1 {
		constructor() {
			this.name = 'monospace';
		}

		build(svg) {
			return new MonospaceTheme(svg);
		}
	}

	/*
	 * The order of commands inside "then" blocks directly influences the
	 * order they are displayed to the user in autocomplete menus.
	 * This relies on the fact that common JS engines maintain insertion
	 * order in objects, though this is not guaranteed. It could be switched
	 * to use Map objects instead for strict compliance, at the cost of
	 * extra syntax.
	 */

	const CM_ERROR = {type: 'error line-error', suggest: [], then: {'': 0}};

	function textTo(exit, suggest = []) {
		return {
			type: 'string',
			suggest,
			then: Object.assign({'': 0}, exit),
		};
	}

	function suggestionsEqual(a, b) {
		return (
			(a.v === b.v) &&
			(a.prefix === b.prefix) &&
			(a.suffix === b.suffix) &&
			(a.q === b.q)
		);
	}

	const AGENT_INFO_TYPES = [
		'person',
		'database',
		'red',
	];

	const PARALLEL_TASKS = [
		'activate',
		'begin',
		'deactivate',
		'end',
		'note',
		'state',
		'text',
	];

	const makeCommands = ((() => {
		function agentListTo(exit, next = 1) {
			return {
				type: 'variable',
				suggest: [{known: 'Agent'}],
				then: Object.assign({}, exit, {
					'': 0,
					',': {type: 'operator', then: {'': next}},
				}),
			};
		}

		const end = {type: '', suggest: ['\n'], then: {}};
		const hiddenEnd = {type: '', suggest: [], then: {}};
		const textToEnd = textTo({'\n': end});
		const colonTextToEnd = {
			type: 'operator',
			then: {'': textToEnd, '\n': hiddenEnd},
		};
		const aliasListToEnd = agentListTo({
			'\n': end,
			'as': {type: 'keyword', then: {
				'': {type: 'variable', suggest: [{known: 'Agent'}], then: {
					'': 0,
					',': {type: 'operator', then: {'': 3}},
					'\n': end,
				}},
			}},
		});
		const agentListToText = agentListTo({':': colonTextToEnd});

		const agentToOptText = {
			type: 'variable',
			suggest: [{known: 'Agent'}],
			then: {
				'': 0,
				':': {type: 'operator', then: {
					'': textToEnd,
					'\n': hiddenEnd,
				}},
				'\n': end,
			},
		};
		const referenceName = {
			':': {type: 'operator', then: {
				'': textTo({
					'as': {type: 'keyword', then: {
						'': {
							type: 'variable',
							suggest: [{known: 'Agent'}],
							then: {
								'': 0,
								'\n': end,
							},
						},
					}},
				}),
			}},
		};
		const refDef = {type: 'keyword', then: Object.assign({
			'over': {type: 'keyword', then: {
				'': agentListTo(referenceName),
			}},
		}, referenceName)};

		const divider = {
			'\n': end,
			':': {type: 'operator', then: {
				'': textToEnd,
				'\n': hiddenEnd,
			}},
			'with': {type: 'keyword', suggest: ['with height '], then: {
				'height': {type: 'keyword', then: {
					'': {type: 'number', suggest: ['6 ', '30 '], then: {
						'\n': end,
						':': {type: 'operator', then: {
							'': textToEnd,
							'\n': hiddenEnd,
						}},
					}},
				}},
			}},
		};

		function simpleList(type, keywords, exit) {
			const first = {};
			const recur = Object.assign({}, exit);

			keywords.forEach((keyword) => {
				first[keyword] = {type, then: recur};
				recur[keyword] = 0;
			});

			return first;
		}

		function optionalKeywords(type, keywords, then) {
			const result = Object.assign({}, then);
			keywords.forEach((keyword) => {
				result[keyword] = {type, then};
			});
			return result;
		}

		const agentInfoList = optionalKeywords(
			'keyword',
			['a', 'an'],
			simpleList('keyword', AGENT_INFO_TYPES, {'\n': end})
		);

		function makeSideNote(side) {
			return {
				type: 'keyword',
				suggest: [side + ' of ', side + ': '],
				then: {
					'of': {type: 'keyword', then: {
						'': agentListToText,
					}},
					':': {type: 'operator', then: {
						'': textToEnd,
					}},
					'': agentListToText,
				},
			};
		}

		function makeOpBlock({exit, sourceExit, blankExit}) {
			const op = {type: 'operator', then: {
				'+': CM_ERROR,
				'-': CM_ERROR,
				'*': CM_ERROR,
				'!': CM_ERROR,
				'': exit,
			}};
			return {
				'+': {type: 'operator', then: {
					'+': CM_ERROR,
					'-': CM_ERROR,
					'*': op,
					'!': CM_ERROR,
					'': exit,
				}},
				'-': {type: 'operator', then: {
					'+': CM_ERROR,
					'-': CM_ERROR,
					'*': op,
					'!': {type: 'operator', then: {
						'+': CM_ERROR,
						'-': CM_ERROR,
						'*': CM_ERROR,
						'!': CM_ERROR,
						'': exit,
					}},
					'': exit,
				}},
				'*': {type: 'operator', then: Object.assign({
					'+': op,
					'-': op,
					'*': CM_ERROR,
					'!': CM_ERROR,
					'': exit,
				}, sourceExit || exit)},
				'!': op,
				'': blankExit || exit,
			};
		}

		function makeCMConnect(arrows) {
			const connect = {
				type: 'keyword',
				then: Object.assign({}, makeOpBlock({
					exit: agentToOptText,
					sourceExit: {
						':': colonTextToEnd,
						'\n': hiddenEnd,
					},
				}), {
					'...': {type: 'operator', then: {
						'': {
							type: 'variable',
							suggest: [{known: 'DelayedAgent'}],
							then: {
								'': 0,
								':': CM_ERROR,
								'\n': end,
							},
						},
						':': CM_ERROR,
						'\n': end,
					}},
				}),
			};

			const connectors = {};
			arrows.forEach((arrow) => (connectors[arrow] = connect));

			const labelIndicator = {
				type: 'operator',
				override: 'Label',
				then: {},
			};

			const hiddenLabelIndicator = {
				type: 'operator',
				suggest: [],
				override: 'Label',
				then: {},
			};

			const firstAgent = {
				type: 'variable',
				suggest: [{known: 'Agent'}],
				then: Object.assign({
					'': 0,
				}, connectors, {
					':': labelIndicator,
				}),
			};

			const firstAgentDelayed = {
				type: 'variable',
				suggest: [{known: 'DelayedAgent'}],
				then: Object.assign({
					'': 0,
					':': hiddenLabelIndicator,
				}, connectors),
			};

			const firstAgentNoFlags = Object.assign({}, firstAgent, {
				then: Object.assign({}, firstAgent.then, {
					'is': {type: 'keyword', then: agentInfoList},
				}),
			});

			return Object.assign({
				'...': {type: 'operator', then: Object.assign({
					'': firstAgentDelayed,
					':': CM_ERROR,
				}, connectors)},
			}, makeOpBlock({
				exit: firstAgent,
				sourceExit: Object.assign({
					'': firstAgent,
					':': hiddenLabelIndicator,
				}, connectors),
				blankExit: firstAgentNoFlags,
			}));
		}

		const commonGroup = {type: 'keyword', then: {
			'': textToEnd,
			':': {type: 'operator', then: {
				'': textToEnd,
			}},
			'\n': end,
		}};

		const BASE_THEN = {
			'title': {type: 'keyword', then: {
				'': textToEnd,
			}},
			'theme': {type: 'keyword', then: {
				'': {
					type: 'string',
					suggest: [{global: 'themes', suffix: '\n'}],
					then: {
						'': 0,
						'\n': end,
					},
				},
			}},
			'headers': {type: 'keyword', then: {
				'none': {type: 'keyword', then: {}},
				'cross': {type: 'keyword', then: {}},
				'box': {type: 'keyword', then: {}},
				'fade': {type: 'keyword', then: {}},
				'bar': {type: 'keyword', then: {}},
			}},
			'terminators': {type: 'keyword', then: {
				'none': {type: 'keyword', then: {}},
				'cross': {type: 'keyword', then: {}},
				'box': {type: 'keyword', then: {}},
				'fade': {type: 'keyword', then: {}},
				'bar': {type: 'keyword', then: {}},
			}},
			'divider': {type: 'keyword', then: Object.assign({
				'line': {type: 'keyword', then: divider},
				'space': {type: 'keyword', then: divider},
				'delay': {type: 'keyword', then: divider},
				'tear': {type: 'keyword', then: divider},
			}, divider)},
			'define': {type: 'keyword', then: {
				'': aliasListToEnd,
				'as': CM_ERROR,
			}},
			'begin': {type: 'keyword', then: {
				'': aliasListToEnd,
				'reference': refDef,
				'as': CM_ERROR,
			}},
			'end': {type: 'keyword', then: {
				'': aliasListToEnd,
				'as': CM_ERROR,
				'\n': end,
			}},
			'activate': {type: 'keyword', then: {'': agentListTo({'\n': end})}},
			'deactivate': {type: 'keyword', then: {'': agentListTo({'\n': end})}},
			'if': commonGroup,
			'else': {type: 'keyword', suggest: ['else\n', 'else if: '], then: {
				'if': {type: 'keyword', suggest: ['if: '], then: {
					'': textToEnd,
					':': {type: 'operator', then: {
						'': textToEnd,
					}},
				}},
				'\n': end,
			}},
			'repeat': commonGroup,
			'group': commonGroup,
			'note': {type: 'keyword', then: {
				'over': {type: 'keyword', then: {
					'': agentListToText,
				}},
				'left': makeSideNote('left'),
				'right': makeSideNote('right'),
				'between': {type: 'keyword', then: {
					'': agentListTo({':': CM_ERROR}, agentListToText),
				}},
			}},
			'state': {type: 'keyword', suggest: ['state over '], then: {
				'over': {type: 'keyword', then: {
					'': {
						type: 'variable',
						suggest: [{known: 'Agent'}],
						then: {
							'': 0,
							',': CM_ERROR,
							':': colonTextToEnd,
						},
					},
				}},
			}},
			'text': {type: 'keyword', then: {
				'left': makeSideNote('left'),
				'right': makeSideNote('right'),
			}},
			'autolabel': {type: 'keyword', then: {
				'off': {type: 'keyword', then: {}},
				'': textTo({'\n': end}, [
					{v: '<label>', suffix: '\n', q: true},
					{v: '[<inc>] <label>', suffix: '\n', q: true},
					{v: '[<inc 1,0.01>] <label>', suffix: '\n', q: true},
				]),
			}},
			'simultaneously': {type: 'keyword', then: {
				':': {type: 'operator', then: {}},
				'with': {type: 'keyword', then: {
					'': {type: 'variable', suggest: [{known: 'Label'}], then: {
						'': 0,
						':': {type: 'operator', then: {}},
					}},
				}},
			}},
		};

		return (arrows) => {
			const arrowConnect = makeCMConnect(arrows);

			const parallel = {};
			for(const task of PARALLEL_TASKS) {
				parallel[task] = BASE_THEN[task];
			}
			Object.assign(parallel, arrowConnect);

			return {
				type: 'error line-error',
				then: Object.assign(
					{},
					BASE_THEN,
					{'&': {type: 'keyword', then: parallel}},
					arrowConnect
				),
			};
		};
	})());

	/* eslint-enable sort-keys */

	function cmCappedToken(token, current) {
		if(Object.keys(current.then).length > 0) {
			return {q: false, suffix: ' ', v: token};
		} else {
			return {q: false, suffix: '\n', v: token};
		}
	}

	function cmGetSuggestions(state, token, current) {
		const suggestions = current.suggest || [''];

		return flatMap(suggestions, (suggest) => {
			if(typeof suggest === 'object') {
				if(suggest.known) {
					return state['known' + suggest.known] || [];
				} else {
					return [suggest];
				}
			} else if(suggest === '') {
				return [cmCappedToken(token, current)];
			} else if(typeof suggest === 'string') {
				return [{q: (token === ''), v: suggest}];
			} else {
				throw new Error('Invalid suggestion type ' + suggest);
			}
		});
	}

	function cmMakeCompletions(state, path) {
		const comp = [];
		const current = last(path);
		Object.keys(current.then).forEach((token) => {
			let next = current.then[token];
			if(typeof next === 'number') {
				next = path[path.length - next - 1];
			}
			mergeSets(
				comp,
				cmGetSuggestions(state, token, next),
				suggestionsEqual
			);
		});
		return comp;
	}

	function getSuggestionCategory(suggestions) {
		for(const suggestion of suggestions) {
			if(typeof suggestion === 'object' && suggestion.known) {
				return suggestion.known;
			}
		}
		return null;
	}

	function appendToken(base, token) {
		return base + (base ? token.s : '') + token.v;
	}

	function storeKnownEntity(state, type, value) {
		mergeSets(
			state['known' + type],
			[{q: true, suffix: ' ', v: value}],
			suggestionsEqual
		);
	}

	function updateKnownEntities(state, locals, token, current) {
		const known = getSuggestionCategory(current.suggest || ['']);

		if(locals.type && known !== locals.type) {
			storeKnownEntity(state, current.override || locals.type, locals.value);
			locals.value = '';
		}

		if(known) {
			locals.value = appendToken(locals.value, token);
		}

		locals.type = known;
	}

	function cmCheckToken(state, eol, commands) {
		const suggestions = {
			type: '',
			value: '',
		};
		let current = commands;
		const path = [current];

		state.line.forEach((token, i) => {
			if(i === state.line.length - 1) {
				state.completions = cmMakeCompletions(state, path);
			}
			const keywordToken = token.q ? '' : token.v;
			let found = current.then[keywordToken];
			if(typeof found === 'undefined') {
				found = current.then[''];
				state.isVar = true;
			} else {
				state.isVar = token.q;
			}
			if(typeof found === 'number') {
				path.length -= found;
			} else {
				path.push(found || CM_ERROR);
			}
			current = last(path);
			updateKnownEntities(state, suggestions, token, current);
		});
		if(eol) {
			updateKnownEntities(state, suggestions, null, {});
		}
		state.nextCompletions = cmMakeCompletions(state, path);
		state.valid = (
			Boolean(current.then['\n']) ||
			Object.keys(current.then).length === 0
		);
		return current.type;
	}

	function getInitialToken(block) {
		const baseToken = (block.baseToken || {});
		return {
			quoted: baseToken.q || false,
			value: baseToken.v || '',
		};
	}

	const NO_TOKEN = -1;

	class Mode {
		constructor(tokenDefinitions, arrows) {
			this.tokenDefinitions = tokenDefinitions;
			this.commands = makeCommands(arrows);
			this.lineComment = '#';
		}

		startState() {
			return {
				beginCompletions: cmMakeCompletions({}, [this.commands]),
				completions: [],
				current: '',
				currentQuoted: false,
				currentSpace: '',
				currentType: NO_TOKEN,
				indent: 0,
				isVar: true,
				knownAgent: [],
				knownDelayedAgent: [],
				knownLabel: [],
				line: [],
				nextCompletions: [],
				valid: true,
			};
		}

		_matchPattern(stream, pattern, consume) {
			if(!pattern) {
				return null;
			}
			pattern.lastIndex = 0;
			return stream.match(pattern, consume);
		}

		_tokenBegin(stream, state) {
			state.currentSpace = '';
			for(let lastChar = ''; !stream.eol(); lastChar = stream.next()) {
				state.currentSpace += lastChar;
				for(let i = 0; i < this.tokenDefinitions.length; ++ i) {
					const block = this.tokenDefinitions[i];
					if(this._matchPattern(stream, block.start, true)) {
						state.currentType = i;
						const {value, quoted} = getInitialToken(block);
						state.current = value;
						state.currentQuoted = quoted;
						return true;
					}
				}
			}
			return false;
		}

		_tokenCheckEscape(stream, state, block) {
			const match = this._matchPattern(stream, block.escape, true);
			if(match) {
				state.current += block.escapeWith(match);
			}
		}

		_addToken(state) {
			state.line.push({
				q: state.currentQuoted,
				s: state.currentSpace,
				v: state.current,
			});
		}

		_tokenEndFound(stream, state, block, match) {
			state.currentType = NO_TOKEN;
			if(block.includeEnd) {
				state.current += match[0];
			}
			if(block.omit) {
				return 'comment';
			}
			this._addToken(state);
			return cmCheckToken(state, stream.eol(), this.commands);
		}

		_tokenEOLFound(stream, state, block) {
			state.current += '\n';
			if(block.omit) {
				return 'comment';
			}
			this._addToken(state);
			const type = cmCheckToken(state, false, this.commands);
			state.line.pop();
			return type;
		}

		_tokenEnd(stream, state) {
			for(;;) {
				const block = this.tokenDefinitions[state.currentType];
				this._tokenCheckEscape(stream, state, block);
				if(block.end) {
					const match = this._matchPattern(stream, block.end, true);
					if(match) {
						return this._tokenEndFound(stream, state, block, match);
					}
				} else {
					return this._tokenEndFound(stream, state, block, null);
				}
				if(stream.eol()) {
					return this._tokenEOLFound(stream, state, block);
				}
				state.current += stream.next();
			}
		}

		_tokenContinueOrBegin(stream, state) {
			if(state.currentType === NO_TOKEN) {
				if(stream.sol()) {
					state.line.length = 0;
					state.valid = true;
				}
				if(!this._tokenBegin(stream, state)) {
					return '';
				}
			}
			return this._tokenEnd(stream, state);
		}

		_isLineTerminated(state) {
			return state.currentType !== NO_TOKEN || state.valid;
		}

		token(stream, state) {
			state.completions = state.nextCompletions;
			state.isVar = true;

			const type = this._tokenContinueOrBegin(stream, state);

			if(stream.eol() && !this._isLineTerminated(state)) {
				return 'line-error ' + type;
			}

			return type;
		}

		indent(state) {
			return state.indent;
		}
	}

	function execAt(str, reg, i) {
		reg.lastIndex = i;
		return reg.exec(str);
	}

	function unescape(match) {
		if(match[1] === 'n') {
			return '\n';
		}
		if('"\\'.indexOf(match[1]) !== -1) {
			return match[1];
		}
		return '\u001B' + match[1];
	}

	const TOKENS = [
		{end: /(?=\n)|$/y, omit: true, start: /#/y},
		{
			baseToken: {q: true},
			end: /"/y,
			escape: /\\(.)/y,
			escapeWith: unescape,
			start: /"/y,
		},
		{baseToken: {v: '...'}, start: /\.\.\./y},
		{end: /(?=[ \t\r\n:+~\-*!<,])|$/y, start: /(?=[^ \t\r\n:+~\-*!<,])/y},
		{
			end: /(?=[^~\-<>x])|[-~]x|[<>](?=x)|$/y,
			includeEnd: true,
			start: /(?=[~\-<])/y,
		},
		{baseToken: {v: ','}, start: /,/y},
		{baseToken: {v: ':'}, start: /:/y},
		{baseToken: {v: '!'}, start: /!/y},
		{baseToken: {v: '+'}, start: /\+/y},
		{baseToken: {v: '*'}, start: /\*/y},
		{baseToken: {v: '\n'}, start: /\n/y},
	];

	/* eslint-disable no-control-regex */ // Removing control characters is the aim
	const CONTROL_CHARS$1 = /[\x00-\x08\x0E-\x1F]/g;
	/* eslint-enable no-control-regex */

	function tokFindBegin(src, i) {
		for(let j = 0; j < TOKENS.length; ++ j) {
			const block = TOKENS[j];
			const match = execAt(src, block.start, i);
			if(match) {
				return {
					appendSpace: '',
					appendValue: '',
					end: !block.end,
					newBlock: block,
					skip: match[0].length,
				};
			}
		}
		return {
			appendSpace: src[i],
			appendValue: '',
			end: false,
			newBlock: null,
			skip: 1,
		};
	}

	function tokContinuePart(src, i, block) {
		if(block.escape) {
			const match = execAt(src, block.escape, i);
			if(match) {
				return {
					appendSpace: '',
					appendValue: block.escapeWith(match),
					end: false,
					newBlock: null,
					skip: match[0].length,
				};
			}
		}
		const match = execAt(src, block.end, i);
		if(match) {
			return {
				appendSpace: '',
				appendValue: block.includeEnd ? match[0] : '',
				end: true,
				newBlock: null,
				skip: match[0].length,
			};
		}
		return {
			appendSpace: '',
			appendValue: src[i],
			end: false,
			newBlock: null,
			skip: 1,
		};
	}

	function tokAdvance(src, i, block) {
		if(block) {
			return tokContinuePart(src, i, block);
		} else {
			return tokFindBegin(src, i);
		}
	}

	function copyPos(pos) {
		return {ch: pos.ch, i: pos.i, ln: pos.ln};
	}

	function advancePos(pos, src, steps) {
		for(let i = 0; i < steps; ++ i) {
			++ pos.ch;
			if(src[pos.i + i] === '\n') {
				++ pos.ln;
				pos.ch = 0;
			}
		}
		pos.i += steps;
	}

	class TokenState {
		constructor(src) {
			this.src = src.replace(CONTROL_CHARS$1, '');
			this.block = null;
			this.token = null;
			this.pos = {ch: 0, i: 0, ln: 0};
			this.reset();
		}

		isOver() {
			return this.pos.i > this.src.length;
		}

		reset() {
			this.token = {b: null, e: null, q: false, s: '', v: ''};
			this.block = null;
		}

		beginToken(advance) {
			this.block = advance.newBlock;
			Object.assign(this.token, this.block.baseToken);
			this.token.b = copyPos(this.pos);
		}

		endToken() {
			let tok = null;
			if(!this.block.omit) {
				this.token.e = copyPos(this.pos);
				tok = this.token;
			}
			this.reset();
			return tok;
		}

		advance() {
			const advance = tokAdvance(this.src, this.pos.i, this.block);

			if(advance.newBlock) {
				this.beginToken(advance);
			}

			this.token.s += advance.appendSpace;
			this.token.v += advance.appendValue;
			advancePos(this.pos, this.src, advance.skip);

			if(advance.end) {
				return this.endToken();
			} else {
				return null;
			}
		}
	}

	function posStr(pos) {
		return 'line ' + (pos.ln + 1) + ', character ' + pos.ch;
	}

	class Tokeniser {
		tokenise(src) {
			const tokens = [];
			const state = new TokenState(src);
			while(!state.isOver()) {
				const token = state.advance();
				if(token) {
					tokens.push(token);
				}
			}
			if(state.block) {
				throw new Error(
					'Unterminated literal (began at ' +
					posStr(state.token.b) + ')'
				);
			}
			return tokens;
		}

		getCodeMirrorMode(arrows) {
			return new Mode(TOKENS, arrows);
		}

		splitLines(tokens) {
			const lines = [];
			let line = [];
			tokens.forEach((token) => {
				if(!token.q && token.v === '\n') {
					if(line.length > 0) {
						lines.push(line);
						line = [];
					}
				} else {
					line.push(token);
				}
			});
			if(line.length > 0) {
				lines.push(line);
			}
			return lines;
		}
	}

	const LABEL_PATTERN = /(.*?)<([^<>]*)>/g;
	const DP_PATTERN = /\.([0-9]*)/;

	function countDP(value) {
		const match = DP_PATTERN.exec(value);
		if(!match || !match[1]) {
			return 0;
		}
		return match[1].length;
	}

	function parseCounter(args) {
		let start = 1;
		let inc = 1;
		let dp = 0;

		if(args[0]) {
			start = Number(args[0]);
			dp = Math.max(dp, countDP(args[0]));
		}
		if(args[1]) {
			inc = Number(args[1]);
			dp = Math.max(dp, countDP(args[1]));
		}

		if(Number.isNaN(start) || Number.isNaN(inc)) {
			return null;
		}

		return {dp, inc, start};
	}

	function parseToken(token) {
		if(token === 'label') {
			return {token: 'label'};
		}

		const p = token.indexOf(' ');
		let type = null;
		let args = null;
		if(p === -1) {
			type = token;
			args = [];
		} else {
			type = token.substr(0, p);
			args = token.substr(p + 1).split(',');
		}

		let result = null;
		if(type === 'inc') {
			result = parseCounter(args);
		}

		return result || ('<' + token + '>');
	}

	function parsePattern(raw) {
		const pattern = [];
		let match = null;
		let end = 0;
		LABEL_PATTERN.lastIndex = 0;
		while((match = LABEL_PATTERN.exec(raw))) {
			if(match[1]) {
				pattern.push(match[1]);
			}
			if(match[2]) {
				pattern.push(parseToken(match[2]));
			}
			end = LABEL_PATTERN.lastIndex;
		}
		const remainder = raw.substr(end);
		if(remainder) {
			pattern.push(remainder);
		}
		return pattern;
	}

	/* eslint-disable no-control-regex */ // Removing control characters is the aim
	const CONTROL_CHARS = /[\x00-\x08\x0E-\x1F]/g;
	/* eslint-enable no-control-regex */

	const STYLES = [
		{
			attrs: {'font-style': 'italic'},
			begin: {matcher: /<i>/g, skip: 0},
			end: {matcher: /<\/i>/g, skip: 0},
		}, {
			attrs: {'font-style': 'italic'},
			begin: {matcher: /[\s_~`>]\*(?=\S)/g, skip: 1},
			end: {matcher: /\S\*(?=[\s_~`<])/g, skip: 1},
		}, {
			attrs: {'font-style': 'italic'},
			begin: {matcher: /[\s*~`>]_(?=\S)/g, skip: 1},
			end: {matcher: /\S_(?=[\s*~`<])/g, skip: 1},
		}, {
			attrs: {'font-weight': 'bolder'},
			begin: {matcher: /<b>/g, skip: 0},
			end: {matcher: /<\/b>/g, skip: 0},
		}, {
			attrs: {'font-weight': 'bolder'},
			begin: {matcher: /[\s_~`>]\*\*(?=\S)/g, skip: 1},
			end: {matcher: /\S\*\*(?=[\s_~`<])/g, skip: 1},
		}, {
			attrs: {'font-weight': 'bolder'},
			begin: {matcher: /[\s*~`>]__(?=\S)/g, skip: 1},
			end: {matcher: /\S__(?=[\s*~`<])/g, skip: 1},
		}, {
			attrs: {'text-decoration': 'line-through'},
			begin: {matcher: /<s>/g, skip: 0},
			end: {matcher: /<\/s>/g, skip: 0},
		}, {
			attrs: {'text-decoration': 'line-through'},
			begin: {matcher: /[\s_*`>]~(?=\S)/g, skip: 1},
			end: {matcher: /\S~(?=[\s_*`<])/g, skip: 1},
		}, {
			attrs: {'text-decoration': 'overline'},
			begin: {matcher: /<o>/g, skip: 0},
			end: {matcher: /<\/o>/g, skip: 0},
		}, {
			attrs: {'font-family': 'Courier New,Liberation Mono,monospace'},
			begin: {matcher: /[\s_*~.>]`(?=\S)/g, skip: 1},
			end: {matcher: /\S`(?=[\s_*~.<])/g, skip: 1},
		}, {
			attrs: {'text-decoration': 'underline'},
			begin: {matcher: /<u>/g, skip: 0},
			end: {matcher: /<\/u>/g, skip: 0},
		}, {
			attrs: {'baseline-shift': '70%', 'font-size': '0.6em'},
			begin: {matcher: /<sup>/g, skip: 0},
			end: {matcher: /<\/sup>/g, skip: 0},
		}, {
			attrs: {'baseline-shift': '-20%', 'font-size': '0.6em'},
			begin: {matcher: /<sub>/g, skip: 0},
			end: {matcher: /<\/sub>/g, skip: 0},
		}, {
			attrs: {'fill': '#DD0000'},
			begin: {matcher: /<red>/g, skip: 0},
			end: {matcher: /<\/red>/g, skip: 0},
		}, {
			attrs: {'filter': 'highlight'},
			begin: {matcher: /<highlight>/g, skip: 0},
			end: {matcher: /<\/highlight>/g, skip: 0},
		}, {
			all: {matcher: /\[([^\]]+)\]\(([^)]+?)(?: "([^"]+)")?\)/g, skip: 0},
			attrs: (m) => ({
				'href': m[2].replace(CONTROL_CHARS, ''),
				'text-decoration': 'underline',
			}),
			text: (m) => m[1].replace(CONTROL_CHARS, ''),
		}, {
			all: {matcher: /<([a-z]+:\/\/[^>]*)>/g, skip: 0},
			attrs: (m) => ({
				'href': m[1].replace(CONTROL_CHARS, ''),
				'text-decoration': 'underline',
			}),
			text: (m) => m[1].replace(CONTROL_CHARS, ''),
		},
	];

	const WHITE = /[\f\n\r\t\v ]+/g;
	const WHITE_END = /^[\t-\r ]+|[\t-\r ]+$/g;

	const ESC = -2;

	function pickBest(best, styleIndex, search, match) {
		if(!match) {
			return best;
		}

		const start = match.index + search.skip;
		const end = search.matcher.lastIndex;
		if(start < best.start || (start === best.start && end > best.end)) {
			return {end, match, start, styleIndex};
		}
		return best;
	}

	function findNext(line, p, active) {
		const virtLine = ' ' + line + ' ';
		const pos = p + 1;
		let best = {
			end: 0,
			match: null,
			start: virtLine.length,
			styleIndex: -1,
		};

		const escIndex = virtLine.indexOf('\u001B', pos);
		if(escIndex !== -1) {
			best = {
				end: escIndex + 1,
				match: null,
				start: escIndex,
				styleIndex: ESC,
			};
		}

		STYLES.forEach(({all, begin, end}, ind) => {
			const search = all || (active[ind] === null ? begin : end);
			search.matcher.lastIndex = pos - search.skip;
			best = pickBest(best, ind, search, search.matcher.exec(virtLine));
		});

		if(best.styleIndex === -1) {
			return null;
		}

		-- best.end;
		-- best.start;
		return best;
	}

	function combineAttrs(active) {
		const attrs = {};
		const decorations = [];
		let any = false;
		active.forEach((activeAttrs) => {
			if(!activeAttrs) {
				return;
			}
			const decoration = activeAttrs['text-decoration'];
			if(decoration && !decorations.includes(decoration)) {
				decorations.push(decoration);
			}
			Object.assign(attrs, activeAttrs);
			any = true;
		});
		if(decorations.length > 1) {
			attrs['text-decoration'] = decorations.join(' ');
		}
		return any ? attrs : null;
	}

	function shrinkWhitespace(text) {
		return text.replace(WHITE, ' ');
	}

	function trimCollapsible(text) {
		return text.replace(WHITE_END, '');
	}

	function getOrCall(v, params) {
		if(typeof v === 'function') {
			return v(...params);
		}
		return v;
	}

	function findStyles(line, active, textCallback) {
		let ln = line;
		let p = 0;
		let s = 0;
		for(let next = null; (next = findNext(ln, p, active));) {
			const {styleIndex, start, end, match} = next;

			if(styleIndex === ESC) {
				ln = ln.substr(0, start) + ln.substr(end);
				p = start + 1;
				continue;
			}

			textCallback(ln.substring(s, start));

			if(active[styleIndex] === null) {
				const style = STYLES[styleIndex];

				active[styleIndex] = getOrCall(style.attrs, [match]);
				if(style.all) {
					textCallback(getOrCall(style.text, [match]));
					active[styleIndex] = null;
				}
			} else {
				active[styleIndex] = null;
			}

			s = end;
			p = end;
		}
		textCallback(ln.substr(s));
	}

	function parseMarkdown(markdown) {
		if(!markdown) {
			return [];
		}

		const active = STYLES.map(() => null);
		const lines = trimCollapsible(markdown).split('\n');
		return lines.map((line) => {
			const parts = [];
			findStyles(shrinkWhitespace(trimCollapsible(line)), active, (text) => {
				if(text) {
					parts.push({attrs: combineAttrs(active), text});
				}
			});
			return parts;
		});
	}

	const BLOCK_TYPES = new Map();
	BLOCK_TYPES.set('if', {
		blockType: 'if',
		skip: [],
		tag: 'if',
		type: 'block begin',
	});
	BLOCK_TYPES.set('else', {
		blockType: 'else',
		skip: ['if'],
		tag: 'else',
		type: 'block split',
	});
	BLOCK_TYPES.set('repeat', {
		blockType: 'repeat',
		skip: [],
		tag: 'repeat',
		type: 'block begin',
	});
	BLOCK_TYPES.set('group', {
		blockType: 'group',
		skip: [],
		tag: '',
		type: 'block begin',
	});

	const CONNECT = {
		agentFlags: {
			'!': {flag: 'end'},
			'*': {allowBlankName: true, blankNameFlag: 'source', flag: 'begin'},
			'+': {flag: 'start'},
			'-': {flag: 'stop'},
		},

		types: ((() => {
			const lTypes = [
				{tok: '', type: 0},
				{tok: '<', type: 1},
				{tok: '<<', type: 2},
				{tok: '~', type: 3},
			];
			const mTypes = [
				{tok: '-', type: 'solid'},
				{tok: '--', type: 'dash'},
				{tok: '~', type: 'wave'},
			];
			const rTypes = [
				{tok: '', type: 0},
				{tok: '>', type: 1},
				{tok: '>>', type: 2},
				{tok: '~', type: 3},
				{tok: 'x', type: 4},
			];

			const types = new Map();

			combine([lTypes, mTypes, rTypes]).forEach((arrow) => {
				const [left, line, right] = arrow;
				if(left.type === 0 && right.type === 0) {
					// A line without arrows cannot be a connector
					return;
				}
				if(left.type === 3 && line.type === 'wave' && right.type === 0) {
					// ~~ could be fade-wave-none or none-wave-fade
					// We allow only none-wave-fade to resolve this
					return;
				}
				types.set(arrow.map((part) => part.tok).join(''), {
					left: left.type,
					line: line.type,
					right: right.type,
				});
			});

			return types;
		})()),
	};

	const TERMINATOR_TYPES = [
		'none',
		'box',
		'cross',
		'fade',
		'bar',
	];

	const NOTE_TYPES = new Map();
	NOTE_TYPES.set('text', {
		mode: 'text',
		types: {
			'left': {
				max: Number.POSITIVE_INFINITY,
				min: 0,
				skip: ['of'],
				type: 'note left',
			},
			'right': {
				max: Number.POSITIVE_INFINITY,
				min: 0,
				skip: ['of'],
				type: 'note right',
			},
		},
	});
	NOTE_TYPES.set('note', {
		mode: 'note',
		types: {
			'between': {
				max: Number.POSITIVE_INFINITY,
				min: 2,
				skip: [],
				type: 'note between',
			},
			'left': {
				max: Number.POSITIVE_INFINITY,
				min: 0,
				skip: ['of'],
				type: 'note left',
			},
			'over': {
				max: Number.POSITIVE_INFINITY,
				min: 0,
				skip: [],
				type: 'note over',
			},
			'right': {
				max: Number.POSITIVE_INFINITY,
				min: 0,
				skip: ['of'],
				type: 'note right',
			},
		},
	});
	NOTE_TYPES.set('state', {
		mode: 'state',
		types: {
			'over': {max: 1, min: 1, skip: [], type: 'note over'},
		},
	});

	const DIVIDER_TYPES = new Map();
	DIVIDER_TYPES.set('line', {defaultHeight: 6});
	DIVIDER_TYPES.set('space', {defaultHeight: 6});
	DIVIDER_TYPES.set('delay', {defaultHeight: 30});
	DIVIDER_TYPES.set('tear', {defaultHeight: 6});

	const AGENT_MANIPULATION_TYPES = new Map();
	AGENT_MANIPULATION_TYPES.set('define', {type: 'agent define'});
	AGENT_MANIPULATION_TYPES.set('begin', {mode: 'box', type: 'agent begin'});
	AGENT_MANIPULATION_TYPES.set('end', {mode: 'cross', type: 'agent end'});

	const AGENT_ACTIVATION_TYPES = new Map();
	AGENT_MANIPULATION_TYPES.set('activate', {
		activated: true,
		type: 'agent activation',
	});
	AGENT_MANIPULATION_TYPES.set('deactivate', {
		activated: false,
		type: 'agent activation',
	});

	function makeError(message, token = null) {
		let suffix = '';
		if(token) {
			suffix = (
				' at line ' + (token.b.ln + 1) +
				', character ' + token.b.ch
			);
		}
		return new Error(message + suffix);
	}

	function endIndexInLine(line, end = null) {
		if(end === null) {
			return line.length;
		}
		return end;
	}

	function joinLabel(line, begin = 0, end = null) {
		const e = endIndexInLine(line, end);
		if(e <= begin) {
			return '';
		}
		let result = line[begin].v;
		for(let i = begin + 1; i < e; ++ i) {
			result += line[i].s + line[i].v;
		}
		return result;
	}

	function readNumber(line, begin = 0, end = null, def = Number.NAN) {
		const text = joinLabel(line, begin, end);
		return Number(text || def);
	}

	function tokenKeyword(token) {
		if(!token || token.q) {
			return null;
		}
		return token.v;
	}

	function skipOver(line, start, skip, error = null) {
		for(let i = 0; i < skip.length; ++ i) {
			const expected = skip[i];
			const token = line[start + i];
			if(tokenKeyword(token) !== expected) {
				if(error) {
					throw makeError(
						error + '; expected "' + expected + '"',
						token
					);
				} else {
					return start;
				}
			}
		}
		return start + skip.length;
	}

	function findTokens(line, tokens, {
		start = 0,
		limit = null,
		orEnd = false,
	} = {}) {
		const e = endIndexInLine(line, limit);
		for(let i = start; i <= e - tokens.length; ++ i) {
			if(skipOver(line, i, tokens) !== i) {
				return i;
			}
		}
		return orEnd ? e : -1;
	}

	function findFirstToken(line, tokenMap, {start = 0, limit = null} = {}) {
		const e = endIndexInLine(line, limit);
		for(let pos = start; pos < e; ++ pos) {
			const value = tokenMap.get(tokenKeyword(line[pos]));
			if(value) {
				return {pos, value};
			}
		}
		return null;
	}

	function readAgentAlias(line, start, end, {enableAlias, allowBlankName}) {
		let aliasSep = end;
		if(enableAlias) {
			aliasSep = findTokens(line, ['as'], {limit: end, orEnd: true, start});
		}
		if(start >= aliasSep && !allowBlankName) {
			let errPosToken = line[start];
			if(!errPosToken) {
				errPosToken = {b: last(line).e};
			}
			throw makeError('Missing agent name', errPosToken);
		}
		return {
			alias: joinLabel(line, aliasSep + 1, end),
			name: joinLabel(line, start, aliasSep),
		};
	}

	function readAgent(line, start, end, {
		flagTypes = {},
		aliases = false,
	} = {}) {
		const flags = [];
		const blankNameFlags = [];
		let p = start;
		let allowBlankName = false;
		for(; p < end; ++ p) {
			const token = line[p];
			const rawFlag = tokenKeyword(token);
			const flag = flagTypes[rawFlag];
			if(!flag) {
				break;
			}
			if(flags.includes(flag.flag)) {
				throw makeError('Duplicate agent flag: ' + rawFlag, token);
			}
			allowBlankName = allowBlankName || Boolean(flag.allowBlankName);
			flags.push(flag.flag);
			blankNameFlags.push(flag.blankNameFlag);
		}
		const {name, alias} = readAgentAlias(line, p, end, {
			allowBlankName,
			enableAlias: aliases,
		});
		return {
			alias,
			flags: name ? flags : blankNameFlags,
			name,
		};
	}

	function readAgentList(line, start, end, readAgentOpts) {
		const list = [];
		let currentStart = -1;
		for(let i = start; i < end; ++ i) {
			const token = line[i];
			if(tokenKeyword(token) === ',') {
				if(currentStart !== -1) {
					list.push(readAgent(line, currentStart, i, readAgentOpts));
					currentStart = -1;
				}
			} else if(currentStart === -1) {
				currentStart = i;
			}
		}
		if(currentStart !== -1) {
			list.push(readAgent(line, currentStart, end, readAgentOpts));
		}
		return list;
	}

	const PARSERS = [
		{begin: ['title'], fn: (line, meta) => { // Title
			meta.title = joinLabel(line, 1);
			return true;
		}},

		{begin: ['theme'], fn: (line, meta) => { // Theme
			meta.theme = joinLabel(line, 1);
			return true;
		}},

		{begin: ['terminators'], fn: (line, meta) => { // Terminators
			const type = tokenKeyword(line[1]);
			if(!type) {
				throw makeError('Unspecified termination', line[0]);
			}
			if(TERMINATOR_TYPES.indexOf(type) === -1) {
				throw makeError('Unknown termination "' + type + '"', line[1]);
			}
			meta.terminators = type;
			return true;
		}},

		{begin: ['headers'], fn: (line, meta) => { // Headers
			const type = tokenKeyword(line[1]);
			if(!type) {
				throw makeError('Unspecified header', line[0]);
			}
			if(TERMINATOR_TYPES.indexOf(type) === -1) {
				throw makeError('Unknown header "' + type + '"', line[1]);
			}
			meta.headers = type;
			return true;
		}},

		{begin: ['divider'], fn: (line) => { // Divider
			const labelSep = findTokens(line, [':'], {orEnd: true});
			const heightSep = findTokens(line, ['with', 'height'], {
				limit: labelSep,
				orEnd: true,
			});

			const mode = joinLabel(line, 1, heightSep) || 'line';
			if(!DIVIDER_TYPES.has(mode)) {
				throw makeError('Unknown divider type', line[1]);
			}

			const height = readNumber(
				line,
				heightSep + 2,
				labelSep,
				DIVIDER_TYPES.get(mode).defaultHeight
			);
			if(Number.isNaN(height) || height < 0) {
				throw makeError('Invalid divider height', line[heightSep + 2]);
			}

			return {
				height,
				label: joinLabel(line, labelSep + 1),
				mode,
				type: 'divider',
			};
		}},

		{begin: ['autolabel'], fn: (line) => { // Autolabel
			let raw = null;
			if(tokenKeyword(line[1]) === 'off') {
				raw = '<label>';
			} else {
				raw = joinLabel(line, 1);
			}
			return {
				pattern: parsePattern(raw),
				type: 'label pattern',
			};
		}},

		{begin: ['end'], fn: (line) => { // Block End
			if(line.length !== 1) {
				return null;
			}
			return {type: 'block end'};
		}},

		{begin: [], fn: (line) => { // Block
			const type = BLOCK_TYPES.get(tokenKeyword(line[0]));
			if(!type) {
				return null;
			}
			let skip = 1;
			if(line.length > skip) {
				skip = skipOver(line, skip, type.skip, 'Invalid block command');
			}
			skip = skipOver(line, skip, [':']);
			return {
				blockType: type.blockType,
				label: joinLabel(line, skip),
				tag: type.tag,
				type: type.type,
			};
		}},

		{begin: ['begin', 'reference'], fn: (line) => { // Begin reference
			let agents = [];
			const labelSep = findTokens(line, [':']);
			if(tokenKeyword(line[2]) === 'over' && labelSep > 3) {
				agents = readAgentList(line, 3, labelSep);
			} else if(labelSep !== 2) {
				throw makeError('Expected ":" or "over"', line[2]);
			}
			const def = readAgent(
				line,
				labelSep + 1,
				line.length,
				{aliases: true}
			);
			if(!def.alias) {
				throw makeError('Reference must have an alias', line[labelSep]);
			}
			return {
				agents,
				alias: def.alias,
				blockType: 'ref',
				label: def.name,
				tag: 'ref',
				type: 'group begin',
			};
		}},

		{begin: [], fn: (line) => { // Agent
			const type = AGENT_MANIPULATION_TYPES.get(tokenKeyword(line[0]));
			if(!type || line.length <= 1) {
				return null;
			}
			return Object.assign({
				agents: readAgentList(line, 1, line.length, {aliases: true}),
			}, type);
		}},

		{begin: [], fn: (line) => { // Activation
			const type = AGENT_ACTIVATION_TYPES.get(tokenKeyword(line[0]));
			if(!type || line.length <= 1) {
				return null;
			}
			return Object.assign({
				agents: readAgentList(line, 1, line.length, {aliases: false}),
			}, type);
		}},

		{begin: ['simultaneously'], fn: (line) => { // Async
			if(tokenKeyword(last(line)) !== ':') {
				return null;
			}
			let target = '';
			if(line.length > 2) {
				if(tokenKeyword(line[1]) !== 'with') {
					return null;
				}
				target = joinLabel(line, 2, line.length - 1);
			}
			return {
				target,
				type: 'async',
			};
		}},

		{begin: [], fn: (line) => { // Note
			const mode = NOTE_TYPES.get(tokenKeyword(line[0]));
			const labelSep = findTokens(line, [':']);
			if(!mode || labelSep === -1) {
				return null;
			}
			const type = mode.types[tokenKeyword(line[1])];
			if(!type) {
				return null;
			}
			let skip = 2;
			skip = skipOver(line, skip, type.skip);
			const agents = readAgentList(line, skip, labelSep);
			if(agents.length < type.min) {
				throw makeError('Too few agents for ' + mode.mode, line[0]);
			}
			if(agents.length > type.max) {
				throw makeError('Too many agents for ' + mode.mode, line[0]);
			}
			return {
				agents,
				label: joinLabel(line, labelSep + 1),
				mode: mode.mode,
				type: type.type,
			};
		}},

		{begin: [], fn: (line) => { // Connect
			const labelSep = findTokens(line, [':'], {orEnd: true});
			const connectionToken = findFirstToken(
				line,
				CONNECT.types,
				{limit: labelSep - 1, start: 0}
			);
			if(!connectionToken) {
				return null;
			}

			const connectPos = connectionToken.pos;

			const readOpts = {
				flagTypes: CONNECT.agentFlags,
			};

			if(tokenKeyword(line[0]) === '...') {
				return {
					agent: readAgent(line, connectPos + 1, labelSep, readOpts),
					label: joinLabel(line, labelSep + 1),
					options: connectionToken.value,
					tag: joinLabel(line, 1, connectPos),
					type: 'connect-delay-end',
				};
			} else if(tokenKeyword(line[connectPos + 1]) === '...') {
				if(labelSep !== line.length) {
					throw makeError(
						'Cannot label beginning of delayed connection',
						line[labelSep]
					);
				}
				return {
					agent: readAgent(line, 0, connectPos, readOpts),
					options: connectionToken.value,
					tag: joinLabel(line, connectPos + 2, labelSep),
					type: 'connect-delay-begin',
				};
			} else {
				return {
					agents: [
						readAgent(line, 0, connectPos, readOpts),
						readAgent(line, connectPos + 1, labelSep, readOpts),
					],
					label: joinLabel(line, labelSep + 1),
					options: connectionToken.value,
					type: 'connect',
				};
			}
		}},

		{begin: [], fn: (line) => { // Marker
			if(line.length < 2 || tokenKeyword(last(line)) !== ':') {
				return null;
			}
			return {
				name: joinLabel(line, 0, line.length - 1),
				type: 'mark',
			};
		}},

		{begin: [], fn: (line) => { // Options
			const sepPos = findTokens(line, ['is']);
			if(sepPos < 1) {
				return null;
			}
			const indefiniteArticles = ['a', 'an'];
			let optionsBegin = sepPos + 1;
			if(indefiniteArticles.includes(tokenKeyword(line[optionsBegin]))) {
				++ optionsBegin;
			}
			if(optionsBegin === line.length) {
				throw makeError('Empty agent options', {b: last(line).e});
			}
			const agent = readAgent(line, 0, sepPos);
			const options = [];
			for(let i = optionsBegin; i < line.length; ++ i) {
				options.push(line[i].v);
			}
			return {
				agent,
				options,
				type: 'agent options',
			};
		}},
	];

	function stageFromLine(line, meta) {
		for(const {begin, fn} of PARSERS) {
			if(skipOver(line, 0, begin) !== begin.length) {
				continue;
			}
			const stage = fn(line, meta);
			if(stage) {
				return stage;
			}
		}
		return null;
	}

	function parseLine(line, {meta, stages}) {
		let parallel = false;
		const [start] = line;
		if(tokenKeyword(start) === '&') {
			parallel = true;
			line.splice(0, 1);
		}

		const stage = stageFromLine(line, meta);

		if(!stage) {
			throw makeError('Unrecognised command: ' + joinLabel(line), line[0]);
		} else if(typeof stage === 'object') {
			stage.ln = start.b.ln;
			stage.parallel = parallel;
			stages.push(stage);
		} else if(parallel) {
			throw makeError('Metadata cannot be parallel', start);
		}
	}

	const SHARED_TOKENISER = new Tokeniser();

	class Parser {
		getCodeMirrorMode() {
			return SHARED_TOKENISER.getCodeMirrorMode(
				Array.from(CONNECT.types.keys())
			);
		}

		parseLines(lines, src) {
			const result = {
				meta: {
					code: src,
					headers: 'box',
					terminators: 'none',
					textFormatter: parseMarkdown,
					theme: '',
					title: '',
				},
				stages: [],
			};

			lines.forEach((line) => parseLine(line, result));

			return result;
		}

		parse(src) {
			const tokens = SHARED_TOKENISER.tokenise(src);
			const lines = SHARED_TOKENISER.splitLines(tokens);
			return this.parseLines(lines, src);
		}
	}

	/* eslint-disable spaced-comment */
	/* eslint-disable capitalized-comments */

	class BaseComponent {
		makeState(/*state*/) {
			// Override if required
		}

		resetState(state) {
			// Override if required
			this.makeState(state);
		}

		prepareMeasurements(/*stage, {
			renderer,
			theme,
			agentInfos,
			textSizer,
			state,
			components,
		}*/) {
			// Override if required
		}

		separationPre(/*stage, {
			renderer,
			theme,
			agentInfos,
			visibleAgentIDs,
			momentaryAgentIDs,
			textSizer,
			addSpacing,
			addSeparation,
			state,
			components,
		}*/) {
			// Override if required
		}

		separation(/*stage, {
			renderer,
			theme,
			agentInfos,
			visibleAgentIDs,
			momentaryAgentIDs,
			textSizer,
			addSpacing,
			addSeparation,
			state,
			components,
		}*/) {
			// Override if required
		}

		renderPre(/*stage, {
			renderer,
			theme,
			agentInfos,
			textSizer,
			state,
			components,
		}*/) {
			// Override if required
			// Return {topShift, agentIDs, asynchronousY}
		}

		render(/*stage, {
			renderer,
			topY,
			primaryY,
			fillLayer,
			blockLayer,
			theme,
			agentInfos,
			svg,
			textSizer,
			addDef,
			makeRegion,
			state,
			components,
		}*/) {
			// Override if required
			// Return bottom Y coordinate
		}

		renderHidden(/*stage, {
			(same args as render, with primaryY = topY)
		}*/) {
			// Override if required
		}

		shouldHide(/*stage, {
			renderer,
			theme,
			agentInfos,
			textSizer,
			state,
			components,
		}*/) {
			// Override if required
			// Return {self, nest}
		}
	}

	function cleanRenderPreResult({
		agentIDs = [],
		topShift = 0,
		y = null,
		asynchronousY = null,
	} = {}, currentY = null) {
		let ts = topShift;
		if(y !== null && currentY !== null) {
			ts = Math.max(ts, y - currentY);
		}
		return {
			agentIDs,
			asynchronousY: (asynchronousY === null) ? currentY : asynchronousY,
			topShift: ts,
			y,
		};
	}

	const components = new Map();

	function register(name, component) {
		components.set(name, component);
	}

	function getComponents() {
		return components;
	}

	class Activation extends BaseComponent {
		radius(activated, env) {
			return activated ? env.theme.agentLineActivationRadius : 0;
		}

		separationPre({agentIDs, activated}, env) {
			const r = this.radius(activated, env);
			agentIDs.forEach((id) => {
				const agentInfo = env.agentInfos.get(id);
				agentInfo.currentRad = r;
				agentInfo.currentMaxRad = Math.max(agentInfo.currentMaxRad, r);
			});
		}

		renderPre({agentIDs, activated}, env) {
			const r = this.radius(activated, env);
			agentIDs.forEach((id) => {
				const agentInfo = env.agentInfos.get(id);
				agentInfo.currentMaxRad = Math.max(agentInfo.currentMaxRad, r);
			});
		}

		render({agentIDs, activated}, env) {
			const r = this.radius(activated, env);
			agentIDs.forEach((id) => {
				env.drawAgentLine(id, env.primaryY);
				env.agentInfos.get(id).currentRad = r;
			});
			return env.primaryY + env.theme.actionMargin;
		}

		renderHidden(stage, env) {
			this.render(stage, env);
		}
	}

	register('agent activation', new Activation());

	const OUTLINE_ATTRS$4 = {
		'class': 'outline',
		'fill': 'transparent',
	};

	class CapBox {
		getConfig(options, env, isBegin) {
			let config = null;
			if(options.includes('database')) {
				config = env.theme.agentCap.database;
			} else if(isBegin && options.includes('person')) {
				config = env.theme.agentCap.person;
			}
			return config || env.theme.agentCap.box;
		}

		prepareMeasurements({formattedLabel, options}, env, isBegin) {
			const config = this.getConfig(options, env, isBegin);
			env.textSizer.expectMeasure(config.labelAttrs, formattedLabel);
		}

		separation({formattedLabel, options}, env, isBegin) {
			const config = this.getConfig(options, env, isBegin);
			const width = (
				env.textSizer.measure(config.labelAttrs, formattedLabel).width +
				config.padding.left +
				config.padding.right
			);

			return {
				left: width / 2,
				radius: width / 2,
				right: width / 2,
			};
		}

		topShift({formattedLabel, options}, env, isBegin) {
			const config = this.getConfig(options, env, isBegin);
			const height = (
				env.textSizer.measureHeight(config.labelAttrs, formattedLabel) +
				config.padding.top +
				config.padding.bottom
			);
			return Math.max(0, height - config.arrowBottom);
		}

		render(y, {x, formattedLabel, options}, env, isBegin) {
			const config = this.getConfig(options, env, isBegin);

			const text = env.svg.boxedText(config, formattedLabel, {x, y});

			env.makeRegion().add(
				text,
				env.svg.box(OUTLINE_ATTRS$4, {
					height: text.height,
					width: text.width,
					x: x - text.width / 2,
					y,
				})
			);

			return {
				height: text.height,
				lineBottom: text.height,
				lineTop: 0,
			};
		}
	}

	class CapCross {
		prepareMeasurements() {
			// No-op
		}

		separation(agentInfo, env) {
			const config = env.theme.agentCap.cross;
			return {
				left: config.size / 2,
				radius: 0,
				right: config.size / 2,
			};
		}

		topShift(agentInfo, env) {
			const config = env.theme.agentCap.cross;
			return config.size / 2;
		}

		render(y, {x, options}, env) {
			const config = env.theme.agentCap.cross;
			const d = config.size / 2;

			env.makeRegion().add(
				config.render({
					options,
					radius: d,
					x,
					y: y + d,
				}),
				env.svg.box(OUTLINE_ATTRS$4, {
					height: d * 2,
					width: d * 2,
					x: x - d,
					y,
				})
			);

			return {
				height: d * 2,
				lineBottom: d,
				lineTop: d,
			};
		}
	}

	class CapBar {
		prepareMeasurements({formattedLabel}, env) {
			const config = env.theme.agentCap.box;
			env.textSizer.expectMeasure(config.labelAttrs, formattedLabel);
		}

		separation({formattedLabel}, env) {
			const config = env.theme.agentCap.box;
			const width = (
				env.textSizer.measure(config.labelAttrs, formattedLabel).width +
				config.padding.left +
				config.padding.right
			);

			return {
				left: width / 2,
				radius: width / 2,
				right: width / 2,
			};
		}

		topShift(agentInfo, env) {
			const config = env.theme.agentCap.bar;
			return config.height / 2;
		}

		render(y, {x, formattedLabel, options}, env) {
			const boxCfg = env.theme.agentCap.box;
			const barCfg = env.theme.agentCap.bar;
			const width = (
				env.textSizer.measure(boxCfg.labelAttrs, formattedLabel).width +
				boxCfg.padding.left +
				boxCfg.padding.right
			);
			const {height} = barCfg;

			env.makeRegion().add(
				barCfg.render({
					height,
					options,
					width,
					x: x - width / 2,
					y,
				}),
				env.svg.box(OUTLINE_ATTRS$4, {
					height,
					width,
					x: x - width / 2,
					y,
				})
			);

			return {
				height,
				lineBottom: height,
				lineTop: 0,
			};
		}
	}

	class CapFade {
		prepareMeasurements() {
			// No-op
		}

		separation({currentRad}) {
			return {
				left: currentRad,
				radius: currentRad,
				right: currentRad,
			};
		}

		topShift(agentInfo, env, isBegin) {
			const config = env.theme.agentCap.fade;
			return isBegin ? config.height : 0;
		}

		render(y, {x}, env, isBegin) {
			const config = env.theme.agentCap.fade;
			const ratio = config.height / (config.height + config.extend);

			const gradID = env.addDef(isBegin ? 'FadeIn' : 'FadeOut', () => (
				env.svg.linearGradient({
					'x1': '0%',
					'x2': '0%',
					'y1': isBegin ? '100%' : '0%',
					'y2': isBegin ? '0%' : '100%',
				}, [
					{
						'offset': '0%',
						'stop-color': '#FFFFFF',
					},
					{
						'offset': (100 * ratio).toFixed(3) + '%',
						'stop-color': '#000000',
					},
				])
			));

			env.lineMaskLayer.add(env.svg.box({
				'fill': 'url(#' + gradID + ')',
			}, {
				height: config.height + config.extend,
				width: config.width,
				x: x - config.width / 2,
				y: y - (isBegin ? config.extend : 0),
			}));

			env.makeRegion().add(env.svg.box(OUTLINE_ATTRS$4, {
				height: config.height,
				width: config.width,
				x: x - config.width / 2,
				y,
			}));

			return {
				height: config.height,
				lineBottom: 0,
				lineTop: config.height,
			};
		}
	}

	class CapNone {
		prepareMeasurements() {
			// No-op
		}

		separation({currentRad}) {
			return {
				left: currentRad,
				radius: currentRad,
				right: currentRad,
			};
		}

		topShift(agentInfo, env) {
			const config = env.theme.agentCap.none;
			return config.height;
		}

		render(y, {x}, env) {
			const config = env.theme.agentCap.none;

			const w = 10;
			env.makeRegion().add(env.svg.box(OUTLINE_ATTRS$4, {
				height: config.height,
				width: w,
				x: x - w / 2,
				y,
			}));

			return {
				height: config.height,
				lineBottom: 0,
				lineTop: config.height,
			};
		}
	}

	const AGENT_CAPS = {
		'bar': new CapBar(),
		'box': new CapBox(),
		'cross': new CapCross(),
		'fade': new CapFade(),
		'none': new CapNone(),
	};

	class AgentCap extends BaseComponent {
		constructor(begin) {
			super();
			this.begin = begin;
		}

		prepareMeasurements({mode, agentIDs}, env) {
			agentIDs.forEach((id) => {
				const agentInfo = env.agentInfos.get(id);
				const cap = AGENT_CAPS[mode];
				cap.prepareMeasurements(agentInfo, env, this.begin);
			});
		}

		separationPre({mode, agentIDs}, env) {
			agentIDs.forEach((id) => {
				const agentInfo = env.agentInfos.get(id);
				const cap = AGENT_CAPS[mode];
				const sep = cap.separation(agentInfo, env, this.begin);
				env.addSpacing(id, sep);
				agentInfo.currentMaxRad = Math.max(
					agentInfo.currentMaxRad,
					sep.radius
				);
			});
		}

		separation({agentIDs}, env) {
			if(this.begin) {
				mergeSets(env.visibleAgentIDs, agentIDs);
			} else {
				removeAll(env.visibleAgentIDs, agentIDs);
			}
		}

		renderPre({mode, agentIDs}, env) {
			let maxTopShift = 0;
			agentIDs.forEach((id) => {
				const agentInfo = env.agentInfos.get(id);
				const cap = AGENT_CAPS[mode];
				const topShift = cap.topShift(agentInfo, env, this.begin);
				maxTopShift = Math.max(maxTopShift, topShift);

				const r = cap.separation(agentInfo, env, this.begin).radius;
				agentInfo.currentMaxRad = Math.max(agentInfo.currentMaxRad, r);
			});
			return {
				agentIDs,
				topShift: maxTopShift,
			};
		}

		render({mode, agentIDs}, env) {
			let maxEnd = 0;
			agentIDs.forEach((id) => {
				const agentInfo = env.agentInfos.get(id);
				const cap = AGENT_CAPS[mode];
				const topShift = cap.topShift(agentInfo, env, this.begin);
				const y0 = env.primaryY - topShift;
				const shifts = cap.render(y0, agentInfo, env, this.begin);
				maxEnd = Math.max(maxEnd, y0 + shifts.height);
				if(this.begin) {
					env.drawAgentLine(id, y0 + shifts.lineBottom);
				} else {
					env.drawAgentLine(id, y0 + shifts.lineTop, true);
				}
			});
			return maxEnd + env.theme.actionMargin;
		}

		renderHidden({agentIDs}, env) {
			agentIDs.forEach((id) => {
				env.drawAgentLine(id, env.topY, !this.begin);
			});
		}
	}

	register('agent begin', new AgentCap(true));
	register('agent end', new AgentCap(false));

	const OUTLINE_ATTRS$3 = {
		'class': 'outline',
		'fill': 'transparent',
	};

	class BlockSplit extends BaseComponent {
		prepareMeasurements({left, tag, label}, env) {
			const blockInfo = env.state.blocks.get(left);
			const config = env.theme.getBlock(blockInfo.type).section;
			env.textSizer.expectMeasure(config.tag.labelAttrs, tag);
			env.textSizer.expectMeasure(config.label.labelAttrs, label);
		}

		separation({left, right, tag, label}, env) {
			const blockInfo = env.state.blocks.get(left);
			const config = env.theme.getBlock(blockInfo.type).section;
			const width = (
				env.textSizer.measure(config.tag.labelAttrs, tag).width +
				config.tag.padding.left +
				config.tag.padding.right +
				env.textSizer.measure(config.label.labelAttrs, label).width +
				config.label.padding.left +
				config.label.padding.right
			);
			env.addSeparation(left, right, width);
		}

		renderPre({left, right}) {
			return {
				agentIDs: [left, right],
			};
		}

		render({left, right, tag, label}, env, first = false) {
			const blockInfo = env.state.blocks.get(left);
			const config = env.theme.getBlock(blockInfo.type);
			const agentInfoL = env.agentInfos.get(left);
			const agentInfoR = env.agentInfos.get(right);

			let y = env.primaryY;

			if(!first) {
				y += config.section.padding.bottom;
			}

			const clickable = env.makeRegion();

			const tagRender = env.svg.boxedText({
				boxAttrs: config.section.tag.boxAttrs,
				boxRenderer: config.section.tag.boxRenderer,
				labelAttrs: config.section.tag.labelAttrs,
				padding: config.section.tag.padding,
			}, tag, {x: agentInfoL.x, y});

			const labelRender = env.svg.boxedText({
				boxAttrs: {'fill': '#000000'},
				labelAttrs: config.section.label.labelAttrs,
				padding: config.section.label.padding,
			}, label, {x: agentInfoL.x + tagRender.width, y});

			const labelHeight = Math.max(
				Math.max(tagRender.height, labelRender.height),
				config.section.label.minHeight
			);

			blockInfo.hold.add(tagRender.box);
			env.lineMaskLayer.add(labelRender.box);
			clickable.add(
				env.svg.box(OUTLINE_ATTRS$3, {
					height: labelHeight,
					width: agentInfoR.x - agentInfoL.x,
					x: agentInfoL.x,
					y,
				}),
				tagRender.label,
				labelRender.label
			);

			if(!first) {
				blockInfo.hold.add(config.sepRenderer({
					'x1': agentInfoL.x,
					'x2': agentInfoR.x,
					'y1': y,
					'y2': y,
				}));
			} else if(blockInfo.canHide) {
				clickable.addClass(blockInfo.hide ? 'collapsed' : 'expanded');
			}

			return y + labelHeight + config.section.padding.top;
		}
	}

	class BlockBegin extends BlockSplit {
		makeState(state) {
			state.blocks = new Map();
		}

		resetState(state) {
			state.blocks.clear();
		}

		storeBlockInfo(stage, env) {
			const {canHide} = stage;
			const blockInfo = {
				canHide,
				hide: canHide && env.renderer.isCollapsed(stage.ln),
				hold: null,
				startY: null,
				type: stage.blockType,
			};
			env.state.blocks.set(stage.left, blockInfo);
			return blockInfo;
		}

		prepareMeasurements(stage, env) {
			this.storeBlockInfo(stage, env);
			super.prepareMeasurements(stage, env);
		}

		separationPre(stage, env) {
			this.storeBlockInfo(stage, env);
			super.separationPre(stage, env);
		}

		separation(stage, env) {
			mergeSets(env.visibleAgentIDs, [stage.left, stage.right]);
			super.separation(stage, env);
		}

		renderPre(stage, env) {
			const blockInfo = this.storeBlockInfo(stage, env);

			const config = env.theme.getBlock(blockInfo.type);

			return {
				agentIDs: [stage.left, stage.right],
				topShift: config.margin.top,
			};
		}

		render(stage, env) {
			const hold = env.svg.el('g');
			env.blockLayer.add(hold);

			const blockInfo = env.state.blocks.get(stage.left);
			blockInfo.hold = hold;
			blockInfo.startY = env.primaryY;

			return super.render(stage, env, true);
		}

		shouldHide({left}, env) {
			const blockInfo = env.state.blocks.get(left);
			return {
				nest: blockInfo.hide ? 1 : 0,
				self: false,
			};
		}
	}

	class BlockEnd extends BaseComponent {
		separation({left, right}, env) {
			removeAll(env.visibleAgentIDs, [left, right]);
		}

		renderPre({left, right}, env) {
			const blockInfo = env.state.blocks.get(left);
			const config = env.theme.getBlock(blockInfo.type);

			return {
				agentIDs: [left, right],
				topShift: config.section.padding.bottom,
			};
		}

		render({left, right}, env) {
			const blockInfo = env.state.blocks.get(left);
			const config = env.theme.getBlock(blockInfo.type);
			const agentInfoL = env.agentInfos.get(left);
			const agentInfoR = env.agentInfos.get(right);

			let renderFn = config.boxRenderer;
			if(blockInfo.hide) {
				renderFn = config.collapsedBoxRenderer || renderFn;
			}

			let shapes = renderFn({
				height: env.primaryY - blockInfo.startY,
				width: agentInfoR.x - agentInfoL.x,
				x: agentInfoL.x,
				y: blockInfo.startY,
			});
			if(!shapes.shape) {
				shapes = {shape: shapes};
			}

			blockInfo.hold.add(shapes.shape);
			env.fillLayer.add(shapes.fill);
			env.lineMaskLayer.add(shapes.mask);

			return env.primaryY + config.margin.bottom + env.theme.actionMargin;
		}

		shouldHide({left}, env) {
			const blockInfo = env.state.blocks.get(left);
			return {
				nest: blockInfo.hide ? -1 : 0,
				self: false,
			};
		}
	}

	register('block begin', new BlockBegin());
	register('block split', new BlockSplit());
	register('block end', new BlockEnd());

	const OUTLINE_ATTRS$2 = {
		'class': 'outline',
		'fill': 'transparent',
	};

	const MASK_PAD = 5;

	function applyMask(shape, maskShapes, env, bounds) {
		if(!maskShapes.length) {
			return;
		}
		const mask = env.svg.el('mask')
			.attr('maskUnits', 'userSpaceOnUse')
			.add(env.svg.box({'fill': '#FFFFFF'}, bounds), ...maskShapes);
		shape.attr('mask', 'url(#' + env.addDef(mask) + ')');
	}

	class Arrowhead {
		constructor(propName) {
			this.propName = propName;
		}

		getConfig(theme) {
			return theme.connect.arrow[this.propName];
		}

		short(theme) {
			const arrow = this.getConfig(theme);
			const join = arrow.attrs['stroke-linejoin'] || 'miter';
			const t = arrow.attrs['stroke-width'] * 0.5;
			const lineStroke = theme.agentLineAttrs['']['stroke-width'] * 0.5;
			if(join === 'round') {
				return lineStroke + t;
			} else {
				const h = arrow.height / 2;
				const w = arrow.width;
				const arrowDistance = t * Math.sqrt((w * w) / (h * h) + 1);
				return lineStroke + arrowDistance;
			}
		}

		render({layer}, env, pt, dir) {
			const config = this.getConfig(env.theme);
			const short = this.short(env.theme);
			layer.add(config.render(config.attrs, {
				dir,
				height: config.height,
				width: config.width,
				x: pt.x + short * dir.dx,
				y: pt.y + short * dir.dy,
			}));
		}

		width(theme) {
			return this.short(theme) + this.getConfig(theme).width;
		}

		height(theme) {
			return this.getConfig(theme).height;
		}

		lineGap(theme, line) {
			const arrow = this.getConfig(theme);
			const short = this.short(theme);
			if(arrow.attrs.fill === 'none') {
				const h = arrow.height / 2;
				const w = arrow.width;
				const safe = short + (line.attrs['stroke-width'] / 2) * (w / h);
				return (short + safe) / 2;
			} else {
				return short + arrow.width / 2;
			}
		}
	}

	class Arrowfade {
		getConfig(theme) {
			return theme.connect.arrow.fade;
		}

		render({lineMask}, env, pt, dir) {
			const config = this.getConfig(env.theme);
			const {short, size} = config;
			let fadeID = null;
			const delta = MASK_PAD / (size + MASK_PAD * 2);
			if(dir.dx >= 0) {
				fadeID = env.addDef('arrowFadeL', () => env.svg.linearGradient({}, [
					{'offset': delta * 100 + '%', 'stop-color': '#000000'},
					{'offset': (100 - delta * 100) + '%', 'stop-color': '#FFFFFF'},
				]));
			} else {
				fadeID = env.addDef('arrowFadeR', () => env.svg.linearGradient({}, [
					{'offset': delta * 100 + '%', 'stop-color': '#FFFFFF'},
					{'offset': (100 - delta * 100) + '%', 'stop-color': '#000000'},
				]));
			}
			const p1 = {x: pt.x + dir.dx * short, y: pt.y + dir.dy * short};
			const p2 = {x: p1.x + dir.dx * size, y: p1.y + dir.dy * size};
			const box = env.svg.box({'fill': 'url(#' + fadeID + ')'}, {
				height: Math.abs(p1.y - p2.y) + MASK_PAD * 2,
				width: size + MASK_PAD * 2,
				x: Math.min(p1.x, p2.x) - MASK_PAD,
				y: Math.min(p1.y, p2.y) - MASK_PAD,
			});
			lineMask.push(box);
		}

		width(theme) {
			return this.getConfig(theme).short;
		}

		height() {
			return 0;
		}

		lineGap(theme) {
			return this.getConfig(theme).short;
		}
	}

	class Arrowcross {
		getConfig(theme) {
			return theme.connect.arrow.cross;
		}

		render({layer}, env, pt, dir) {
			const config = this.getConfig(env.theme);
			layer.add(config.render({
				radius: config.radius,
				x: pt.x + config.short * dir.dx,
				y: pt.y + config.short * dir.dy,
			}));
		}

		width(theme) {
			const config = this.getConfig(theme);
			return config.short + config.radius;
		}

		height(theme) {
			return this.getConfig(theme).radius * 2;
		}

		lineGap(theme) {
			return this.getConfig(theme).short;
		}
	}

	const ARROWHEADS = [
		{
			height: () => 0,
			lineGap: () => 0,
			render: () => null,
			width: () => 0,
		},
		new Arrowhead('single'),
		new Arrowhead('double'),
		new Arrowfade(),
		new Arrowcross(),
	];

	class Connect extends BaseComponent {
		prepareMeasurements({agentIDs, label}, env) {
			const config = env.theme.connect;
			const loopback = (agentIDs[0] === agentIDs[1]);
			const labelAttrs = (loopback ?
				config.label.loopbackAttrs : config.label.attrs);

			env.textSizer.expectMeasure(labelAttrs, label);
		}

		separationPre({agentIDs}, env) {
			const r = env.theme.connect.source.radius;
			agentIDs.forEach((id) => {
				const agentInfo = env.agentInfos.get(id);
				if(!agentInfo.isVirtualSource) {
					return;
				}
				agentInfo.currentRad = r;
				agentInfo.currentMaxRad = Math.max(agentInfo.currentMaxRad, r);
			});
		}

		separation({label, agentIDs, options}, env) {
			const config = env.theme.connect;

			const lArrow = ARROWHEADS[options.left];
			const rArrow = ARROWHEADS[options.right];

			const loopback = (agentIDs[0] === agentIDs[1]);
			const labelAttrs = (loopback ?
				config.label.loopbackAttrs : config.label.attrs);

			let labelWidth = env.textSizer.measure(labelAttrs, label).width;
			if(labelWidth > 0) {
				labelWidth += config.label.padding * 2;
			}

			const info1 = env.agentInfos.get(agentIDs[0]);
			if(loopback) {
				env.addSpacing(agentIDs[0], {
					left: 0,
					right: (
						info1.currentMaxRad +
						Math.max(
							labelWidth + lArrow.width(env.theme),
							rArrow.width(env.theme)
						) +
						config.loopbackRadius
					),
				});
			} else {
				const info2 = env.agentInfos.get(agentIDs[1]);
				env.addSeparation(
					agentIDs[0],
					agentIDs[1],

					info1.currentMaxRad +
					info2.currentMaxRad +
					labelWidth +
					Math.max(
						lArrow.width(env.theme),
						rArrow.width(env.theme)
					) * 2
				);
			}

			mergeSets(env.momentaryAgentIDs, agentIDs);
		}

		renderRevArrowLine({x1, y1, x2, y2, xR}, options, env, clickable) {
			const line = env.theme.getConnectLine(options.line);
			const lArrow = ARROWHEADS[options.left];
			const rArrow = ARROWHEADS[options.right];

			const dx1 = lArrow.lineGap(env.theme, line);
			const dx2 = rArrow.lineGap(env.theme, line);
			const rad = env.theme.connect.loopbackRadius;
			const rendered = line.renderRev({
				rad,
				x1: x1 + dx1,
				x2: x2 + dx2,
				xR,
				y1,
				y2,
			});
			clickable.add(rendered.shape);

			const lineMask = [];

			lArrow.render({layer: clickable, lineMask}, env, {
				x: rendered.p1.x - dx1,
				y: rendered.p1.y,
			}, {dx: 1, dy: 0});

			rArrow.render({layer: clickable, lineMask}, env, {
				x: rendered.p2.x - dx2,
				y: rendered.p2.y,
			}, {dx: 1, dy: 0});

			applyMask(rendered.shape, lineMask, env, {
				height: y2 - y1 + MASK_PAD * 2,
				width: xR + rad - Math.min(x1, x2) + MASK_PAD * 2,
				x: Math.min(x1, x2) - MASK_PAD,
				y: y1 - MASK_PAD,
			});
		}

		renderSelfConnect({label, agentIDs, options}, env, from, yBegin) {
			const config = env.theme.connect;

			const lArrow = ARROWHEADS[options.left];
			const rArrow = ARROWHEADS[options.right];

			const to = env.agentInfos.get(agentIDs[1]);

			const height = label ? (
				env.textSizer.measureHeight(config.label.attrs, label) +
				config.label.margin.top +
				config.label.margin.bottom
			) : 0;

			const xL = (
				from.x + from.currentMaxRad +
				lArrow.width(env.theme) +
				(label ? config.label.padding : 0)
			);

			const renderedText = env.svg.boxedText({
				boxAttrs: {'fill': '#000000'},
				labelAttrs: config.label.loopbackAttrs,
				padding: config.mask.padding,
			}, label, {
				x: xL - config.mask.padding.left,
				y: yBegin - height + config.label.margin.top,
			});

			const labelW = (label ? (
				renderedText.width +
				config.label.padding -
				config.mask.padding.left -
				config.mask.padding.right
			) : 0);

			const xR = Math.max(
				to.x + to.currentMaxRad + rArrow.width(env.theme),
				xL + labelW
			);

			const raise = Math.max(height, lArrow.height(env.theme) / 2);
			const arrowDip = rArrow.height(env.theme) / 2;

			env.lineMaskLayer.add(renderedText.box);
			const clickable = env.makeRegion().add(
				env.svg.box(OUTLINE_ATTRS$2, {
					'height': raise + env.primaryY - yBegin + arrowDip,
					'width': xR + config.loopbackRadius - from.x,
					'x': from.x,
					'y': yBegin - raise,
				}),
				renderedText.label
			);

			this.renderRevArrowLine({
				x1: from.x + from.currentMaxRad,
				x2: to.x + to.currentMaxRad,
				xR,
				y1: yBegin,
				y2: env.primaryY,
			}, options, env, clickable);

			return (
				env.primaryY +
				Math.max(arrowDip, 0) +
				env.theme.actionMargin
			);
		}

		renderArrowLine({x1, y1, x2, y2}, options, env, clickable) {
			const line = env.theme.getConnectLine(options.line);
			const lArrow = ARROWHEADS[options.left];
			const rArrow = ARROWHEADS[options.right];

			const len = Math.sqrt(
				(x2 - x1) * (x2 - x1) +
				(y2 - y1) * (y2 - y1)
			);
			const d1 = lArrow.lineGap(env.theme, line);
			const d2 = rArrow.lineGap(env.theme, line);
			const dx = (x2 - x1) / len;
			const dy = (y2 - y1) / len;

			const rendered = line.renderFlat({
				x1: x1 + d1 * dx,
				x2: x2 - d2 * dx,
				y1: y1 + d1 * dy,
				y2: y2 - d2 * dy,
			});
			clickable.add(rendered.shape);

			const p1 = {x: rendered.p1.x - d1 * dx, y: rendered.p1.y - d1 * dy};
			const p2 = {x: rendered.p2.x + d2 * dx, y: rendered.p2.y + d2 * dy};

			const lineMask = [];

			lArrow.render({layer: clickable, lineMask}, env, p1, {dx, dy});
			rArrow.render({layer: clickable, lineMask}, env, p2, {
				dx: -dx,
				dy: -dy,
			});

			applyMask(rendered.shape, lineMask, env, {
				height: Math.abs(y2 - y1) + MASK_PAD * 2,
				width: Math.abs(x2 - x1) + MASK_PAD * 2,
				x: Math.min(x1, x2) - MASK_PAD,
				y: Math.min(y1, y2) - MASK_PAD,
			});

			return {
				lArrow,
				p1,
				p2,
				rArrow,
			};
		}

		renderVirtualSources({from, to, rendered}, env, clickable) {
			const config = env.theme.connect.source;

			if(from.isVirtualSource) {
				clickable.add(config.render({
					radius: config.radius,
					x: rendered.p1.x - config.radius,
					y: rendered.p1.y,
				}));
			}
			if(to.isVirtualSource) {
				clickable.add(config.render({
					radius: config.radius,
					x: rendered.p2.x + config.radius,
					y: rendered.p2.y,
				}));
			}
		}

		renderSimpleLabel(label, {layer, x1, x2, y1, y2, height}, env) {
			const config = env.theme.connect;

			const midX = (x1 + x2) / 2;
			const midY = (y1 + y2) / 2;

			let labelLayer = layer;
			const boxAttrs = {'fill': '#000000'};
			if(y1 !== y2) {
				const angle = Math.atan((y2 - y1) / (x2 - x1));
				const transform = (
					'rotate(' +
					(angle * 180 / Math.PI) +
					' ' + midX + ',' + midY +
					')'
				);
				boxAttrs.transform = transform;
				labelLayer = env.svg.el('g').attr('transform', transform);
				layer.add(labelLayer);
			}

			const text = env.svg.boxedText({
				boxAttrs,
				labelAttrs: config.label.attrs,
				padding: config.mask.padding,
			}, label, {
				x: midX,
				y: midY + config.label.margin.top - height,
			});
			env.lineMaskLayer.add(text.box);
			labelLayer.add(text.label);
		}

		renderSimpleConnect({label, agentIDs, options}, env, from, yBegin) {
			const config = env.theme.connect;
			const to = env.agentInfos.get(agentIDs[1]);

			const dir = (from.x < to.x) ? 1 : -1;

			const height = (
				env.textSizer.measureHeight(config.label.attrs, label) +
				config.label.margin.top +
				config.label.margin.bottom
			);

			const x1 = from.x + from.currentMaxRad * dir;
			const x2 = to.x - to.currentMaxRad * dir;

			const clickable = env.makeRegion();

			const rendered = this.renderArrowLine({
				x1,
				x2,
				y1: yBegin,
				y2: env.primaryY,
			}, options, env, clickable);

			const arrowSpread = Math.max(
				rendered.lArrow.height(env.theme),
				rendered.rArrow.height(env.theme)
			) / 2;

			const lift = Math.max(height, arrowSpread);

			this.renderVirtualSources({from, rendered, to}, env, clickable);

			clickable.add(env.svg.el('path')
				.attrs(OUTLINE_ATTRS$2)
				.attr('d', (
					'M' + x1 + ',' + (yBegin - lift) +
					'L' + x2 + ',' + (env.primaryY - lift) +
					'L' + x2 + ',' + (env.primaryY + arrowSpread) +
					'L' + x1 + ',' + (yBegin + arrowSpread) +
					'Z'
				)));

			this.renderSimpleLabel(label, {
				height,
				layer: clickable,
				x1,
				x2,
				y1: yBegin,
				y2: env.primaryY,
			}, env);

			return env.primaryY + Math.max(
				arrowSpread + env.theme.minActionMargin,
				env.theme.actionMargin
			);
		}

		renderPre({label, agentIDs, options}, env) {
			const config = env.theme.connect;

			const lArrow = ARROWHEADS[options.left];
			const rArrow = ARROWHEADS[options.right];

			const height = (
				env.textSizer.measureHeight(config.label.attrs, label) +
				config.label.margin.top +
				config.label.margin.bottom
			);

			let arrowH = lArrow.height(env.theme);
			if(agentIDs[0] !== agentIDs[1]) {
				arrowH = Math.max(arrowH, rArrow.height(env.theme));
			}

			return {
				agentIDs,
				topShift: Math.max(arrowH / 2, height),
			};
		}

		render(stage, env, from = null, yBegin = null) {
			let yb = yBegin;
			let f = from;
			if(from === null) {
				f = env.agentInfos.get(stage.agentIDs[0]);
				yb = env.primaryY;
			}
			if(stage.agentIDs[0] === stage.agentIDs[1]) {
				return this.renderSelfConnect(stage, env, f, yb);
			} else {
				return this.renderSimpleConnect(stage, env, f, yb);
			}
		}
	}

	class ConnectDelayBegin extends Connect {
		makeState(state) {
			state.delayedConnections = new Map();
		}

		resetState(state) {
			state.delayedConnections.clear();
		}

		separation(stage, env) {
			super.separation(stage, env);
			mergeSets(env.momentaryAgentIDs, [stage.agentIDs[0]]);
		}

		renderPre(stage, env) {
			return Object.assign(super.renderPre(stage, env), {
				agentIDs: [stage.agentIDs[0]],
			});
		}

		render(stage, env) {
			const dc = env.state.delayedConnections;
			dc.set(stage.tag, {
				from: Object.assign({}, env.agentInfos.get(stage.agentIDs[0])),
				stage,
				y: env.primaryY,
			});
			return env.primaryY + env.theme.actionMargin;
		}

		renderHidden(stage, env) {
			this.render(stage, env);
		}
	}

	class ConnectDelayEnd extends Connect {
		prepareMeasurements() {
			// No-op
		}

		separationPre() {
			// No-op
		}

		separation() {
			// No-op
		}

		renderPre({tag}, env) {
			const config = env.theme.connect;

			const dc = env.state.delayedConnections;
			const begin = dc.get(tag);
			const beginStage = begin.stage;
			const agentIDs = [beginStage.agentIDs[1]];

			if(beginStage.agentIDs[0] === beginStage.agentIDs[1]) {
				return {
					agentIDs,
					y: begin.y + config.loopbackRadius * 2,
				};
			}

			return Object.assign(super.renderPre(beginStage, env), {agentIDs});
		}

		render({tag}, env) {
			const dc = env.state.delayedConnections;
			const begin = dc.get(tag);
			return super.render(begin.stage, env, begin.from, begin.y);
		}
	}

	register('connect', new Connect());
	register('connect-delay-begin', new ConnectDelayBegin());
	register('connect-delay-end', new ConnectDelayEnd());

	const OUTLINE_ATTRS$1 = {
		'class': 'outline',
		'fill': 'transparent',
	};

	class Divider extends BaseComponent {
		prepareMeasurements({mode, formattedLabel}, env) {
			const config = env.theme.getDivider(mode);
			env.textSizer.expectMeasure(config.labelAttrs, formattedLabel);
		}

		separation({mode, formattedLabel}, env) {
			const config = env.theme.getDivider(mode);

			const width = (
				env.textSizer.measure(config.labelAttrs, formattedLabel).width +
				config.padding.left +
				config.padding.right
			);

			env.addSeparation('[', ']', width);
			env.addSpacing('[', {left: config.extend, right: 0});
			env.addSpacing(']', {left: 0, right: config.extend});
		}

		renderPre() {
			return {
				agentIDs: ['[', ']'],
			};
		}

		render({mode, height, formattedLabel}, env) {
			const config = env.theme.getDivider(mode);

			const left = env.agentInfos.get('[');
			const right = env.agentInfos.get(']');

			let labelWidth = 0;
			let labelHeight = 0;
			if(formattedLabel) {
				labelHeight = env.textSizer.measureHeight(
					config.labelAttrs,
					formattedLabel
				);
			}

			const fullHeight = Math.max(height, labelHeight) + config.margin;

			let labelText = null;
			if(formattedLabel) {
				const boxed = env.svg.boxedText({
					boxAttrs: {'fill': '#000000'},
					labelAttrs: config.labelAttrs,
					padding: config.padding,
				}, formattedLabel, {
					x: (left.x + right.x) / 2,
					y: (
						env.primaryY +
						(fullHeight - labelHeight) / 2 -
						config.padding.top
					),
				});
				env.fullMaskLayer.add(boxed.box);
				labelText = boxed.label;
				labelWidth = boxed.width;
			}

			const {shape, mask} = config.render({
				env,
				height,
				labelHeight,
				labelWidth,
				width: right.x - left.x + config.extend * 2,
				x: left.x - config.extend,
				y: env.primaryY + (fullHeight - height) / 2,
			});
			env.fullMaskLayer.add(mask);

			env.makeRegion({unmasked: true}).add(
				env.svg.box(OUTLINE_ATTRS$1, {
					'height': fullHeight,
					'width': right.x - left.x + config.extend * 2,
					'x': left.x - config.extend,
					'y': env.primaryY,
				}),
				shape,
				labelText
			);

			return env.primaryY + fullHeight + env.theme.actionMargin;
		}
	}

	register('divider', new Divider());

	class Mark extends BaseComponent {
		makeState(state) {
			state.marks = new Map();
		}

		resetState(state) {
			state.marks.clear();
		}

		render({name}, {topY, state}) {
			state.marks.set(name, topY);
		}

		renderHidden(stage, env) {
			this.render(stage, env);
		}
	}

	class Async extends BaseComponent {
		renderPre({target}, {state}) {
			let y = 0;
			if(target && state.marks) {
				y = state.marks.get(target) || 0;
			}
			return {
				asynchronousY: y,
			};
		}
	}

	register('mark', new Mark());
	register('async', new Async());

	const OUTLINE_ATTRS = {
		'class': 'outline',
		'fill': 'transparent',
	};

	function findExtremes$1(agentInfos, agentIDs) {
		let min = null;
		let max = null;
		agentIDs.forEach((id) => {
			const info = agentInfos.get(id);
			if(min === null || info.index < min.index) {
				min = info;
			}
			if(max === null || info.index > max.index) {
				max = info;
			}
		});
		return {
			left: min.id,
			right: max.id,
		};
	}

	function findEdges(fullW, {
		x0 = null,
		x1 = null,
		xMid = null,
	}) {
		let xL = x0;
		let xR = x1;
		if(xL === null && xMid !== null) {
			xL = xMid - fullW / 2;
		}
		if(xR === null && xL !== null) {
			xR = xL + fullW;
		} else if(xL === null) {
			xL = xR - fullW;
		}
		return {xL, xR};
	}

	function textAnchorX(anchor, {xL, xR}, padding) {
		switch(anchor) {
		case 'middle':
			return (xL + padding.left + xR - padding.right) / 2;
		case 'end':
			return xR - padding.right;
		default:
			return xL + padding.left;
		}
	}

	class NoteComponent extends BaseComponent {
		prepareMeasurements({mode, label}, env) {
			const config = env.theme.getNote(mode);
			env.textSizer.expectMeasure(config.labelAttrs, label);
		}

		renderPre({agentIDs}) {
			return {agentIDs};
		}

		renderNote({
			label,
			mode,
			position,
		}, env) {
			const config = env.theme.getNote(mode);
			const {padding} = config;

			const y = env.topY + config.margin.top + padding.top;
			const labelNode = env.svg.formattedText(config.labelAttrs, label);
			const size = env.textSizer.measure(labelNode);

			const fullW = (size.width + padding.left + padding.right);
			const fullH = (size.height + padding.top + padding.bottom);
			const edges = findEdges(fullW, position);

			labelNode.set({
				x: textAnchorX(config.labelAttrs['text-anchor'], edges, padding),
				y,
			});

			const boundingBox = {
				height: fullH,
				width: edges.xR - edges.xL,
				x: edges.xL,
				y: env.topY + config.margin.top,
			};

			env.makeRegion().add(
				config.boxRenderer(boundingBox),
				env.svg.box(OUTLINE_ATTRS, boundingBox),
				labelNode
			);

			return (
				env.topY +
				config.margin.top +
				fullH +
				config.margin.bottom +
				env.theme.actionMargin
			);
		}
	}

	class NoteOver extends NoteComponent {
		separation({agentIDs, mode, label}, env) {
			const config = env.theme.getNote(mode);
			const width = (
				env.textSizer.measure(config.labelAttrs, label).width +
				config.padding.left +
				config.padding.right
			);

			const {left, right} = findExtremes$1(env.agentInfos, agentIDs);
			const infoL = env.agentInfos.get(left);
			const infoR = env.agentInfos.get(right);
			if(infoL === infoR) {
				env.addSpacing(left, {
					left: width / 2,
					right: width / 2,
				});
			} else {
				const hangL = infoL.currentMaxRad + config.overlap.left;
				const hangR = infoR.currentMaxRad + config.overlap.right;

				env.addSeparation(left, right, width - hangL - hangR);

				env.addSpacing(left, {left: hangL, right: 0});
				env.addSpacing(right, {left: 0, right: hangR});
			}
		}

		render({agentIDs, mode, label}, env) {
			const config = env.theme.getNote(mode);

			const {left, right} = findExtremes$1(env.agentInfos, agentIDs);
			const infoL = env.agentInfos.get(left);
			const infoR = env.agentInfos.get(right);
			if(infoL === infoR) {
				const xMid = infoL.x;
				return this.renderNote({
					label,
					mode,
					position: {xMid},
				}, env);
			} else {
				return this.renderNote({
					label,
					mode,
					position: {
						x0: infoL.x - infoL.currentMaxRad - config.overlap.left,
						x1: infoR.x + infoR.currentMaxRad + config.overlap.right,
					},
				}, env);
			}
		}
	}

	class NoteSide extends NoteComponent {
		constructor(isRight) {
			super();
			this.isRight = isRight;
		}

		separation({agentIDs, mode, label}, env) {
			const config = env.theme.getNote(mode);
			const {left, right} = findExtremes$1(env.agentInfos, agentIDs);
			const width = (
				env.textSizer.measure(config.labelAttrs, label).width +
				config.padding.left +
				config.padding.right +
				config.margin.left +
				config.margin.right
			);

			if(this.isRight) {
				const info = env.agentInfos.get(right);
				env.addSpacing(right, {
					left: 0,
					right: width + info.currentMaxRad,
				});
			} else {
				const info = env.agentInfos.get(left);
				env.addSpacing(left, {
					left: width + info.currentMaxRad,
					right: 0,
				});
			}
		}

		render({agentIDs, mode, label}, env) {
			const config = env.theme.getNote(mode);
			const {left, right} = findExtremes$1(env.agentInfos, agentIDs);
			if(this.isRight) {
				const info = env.agentInfos.get(right);
				const x0 = info.x + info.currentMaxRad + config.margin.left;
				return this.renderNote({
					label,
					mode,
					position: {x0},
				}, env);
			} else {
				const info = env.agentInfos.get(left);
				const x1 = info.x - info.currentMaxRad - config.margin.right;
				return this.renderNote({
					label,
					mode,
					position: {x1},
				}, env);
			}
		}
	}

	class NoteBetween extends NoteComponent {
		separation({agentIDs, mode, label}, env) {
			const config = env.theme.getNote(mode);
			const {left, right} = findExtremes$1(env.agentInfos, agentIDs);
			const infoL = env.agentInfos.get(left);
			const infoR = env.agentInfos.get(right);

			env.addSeparation(
				left,
				right,

				env.textSizer.measure(config.labelAttrs, label).width +
				config.padding.left +
				config.padding.right +
				config.margin.left +
				config.margin.right +
				infoL.currentMaxRad +
				infoR.currentMaxRad
			);
		}

		render({agentIDs, mode, label}, env) {
			const {left, right} = findExtremes$1(env.agentInfos, agentIDs);
			const infoL = env.agentInfos.get(left);
			const infoR = env.agentInfos.get(right);
			const xMid = (
				infoL.x + infoL.currentMaxRad +
				infoR.x - infoR.currentMaxRad
			) / 2;

			return this.renderNote({
				label,
				mode,
				position: {xMid},
			}, env);
		}
	}

	register('note over', new NoteOver());
	register('note left', new NoteSide(false));
	register('note right', new NoteSide(true));
	register('note between', new NoteBetween());

	function nullableMax(a = null, b = null) {
		if(a === null) {
			return b;
		}
		if(b === null) {
			return a;
		}
		return Math.max(a, b);
	}

	function mergeResults(a, b) {
		mergeSets(a.agentIDs, b.agentIDs);
		return {
			agentIDs: a.agentIDs,
			asynchronousY: nullableMax(a.asynchronousY, b.asynchronousY),
			topShift: Math.max(a.topShift, b.topShift),
			y: nullableMax(a.y, b.y),
		};
	}

	class Parallel extends BaseComponent {
		invokeChildren(stage, env, methodName) {
			return stage.stages.map((subStage) => {
				const component = env.components.get(subStage.type);
				return component[methodName](subStage, env);
			});
		}

		prepareMeasurements(stage, env) {
			this.invokeChildren(stage, env, 'prepareMeasurements');
		}

		separationPre(stage, env) {
			this.invokeChildren(stage, env, 'separationPre');
		}

		separation(stage, env) {
			this.invokeChildren(stage, env, 'separation');
		}

		renderPre(stage, env) {
			const baseResults = {
				agentIDs: [],
				asynchronousY: null,
				topShift: 0,
			};

			return this.invokeChildren(stage, env, 'renderPre')
				.map((r) => cleanRenderPreResult(r))
				.reduce(mergeResults, baseResults);
		}

		render(stage, env) {
			const originalMakeRegion = env.makeRegion;
			let bottomY = 0;
			stage.stages.forEach((subStage) => {
				env.makeRegion = (options = {}) => (
					originalMakeRegion(Object.assign({
						stageOverride: subStage,
					}, options))
				);

				const component = env.components.get(subStage.type);
				const baseY = component.render(subStage, env) || 0;
				bottomY = Math.max(bottomY, baseY);
			});
			env.makeRegion = originalMakeRegion;
			return bottomY;
		}

		renderHidden(stage, env) {
			this.invokeChildren(stage, env, 'renderHidden');
		}

		shouldHide(stage, env) {
			const baseResults = {
				nest: 0,
				self: false,
			};
			return this.invokeChildren(stage, env, 'shouldHide')
				.reduce((result, {self = false, nest = 0} = {}) => ({
					nest: result.nest + nest,
					self: result.self || Boolean(self),
				}), baseResults);
		}
	}

	register('parallel', new Parallel());

	function make(value, document) {
		if(typeof value === 'string') {
			return document.createTextNode(value);
		} else if(typeof value === 'number') {
			return document.createTextNode(value.toString(10));
		} else if(typeof value === 'object' && value.element) {
			return value.element;
		} else {
			return value;
		}
	}

	function unwrap(node) {
		if(node === null) {
			return null;
		} else if(node.element) {
			return node.element;
		} else {
			return node;
		}
	}

	class WrappedElement {
		constructor(element) {
			this.element = element;
		}

		addBefore(child = null, before = null) {
			if(child === null) {
				return this;
			} else if(Array.isArray(child)) {
				for(const c of child) {
					this.addBefore(c, before);
				}
			} else {
				const childElement = make(child, this.element.ownerDocument);
				this.element.insertBefore(childElement, unwrap(before));
			}
			return this;
		}

		add(...child) {
			return this.addBefore(child, null);
		}

		del(child = null) {
			if(child !== null) {
				this.element.removeChild(unwrap(child));
			}
			return this;
		}

		attr(key, value) {
			this.element.setAttribute(key, value);
			return this;
		}

		attrs(attrs) {
			for(const k in attrs) {
				if(Object.prototype.hasOwnProperty.call(attrs, k)) {
					this.element.setAttribute(k, attrs[k]);
				}
			}
			return this;
		}

		styles(styles) {
			for(const k in styles) {
				if(Object.prototype.hasOwnProperty.call(styles, k)) {
					this.element.style[k] = styles[k];
				}
			}
			return this;
		}

		setClass(cls) {
			return this.attr('class', cls);
		}

		addClass(cls) {
			const classes = this.element.getAttribute('class');
			if(!classes) {
				return this.setClass(cls);
			}
			const list = classes.split(' ');
			if(list.includes(cls)) {
				return this;
			}
			list.push(cls);
			return this.attr('class', list.join(' '));
		}

		delClass(cls) {
			const classes = this.element.getAttribute('class');
			if(!classes) {
				return this;
			}
			const list = classes.split(' ');
			const p = list.indexOf(cls);
			if(p !== -1) {
				list.splice(p, 1);
				this.attr('class', list.join(' '));
			}
			return this;
		}

		text(text) {
			this.element.textContent = text;
			return this;
		}

		on(event, callback, options = {}) {
			if(Array.isArray(event)) {
				for(const e of event) {
					this.on(e, callback, options);
				}
			} else {
				this.element.addEventListener(event, callback, options);
			}
			return this;
		}

		off(event, callback, options = {}) {
			if(Array.isArray(event)) {
				for(const e of event) {
					this.off(e, callback, options);
				}
			} else {
				this.element.removeEventListener(event, callback, options);
			}
			return this;
		}

		val(value) {
			this.element.value = value;
			return this;
		}

		select(start, end = null) {
			this.element.selectionStart = start;
			this.element.selectionEnd = (end === null) ? start : end;
			return this;
		}

		focus() {
			this.element.focus();
			return this;
		}

		focussed() {
			return this.element === this.element.ownerDocument.activeElement;
		}

		empty() {
			while(this.element.childNodes.length > 0) {
				this.element.removeChild(this.element.lastChild);
			}
			return this;
		}

		attach(parent) {
			unwrap(parent).appendChild(this.element);
			return this;
		}

		detach() {
			if(this.element.parentNode) {
				this.element.parentNode.removeChild(this.element);
			}
			return this;
		}
	}

	class DOMWrapper {
		constructor(document) {
			if(!document) {
				throw new Error('Missing document!');
			}
			this.document = document;
			this.wrap = this.wrap.bind(this);
			this.el = this.el.bind(this);
			this.txt = this.txt.bind(this);
		}

		wrap(element) {
			if(element.element) {
				return element;
			} else {
				return new WrappedElement(element);
			}
		}

		el(tag, namespace = null) {
			let element = null;
			if(namespace === null) {
				element = this.document.createElement(tag);
			} else {
				element = this.document.createElementNS(namespace, tag);
			}
			return new WrappedElement(element);
		}

		txt(content = '') {
			return this.document.createTextNode(content);
		}
	}

	DOMWrapper.WrappedElement = WrappedElement;

	function merge(state, newState) {
		for(const k in state) {
			if(Object.prototype.hasOwnProperty.call(state, k)) {
				if(newState[k] !== null && typeof newState[k] !== 'undefined') {
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
			let element = text;
			if(attrs) {
				if(attrs.href) {
					element = svg.el('a').attrs({
						'cursor': 'pointer',
						'rel': 'nofollow',
						'target': '_blank',
					});
				} else {
					element = svg.el('tspan');
				}
				element.attrs(attrs).add(text);
				if(attrs.filter) {
					element.attr('filter', svg.getTextFilter(attrs.filter));
				}
			}
			node.add(element);
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
						latest: '',
						node: this.svg.el('text')
							.attr('x', this.state.x)
							.attrs(this.state.attrs)
							.attach(this.container),
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
			let curY = this.state.y;
			for(let i = 0; i < this.lines.length; ++ i) {
				const line = [this.state.formatted[i]];
				const baseline = sizer.baseline(this.state.attrs, line);
				this.lines[i].node.attr('y', curY + baseline);
				curY += sizer.measureHeight(this.state.attrs, line);
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

	class TextSizer {
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
	}

	class PatternedLine {
		constructor(pattern = null, phase = 0) {
			this.pattern = pattern;
			this.dw = pattern && pattern.partWidth;
			this.points = [];
			this.phase = phase;
			this.x = null;
			this.y = null;
			this.disconnect = 0;
		}

		_nextDelta() {
			return this.pattern.getDelta(this.phase ++);
		}

		_link() {
			if(this.disconnect === 2) {
				this.points.push(this.x + ' ' + this.y);
				this.disconnect = 0;
			}
		}

		cap() {
			if(this.disconnect > 0) {
				this.points.push(this.x + ' ' + this.y);
				this.disconnect = 0;
			}
			return this;
		}

		move(x, y) {
			this.cap();
			this.x = x;
			this.y = y;
			this.disconnect = 2;
			return this;
		}

		line(x, y, {patterned = true} = {}) {
			if(this.pattern && patterned) {
				const len = Math.sqrt(
					(x - this.x) * (x - this.x) +
					(y - this.y) * (y - this.y)
				);
				const dx1 = (x - this.x) / len;
				const dy1 = (y - this.y) / len;
				const dx2 = -dy1;
				const dy2 = dx1;

				for(let pos = 0; pos + this.dw <= len; pos += this.dw) {
					const delta = this._nextDelta();
					this.points.push(
						(this.x + pos * dx1 + delta * dx2) + ' ' +
						(this.y + pos * dy1 + delta * dy2)
					);
				}
				this.disconnect = 1;
			} else {
				this._link();
				this.disconnect = 2;
			}

			this.x = x;
			this.y = y;
			return this;
		}

		arc(cx, cy, theta) {
			const radius = Math.sqrt(
				(cx - this.x) * (cx - this.x) +
				(cy - this.y) * (cy - this.y)
			);
			const theta1 = Math.atan2(this.x - cx, cy - this.y);
			const nextX = cx + Math.sin(theta1 + theta) * radius;
			const nextY = cy - Math.cos(theta1 + theta) * radius;

			if(this.pattern) {
				const dir = (theta < 0 ? 1 : -1);
				const dt = this.dw / radius;

				for(let t = theta1; t + dt <= theta1 + theta; t += dt) {
					const delta = this._nextDelta() * dir;
					this.points.push(
						(cx + Math.sin(t) * (radius + delta)) + ' ' +
						(cy - Math.cos(t) * (radius + delta))
					);
				}
				this.disconnect = 1;
			} else {
				this.points.push(
					this.x + ' ' + this.y +
					'A' + radius + ' ' + radius + ' 0 ' +
					((Math.abs(theta) >= Math.PI) ? '1 ' : '0 ') +
					((theta < 0) ? '0 ' : '1 ') +
					nextX + ' ' + nextY
				);
				this.disconnect = 0;
			}

			this.x = nextX;
			this.y = nextY;

			return this;
		}

		asPath() {
			this._link();
			return 'M' + this.points.join('L');
		}
	}

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
								cacheLine.formatted
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

	class SVG {
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
					.attrs(flickAttrs)
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

	function findExtremes(agentInfos, agentIDs) {
		let min = null;
		let max = null;
		agentIDs.forEach((id) => {
			const info = agentInfos.get(id);
			if(min === null || info.index < min.index) {
				min = info;
			}
			if(max === null || info.index > max.index) {
				max = info;
			}
		});
		return {
			left: min.id,
			right: max.id,
		};
	}

	function makeThemes(themes) {
		if(themes.length === 0) {
			throw new Error('Cannot render without a theme');
		}
		const themeMap = new Map();
		themes.forEach((theme) => {
			themeMap.set(theme.name, theme);
		});
		themeMap.set('', themes[0]);
		return themeMap;
	}

	let globalNamespace = 0;

	function parseNamespace(namespace) {
		if(namespace === null) {
			return 'R' + (globalNamespace ++);
		}
		return namespace;
	}

	class Renderer extends EventObject {
		constructor({
			themes = [],
			namespace = null,
			components = null,
			document,
			textSizerFactory = null,
		} = {}) {
			super();

			this._bindMethods();

			this.state = {};
			this.width = 0;
			this.height = 0;
			this.themes = makeThemes(themes);
			this.themeBuilder = null;
			this.theme = null;
			this.namespace = parseNamespace(namespace);
			this.components = components || getComponents();
			this.svg = new SVG(new DOMWrapper(document), textSizerFactory);
			this.knownThemeDefs = new Set();
			this.knownTextFilterDefs = new Map();
			this.knownDefs = new Set();
			this.highlights = new Map();
			this.collapsed = new Set();
			this.currentHighlight = -1;
			this.buildStaticElements();
			this.components.forEach((component) => {
				component.makeState(this.state);
			});
		}

		_bindMethods() {
			this.separationStage = this.separationStage.bind(this);
			this.prepareMeasurementsStage =
				this.prepareMeasurementsStage.bind(this);
			this.renderStage = this.renderStage.bind(this);
			this.addThemeDef = this.addThemeDef.bind(this);
			this.addThemeTextDef = this.addThemeTextDef.bind(this);
			this.addDef = this.addDef.bind(this);
		}

		addTheme(theme) {
			this.themes.set(theme.name, theme);
		}

		buildStaticElements() {
			const {el} = this.svg;

			this.metaCode = this.svg.txt();
			this.themeDefs = el('defs');
			this.defs = el('defs');
			this.fullMask = el('mask').attrs({
				'id': this.namespace + 'FullMask',
				'maskUnits': 'userSpaceOnUse',
			});
			this.lineMask = el('mask').attrs({
				'id': this.namespace + 'LineMask',
				'maskUnits': 'userSpaceOnUse',
			});
			this.fullMaskReveal = el('rect').attr('fill', '#FFFFFF');
			this.lineMaskReveal = el('rect').attr('fill', '#FFFFFF');
			this.backgroundFills = el('g');
			this.agentLines = el('g')
				.attr('mask', 'url(#' + this.namespace + 'LineMask)');
			this.blocks = el('g');
			this.shapes = el('g');
			this.unmaskedShapes = el('g');
			this.title = this.svg.formattedText();

			this.svg.body.add(
				this.svg.el('metadata')
					.add(this.metaCode),
				this.themeDefs,
				this.defs,
				this.backgroundFills,
				this.title,
				this.unmaskedShapes,
				el('g')
					.attr('mask', 'url(#' + this.namespace + 'FullMask)')
					.add(
						this.agentLines,
						this.blocks,
						this.shapes
					)
			);
		}

		addThemeDef(name, generator) {
			const namespacedName = this.namespace + name;
			if(!this.knownThemeDefs.has(name)) {
				this.knownThemeDefs.add(name);
				this.themeDefs.add(generator().attr('id', namespacedName));
			}
			return namespacedName;
		}

		addThemeTextDef(name, generator) {
			const namespacedName = this.namespace + name;
			if(!this.knownTextFilterDefs.has(name)) {
				const def = generator().attr('id', namespacedName);
				this.knownTextFilterDefs.set(name, def);
			}
			this.svg.registerTextFilter(name, namespacedName);
		}

		addDef(name, generator) {
			let nm = name;
			let gen = generator;

			if(typeof generator !== 'function') {
				nm = 'P' + this.knownDefs.size;
				gen = () => name;
			}

			const namespacedName = this.namespace + nm;
			if(!this.knownDefs.has(nm)) {
				this.knownDefs.add(nm);
				this.defs.add(gen().attr('id', namespacedName));
			}
			return namespacedName;
		}

		addSeparation(agentID1, agentID2, dist) {
			const info1 = this.agentInfos.get(agentID1);
			const info2 = this.agentInfos.get(agentID2);

			const d1 = info1.separations.get(agentID2) || 0;
			info1.separations.set(agentID2, Math.max(d1, dist));

			const d2 = info2.separations.get(agentID1) || 0;
			info2.separations.set(agentID1, Math.max(d2, dist));
		}

		checkHidden(stage) {
			const component = this.components.get(stage.type);
			const env = {
				agentInfos: this.agentInfos,
				components: this.components,
				renderer: this,
				state: this.state,
				textSizer: this.svg.textSizer,
				theme: this.theme,
			};

			const hide = component.shouldHide(stage, env) || {};

			const wasHidden = (this.hideNest > 0);
			this.hideNest += hide.nest || 0;
			const isHidden = (this.hideNest > 0);

			if(this.hideNest < 0) {
				throw new Error('Unexpected nesting in ' + stage.type);
			}
			if(wasHidden === isHidden) {
				return isHidden;
			} else {
				return Boolean(hide.self);
			}
		}

		separationStage(stage) {
			const agentSpaces = new Map();
			const agentIDs = this.visibleAgentIDs.slice();
			const seps = [];

			const addSpacing = (agentID, {left, right}) => {
				const current = agentSpaces.get(agentID);
				current.left = Math.max(current.left, left);
				current.right = Math.max(current.right, right);
			};

			const addSeparation = (agentID1, agentID2, dist) => {
				seps.push({agentID1, agentID2, dist});
			};

			this.agentInfos.forEach((agentInfo) => {
				const rad = agentInfo.currentRad;
				agentInfo.currentMaxRad = rad;
				agentSpaces.set(agentInfo.id, {left: rad, right: rad});
			});

			const env = {
				addSeparation,
				addSpacing,
				agentInfos: this.agentInfos,
				components: this.components,
				momentaryAgentIDs: agentIDs,
				renderer: this,
				state: this.state,
				textSizer: this.svg.textSizer,
				theme: this.theme,
				visibleAgentIDs: this.visibleAgentIDs,
			};

			const component = this.components.get(stage.type);
			if(!component) {
				throw new Error('Unknown component: ' + stage.type);
			}

			component.separationPre(stage, env);
			component.separation(stage, env);

			if(this.checkHidden(stage)) {
				return;
			}

			mergeSets(agentIDs, this.visibleAgentIDs);

			seps.forEach(({agentID1, agentID2, dist}) => {
				this.addSeparation(agentID1, agentID2, dist);
			});

			agentIDs.forEach((agentIDR) => {
				const infoR = this.agentInfos.get(agentIDR);
				const sepR = agentSpaces.get(agentIDR);
				infoR.maxRPad = Math.max(infoR.maxRPad, sepR.right);
				infoR.maxLPad = Math.max(infoR.maxLPad, sepR.left);
				agentIDs.forEach((agentIDL) => {
					const infoL = this.agentInfos.get(agentIDL);
					if(infoL.index >= infoR.index) {
						return;
					}
					const sepL = agentSpaces.get(agentIDL);
					this.addSeparation(
						agentIDR,
						agentIDL,
						sepR.left + sepL.right + this.theme.agentMargin
					);
				});
			});
		}

		prepareMeasurementsStage(stage) {
			const env = {
				agentInfos: this.agentInfos,
				components: this.components,
				renderer: this,
				state: this.state,
				textSizer: this.svg.textSizer,
				theme: this.theme,
			};

			const component = this.components.get(stage.type);
			if(!component) {
				throw new Error('Unknown component: ' + stage.type);
			}

			component.prepareMeasurements(stage, env);
		}

		checkAgentRange(agentIDs, topY = 0) {
			if(agentIDs.length === 0) {
				return topY;
			}
			const {left, right} = findExtremes(this.agentInfos, agentIDs);
			const leftX = this.agentInfos.get(left).x;
			const rightX = this.agentInfos.get(right).x;
			let baseY = topY;
			this.agentInfos.forEach((agentInfo) => {
				if(agentInfo.x >= leftX && agentInfo.x <= rightX) {
					baseY = Math.max(baseY, agentInfo.latestY);
				}
			});
			return baseY;
		}

		markAgentRange(agentIDs, y) {
			if(agentIDs.length === 0) {
				return;
			}
			const {left, right} = findExtremes(this.agentInfos, agentIDs);
			const leftX = this.agentInfos.get(left).x;
			const rightX = this.agentInfos.get(right).x;
			this.agentInfos.forEach((agentInfo) => {
				if(agentInfo.x >= leftX && agentInfo.x <= rightX) {
					agentInfo.latestY = y;
				}
			});
		}

		drawAgentLine(agentInfo, toY) {
			if(
				agentInfo.latestYStart !== null &&
				toY > agentInfo.latestYStart
			) {
				this.agentLines.add(this.theme.renderAgentLine({
					className: 'agent-' + agentInfo.index + '-line',
					options: agentInfo.options,
					width: agentInfo.currentRad * 2,
					x: agentInfo.x,
					y0: agentInfo.latestYStart,
					y1: toY,
				}));
			}
		}

		addHighlightObject(line, o) {
			let list = this.highlights.get(line);
			if(!list) {
				list = [];
				this.highlights.set(line, list);
			}
			list.push(o);
		}

		forwardEvent(source, sourceEvent, forwardEvent, forwardArgs) {
			source.on(
				sourceEvent,
				this.trigger.bind(this, forwardEvent, forwardArgs)
			);
		}

		renderStage(stage) {
			this.agentInfos.forEach((agentInfo) => {
				const rad = agentInfo.currentRad;
				agentInfo.currentMaxRad = rad;
			});

			const envPre = {
				agentInfos: this.agentInfos,
				components: this.components,
				renderer: this,
				state: this.state,
				textSizer: this.svg.textSizer,
				theme: this.theme,
			};
			const component = this.components.get(stage.type);
			const result = component.renderPre(stage, envPre);
			const {agentIDs, topShift, asynchronousY} =
				cleanRenderPreResult(result, this.currentY);

			const topY = this.checkAgentRange(agentIDs, asynchronousY);

			const makeRegion = ({
				stageOverride = null,
				unmasked = false,
			} = {}) => {
				const o = this.svg.el('g').setClass('region');
				const targetStage = (stageOverride || stage);
				this.addHighlightObject(targetStage.ln, o);
				this.forwardEvent(o, 'mouseenter', 'mouseover', [targetStage]);
				this.forwardEvent(o, 'mouseleave', 'mouseout', [targetStage]);
				this.forwardEvent(o, 'click', 'click', [targetStage]);
				this.forwardEvent(o, 'dblclick', 'dblclick', [targetStage]);
				return o.attach(unmasked ? this.unmaskedShapes : this.shapes);
			};

			const env = {
				addDef: this.addDef,
				agentInfos: this.agentInfos,
				blockLayer: this.blocks,
				components: this.components,
				drawAgentLine: (agentID, toY, andStop = false) => {
					const agentInfo = this.agentInfos.get(agentID);
					this.drawAgentLine(agentInfo, toY);
					agentInfo.latestYStart = andStop ? null : toY;
				},
				fillLayer: this.backgroundFills,
				fullMaskLayer: this.fullMask,
				lineMaskLayer: this.lineMask,
				makeRegion,
				primaryY: topY + topShift,
				renderer: this,
				state: this.state,
				svg: this.svg,
				textSizer: this.svg.textSizer,
				theme: this.theme,
				topY,
			};

			let bottomY = topY;
			if(this.checkHidden(stage)) {
				env.primaryY = topY;
				component.renderHidden(stage, env);
			} else {
				bottomY = Math.max(bottomY, component.render(stage, env) || 0);
			}

			this.markAgentRange(agentIDs, bottomY);
			this.currentY = bottomY;
		}

		positionAgents() {
			// Map guarantees insertion-order iteration
			const orderedInfos = [];
			this.agentInfos.forEach((agentInfo) => {
				let currentX = 0;
				agentInfo.separations.forEach((dist, otherAgent) => {
					const otherAgentInfo = this.agentInfos.get(otherAgent);
					if(otherAgentInfo.index < agentInfo.index) {
						currentX = Math.max(currentX, otherAgentInfo.x + dist);
					}
				});
				agentInfo.x = currentX;
				orderedInfos.push(agentInfo);
			});

			let previousInfo = {x: 0};
			orderedInfos.reverse().forEach((agentInfo) => {
				let currentX = previousInfo.x;
				previousInfo = agentInfo;
				if(!agentInfo.anchorRight) {
					return;
				}
				agentInfo.separations.forEach((dist, otherAgent) => {
					const otherAgentInfo = this.agentInfos.get(otherAgent);
					if(otherAgentInfo.index > agentInfo.index) {
						currentX = Math.min(currentX, otherAgentInfo.x - dist);
					}
				});
				agentInfo.x = currentX;
			});

			this.agentInfos.forEach(({x, maxRPad, maxLPad}) => {
				this.minX = Math.min(this.minX, x - maxLPad);
				this.maxX = Math.max(this.maxX, x + maxRPad);
			});
		}

		buildAgentInfos(agents) {
			this.agentInfos = new Map();
			agents.forEach((agent, index) => {
				this.agentInfos.set(agent.id, {
					anchorRight: agent.anchorRight,
					currentMaxRad: 0,
					currentRad: 0,
					formattedLabel: agent.formattedLabel,
					id: agent.id,
					index,
					isVirtualSource: agent.isVirtualSource,
					latestY: 0,
					latestYStart: null,
					maxLPad: 0,
					maxRPad: 0,
					options: agent.options,
					separations: new Map(),
					x: null,
				});
			});
		}

		updateBounds(stagesHeight) {
			const cx = (this.minX + this.maxX) / 2;
			const titleSize = this.svg.textSizer.measure(this.title);
			const titleY = ((titleSize.height > 0) ?
				(-this.theme.titleMargin - titleSize.height) : 0
			);
			this.title.set({x: cx, y: titleY});

			const halfTitleWidth = titleSize.width / 2;
			const margin = this.theme.outerMargin;
			const x0 = Math.min(this.minX, cx - halfTitleWidth) - margin;
			const x1 = Math.max(this.maxX, cx + halfTitleWidth) + margin;
			const y0 = titleY - margin;
			const y1 = stagesHeight + margin;

			this.width = x1 - x0;
			this.height = y1 - y0;

			const fullSize = {
				'height': this.height,
				'width': this.width,
				'x': x0,
				'y': y0,
			};

			this.fullMaskReveal.attrs(fullSize);
			this.lineMaskReveal.attrs(fullSize);

			this.svg.body.attr('viewBox', (
				x0 + ' ' + y0 + ' ' +
				this.width + ' ' + this.height
			));
		}

		_resetState() {
			this.components.forEach((component) => {
				component.resetState(this.state);
			});
			this.currentY = 0;
			this.hideNest = 0;
		}

		_reset(theme) {
			if(theme) {
				this.knownThemeDefs.clear();
				this.knownTextFilterDefs.clear();
				this.themeDefs.empty();
			}

			this.knownDefs.clear();
			this.highlights.clear();
			this.defs.empty();
			this.fullMask.empty();
			this.lineMask.empty();
			this.backgroundFills.empty();
			this.agentLines.empty();
			this.blocks.empty();
			this.shapes.empty();
			this.unmaskedShapes.empty();
			this.defs.add(
				this.fullMask.add(this.fullMaskReveal),
				this.lineMask.add(this.lineMaskReveal)
			);
			this._resetState();
		}

		setHighlight(line = null) {
			const ln = (line === null) ? -1 : line;
			if(this.currentHighlight === ln) {
				return;
			}
			if(this.highlights.has(this.currentHighlight)) {
				this.highlights.get(this.currentHighlight).forEach((o) => {
					o.delClass('focus');
				});
			}
			if(this.highlights.has(ln)) {
				this.highlights.get(ln).forEach((o) => {
					o.addClass('focus');
				});
			}
			this.currentHighlight = ln;
		}

		isCollapsed(line) {
			return this.collapsed.has(line);
		}

		setCollapseAll(collapsed) {
			if(collapsed) {
				throw new Error('Cannot collapse all');
			} else {
				if(this.collapsed.size === 0) {
					return false;
				}
				this.collapsed.clear();
			}
			return true;
		}

		_setCollapsed(line, collapsed) {
			if(typeof line !== 'number') {
				return false;
			}
			if(collapsed === this.isCollapsed(line)) {
				return false;
			}
			if(collapsed) {
				this.collapsed.add(line);
			} else {
				this.collapsed.delete(line);
			}
			return true;
		}

		setCollapsed(line, collapsed = true) {
			if(line === null) {
				return this.setCollapseAll(collapsed);
			}
			if(Array.isArray(line)) {
				return line
					.map((ln) => this._setCollapsed(ln, collapsed))
					.some((changed) => changed);
			}
			return this._setCollapsed(line, collapsed);
		}

		_switchTheme(name) {
			const oldThemeBuilder = this.themeBuilder;
			this.themeBuilder = this.getThemeNamed(name);
			if(this.themeBuilder !== oldThemeBuilder) {
				this.theme = this.themeBuilder.build(this.svg);
			}
			this.theme.reset();

			return (this.themeBuilder !== oldThemeBuilder);
		}

		optimisedRenderPreReflow(sequence) {
			const themeChanged = this._switchTheme(sequence.meta.theme);
			this._reset(themeChanged);

			this.metaCode.nodeValue = sequence.meta.code;
			this.svg.resetTextFilters();
			this.theme.addDefs(this.addThemeDef, this.addThemeTextDef);
			for(const def of this.knownTextFilterDefs.values()) {
				def.detach();
			}

			this.title.set({
				attrs: Object.assign({
					'class': 'title',
				}, this.theme.getTitleAttrs()),
				formatted: sequence.meta.title,
			});
			this.svg.textSizer.expectMeasure(this.title);

			this.minX = 0;
			this.maxX = 0;

			this.buildAgentInfos(sequence.agents);

			sequence.stages.forEach(this.prepareMeasurementsStage);
			this._resetState();
			this.svg.textSizer.performMeasurementsPre();
		}

		optimisedRenderReflow() {
			this.svg.textSizer.performMeasurementsAct();
		}

		optimisedRenderPostReflow(sequence) {
			this.visibleAgentIDs = ['[', ']'];
			sequence.stages.forEach(this.separationStage);
			this._resetState();

			this.positionAgents();

			sequence.stages.forEach(this.renderStage);
			const bottomY = this.checkAgentRange(['[', ']'], this.currentY);

			this.svg.getUsedTextFilterNames().forEach((name) => {
				this.themeDefs.add(this.knownTextFilterDefs.get(name));
			});

			const stagesHeight = Math.max(bottomY - this.theme.actionMargin, 0);
			this.updateBounds(stagesHeight);

			const prevHighlight = this.currentHighlight;
			this.currentHighlight = -1;
			this.setHighlight(prevHighlight);

			this.svg.textSizer.performMeasurementsPost();
			this.svg.textSizer.resetCache();
		}

		render(sequence) {
			this.optimisedRenderPreReflow(sequence);
			this.optimisedRenderReflow();
			this.optimisedRenderPostReflow(sequence);
		}

		getThemeNames() {
			return (Array.from(this.themes.keys())
				.filter((name) => (name !== ''))
			);
		}

		getThemes() {
			return this.getThemeNames().map((name) => this.themes.get(name));
		}

		getThemeNamed(themeName) {
			const theme = this.themes.get(themeName);
			if(theme) {
				return theme;
			}
			return this.themes.get('');
		}

		getAgentX(id) {
			return this.agentInfos.get(id).x;
		}

		dom() {
			return this.svg.body.element;
		}
	}

	/*
	 * Handlee font, by Joe Prince
	 * Downloaded from Google Fonts and converted to Base64 for embedding in
	 * generated SVGs
	 * https://fonts.google.com/specimen/Handlee
	 * base64 -b64 \
	 *   < *.woff2 \
	 *   | sed -e "s/^/"$'\t'$'\t'$'\t'"'/" -e "s/$/' +/" \
	 *   > handlee.woff2.b64
	 */

	/* License

	SIL OPEN FONT LICENSE
	Version 1.1 - 26 February 2007

	PREAMBLE
	The goals of the Open Font License (OFL) are to stimulate worldwide
	development of collaborative font projects, to support the font creation
	efforts of academic and linguistic communities, and to provide a free and
	open framework in which fonts may be shared and improved in partnership
	with others.

	The OFL allows the licensed fonts to be used, studied, modified and
	redistributed freely as long as they are not sold by themselves. The
	fonts, including any derivative works, can be bundled, embedded,
	redistributed and/or sold with any software provided that any reserved
	names are not used by derivative works. The fonts and derivatives,
	however, cannot be released under any other type of license. The
	requirement for fonts to remain under this license does not apply
	to any document created using the fonts or their derivatives.

	DEFINITIONS
	"Font Software" refers to the set of files released by the Copyright
	Holder(s) under this license and clearly marked as such. This may
	include source files, build scripts and documentation.

	"Reserved Font Name" refers to any names specified as such after the
	copyright statement(s).

	"Original Version" refers to the collection of Font Software components as
	distributed by the Copyright Holder(s).

	"Modified Version" refers to any derivative made by adding to, deleting,
	or substituting — in part or in whole — any of the components of the
	Original Version, by changing formats or by porting the Font Software to a
	new environment.

	"Author" refers to any designer, engineer, programmer, technical
	writer or other person who contributed to the Font Software.

	PERMISSION & CONDITIONS
	Permission is hereby granted, free of charge, to any person obtaining
	a copy of the Font Software, to use, study, copy, merge, embed, modify,
	redistribute, and sell modified and unmodified copies of the Font
	Software, subject to the following conditions:

	1) Neither the Font Software nor any of its individual components,
	in Original or Modified Versions, may be sold by itself.

	2) Original or Modified Versions of the Font Software may be bundled,
	redistributed and/or sold with any software, provided that each copy
	contains the above copyright notice and this license. These can be
	included either as stand-alone text files, human-readable headers or
	in the appropriate machine-readable metadata fields within text or
	binary files as long as those fields can be easily viewed by the user.

	3) No Modified Version of the Font Software may use the Reserved Font
	Name(s) unless explicit written permission is granted by the corresponding
	Copyright Holder. This restriction only applies to the primary font name as
	presented to the users.

	4) The name(s) of the Copyright Holder(s) or the Author(s) of the Font
	Software shall not be used to promote, endorse or advertise any
	Modified Version, except to acknowledge the contribution(s) of the
	Copyright Holder(s) and the Author(s) or with their explicit written
	permission.

	5) The Font Software, modified or unmodified, in part or in whole,
	must be distributed entirely under this license, and must not be
	distributed under any other license. The requirement for fonts to
	remain under this license does not apply to any document created
	using the Font Software.

	TERMINATION
	This license becomes null and void if any of the above conditions are
	not met.

	DISCLAIMER
	THE FONT SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
	EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO ANY WARRANTIES OF
	MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT
	OF COPYRIGHT, PATENT, TRADEMARK, OR OTHER RIGHT. IN NO EVENT SHALL THE
	COPYRIGHT HOLDER BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
	INCLUDING ANY GENERAL, SPECIAL, INDIRECT, INCIDENTAL, OR CONSEQUENTIAL
	DAMAGES, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
	FROM, OUT OF THE USE OR INABILITY TO USE THE FONT SOFTWARE OR FROM
	OTHER DEALINGS IN THE FONT SOFTWARE.

	*/

	var Handlee = {
		name: 'Handlee',
		woff2: (
			'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' +
			'jjhu2qURx1x+3R5nnI2W/z0OAAA='
		),
	};

	class Random {
		// Xorshift+ 64-bit random generator https://en.wikipedia.org/wiki/Xorshift

		constructor() {
			this.s = new Uint32Array(4);
		}

		reset() {
			// Arbitrary random seed with roughly balanced 1s / 0s
			// (taken from running Math.random a few times)
			this.s[0] = 0x177E9C74;
			this.s[1] = 0xAE6FFDCE;
			this.s[2] = 0x3CF4F32B;
			this.s[3] = 0x46449F88;
		}

		nextFloat() {
			/* eslint-disable no-bitwise */ // Bit-ops are part of the algorithm
			/* eslint-disable prefer-destructuring */ // Clearer this way
			const range = 0x100000000;
			let x0 = this.s[0];
			let x1 = this.s[1];
			const y0 = this.s[2];
			const y1 = this.s[3];
			this.s[0] = y0;
			this.s[1] = y1;
			x0 ^= (x0 << 23) | (x1 >>> 9);
			x1 ^= (x1 << 23);
			this.s[2] = x0 ^ y0 ^ (x0 >>> 17) ^ (y0 >>> 26);
			this.s[3] = (
				x1 ^ y1 ^
				((x0 << 15) | (x1 >>> 17)) ^
				((y0 << 6) | (y1 >>> 26))
			);
			return (((this.s[3] + y1) >>> 0) % range) / range;
			/* eslint-enable no-bitwise */
			/* eslint-enable prefer-destructuring */
		}
	}

	/* eslint-disable max-lines */

	const FONT = Handlee.name;
	const FONT_FAMILY = FONT + ',cursive';
	const LINE_HEIGHT = 1.5;
	const MAX_CHAOS = 5;

	const PENCIL = {
		normal: {
			'stroke': 'rgba(0,0,0,0.7)',
			'stroke-width': 0.8,
			'stroke-linejoin': 'round',
			'stroke-linecap': 'round',
		},
		thick: {
			'stroke': 'rgba(0,0,0,0.8)',
			'stroke-width': 1.2,
			'stroke-linejoin': 'round',
			'stroke-linecap': 'round',
		},
	};

	const NOTE_ATTRS = {
		'font-family': FONT_FAMILY,
		'font-size': 8,
		'line-height': LINE_HEIGHT,
	};

	const DIVIDER_LABEL_ATTRS = {
		'font-family': FONT_FAMILY,
		'font-size': 8,
		'line-height': LINE_HEIGHT,
		'text-anchor': 'middle',
	};

	const RIGHT = {};
	const LEFT = {};

	class SketchWavePattern {
		constructor(width, handedness) {
			this.deltas = [
				+0.0,
				-0.3,
				-0.6,
				-0.75,
				-0.45,
				+0.0,
				+0.45,
				+0.75,
				+0.6,
				+0.3,
			];
			if(handedness !== RIGHT) {
				this.deltas.reverse();
			}
			this.partWidth = 6 / this.deltas.length;
		}

		getDelta(p) {
			return this.deltas[p % this.deltas.length] + Math.sin(p * 0.03) * 0.5;
		}
	}

	function clamp(v, low, high) {
		return Math.max(low, Math.min(high, v));
	}

	class SketchTheme extends BaseTheme {
		constructor(svg, handedness = RIGHT) {
			super(svg, {
				'font-family': FONT,
				'font-size': 8,
				'line-height': LINE_HEIGHT,
			});

			this.handedness = (handedness === RIGHT) ? 1 : -1;
			this.random = new Random();
			const wave = new SketchWavePattern(4, handedness);

			const sharedBlockSection = {
				padding: {
					top: 3,
					bottom: 2,
				},
				tag: {
					padding: {
						top: 2,
						left: 3,
						right: 5,
						bottom: 0,
					},
					boxRenderer: this.renderTag.bind(this),
					labelAttrs: {
						'font-family': FONT_FAMILY,
						'font-weight': 'bold',
						'font-size': 9,
						'line-height': LINE_HEIGHT,
						'text-anchor': 'left',
					},
				},
				label: {
					minHeight: 6,
					padding: {
						top: 2,
						left: 5,
						right: 3,
						bottom: 1,
					},
					labelAttrs: {
						'font-family': FONT_FAMILY,
						'font-size': 8,
						'line-height': LINE_HEIGHT,
						'text-anchor': 'left',
					},
				},
			};

			Object.assign(this, {
				titleMargin: 10,
				outerMargin: 5,
				agentMargin: 10,
				actionMargin: 10,
				minActionMargin: 3,
				agentLineActivationRadius: 4,

				agentCap: {
					box: {
						padding: {
							top: 5,
							left: 10,
							right: 10,
							bottom: 5,
						},
						arrowBottom: 5 + 12 * 1.3 / 2,
						labelAttrs: {
							'font-family': FONT_FAMILY,
							'font-size': 12,
							'line-height': LINE_HEIGHT,
							'text-anchor': 'middle',
						},
						boxRenderer: this.renderBox.bind(this),
					},
					person: {
						padding: {
							top: 20,
							left: 10,
							right: 10,
							bottom: 5,
						},
						arrowBottom: 5 + 12 * 1.3 / 2,
						labelAttrs: {
							'font-family': FONT_FAMILY,
							'font-size': 12,
							'line-height': LINE_HEIGHT,
							'text-anchor': 'middle',
						},
						boxRenderer: this.renderPerson.bind(this),
					},
					database: {
						padding: {
							top: 12,
							left: 10,
							right: 10,
							bottom: 2,
						},
						arrowBottom: 5 + 12 * 1.3 / 2,
						boxRenderer: this.renderDB.bind(this),
						labelAttrs: {
							'font-family': FONT,
							'font-size': 12,
							'line-height': LINE_HEIGHT,
							'text-anchor': 'middle',
						},
					},
					cross: {
						size: 15,
						render: this.renderCross.bind(this),
					},
					bar: {
						height: 6,
						render: this.renderBar.bind(this),
					},
					fade: {
						width: Math.ceil(MAX_CHAOS * 2 + 2),
						height: 6,
						extend: Math.ceil(MAX_CHAOS * 0.3 + 1),
					},
					none: {
						height: 10,
					},
				},

				connect: {
					loopbackRadius: 6,
					arrow: {
						'single': {
							width: 5,
							height: 6,
							attrs: Object.assign({
								'fill': 'rgba(0,0,0,0.9)',
							}, PENCIL.normal),
							render: this.renderArrowHead.bind(this),
						},
						'double': {
							width: 4,
							height: 8,
							attrs: Object.assign({
								'fill': 'none',
							}, PENCIL.normal),
							render: this.renderArrowHead.bind(this),
						},
						'fade': {
							short: 0,
							size: 12,
						},
						'cross': {
							short: 5,
							radius: 3,
							render: this.renderCross.bind(this),
						},
					},
					label: {
						padding: 6,
						margin: {top: 2, bottom: 1},
						attrs: {
							'font-family': FONT_FAMILY,
							'font-size': 8,
							'line-height': LINE_HEIGHT,
							'text-anchor': 'middle',
						},
						loopbackAttrs: {
							'font-family': FONT_FAMILY,
							'font-size': 8,
							'line-height': LINE_HEIGHT,
						},
					},
					source: {
						radius: 1,
						render: svg.circleFactory({
							'fill': '#000000',
							'stroke': '#000000',
							'stroke-width': 1,
						}),
					},
					mask: {
						padding: {
							top: 0,
							left: 3,
							right: 3,
							bottom: 1,
						},
					},
				},

				agentLineAttrs: {
					'': Object.assign({
						'fill': 'none',
					}, PENCIL.normal),
					'red': {
						'stroke': 'rgba(200,40,0,0.8)',
					},
				},
				blocks: {
					'ref': {
						margin: {
							top: 0,
							bottom: 0,
						},
						boxRenderer: this.renderRefBlock.bind(this),
						section: sharedBlockSection,
					},
					'': {
						margin: {
							top: 0,
							bottom: 0,
						},
						boxRenderer: this.renderBlock.bind(this),
						collapsedBoxRenderer: this.renderMinBlock.bind(this),
						section: sharedBlockSection,
						sepRenderer: this.renderSeparator.bind(this),
					},
				},
				notes: {
					'text': {
						margin: {top: 0, left: 6, right: 6, bottom: 0},
						padding: {top: 2, left: 2, right: 2, bottom: 2},
						overlap: {left: 10, right: 10},
						boxRenderer: svg.boxFactory({
							'fill': '#FFFFFF',
						}),
						labelAttrs: NOTE_ATTRS,
					},
					'note': {
						margin: {top: 0, left: 5, right: 5, bottom: 0},
						padding: {top: 5, left: 5, right: 10, bottom: 5},
						overlap: {left: 10, right: 10},
						boxRenderer: this.renderNote.bind(this),
						labelAttrs: NOTE_ATTRS,
					},
					'state': {
						margin: {top: 0, left: 5, right: 5, bottom: 0},
						padding: {top: 7, left: 7, right: 7, bottom: 7},
						overlap: {left: 10, right: 10},
						boxRenderer: this.renderState.bind(this),
						labelAttrs: NOTE_ATTRS,
					},
				},
				dividers: {
					'': {
						labelAttrs: DIVIDER_LABEL_ATTRS,
						padding: {top: 2, left: 5, right: 5, bottom: 2},
						extend: 0,
						margin: 0,
						render: () => ({}),
					},
					'line': {
						labelAttrs: DIVIDER_LABEL_ATTRS,
						padding: {top: 2, left: 5, right: 5, bottom: 2},
						extend: 10,
						margin: 0,
						render: this.renderLineDivider.bind(this),
					},
					'delay': {
						labelAttrs: DIVIDER_LABEL_ATTRS,
						padding: {top: 2, left: 5, right: 5, bottom: 2},
						extend: 0,
						margin: 0,
						render: this.renderDelayDivider.bind(this, {
							dotSize: 1,
							gapSize: 2,
						}),
					},
					'tear': {
						labelAttrs: DIVIDER_LABEL_ATTRS,
						padding: {top: 2, left: 5, right: 5, bottom: 2},
						extend: 10,
						margin: 10,
						render: this.renderTearDivider.bind(this, {
							fadeBegin: 5,
							fadeSize: 10,
							pattern: wave,
							lineAttrs: PENCIL.normal,
						}),
					},
				},
			});

			this.addConnectLine('solid', {attrs: PENCIL.normal});
			this.addConnectLine('dash', {attrs: {
				'stroke-dasharray': '4, 2',
			}});
			this.addConnectLine('wave', {
				attrs: {
					'stroke-linejoin': 'round',
					'stroke-linecap': 'round',
				},
				pattern: wave,
			});
		}

		reset() {
			this.random.reset();
		}

		addDefs(builder, textBuilder) {
			builder('sketch_font', () => {
				const style = this.svg.el('style', null);
				// Font must be embedded for exporting as SVG / PNG
				style.text(
					'@font-face{' +
					'font-family:' + Handlee.name + ';' +
					'src:url("data:font/woff2;base64,' + Handlee.woff2 + '");' +
					'}'
				);
				return style;
			});

			super.addDefs(builder, textBuilder);
		}

		vary(range, centre = 0) {
			if(!range) {
				return centre;
			}
			// Cosine distribution [-pi/2 pi/2] scaled to [-range range]
			const rand = this.random.nextFloat(); // [0 1)
			return centre + Math.asin(rand * 2 - 1) * 2 * range / Math.PI;
		}

		lineNodes(p1, p2, {
			var1 = 1,
			var2 = 1,
			varX = 1,
			varY = 1,
			move = true,
		}) {
			const length = Math.sqrt(
				(p2.x - p1.x) * (p2.x - p1.x) +
				(p2.y - p1.y) * (p2.y - p1.y)
			);
			const rough = Math.min(Math.sqrt(length) * 0.2, MAX_CHAOS);
			const x1 = this.vary(var1 * varX * rough, p1.x);
			const y1 = this.vary(var1 * varY * rough, p1.y);
			const x2 = this.vary(var2 * varX * rough, p2.x);
			const y2 = this.vary(var2 * varY * rough, p2.y);

			// -1 = p1 higher, 1 = p2 higher
			const upper = clamp((y1 - y2) / (Math.abs(x1 - x2) + 0.001), -1, 1);
			const frac = upper / 6 + 0.5;

			/*
			 * Line curve is to top / left (simulates right-handed drawing)
			 * or top / right (left-handed)
			 */
			const curveX = this.vary(0.5, 0.5) * rough;
			const curveY = this.vary(0.5, 0.5) * rough;
			const xc = x1 * (1 - frac) + x2 * frac - curveX * this.handedness;
			const yc = y1 * (1 - frac) + y2 * frac - curveY;
			const nodes = (
				(move ? ('M' + x1 + ' ' + y1) : '') +
				'C' + xc + ' ' + yc +
				',' + x2 + ' ' + y2 +
				',' + x2 + ' ' + y2
			);
			return {
				nodes,
				p1: {x: x1, y: y1},
				p2: {x: x2, y: y2},
			};
		}

		renderLine(p1, p2, lineOptions) {
			const line = this.lineNodes(p1, p2, lineOptions);
			return this.svg.el('path')
				.attrs({
					'd': line.nodes,
					'fill': 'none',
					'stroke-dasharray': lineOptions.dash ? '6, 5' : 'none',
				})
				.attrs(lineOptions.attrs || (
					lineOptions.thick ? PENCIL.thick : PENCIL.normal
				));
		}

		boxNodes({x, y, width, height}) {
			const lT = this.lineNodes(
				{x, y},
				{x: x + width, y},
				{}
			);
			const lB = this.lineNodes(
				{x: x + width, y: y + height},
				{x, y: y + height},
				{move: false}
			);
			const lR = this.lineNodes(
				lT.p2,
				lB.p1,
				{var1: 0, var2: 0, move: false}
			);
			const lL = this.lineNodes(
				lB.p2,
				lT.p1,
				{var1: 0, var2: 0.3, move: false}
			);

			return lT.nodes + lR.nodes + lB.nodes + lL.nodes;
		}

		renderBox(position, {fill = null, thick = false, attrs = null} = {}) {
			return this.svg.el('path')
				.attrs({
					'd': this.boxNodes(position),
					'fill': fill || '#FFFFFF',
				})
				.attrs(attrs || (thick ? PENCIL.thick : PENCIL.normal));
		}

		renderPerson(position) {
			const sx = 18 / 2;
			const sy = 15;
			const iconAttrs = Object.assign({'fill': 'none'}, PENCIL.normal);
			const cx = position.x + position.width / 2;

			const v = this.vary.bind(this);
			const lean = v(0.1, 0.05 * this.handedness);
			const skew = v(0.1, 0.05 * this.handedness);
			const shoulders = v(0.05, 0.35);

			return this.svg.el('g').add(
				this.svg.el('path')
					.attr('d', (
						'M' + (cx - sx) + ' ' + (position.y + sy) +
						'c' + (sx * lean) + ' ' + (-sy * (shoulders - skew)) +
						' ' + (sx * (2 + lean)) + ' ' + (-sy * (shoulders + skew)) +
						' ' + (sx * 2) + ' 0'
					))
					.attrs(iconAttrs),
				this.svg.el('path')
					.attr('d', (
						'M' + cx + ' ' + position.y +
						'c' + (sx * v(0.05, 0.224)) + ' ' + v(0.02, 0) +
						' ' + (sx * v(0.07, 0.4)) + ' ' + (sy * v(0.02, 0.1)) +
						' ' + (sx * 0.4) + ' ' + (sy * v(0.05, 0.275)) +
						's' + (-sx * v(0.05, 0.176)) + ' ' + (sy * 0.35) +
						' ' + (-sx * 0.4) + ' ' + (sy * v(0.05, 0.35)) +
						's' + (-sx * v(0.07, 0.4)) + ' ' + (-sy * 0.175) +
						' ' + (-sx * 0.4) + ' ' + (-sy * v(0.05, 0.35)) +
						's' + (sx * v(0.05, 0.176)) + ' ' + (-sy * 0.275) +
						' ' + (sx * v(0.05, 0.4)) + ' ' + (-sy * v(0.02, 0.275))
					))
					.attrs(iconAttrs),
				this.renderBox({
					height: position.height - sy,
					width: position.width,
					x: position.x,
					y: position.y + sy,
				})
			);
		}

		renderDB(pos) {
			const tilt = 5;
			const tiltC = tilt * 1.2;

			const l1 = this.lineNodes(
				{x: pos.x, y: pos.y + tilt},
				{x: pos.x, y: pos.y + pos.height - tilt},
				{}
			);

			const l2 = this.lineNodes(
				{x: pos.x + pos.width, y: pos.y + pos.height - tilt},
				{x: pos.x + pos.width, y: pos.y + tilt},
				{move: false}
			);

			const v = this.vary.bind(this);

			const cx = pos.x + pos.width / 2;
			const dx = -pos.width * this.handedness / 2;
			const topX1 = cx - dx * v(0.03, 1.02);
			const topY1 = pos.y + tilt * v(0.15, 1);
			const topX2 = cx + dx * v(0.03, 1.02);
			const topY2 = pos.y + tilt * v(0.15, 1);

			return this.svg.el('g').add(
				this.svg.el('path')
					.attr('d', (
						l1.nodes +
						'C' + l1.p2.x + ' ' + (l1.p2.y + v(0.1, tiltC)) +
						' ' + l2.p1.x + ' ' + (l2.p1.y + v(0.1, tiltC)) +
						' ' + l2.p1.x + ' ' + l2.p1.y +
						l2.nodes
					))
					.attrs(PENCIL.normal)
					.attr('fill', '#FFFFFF'),
				this.svg.el('path')
					.attr('d', (
						'M' + topX1 + ' ' + topY1 +
						'C' + (topX1 + dx * 0.2) + ' ' + (topY1 - v(0.2, tiltC)) +
						' ' + topX2 + ' ' + (topY2 - v(0.2, tiltC)) +
						' ' + topX2 + ' ' + topY2 +
						'S' + topX1 + ' ' + (topY1 + v(0.2, tiltC)) +
						' ' + v(1, topX1) + ' ' + v(0.5, topY1)
					))
					.attrs(PENCIL.normal)
					.attr('fill', '#FFFFFF')
			);
		}

		renderNote({x, y, width, height}) {
			const flickSize = 5;
			const lT = this.lineNodes(
				{x, y},
				{x: x + width - flickSize, y},
				{}
			);
			const lF = this.lineNodes(
				lT.p2,
				{x: x + width, y: y + flickSize},
				{move: false, var1: 0}
			);
			const lB = this.lineNodes(
				{x: x + width, y: y + height},
				{x, y: y + height},
				{move: false}
			);
			const lR = this.lineNodes(
				lF.p2,
				lB.p1,
				{var1: 0, var2: 0, move: false}
			);
			const lL = this.lineNodes(
				lB.p2,
				lT.p1,
				{var1: 0, var2: 0.3, move: false}
			);
			const lF1 = this.lineNodes(
				lF.p1,
				{x: x + width - flickSize, y: y + flickSize},
				{var1: 0.3}
			);
			const lF2 = this.lineNodes(
				lF1.p2,
				lF.p2,
				{var1: 0, move: false}
			);

			return this.svg.el('g').add(
				this.svg.el('path')
					.attrs({
						'd': (
							lT.nodes +
							lF.nodes +
							lR.nodes +
							lB.nodes +
							lL.nodes
						),
						'fill': '#FFFFFF',
					})
					.attrs(PENCIL.normal),
				this.svg.el('path')
					.attrs({
						'd': lF1.nodes + lF2.nodes,
						'fill': 'none',
					})
					.attrs(PENCIL.normal)
			);
		}

		renderLineDivider({x, y, labelWidth, width, height}) {
			let shape = null;
			const yPos = y + height / 2;
			if(labelWidth > 0) {
				shape = this.svg.el('g').add(
					this.renderLine(
						{x, y: yPos},
						{x: x + (width - labelWidth) / 2, y: yPos},
						{}
					),
					this.renderLine(
						{x: x + (width + labelWidth) / 2, y: yPos},
						{x: x + width, y: yPos},
						{}
					)
				);
			} else {
				shape = this.renderLine(
					{x, y: yPos},
					{x: x + width, y: yPos},
					{}
				);
			}
			return {shape};
		}

		renderFlatConnect(pattern, attrs, {x1, y1, x2, y2}) {
			if(pattern) {
				const x1v = x1 + this.vary(0.3);
				const x2v = x2 + this.vary(0.3);
				const y1v = y1 + this.vary(1);
				const y2v = y2 + this.vary(1);
				return {
					shape: this.svg.el('path')
						.attr('d', this.svg.patternedLine(pattern)
							.move(x1v, y1v)
							.line(x2v, y2v)
							.cap()
							.asPath())
						.attrs(attrs),
					p1: {x: x1v, y: y1v},
					p2: {x: x2v, y: y2v},
				};
			} else {
				const ln = this.lineNodes(
					{x: x1, y: y1},
					{x: x2, y: y2},
					{varX: 0.3}
				);
				return {
					shape: this.svg.el('path').attr('d', ln.nodes).attrs(attrs),
					p1: ln.p1,
					p2: ln.p2,
				};
			}
		}

		renderRevConnect(pattern, attrs, {x1, y1, x2, y2, xR}) {
			if(pattern) {
				const x1v = x1 + this.vary(0.3);
				const x2v = x2 + this.vary(0.3);
				const y1v = y1 + this.vary(1);
				const y2v = y2 + this.vary(1);
				return {
					shape: this.svg.el('path')
						.attr('d', this.svg.patternedLine(pattern)
							.move(x1v, y1v)
							.line(xR, y1)
							.arc(xR, (y1 + y2) / 2, Math.PI)
							.line(x2v, y2v)
							.cap()
							.asPath())
						.attrs(attrs),
					p1: {x: x1v, y: y1v},
					p2: {x: x2v, y: y2v},
				};
			} else {
				const variance = Math.min((xR - x1) * 0.06, 3);
				const overshoot = Math.min((xR - x1) * 0.5, 6);
				const p1x = x1 + this.vary(variance, -1);
				const p1y = y1 + this.vary(variance, -1);
				const b1x = xR - overshoot * this.vary(0.2, 1);
				const b1y = y1 - this.vary(1, 2);
				const p2x = xR;
				const p2y = y1 + this.vary(1, 1);
				const b2x = xR;
				const b2y = y2 + this.vary(2);
				const p3x = x2 + this.vary(variance, -1);
				const p3y = y2 + this.vary(variance, -1);

				return {
					shape: this.svg.el('path')
						.attr('d', (
							'M' + p1x + ' ' + p1y +
							'C' + p1x + ' ' + p1y +
							',' + b1x + ' ' + b1y +
							',' + p2x + ' ' + p2y +
							'S' + b2x + ' ' + b2y +
							',' + p3x + ' ' + p3y
						))
						.attrs(attrs),
					p1: {x: p1x, y: p1y},
					p2: {x: p3x, y: p3y},
				};
			}
		}

		renderArrowHead(attrs, {x, y, width, height, dir}) {
			const w = width * this.vary(0.2, 1);
			const h = height * this.vary(0.3, 1);
			const wx = w * dir.dx;
			const wy = w * dir.dy;
			const hy = h * 0.5 * dir.dx;
			const hx = -h * 0.5 * dir.dy;
			const l1 = this.lineNodes(
				{x: x + wx - hx, y: y + wy - hy},
				{x, y},
				{var1: 2.0, var2: 0.2}
			);
			const l2 = this.lineNodes(
				l1.p2,
				{x: x + wx + hx, y: y + wy + hy},
				{var1: 0, var2: 2.0, move: false}
			);
			const l3 = (attrs.fill === 'none') ? {nodes: ''} : this.lineNodes(
				l2.p2,
				l1.p1,
				{var1: 0, var2: 0, move: false}
			);
			return this.svg.el('path')
				.attr('d', l1.nodes + l2.nodes + l3.nodes)
				.attrs(attrs);
		}

		renderState({x, y, width, height}) {
			const dx = Math.min(width * 0.06, 3);
			const dy = Math.min(height * 0.06, 3);
			const tlX = x + dx * this.vary(0.6, 1);
			const tlY = y + dy * this.vary(0.6, 1);
			const trX = x + width - dx * this.vary(0.6, 1);
			const trY = y + dy * this.vary(0.6, 1);
			const blX = x + dx * this.vary(0.6, 1);
			const blY = y + height - dy * this.vary(0.6, 1);
			const brX = x + width - dx * this.vary(0.6, 1);
			const brY = y + height - dy * this.vary(0.6, 1);
			const mX = x + width / 2;
			const mY = y + height / 2;
			const cx = dx * this.vary(0.2, 1.2);
			const cy = dy * this.vary(0.2, 1.2);
			const bentT = y - Math.min(width * 0.005, 1);
			const bentB = y + height - Math.min(width * 0.01, 2);
			const bentL = x - Math.min(height * 0.01, 2) * this.handedness;
			const bentR = bentL + width;

			return this.svg.el('path')
				.attr('d', (
					'M' + tlX + ' ' + tlY +
					'C' + (tlX + cx) + ' ' + (tlY - cy) +
					',' + (mX - width * this.vary(0.03, 0.3)) + ' ' + bentT +
					',' + mX + ' ' + bentT +
					'S' + (trX - cx) + ' ' + (trY - cy) +
					',' + trX + ' ' + trY +
					'S' + bentR + ' ' + (mY - height * this.vary(0.03, 0.3)) +
					',' + bentR + ' ' + mY +
					'S' + (brX + cx) + ' ' + (brY - cy) +
					',' + brX + ' ' + brY +
					'S' + (mX + width * this.vary(0.03, 0.3)) + ' ' + bentB +
					',' + mX + ' ' + bentB +
					'S' + (blX + cx) + ' ' + (blY + cy) +
					',' + blX + ' ' + blY +
					'S' + bentL + ' ' + (mY + height * this.vary(0.03, 0.3)) +
					',' + bentL + ' ' + mY +
					'S' + (tlX - cx) + ' ' + (tlY + cy) +
					',' + tlX + ' ' + tlY +
					'Z'
				))
				.attr('fill', '#FFFFFF')
				.attrs(PENCIL.normal);
		}

		renderRefBlock(position) {
			const nodes = this.boxNodes(position);
			return {
				shape: this.svg.el('path')
					.attrs({'d': nodes, 'fill': 'none'})
					.attrs(PENCIL.thick),
				mask: this.svg.el('path')
					.attrs({'d': nodes, 'fill': '#000000'}),
				fill: this.svg.el('path')
					.attrs({'d': nodes, 'fill': '#FFFFFF'}),
			};
		}

		renderBlock(position) {
			return this.renderBox(position, {fill: 'none', thick: true});
		}

		renderMinBlock(position) {
			return this.renderRefBlock(position);
		}

		renderTag({x, y, width, height}) {
			const x2 = x + width;
			const y2 = y + height;

			const l1 = this.lineNodes(
				{x: x2 + 3, y},
				{x: x2 - 2, y: y2},
				{}
			);
			const l2 = this.lineNodes(
				l1.p2,
				{x, y: y2 + 1},
				{var1: 0, move: false}
			);

			const line = l1.nodes + l2.nodes;

			return this.svg.el('g').add(
				this.svg.el('path')
					.attrs({
						'd': line + 'L' + x + ' ' + y,
						'fill': '#FFFFFF',
					}),
				this.svg.el('path')
					.attrs({
						'd': line,
						'fill': '#FFFFFF',
					})
					.attrs(PENCIL.normal)
			);
		}

		renderSeparator({x1, y1, x2, y2}) {
			return this.renderLine(
				{x: x1, y: y1},
				{x: x2, y: y2},
				{thick: true, dash: true}
			);
		}

		renderBar({x, y, width, height}) {
			return this.renderBox({x, y, width, height}, {fill: '#000000'});
		}

		renderCross({x, y, radius}) {
			const r1 = this.vary(0.2, 1) * radius;
			const l1 = this.lineNodes(
				{x: x - r1, y: y - r1},
				{x: x + r1, y: y + r1},
				{}
			);
			const r2 = this.vary(0.2, 1) * radius;
			const l2 = this.lineNodes(
				{x: x + r2, y: y - r2},
				{x: x - r2, y: y + r2},
				{}
			);

			return this.svg.el('path')
				.attrs({
					'd': l1.nodes + l2.nodes,
					'fill': 'none',
				})
				.attrs(PENCIL.normal);
		}

		renderAgentLine({x, y0, y1, width, className, options}) {
			const attrs = this.optionsAttributes(this.agentLineAttrs, options);
			if(width > 0) {
				return this.renderBox({
					x: x - width / 2,
					y: y0,
					width,
					height: y1 - y0,
				}, {fill: 'none', attrs}).setClass(className);
			} else {
				return this.renderLine(
					{x, y: y0},
					{x, y: y1},
					{varY: 0.3, attrs}
				).setClass(className);
			}
		}
	}

	class Factory {
		constructor(handedness = RIGHT) {
			const right = (handedness === RIGHT);
			this.name = right ? 'sketch' : 'sketch left handed';
			this.handedness = handedness;
		}

		build(svg) {
			return new SketchTheme(svg, this.handedness);
		}
	}

	Object.assign(Factory, {RIGHT, LEFT});

	const TRIMMER = /^([ \t]*)(.*)$/;
	const SQUASH = {
		after: '.!+', // Cannot squash after * or - in all cases
		end: /[ \t\r\n]$/,
		start: /^[ \t\r\n:,]/,
	};
	const ONGOING_QUOTE = /^"(\\.|[^"])*$/;
	const REQUIRED_QUOTED = /[\r\n:,"<>\-~]/;
	const QUOTE_ESCAPE = /["\\]/g;

	function completionsEqual(a, b) {
		return (
			(a.v === b.v) &&
			(a.prefix === b.prefix) &&
			(a.suffix === b.suffix) &&
			(a.q === b.q)
		);
	}

	function makeRangeFrom(cm, line, chFrom) {
		const ln = cm.getLine(line);
		const ranges = {
			squash: {ch: chFrom, line},
			word: {ch: chFrom, line},
		};
		if(chFrom > 0 && ln[chFrom - 1] === ' ') {
			if(SQUASH.after.includes(ln[chFrom - 2])) {
				ranges.word.ch --;
			}
			ranges.squash.ch --;
		}
		return ranges;
	}

	function makeRangeTo(cm, line, chTo) {
		const ln = cm.getLine(line);
		const ranges = {
			squash: {ch: chTo, line},
			word: {ch: chTo, line},
		};
		if(ln[chTo] === ' ') {
			ranges.squash.ch ++;
		}
		return ranges;
	}

	function wrapQuote({v, q, prefix = '', suffix = ''}, quote) {
		const quo = (quote || !REQUIRED_QUOTED.test(v)) ? quote : '"';
		return (
			prefix +
			((quo && q) ? (quo + v.replace(QUOTE_ESCAPE, '\\$&') + quo) : v) +
			suffix
		);
	}

	function makeHintItem(entry, ranges, quote) {
		const quoted = wrapQuote(entry, quote);
		const from = entry.q ? ranges.fromVar : ranges.fromKey;
		if(quoted === '\n') {
			return {
				className: 'pick-virtual',
				displayFrom: null,
				displayText: '<END>',
				from: from.squash,
				text: '\n',
				to: ranges.to.squash,
			};
		} else {
			return {
				className: null,
				displayFrom: from.word,
				displayText: quoted.trim(),
				from: SQUASH.start.test(quoted) ? from.squash : from.word,
				text: quoted,
				to: SQUASH.end.test(quoted) ? ranges.to.squash : ranges.to.word,
			};
		}
	}

	function getGlobals({global, prefix = '', suffix = ''}, globals) {
		const identified = globals[global];
		if(!identified) {
			return [];
		}
		return identified.map((item) => ({prefix, q: true, suffix, v: item}));
	}

	function populateGlobals(completions, globals = {}) {
		for(let i = 0; i < completions.length;) {
			if(completions[i].global) {
				const identified = getGlobals(completions[i], globals);
				mergeSets(completions, identified, completionsEqual);
				completions.splice(i, 1);
			} else {
				++ i;
			}
		}
	}

	function getTokensUpTo(cm, pos) {
		const tokens = cm.getLineTokens(pos.line);
		for(let p = 0; p < tokens.length; ++ p) {
			if(tokens[p].end >= pos.ch) {
				tokens.length = p + 1;
				break;
			}
		}
		return tokens;
	}

	function getVariablePartial(tokens, pos) {
		let partial = '';
		let start = 0;
		let fin = 0;
		tokens.forEach((token) => {
			if(token.state.isVar) {
				partial += token.string;
				fin = token.end;
			} else {
				partial = '';
				start = token.end;
			}
		});
		if(fin > pos.ch) {
			partial = partial.substr(0, pos.ch - start);
		}
		const parts = TRIMMER.exec(partial);
		partial = parts[2];
		let quote = '';
		if(ONGOING_QUOTE.test(partial)) {
			quote = partial.charAt(0);
			partial = partial.substr(1);
		}
		return {
			from: start + parts[1].length,
			partial,
			quote,
			valid: fin >= start,
		};
	}

	function getKeywordPartial(token, pos) {
		let partial = token.string;
		if(token.end > pos.ch) {
			partial = partial.substr(0, pos.ch - token.start);
		}
		const parts = TRIMMER.exec(partial);
		return {
			from: token.start + parts[1].length,
			partial: parts[2],
			valid: true,
		};
	}

	function suggestDropdownLocation(list, fromKey) {
		let p = null;
		list.forEach(({displayFrom}) => {
			if(displayFrom) {
				if(
					!p ||
					displayFrom.line > p.line ||
					(displayFrom.line === p.line && displayFrom.ch > p.ch)
				) {
					p = displayFrom;
				}
			}
		});
		return p || fromKey.word;
	}

	function partialMatch(v, p) {
		return p.valid && v.startsWith(p.partial);
	}

	function getCompletions(cur, token, globals) {
		let completions = null;
		if(cur.ch > 0 && token.state.line.length > 0) {
			completions = token.state.completions.slice();
		} else {
			completions = token.state.beginCompletions
				.concat(token.state.knownAgent);
		}
		populateGlobals(completions, globals);
		return completions;
	}

	function getHints(cm, options) {
		const cur = cm.getCursor();
		const tokens = getTokensUpTo(cm, cur);
		const token = last(tokens) || cm.getTokenAt(cur);
		const pVar = getVariablePartial(tokens, cur);
		const pKey = getKeywordPartial(token, cur);

		const completions = getCompletions(cur, token, cm.options.globals);

		const ranges = {
			fromKey: makeRangeFrom(cm, cur.line, pKey.from),
			fromVar: makeRangeFrom(cm, cur.line, pVar.from),
			to: makeRangeTo(cm, cur.line, token.end),
		};
		let selfValid = null;
		const list = (completions
			.filter((o) => (
				(o.q || !pVar.quote) &&
				partialMatch(o.v, o.q ? pVar : pKey)
			))
			.map((o) => {
				if(!options.completeSingle) {
					if(o.v === (o.q ? pVar : pKey).partial) {
						selfValid = o;
						return null;
					}
				}
				return makeHintItem(o, ranges, pVar.quote);
			})
			.filter((opt) => (opt !== null))
		);
		if(selfValid && list.length > 0) {
			list.unshift(makeHintItem(selfValid, ranges, pVar.quote));
		}

		const data = {
			from: suggestDropdownLocation(list, ranges.fromKey),
			list,
			to: ranges.to.word,
		};

		// Workaround for https://github.com/codemirror/CodeMirror/issues/3092
		const CM = cm.constructor;
		CM.on(data, 'shown', CM.signal.bind(cm, cm, 'hint-shown'));

		return data;
	}

	const themes = [
		new Factory$3(),
		new Factory$1(),
		new Factory$2(),
		new Factory(Factory.RIGHT),
		new Factory(Factory.LEFT),
	];

	const SharedParser = new Parser();
	const SharedGenerator = new Generator();
	const CMMode = SharedParser.getCodeMirrorMode();

	function registerCodeMirrorMode(CodeMirror, modeName = 'sequence') {
		const cm = CodeMirror || window.CodeMirror;
		cm.defineMode(modeName, () => CMMode);
		cm.registerHelper('hint', modeName, getHints);
	}

	function addTheme(theme) {
		themes.push(theme);
	}

	function extractCodeFromSVG(svg) {
		const dom = new DOMParser().parseFromString(svg, 'image/svg+xml');
		const meta = dom.querySelector('metadata');
		if(!meta) {
			return '';
		}
		return meta.textContent;
	}

	function renderAll(diagrams) {
		const errors = [];
		function storeError(sd, e) {
			errors.push(e);
		}

		diagrams.forEach((diagram) => {
			diagram.addEventListener('error', storeError);
			diagram.optimisedRenderPreReflow();
		});
		diagrams.forEach((diagram) => {
			diagram.optimisedRenderReflow();
		});
		diagrams.forEach((diagram) => {
			diagram.optimisedRenderPostReflow();
			diagram.removeEventListener('error', storeError);
		});

		if(errors.length > 0) {
			throw errors;
		}
	}

	function pickDocument(container) {
		if(container) {
			return container.ownerDocument || null;
		} else if(typeof window === 'undefined') {
			return null;
		} else {
			return window.document;
		}
	}

	class SequenceDiagram extends EventObject {
		/* eslint-disable-next-line complexity */ // Just some defaults
		constructor(code = null, options = {}) {
			super();

			let opts = null;
			if(code && typeof code === 'object') {
				opts = code;
				this.code = opts.code;
			} else {
				opts = options;
				this.code = code;
			}

			Object.assign(this, {
				exporter: new Exporter(),
				generator: SharedGenerator,
				isInteractive: false,
				latestProcessed: null,
				latestTitle: '',
				parser: SharedParser,
				registerCodeMirrorMode,
				renderer: new Renderer(Object.assign({
					document: pickDocument(opts.container),
					themes,
				}, opts)),
				textSizerFactory: opts.textSizerFactory || null,
			});

			this.renderer.addEventForwarding(this);

			if(opts.container) {
				opts.container.appendChild(this.dom());
			}
			if(opts.interactive) {
				this.addInteractivity();
			}
			if(typeof this.code === 'string' && opts.render !== false) {
				this.render();
			}
		}

		clone(options = {}) {
			const reference = (options.container || this.renderer.dom());

			return new SequenceDiagram(Object.assign({
				code: this.code,
				components: this.renderer.components,
				container: null,
				document: reference.ownerDocument,
				interactive: this.isInteractive,
				namespace: null,
				textSizerFactory: this.textSizerFactory,
				themes: this.renderer.getThemes(),
			}, options));
		}

		set(code = '', {render = true} = {}) {
			if(this.code === code) {
				return;
			}

			this.code = code;
			if(render) {
				this.render();
			}
		}

		process(code) {
			const parsed = this.parser.parse(code);
			return this.generator.generate(parsed);
		}

		addTheme(theme) {
			this.renderer.addTheme(theme);
		}

		setHighlight(line) {
			this.renderer.setHighlight(line);
		}

		isCollapsed(line) {
			return this.renderer.isCollapsed(line);
		}

		setCollapsed(line, collapsed = true, {render = true} = {}) {
			if(!this.renderer.setCollapsed(line, collapsed)) {
				return false;
			}
			if(render && this.latestProcessed) {
				this.render(this.latestProcessed);
			}
			return true;
		}

		collapse(line, options) {
			return this.setCollapsed(line, true, options);
		}

		expand(line, options) {
			return this.setCollapsed(line, false, options);
		}

		toggleCollapsed(line, options) {
			return this.setCollapsed(line, !this.isCollapsed(line), options);
		}

		expandAll(options) {
			return this.setCollapsed(null, false, options);
		}

		getThemeNames() {
			return this.renderer.getThemeNames();
		}

		getThemes() {
			return this.renderer.getThemes();
		}

		_updateSize({width = null, height = null, zoom = null}) {
			if(width !== null) {
				if(height === null) {
					this.renderer.height *= width / this.renderer.width;
				} else {
					this.renderer.height = height;
				}
				this.renderer.width = width;
			} else if(height !== null) {
				this.renderer.width *= height / this.renderer.height;
				this.renderer.height = height;
			} else if(zoom !== null) {
				this.renderer.width *= zoom;
				this.renderer.height *= zoom;
			}
		}

		getSVGCodeSynchronous({size = {}} = {}) {
			this._updateSize(size);
			return this.exporter.getSVGContent(this.renderer);
		}

		getSVGCode(options) {
			return Promise.resolve(this.getSVGCodeSynchronous(options));
		}

		getSVGSynchronous({size = {}} = {}) {
			this._updateSize(size);
			return this.exporter.getSVGURL(this.renderer);
		}

		getSVG({size = {}} = {}) {
			this._updateSize(size);
			return Promise.resolve({
				latest: true,
				url: this.getSVGSynchronous(),
			});
		}

		getCanvas({resolution = 1, size = {}} = {}) {
			this._updateSize(size);
			return new Promise((resolve) => {
				this.exporter.getCanvas(this.renderer, resolution, resolve);
			});
		}

		getPNG({resolution = 1, size = {}} = {}) {
			this._updateSize(size);
			return new Promise((resolve) => {
				this.exporter.getPNGURL(
					this.renderer,
					resolution,
					(url, latest) => {
						resolve({latest, url});
					}
				);
			});
		}

		getSize() {
			return {
				height: this.renderer.height,
				width: this.renderer.width,
			};
		}

		getTitle() {
			return this.latestTitle;
		}

		_revertParent(state) {
			const dom = this.renderer.dom();
			if(dom.parentNode !== state.originalParent) {
				dom.parentNode.removeChild(dom);
				if(state.originalParent) {
					state.originalParent.appendChild(dom);
				}
			}
		}

		_sendRenderError(e) {
			this._revertParent(this.renderState);
			this.renderState.error = true;
			this.trigger('error', [this, e]);
		}

		optimisedRenderPreReflow(processed = null) {
			const dom = this.renderer.dom();
			this.renderState = {
				error: false,
				originalParent: dom.parentNode,
				processed,
			};
			const state = this.renderState;

			if(!dom.isConnected) {
				if(state.originalParent) {
					state.originalParent.removeChild(dom);
				}
				dom.ownerDocument.body.appendChild(dom);
			}

			try {
				if(!state.processed) {
					state.processed = this.process(this.code);
				}
				const titleParts = state.processed.meta.title || [];
				this.latestTitle = titleParts
					.map((ln) => ln.map((p) => p.text).join(''))
					.join(' ');
				this.renderer.optimisedRenderPreReflow(state.processed);
			} catch(e) {
				this._sendRenderError(e);
			}
		}

		optimisedRenderReflow() {
			try {
				if(!this.renderState.error) {
					this.renderer.optimisedRenderReflow();
				}
			} catch(e) {
				this._sendRenderError(e);
			}
		}

		optimisedRenderPostReflow() {
			const state = this.renderState;

			try {
				if(!state.error) {
					this.renderer.optimisedRenderPostReflow(state.processed);
				}
			} catch(e) {
				this._sendRenderError(e);
			}

			this.renderState = null;

			if(!state.error) {
				this._revertParent(state);
				this.latestProcessed = state.processed;
				this.trigger('render', [this]);
			}
		}

		render(processed = null) {
			let latestError = null;
			function storeError(sd, e) {
				latestError = e;
			}
			this.addEventListener('error', storeError);

			this.optimisedRenderPreReflow(processed);
			this.optimisedRenderReflow();
			this.optimisedRenderPostReflow();

			this.removeEventListener('error', storeError);
			if(latestError) {
				throw latestError;
			}
		}

		setContainer(node = null) {
			const dom = this.dom();
			if(dom.parentNode) {
				dom.parentNode.removeChild(dom);
			}
			if(node) {
				node.appendChild(dom);
			}
		}

		addInteractivity() {
			if(this.isInteractive) {
				return;
			}
			this.isInteractive = true;

			this.addEventListener('click', (element) => {
				this.toggleCollapsed(element.ln);
			});
		}

		extractCodeFromSVG(svg) {
			return extractCodeFromSVG(svg);
		}

		renderAll(diagrams) {
			return renderAll(diagrams);
		}

		dom() {
			return this.renderer.dom();
		}
	}

	function datasetBoolean(value) {
		return typeof value !== 'undefined' && value !== 'false';
	}

	function parseTagOptions(element) {
		return {
			interactive: datasetBoolean(element.dataset.sdInteractive),
			namespace: element.dataset.sdNamespace || null,
		};
	}

	function convertOne(element, code = null, options = {}) {
		if(element.tagName === 'svg') {
			return null;
		}

		const tagOptions = parseTagOptions(element);

		const diagram = new SequenceDiagram(
			(code === null) ? element.textContent : code,
			Object.assign(tagOptions, options)
		);
		const newElement = diagram.dom();
		const attrs = element.attributes;
		for(let i = 0; i < attrs.length; ++ i) {
			newElement.setAttribute(
				attrs[i].nodeName,
				attrs[i].nodeValue
			);
		}
		element.parentNode.replaceChild(newElement, element);
		return diagram;
	}

	function convert(elements, code = null, options = {}) {
		let c = null;
		let opts = null;
		if(code && typeof code === 'object') {
			opts = code;
			c = opts.code;
		} else {
			opts = options;
			c = code;
		}

		if(Array.isArray(elements)) {
			const nodrawOpts = Object.assign({}, opts, {render: false});
			const diagrams = elements
				.map((el) => convertOne(el, c, nodrawOpts))
				.filter((diagram) => (diagram !== null));
			if(opts.render !== false) {
				renderAll(diagrams);
			}
			return diagrams;
		} else {
			return convertOne(elements, c, opts);
		}
	}

	function convertAll(root = null, className = 'sequence-diagram') {
		let r = null;
		let cls = null;
		if(typeof root === 'string') {
			r = null;
			cls = root;
		} else {
			r = root;
			cls = className;
		}

		let elements = null;
		if(r && typeof r.length !== 'undefined') {
			elements = r;
		} else {
			elements = (r || window.document).getElementsByClassName(cls);
		}

		// Convert from "live" collection to static to avoid infinite loops:
		const els = [];
		for(let i = 0; i < elements.length; ++ i) {
			els.push(elements[i]);
		}

		// Convert elements
		convert(els);
	}

	function getDefaultThemeNames() {
		return themes.map((theme) => theme.name);
	}

	Object.assign(SequenceDiagram, {
		Exporter,
		Generator,
		Parser,
		Renderer,
		addTheme,
		convert,
		convertAll,
		extractCodeFromSVG,
		getDefaultThemeNames,
		registerCodeMirrorMode,
		renderAll,
		themes,
	});

	const out = {
		SequenceDiagram,
	};

	if(typeof exports !== 'undefined') {
		Object.assign(exports, out);
	} else if(window.define && window.define.amd) {
		Object.assign(SequenceDiagram, out);
		window.define(() => SequenceDiagram);
	} else {
		window.document.addEventListener('DOMContentLoaded', () => {
			SequenceDiagram.convertAll();
		}, {once: true});

		if(window.CodeMirror) {
			SequenceDiagram.registerCodeMirrorMode(window.CodeMirror);
		}

		Object.assign(window, out);
	}

})();
