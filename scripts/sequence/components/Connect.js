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

		render(layer, theme, pt, dir) {
			const config = this.getConfig(theme);
			layer.appendChild(config.render(config.attrs, {
				x: pt.x + this.short(theme) * dir,
				y: pt.y,
				dx: config.width * dir,
				dy: config.height / 2,
			}));
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

	function renderFlat({x1, dx1, x2, dx2, y}, attrs) {
		const ww = attrs['wave-width'];
		const hh = attrs['wave-height'];

		if(!ww || !hh) {
			return {
				shape: svg.make('line', Object.assign({
					'x1': x1 + dx1,
					'y1': y,
					'x2': x2 + dx2,
					'y2': y,
				}, attrs)),
				p1: {x: x1, y},
				p2: {x: x2, y},
			};
		}

		const heights = makeWavyLineHeights(hh);
		const dw = ww / heights.length;
		let p = 0;

		let points = '';
		const xL = Math.min(x1 + dx1, x2 + dx2);
		const xR = Math.max(x1 + dx1, x2 + dx2);
		for(let x = xL; x + dw <= xR; x += dw) {
			points += (
				x + ' ' +
				(y + heights[(p ++) % heights.length]) + ' '
			);
		}
		points += xR + ' ' + y;
		return {
			shape: svg.make('polyline', Object.assign({points}, attrs)),
			p1: {x: x1, y},
			p2: {x: x2, y},
		};
	}

	function renderRev({xL, dx1, dx2, y1, y2, xR}, attrs) {
		const r = (y2 - y1) / 2;
		const ww = attrs['wave-width'];
		const hh = attrs['wave-height'];

		if(!ww || !hh) {
			return {
				shape: svg.make('path', Object.assign({
					'd': (
						'M' + (xL + dx1) + ' ' + y1 +
						'L' + xR + ' ' + y1 +
						'A' + r + ' ' + r + ' 0 0 1 ' + xR + ' ' + y2 +
						'L' + (xL + dx2) + ' ' + y2
					),
				}, attrs)),
				p1: {x: xL, y: y1},
				p2: {x: xL, y: y2},
			};
		}

		const heights = makeWavyLineHeights(hh);
		const dw = ww / heights.length;
		let p = 0;

		let points = '';
		for(let x = xL + dx1; x + dw <= xR; x += dw) {
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

		for(let x = xR; x - dw >= xL + dx2; x -= dw) {
			points += (
				x + ' ' +
				(y2 - heights[(p ++) % heights.length]) + ' '
			);
		}

		points += (xL + dx2) + ' ' + y2;
		return {
			shape: svg.make('polyline', Object.assign({points}, attrs)),
			p1: {x: xL, y: y1},
			p2: {x: xL, y: y2},
		};
	}

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

			const line = config.line[options.line];
			const rendered = (line.renderRev || renderRev)({
				xL: lineX,
				dx1: lArrow.lineGap(env.theme, line.attrs),
				dx2: rArrow.lineGap(env.theme, line.attrs),
				y1: y0,
				y2: y1,
				xR: x1,
			}, line.attrs);
			env.shapeLayer.appendChild(rendered.shape);

			lArrow.render(env.shapeLayer, env.theme, rendered.p1, 1);
			rArrow.render(env.shapeLayer, env.theme, rendered.p2, 1);

			const raise = Math.max(height, lArrow.height(env.theme) / 2);
			const arrowDip = rArrow.height(env.theme) / 2;

			clickable.insertBefore(svg.make('rect', {
				'x': lineX,
				'y': y0 - raise,
				'width': x1 + r - lineX,
				'height': raise + r * 2 + arrowDip,
				'fill': 'transparent',
			}), clickable.firstChild);

			return y1 + Math.max(
				arrowDip + env.theme.minActionMargin,
				env.theme.actionMargin
			);
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

			const line = config.line[options.line];
			const rendered = (line.render || renderFlat)({
				x1: x0,
				dx1: lArrow.lineGap(env.theme, line.attrs) * dir,
				x2: x1,
				dx2: -rArrow.lineGap(env.theme, line.attrs) * dir,
				y,
			}, line.attrs);
			env.shapeLayer.appendChild(rendered.shape);

			lArrow.render(env.shapeLayer, env.theme, rendered.p1, dir);
			rArrow.render(env.shapeLayer, env.theme, rendered.p2, -dir);

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

			return y + Math.max(
				arrowSpread + env.theme.minActionMargin,
				env.theme.actionMargin
			);
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
