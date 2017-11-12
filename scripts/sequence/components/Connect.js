define([
	'./BaseComponent',
	'svg/SVGUtilities',
	'svg/SVGShapes',
], (
	BaseComponent,
	svg,
	SVGShapes
) => {
	'use strict';

	function drawHorizontalArrowHead(container, {x, y, dx, dy, attrs}) {
		container.appendChild(svg.make(
			attrs.fill === 'none' ? 'polyline' : 'polygon',
			Object.assign({
				'points': (
					(x + dx) + ' ' + (y - dy) + ' ' +
					x + ' ' + y + ' ' +
					(x + dx) + ' ' + (y + dy)
				),
			}, attrs)
		));
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
			const lineStroke = theme.agentLineAttrs['stroke-width'] * 0.5;
			if(join === 'round') {
				return lineStroke + t;
			} else {
				const h = arrow.height / 2;
				const w = arrow.width;
				const arrowDistance = t * Math.sqrt((w * w) / (h * h) + 1);
				return lineStroke + arrowDistance;
			}
		}

		render(layer, theme, {x, y, dir}) {
			const config = this.getConfig(theme);
			drawHorizontalArrowHead(layer, {
				x: x + this.short(theme) * dir,
				y,
				dx: config.width * dir,
				dy: config.height / 2,
				attrs: config.attrs,
			});
		}

		width(theme) {
			return this.short(theme) + this.getConfig(theme).width;
		}

		height(theme) {
			return this.getConfig(theme).height;
		}

		lineGap(theme, lineAttrs) {
			const arrow = this.getConfig(theme);
			const short = this.short(theme);
			if(arrow.attrs.fill === 'none') {
				const h = arrow.height / 2;
				const w = arrow.width;
				const safe = short + (lineAttrs['stroke-width'] / 2) * (w / h);
				return (short + safe) / 2;
			} else {
				return short + arrow.width / 2;
			}
		}
	}

	const ARROWHEADS = [
		{
			render: () => {},
			width: () => 0,
			height: () => 0,
			lineGap: () => 0,
		},
		new Arrowhead('single'),
		new Arrowhead('double'),
	];

	function makeWavyLineHeights(height) {
		return [
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

	class ConnectingLine {
		renderFlat(container, {x1, x2, y}, attrs) {
			const ww = attrs['wave-width'];
			const hh = attrs['wave-height'];

			if(!ww || !hh) {
				container.appendChild(svg.make('line', Object.assign({
					'x1': x1,
					'y1': y,
					'x2': x2,
					'y2': y,
				}, attrs)));
				return;
			}

			const heights = makeWavyLineHeights(hh);
			const dw = ww / heights.length;
			let p = 0;

			let points = '';
			for(let x = x1; x + dw <= x2; x += dw) {
				points += (
					x + ' ' +
					(y + heights[(p ++) % heights.length]) + ' '
				);
			}
			points += x2 + ' ' + y;
			container.appendChild(svg.make('polyline', Object.assign({
				points,
			}, attrs)));
		}

		renderRev(container, {xL1, xL2, y1, y2, xR}, attrs) {
			const r = (y2 - y1) / 2;
			const ww = attrs['wave-width'];
			const hh = attrs['wave-height'];

			if(!ww || !hh) {
				container.appendChild(svg.make('path', Object.assign({
					'd': (
						'M ' + xL1 + ' ' + y1 +
						' L ' + xR + ' ' + y1 +
						' A ' + r + ' ' + r + ' 0 0 1 ' + xR + ' ' + y2 +
						' L ' + xL2 + ' ' + y2
					),
				}, attrs)));
				return;
			}

			const heights = makeWavyLineHeights(hh);
			const dw = ww / heights.length;
			let p = 0;

			let points = '';
			for(let x = xL1; x + dw <= xR; x += dw) {
				points += (
					x + ' ' +
					(y1 + heights[(p ++) % heights.length]) + ' '
				);
			}

			const ym = (y1 + y2) / 2;
			for(let t = 0; t + dw / r <= Math.PI; t += dw / r) {
				const h = heights[(p ++) % heights.length];
				points += (
					(xR + Math.sin(t) * (r - h)) + ' ' +
					(ym - Math.cos(t) * (r - h)) + ' '
				);
			}

			for(let x = xR; x - dw >= xL2; x -= dw) {
				points += (
					x + ' ' +
					(y2 - heights[(p ++) % heights.length]) + ' '
				);
			}

			points += xL2 + ' ' + y2;
			container.appendChild(svg.make('polyline', Object.assign({
				points,
			}, attrs)));
		}
	}

	const CONNECTING_LINE = new ConnectingLine();

	class Connect extends BaseComponent {
		separation({label, agentNames, options}, env) {
			const config = env.theme.connect;

			const lArrow = ARROWHEADS[options.left];
			const rArrow = ARROWHEADS[options.right];

			let labelWidth = (
				env.textSizer.measure(config.label.attrs, label).width
			);
			if(labelWidth > 0) {
				labelWidth += config.label.padding * 2;
			}

			const info1 = env.agentInfos.get(agentNames[0]);
			if(agentNames[0] === agentNames[1]) {
				env.addSpacing(agentNames[0], {
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
				const info2 = env.agentInfos.get(agentNames[1]);
				env.addSeparation(
					agentNames[0],
					agentNames[1],

					info1.currentMaxRad +
					info2.currentMaxRad +
					labelWidth +
					Math.max(
						lArrow.width(env.theme),
						rArrow.width(env.theme)
					) * 2
				);
			}
		}

		renderSelfConnect({label, agentNames, options}, env) {
			/* jshint -W071 */ // TODO: find appropriate abstractions
			const config = env.theme.connect;
			const from = env.agentInfos.get(agentNames[0]);

			const lArrow = ARROWHEADS[options.left];
			const rArrow = ARROWHEADS[options.right];

			const height = label ? (
				env.textSizer.measureHeight(config.label.attrs, label) +
				config.label.margin.top +
				config.label.margin.bottom
			) : 0;

			const lineX = from.x + from.currentMaxRad;
			const y0 = env.primaryY;
			const x0 = (
				lineX +
				lArrow.width(env.theme) +
				(label ? config.label.padding : 0)
			);

			const clickable = env.makeRegion();

			const renderedText = SVGShapes.renderBoxedText(label, {
				x: x0 - config.mask.padding.left,
				y: y0 - height + config.label.margin.top,
				padding: config.mask.padding,
				boxAttrs: {'fill': '#000000'},
				labelAttrs: config.label.loopbackAttrs,
				boxLayer: env.maskLayer,
				labelLayer: clickable,
				SVGTextBlockClass: env.SVGTextBlockClass,
			});
			const labelW = (label ? (
				renderedText.width +
				config.label.padding -
				config.mask.padding.left -
				config.mask.padding.right
			) : 0);
			const r = config.loopbackRadius;
			const x1 = Math.max(lineX + rArrow.width(env.theme), x0 + labelW);
			const y1 = y0 + r * 2;

			const lineAttrs = config.lineAttrs[options.line];
			CONNECTING_LINE.renderRev(env.shapeLayer, {
				xL1: lineX + lArrow.lineGap(env.theme, lineAttrs),
				xL2: lineX + rArrow.lineGap(env.theme, lineAttrs),
				y1: y0,
				y2: y1,
				xR: x1,
			}, lineAttrs);

			lArrow.render(env.shapeLayer, env.theme, {x: lineX, y: y0, dir: 1});
			rArrow.render(env.shapeLayer, env.theme, {x: lineX, y: y1, dir: 1});

			const raise = Math.max(height, lArrow.height(env.theme) / 2);
			const arrowDip = rArrow.height(env.theme) / 2;

			clickable.insertBefore(svg.make('rect', {
				'x': lineX,
				'y': y0 - raise,
				'width': x1 + r - lineX,
				'height': raise + r * 2 + arrowDip,
				'fill': 'transparent',
			}), clickable.firstChild);

			return y1 + arrowDip + env.theme.actionMargin;
		}

		renderSimpleConnect({label, agentNames, options}, env) {
			const config = env.theme.connect;
			const from = env.agentInfos.get(agentNames[0]);
			const to = env.agentInfos.get(agentNames[1]);

			const lArrow = ARROWHEADS[options.left];
			const rArrow = ARROWHEADS[options.right];

			const dir = (from.x < to.x) ? 1 : -1;

			const height = (
				env.textSizer.measureHeight(config.label.attrs, label) +
				config.label.margin.top +
				config.label.margin.bottom
			);

			const x0 = from.x + from.currentMaxRad * dir;
			const x1 = to.x - to.currentMaxRad * dir;
			const y = env.primaryY;

			const clickable = env.makeRegion();

			SVGShapes.renderBoxedText(label, {
				x: (x0 + x1) / 2,
				y: y - height + config.label.margin.top,
				padding: config.mask.padding,
				boxAttrs: {'fill': '#000000'},
				labelAttrs: config.label.attrs,
				boxLayer: env.maskLayer,
				labelLayer: clickable,
				SVGTextBlockClass: env.SVGTextBlockClass,
			});

			const lineAttrs = config.lineAttrs[options.line];
			CONNECTING_LINE.renderFlat(env.shapeLayer, {
				x1: x0 + lArrow.lineGap(env.theme, lineAttrs) * dir,
				x2: x1 - rArrow.lineGap(env.theme, lineAttrs) * dir,
				y,
			}, lineAttrs);

			lArrow.render(env.shapeLayer, env.theme, {x: x0, y, dir});
			rArrow.render(env.shapeLayer, env.theme, {x: x1, y, dir: -dir});

			const arrowSpread = Math.max(
				lArrow.height(env.theme),
				rArrow.height(env.theme)
			) / 2;

			clickable.insertBefore(svg.make('rect', {
				'x': Math.min(x0, x1),
				'y': y - Math.max(height, arrowSpread),
				'width': Math.abs(x1 - x0),
				'height': Math.max(height, arrowSpread) + arrowSpread,
				'fill': 'transparent',
			}), clickable.firstChild);

			return y + arrowSpread + env.theme.actionMargin;
		}

		renderPre({label, agentNames, options}, env) {
			const config = env.theme.connect;

			const lArrow = ARROWHEADS[options.left];
			const rArrow = ARROWHEADS[options.right];

			const height = (
				env.textSizer.measureHeight(config.label.attrs, label) +
				config.label.margin.top +
				config.label.margin.bottom
			);

			let arrowH = lArrow.height(env.theme);
			if(agentNames[0] !== agentNames[1]) {
				arrowH = Math.max(arrowH, rArrow.height(env.theme));
			}

			return {
				agentNames,
				topShift: Math.max(arrowH / 2, height),
			};
		}

		render(stage, env) {
			if(stage.agentNames[0] === stage.agentNames[1]) {
				return this.renderSelfConnect(stage, env);
			} else {
				return this.renderSimpleConnect(stage, env);
			}
		}
	}

	BaseComponent.register('connect', new Connect());

	return Connect;
});
