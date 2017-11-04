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

	function getArrowShort(theme) {
		const arrow = theme.connect.arrow;
		const h = arrow.height / 2;
		const w = arrow.width;
		const t = arrow.attrs['stroke-width'] * 0.5;
		const lineStroke = theme.agentLineAttrs['stroke-width'] * 0.5;
		const arrowDistance = t * Math.sqrt((w * w) / (h * h) + 1);
		return lineStroke + arrowDistance;
	}

	class Connect extends BaseComponent {
		separation({agentNames, label}, env) {
			const config = env.theme.connect;

			const labelWidth = (
				env.textSizer.measure(config.label.attrs, label).width +
				config.label.padding * 2
			);

			const short = getArrowShort(env.theme);

			const info1 = env.agentInfos.get(agentNames[0]);
			if(agentNames[0] === agentNames[1]) {
				env.addSpacing(agentNames[0], {
					left: 0,
					right: (
						info1.currentMaxRad +
						labelWidth +
						config.arrow.width +
						short +
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
					config.arrow.width * 2 +
					short * 2
				);
			}
		}

		renderSelfConnect({label, agentNames, options}, env) {
			const config = env.theme.connect;
			const from = env.agentInfos.get(agentNames[0]);

			const dy = config.arrow.height / 2;
			const short = getArrowShort(env.theme);

			const height = (
				env.textSizer.measureHeight(config.label.attrs, label) +
				config.label.margin.top +
				config.label.margin.bottom
			);

			const lineX = from.x + from.currentRad;
			const y0 = env.primaryY;
			const x0 = (
				lineX +
				short +
				config.arrow.width +
				config.label.padding
			);

			const renderedText = SVGShapes.renderBoxedText(label, {
				x: x0 - config.mask.padding.left,
				y: y0 - height + config.label.margin.top,
				padding: config.mask.padding,
				boxAttrs: config.mask.maskAttrs,
				labelAttrs: config.label.loopbackAttrs,
				boxLayer: env.maskLayer,
				labelLayer: env.labelLayer,
				SVGTextBlockClass: env.SVGTextBlockClass,
			});
			const r = config.loopbackRadius;
			const x1 = (
				x0 +
				renderedText.width +
				config.label.padding -
				config.mask.padding.left -
				config.mask.padding.right
			);
			const y1 = y0 + r * 2;

			env.shapeLayer.appendChild(svg.make('path', Object.assign({
				'd': (
					'M ' + (lineX + (options.left ? short : 0)) + ' ' + y0 +
					' L ' + x1 + ' ' + y0 +
					' A ' + r + ' ' + r + ' 0 0 1 ' + x1 + ' ' + y1 +
					' L ' + (lineX + (options.right ? short : 0)) + ' ' + y1
				),
			}, config.lineAttrs[options.line])));

			if(options.left) {
				drawHorizontalArrowHead(env.shapeLayer, {
					x: lineX + short,
					y: y0,
					dx: config.arrow.width,
					dy,
					attrs: config.arrow.attrs,
				});
			}

			if(options.right) {
				drawHorizontalArrowHead(env.shapeLayer, {
					x: lineX + short,
					y: y1,
					dx: config.arrow.width,
					dy,
					attrs: config.arrow.attrs,
				});
			}

			return y1 + dy + env.theme.actionMargin;
		}

		renderSimpleConnect({label, agentNames, options}, env) {
			const config = env.theme.connect;
			const from = env.agentInfos.get(agentNames[0]);
			const to = env.agentInfos.get(agentNames[1]);

			const dy = config.arrow.height / 2;
			const dir = (from.x < to.x) ? 1 : -1;
			const short = getArrowShort(env.theme);

			const height = (
				env.textSizer.measureHeight(config.label.attrs, label) +
				config.label.margin.top +
				config.label.margin.bottom
			);

			const x0 = from.x + from.currentRad * dir;
			const x1 = to.x - to.currentRad * dir;
			let y = env.primaryY;

			SVGShapes.renderBoxedText(label, {
				x: (x0 + x1) / 2,
				y: y - height + config.label.margin.top,
				padding: config.mask.padding,
				boxAttrs: config.mask.maskAttrs,
				labelAttrs: config.label.attrs,
				boxLayer: env.maskLayer,
				labelLayer: env.labelLayer,
				SVGTextBlockClass: env.SVGTextBlockClass,
			});

			env.shapeLayer.appendChild(svg.make('line', Object.assign({
				'x1': x0 + (options.left ? short : 0) * dir,
				'y1': y,
				'x2': x1 - (options.right ? short : 0) * dir,
				'y2': y,
			}, config.lineAttrs[options.line])));

			if(options.left) {
				drawHorizontalArrowHead(env.shapeLayer, {
					x: x0 + short * dir,
					y,
					dx: config.arrow.width * dir,
					dy,
					attrs: config.arrow.attrs,
				});
			}

			if(options.right) {
				drawHorizontalArrowHead(env.shapeLayer, {
					x: x1 - short * dir,
					y,
					dx: -config.arrow.width * dir,
					dy,
					attrs: config.arrow.attrs,
				});
			}

			return y + dy + env.theme.actionMargin;
		}

		renderPre({label, agentNames}, env) {
			const config = env.theme.connect;

			const height = (
				env.textSizer.measureHeight(config.label.attrs, label) +
				config.label.margin.top +
				config.label.margin.bottom
			);

			return {
				agentNames,
				topShift: Math.max(config.arrow.height / 2, height),
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
