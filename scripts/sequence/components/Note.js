/* eslint-disable complexity */ // Temporary ignore while switching linter
/* eslint-disable no-param-reassign */ // Also temporary

import BaseComponent, {register} from './BaseComponent.js';

const OUTLINE_ATTRS = {
	'class': 'outline',
	'fill': 'transparent',
};

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

class NoteComponent extends BaseComponent {
	prepareMeasurements({mode, label}, env) {
		const config = env.theme.getNote(mode);
		env.textSizer.expectMeasure(config.labelAttrs, label);
	}

	renderPre({agentIDs}) {
		return {agentIDs};
	}

	renderNote({
		xMid = null,
		x0 = null,
		x1 = null,
		mode,
		label,
	}, env) {
		const config = env.theme.getNote(mode);

		const y = env.topY + config.margin.top + config.padding.top;
		const labelNode = env.svg.formattedText(config.labelAttrs, label);
		const size = env.textSizer.measure(labelNode);

		const fullW = (
			size.width +
			config.padding.left +
			config.padding.right
		);
		const fullH = (
			config.padding.top +
			size.height +
			config.padding.bottom
		);
		if(x0 === null && xMid !== null) {
			x0 = xMid - fullW / 2;
		}
		if(x1 === null && x0 !== null) {
			x1 = x0 + fullW;
		} else if(x0 === null) {
			x0 = x1 - fullW;
		}
		switch(config.labelAttrs['text-anchor']) {
		case 'middle':
			labelNode.set({
				x: (
					x0 + config.padding.left +
					x1 - config.padding.right
				) / 2,
				y,
			});
			break;
		case 'end':
			labelNode.set({x: x1 - config.padding.right, y});
			break;
		default:
			labelNode.set({x: x0 + config.padding.left, y});
			break;
		}

		env.makeRegion().add(
			config.boxRenderer({
				height: fullH,
				width: x1 - x0,
				x: x0,
				y: env.topY + config.margin.top,
			}),
			env.svg.box(OUTLINE_ATTRS, {
				height: fullH,
				width: x1 - x0,
				x: x0,
				y: env.topY + config.margin.top,
			}),
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

export class NoteOver extends NoteComponent {
	separation({agentIDs, mode, label}, env) {
		const config = env.theme.getNote(mode);
		const width = (
			env.textSizer.measure(config.labelAttrs, label).width +
			config.padding.left +
			config.padding.right
		);

		const {left, right} = findExtremes(env.agentInfos, agentIDs);
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

		const {left, right} = findExtremes(env.agentInfos, agentIDs);
		const infoL = env.agentInfos.get(left);
		const infoR = env.agentInfos.get(right);
		if(infoL === infoR) {
			const xMid = infoL.x;
			return this.renderNote({
				label,
				mode,
				xMid,
			}, env);
		} else {
			return this.renderNote({
				label,
				mode,
				x0: infoL.x - infoL.currentMaxRad - config.overlap.left,
				x1: infoR.x + infoR.currentMaxRad + config.overlap.right,
			}, env);
		}
	}
}

export class NoteSide extends NoteComponent {
	constructor(isRight) {
		super();
		this.isRight = isRight;
	}

	separation({agentIDs, mode, label}, env) {
		const config = env.theme.getNote(mode);
		const {left, right} = findExtremes(env.agentInfos, agentIDs);
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
		const {left, right} = findExtremes(env.agentInfos, agentIDs);
		if(this.isRight) {
			const info = env.agentInfos.get(right);
			const x0 = info.x + info.currentMaxRad + config.margin.left;
			return this.renderNote({
				label,
				mode,
				x0,
			}, env);
		} else {
			const info = env.agentInfos.get(left);
			const x1 = info.x - info.currentMaxRad - config.margin.right;
			return this.renderNote({
				label,
				mode,
				x1,
			}, env);
		}
	}
}

export class NoteBetween extends NoteComponent {
	separation({agentIDs, mode, label}, env) {
		const config = env.theme.getNote(mode);
		const {left, right} = findExtremes(env.agentInfos, agentIDs);
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
		const {left, right} = findExtremes(env.agentInfos, agentIDs);
		const infoL = env.agentInfos.get(left);
		const infoR = env.agentInfos.get(right);
		const xMid = (
			infoL.x + infoL.currentMaxRad +
			infoR.x - infoR.currentMaxRad
		) / 2;

		return this.renderNote({
			label,
			mode,
			xMid,
		}, env);
	}
}

register('note over', new NoteOver());
register('note left', new NoteSide(false));
register('note right', new NoteSide(true));
register('note between', new NoteBetween());
