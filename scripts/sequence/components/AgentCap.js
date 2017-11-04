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
		separation({label}, env) {
			const config = env.theme.agentCap.box;
			const width = (
				env.textSizer.measure(config.labelAttrs, label).width +
				config.padding.left +
				config.padding.right
			);

			return {
				left: width / 2,
				right: width / 2,
			};
		}

		topShift() {
			return 0;
		}

		render(y, {x, label}, env) {
			const config = env.theme.agentCap.box;
			const {height} = SVGShapes.renderBoxedText(label, {
				x,
				y,
				padding: config.padding,
				boxAttrs: config.boxAttrs,
				labelAttrs: config.labelAttrs,
				boxLayer: env.shapeLayer,
				labelLayer: env.labelLayer,
				SVGTextBlockClass: env.SVGTextBlockClass,
			});

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
			};
		}

		topShift(agentInfo, env) {
			const config = env.theme.agentCap.cross;
			return config.size / 2;
		}

		render(y, {x}, env) {
			const config = env.theme.agentCap.cross;
			const d = config.size / 2;

			env.shapeLayer.appendChild(svg.make('path', Object.assign({
				'd': (
					'M ' + (x - d) + ' ' + y +
					' L ' + (x + d) + ' ' + (y + d * 2) +
					' M ' + (x + d) + ' ' + y +
					' L ' + (x - d) + ' ' + (y + d * 2)
				),
			}, config.attrs)));

			return {
				lineTop: d,
				lineBottom: d,
				height: d * 2,
			};
		}
	}

	class CapBar {
		separation({label}, env) {
			const config = env.theme.agentCap.box;
			const width = (
				env.textSizer.measure(config.labelAttrs, label).width +
				config.padding.left +
				config.padding.right
			);

			return {
				left: width / 2,
				right: width / 2,
			};
		}

		topShift(agentInfo, env) {
			const config = env.theme.agentCap.bar;
			return config.attrs.height / 2;
		}

		render(y, {x, label}, env) {
			const configB = env.theme.agentCap.box;
			const config = env.theme.agentCap.bar;
			const width = (
				env.textSizer.measure(configB.labelAttrs, label).width +
				configB.padding.left +
				configB.padding.right
			);

			env.shapeLayer.appendChild(svg.make('rect', Object.assign({
				'x': x - width / 2,
				'y': y,
				'width': width,
			}, config.attrs)));

			return {
				lineTop: 0,
				lineBottom: config.attrs.height,
				height: config.attrs.height,
			};
		}
	}

	class CapNone {
		separation({currentRad}) {
			return {left: currentRad, right: currentRad};
		}

		topShift(agentInfo, env) {
			const config = env.theme.agentCap.none;
			return config.height;
		}

		render(y, agentInfo, env) {
			const config = env.theme.agentCap.none;
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
		'none': new CapNone(),
	};

	class AgentCap extends BaseComponent {
		constructor(begin) {
			super();
			this.begin = begin;
		}

		separation({mode, agentNames}, env) {
			if(this.begin) {
				array.mergeSets(env.visibleAgents, agentNames);
			} else {
				array.removeAll(env.visibleAgents, agentNames);
			}

			agentNames.forEach((name) => {
				const agentInfo = env.agentInfos.get(name);
				const separationFn = AGENT_CAPS[mode].separation;
				env.addSpacing(name, separationFn(agentInfo, env));
			});
		}

		renderPre({mode, agentNames}, env) {
			let maxTopShift = 0;
			agentNames.forEach((name) => {
				const agentInfo = env.agentInfos.get(name);
				const topShift = AGENT_CAPS[mode].topShift(agentInfo, env);
				maxTopShift = Math.max(maxTopShift, topShift);
			});
			return {
				agentNames,
				topShift: maxTopShift,
			};
		}

		render({mode, agentNames}, env) {
			let maxEnd = 0;
			agentNames.forEach((name) => {
				const agentInfo = env.agentInfos.get(name);
				const topShift = AGENT_CAPS[mode].topShift(agentInfo, env);
				const y0 = env.primaryY - topShift;
				const shifts = AGENT_CAPS[mode].render(
					y0,
					agentInfo,
					env
				);
				maxEnd = Math.max(maxEnd, y0 + shifts.height);
				if(this.begin) {
					env.drawAgentLine(name, y0 + shifts.lineBottom);
				} else {
					env.drawAgentLine(name, y0 + shifts.lineTop, true);
				}
			});
			return maxEnd + env.theme.actionMargin;
		}
	}

	BaseComponent.register('agent begin', new AgentCap(true));
	BaseComponent.register('agent end', new AgentCap(false));

	return AgentCap;
});
