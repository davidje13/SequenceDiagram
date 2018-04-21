import BaseComponent, {register} from './BaseComponent.mjs';
import {mergeSets, removeAll} from '../../core/ArrayUtilities.mjs';

const OUTLINE_ATTRS = {
	'class': 'outline',
	'fill': 'transparent',
};

class CapBox {
	getConfig(options, env) {
		let config = null;
		if(options.includes('database')) {
			config = env.theme.agentCap.database;
		}
		return config || env.theme.agentCap.box;
	}

	prepareMeasurements({formattedLabel, options}, env) {
		const config = this.getConfig(options, env);
		env.textSizer.expectMeasure(config.labelAttrs, formattedLabel);
	}

	separation({formattedLabel, options}, env) {
		const config = this.getConfig(options, env);
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

	topShift({formattedLabel, options}, env) {
		const config = this.getConfig(options, env);
		const height = (
			env.textSizer.measureHeight(config.labelAttrs, formattedLabel) +
			config.padding.top +
			config.padding.bottom
		);
		return Math.max(0, height - config.arrowBottom);
	}

	render(y, {x, formattedLabel, options}, env) {
		const config = this.getConfig(options, env);

		const text = env.svg.boxedText(config, formattedLabel, {x, y});

		env.makeRegion().add(
			text,
			env.svg.box(OUTLINE_ATTRS, {
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
			env.svg.box(OUTLINE_ATTRS, {
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
			env.svg.box(OUTLINE_ATTRS, {
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

		env.makeRegion().add(env.svg.box(OUTLINE_ATTRS, {
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
		env.makeRegion().add(env.svg.box(OUTLINE_ATTRS, {
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

export default class AgentCap extends BaseComponent {
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
