define([
	'./BaseComponent',
	'core/ArrayUtilities',
	'svg/SVGUtilities',
	'svg/SVGShapes',
], (
	BaseComponent,
	array,
	svg,
	SVGShapes
) => {
	'use strict';

	class CapBox {
		separation({formattedLabel}, env) {
			const config = env.theme.agentCap.box;
			const width = (
				env.textSizer.measure(config.labelAttrs, formattedLabel).width +
				config.padding.left +
				config.padding.right
			);

			return {
				left: width / 2,
				right: width / 2,
				radius: width / 2,
			};
		}

		topShift({formattedLabel}, env) {
			const config = env.theme.agentCap.box;
			const height = (
				env.textSizer.measureHeight(config.labelAttrs, formattedLabel) +
				config.padding.top +
				config.padding.bottom
			);
			return Math.max(0, height - config.arrowBottom);
		}

		render(y, {x, formattedLabel}, env) {
			const config = env.theme.agentCap.box;
			const clickable = env.makeRegion();
			const {width, height} = SVGShapes.renderBoxedText(formattedLabel, {
				x,
				y,
				padding: config.padding,
				boxAttrs: config.boxAttrs,
				boxRenderer: config.boxRenderer,
				labelAttrs: config.labelAttrs,
				boxLayer: env.shapeLayer,
				labelLayer: clickable,
				SVGTextBlockClass: env.SVGTextBlockClass,
			});
			clickable.insertBefore(svg.make('rect', {
				'x': x - width / 2,
				'y': y,
				'width': width,
				'height': height,
				'fill': 'transparent',
				'class': 'vis',
			}), clickable.firstChild);

			return {
				lineTop: 0,
				lineBottom: height,
				height,
			};
		}
	}

	class CapCross {
		separation(agentInfo, env) {
			const config = env.theme.agentCap.cross;
			return {
				left: config.size / 2,
				right: config.size / 2,
				radius: 0,
			};
		}

		topShift(agentInfo, env) {
			const config = env.theme.agentCap.cross;
			return config.size / 2;
		}

		render(y, {x}, env) {
			const config = env.theme.agentCap.cross;
			const d = config.size / 2;

			env.shapeLayer.appendChild(config.render({x, y: y + d, radius: d}));

			env.makeRegion().appendChild(svg.make('rect', {
				'x': x - d,
				'y': y,
				'width': d * 2,
				'height': d * 2,
				'fill': 'transparent',
				'class': 'vis',
			}));

			return {
				lineTop: d,
				lineBottom: d,
				height: d * 2,
			};
		}
	}

	class CapBar {
		separation({formattedLabel}, env) {
			const config = env.theme.agentCap.box;
			const width = (
				env.textSizer.measure(config.labelAttrs, formattedLabel).width +
				config.padding.left +
				config.padding.right
			);

			return {
				left: width / 2,
				right: width / 2,
				radius: width / 2,
			};
		}

		topShift(agentInfo, env) {
			const config = env.theme.agentCap.bar;
			return config.height / 2;
		}

		render(y, {x, formattedLabel}, env) {
			const boxCfg = env.theme.agentCap.box;
			const barCfg = env.theme.agentCap.bar;
			const width = (
				env.textSizer.measure(boxCfg.labelAttrs, formattedLabel).width +
				boxCfg.padding.left +
				boxCfg.padding.right
			);
			const height = barCfg.height;

			env.shapeLayer.appendChild(barCfg.render({
				x: x - width / 2,
				y,
				width,
				height,
			}));

			env.makeRegion().appendChild(svg.make('rect', {
				'x': x - width / 2,
				'y': y,
				'width': width,
				'height': height,
				'fill': 'transparent',
				'class': 'vis',
			}));

			return {
				lineTop: 0,
				lineBottom: height,
				height: height,
			};
		}
	}

	class CapFade {
		separation({currentRad}) {
			return {
				left: currentRad,
				right: currentRad,
				radius: currentRad,
			};
		}

		topShift(agentInfo, env, isBegin) {
			const config = env.theme.agentCap.fade;
			return isBegin ? config.height : 0;
		}

		render(y, {x}, env, isBegin) {
			const config = env.theme.agentCap.fade;
			const ratio = config.height / (config.height + config.extend);

			const gradID = env.addDef(isBegin ? 'FadeIn' : 'FadeOut', () => {
				const grad = svg.make('linearGradient', {
					'x1': '0%',
					'y1': isBegin ? '100%' : '0%',
					'x2': '0%',
					'y2': isBegin ? '0%' : '100%',
				});
				grad.appendChild(svg.make('stop', {
					'offset': '0%',
					'stop-color': '#FFFFFF',
				}));
				grad.appendChild(svg.make('stop', {
					'offset': (100 * ratio).toFixed(3) + '%',
					'stop-color': '#000000',
				}));
				return grad;
			});

			env.maskLayer.appendChild(svg.make('rect', {
				'x': x - config.width / 2,
				'y': y - (isBegin ? config.extend : 0),
				'width': config.width,
				'height': config.height + config.extend,
				'fill': 'url(#' + gradID + ')',
			}));

			env.makeRegion().appendChild(svg.make('rect', {
				'x': x - config.width / 2,
				'y': y,
				'width': config.width,
				'height': config.height,
				'fill': 'transparent',
				'class': 'vis',
			}));

			return {
				lineTop: config.height,
				lineBottom: 0,
				height: config.height,
			};
		}
	}

	class CapNone {
		separation({currentRad}) {
			return {
				left: currentRad,
				right: currentRad,
				radius: currentRad,
			};
		}

		topShift(agentInfo, env) {
			const config = env.theme.agentCap.none;
			return config.height;
		}

		render(y, {x}, env) {
			const config = env.theme.agentCap.none;

			const w = 10;
			env.makeRegion().appendChild(svg.make('rect', {
				'x': x - w / 2,
				'y': y,
				'width': w,
				'height': config.height,
				'fill': 'transparent',
				'class': 'vis',
			}));

			return {
				lineTop: config.height,
				lineBottom: 0,
				height: config.height,
			};
		}
	}

	const AGENT_CAPS = {
		'box': new CapBox(),
		'cross': new CapCross(),
		'bar': new CapBar(),
		'fade': new CapFade(),
		'none': new CapNone(),
	};

	class AgentCap extends BaseComponent {
		constructor(begin) {
			super();
			this.begin = begin;
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

		separation({mode, agentIDs}, env) {
			if(this.begin) {
				array.mergeSets(env.visibleAgentIDs, agentIDs);
			} else {
				array.removeAll(env.visibleAgentIDs, agentIDs);
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
				const shifts = cap.render(
					y0,
					agentInfo,
					env,
					this.begin
				);
				maxEnd = Math.max(maxEnd, y0 + shifts.height);
				if(this.begin) {
					env.drawAgentLine(id, y0 + shifts.lineBottom);
				} else {
					env.drawAgentLine(id, y0 + shifts.lineTop, true);
				}
			});
			return maxEnd + env.theme.actionMargin;
		}
	}

	BaseComponent.register('agent begin', new AgentCap(true));
	BaseComponent.register('agent end', new AgentCap(false));

	return AgentCap;
});
