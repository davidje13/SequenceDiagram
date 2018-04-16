/* eslint-disable sort-keys */ // Maybe later

import BaseComponent, {register} from './BaseComponent.js';
import {mergeSets} from '../../core/ArrayUtilities.js';

const OUTLINE_ATTRS = {
	'class': 'outline',
	'fill': 'transparent',
};

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

	render(layer, theme, pt, dir) {
		const config = this.getConfig(theme);
		const short = this.short(theme);
		layer.add(config.render(config.attrs, {
			x: pt.x + short * dir.dx,
			y: pt.y + short * dir.dy,
			width: config.width,
			height: config.height,
			dir,
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

class Arrowcross {
	getConfig(theme) {
		return theme.connect.arrow.cross;
	}

	render(layer, theme, pt, dir) {
		const config = this.getConfig(theme);
		layer.add(config.render({
			x: pt.x + config.short * dir.dx,
			y: pt.y + config.short * dir.dy,
			radius: config.radius,
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
		render: () => null,
		width: () => 0,
		height: () => 0,
		lineGap: () => 0,
	},
	new Arrowhead('single'),
	new Arrowhead('double'),
	new Arrowcross(),
];

export class Connect extends BaseComponent {
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
		const config = env.theme.connect;
		const line = config.line[options.line];
		const lArrow = ARROWHEADS[options.left];
		const rArrow = ARROWHEADS[options.right];

		const dx1 = lArrow.lineGap(env.theme, line.attrs);
		const dx2 = rArrow.lineGap(env.theme, line.attrs);
		const rendered = line.renderRev(line.attrs, {
			x1: x1 + dx1,
			y1,
			x2: x2 + dx2,
			y2,
			xR,
			rad: config.loopbackRadius,
		});
		clickable.add(rendered.shape);

		lArrow.render(clickable, env.theme, {
			x: rendered.p1.x - dx1,
			y: rendered.p1.y,
		}, {dx: 1, dy: 0});

		rArrow.render(clickable, env.theme, {
			x: rendered.p2.x - dx2,
			y: rendered.p2.y,
		}, {dx: 1, dy: 0});
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
			padding: config.mask.padding,
			boxAttrs: {'fill': '#000000'},
			labelAttrs: config.label.loopbackAttrs,
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
			env.svg.box(OUTLINE_ATTRS, {
				'x': from.x,
				'y': yBegin - raise,
				'width': xR + config.loopbackRadius - from.x,
				'height': raise + env.primaryY - yBegin + arrowDip,
			}),
			renderedText.label
		);

		this.renderRevArrowLine({
			x1: from.x + from.currentMaxRad,
			y1: yBegin,
			x2: to.x + to.currentMaxRad,
			y2: env.primaryY,
			xR,
		}, options, env, clickable);

		return (
			env.primaryY +
			Math.max(arrowDip, 0) +
			env.theme.actionMargin
		);
	}

	renderArrowLine({x1, y1, x2, y2}, options, env, clickable) {
		const config = env.theme.connect;
		const line = config.line[options.line];
		const lArrow = ARROWHEADS[options.left];
		const rArrow = ARROWHEADS[options.right];

		const len = Math.sqrt(
			(x2 - x1) * (x2 - x1) +
			(y2 - y1) * (y2 - y1)
		);
		const d1 = lArrow.lineGap(env.theme, line.attrs);
		const d2 = rArrow.lineGap(env.theme, line.attrs);
		const dx = (x2 - x1) / len;
		const dy = (y2 - y1) / len;

		const rendered = line.renderFlat(line.attrs, {
			x1: x1 + d1 * dx,
			y1: y1 + d1 * dy,
			x2: x2 - d2 * dx,
			y2: y2 - d2 * dy,
		});
		clickable.add(rendered.shape);

		const p1 = {x: rendered.p1.x - d1 * dx, y: rendered.p1.y - d1 * dy};
		const p2 = {x: rendered.p2.x + d2 * dx, y: rendered.p2.y + d2 * dy};

		lArrow.render(clickable, env.theme, p1, {dx, dy});
		rArrow.render(clickable, env.theme, p2, {dx: -dx, dy: -dy});

		return {
			p1,
			p2,
			lArrow,
			rArrow,
		};
	}

	renderVirtualSources({from, to, rendered}, env, clickable) {
		const config = env.theme.connect.source;

		if(from.isVirtualSource) {
			clickable.add(config.render({
				x: rendered.p1.x - config.radius,
				y: rendered.p1.y,
				radius: config.radius,
			}));
		}
		if(to.isVirtualSource) {
			clickable.add(config.render({
				x: rendered.p2.x + config.radius,
				y: rendered.p2.y,
				radius: config.radius,
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
			padding: config.mask.padding,
			boxAttrs,
			labelAttrs: config.label.attrs,
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
			y1: yBegin,
			x2,
			y2: env.primaryY,
		}, options, env, clickable);

		const arrowSpread = Math.max(
			rendered.lArrow.height(env.theme),
			rendered.rArrow.height(env.theme)
		) / 2;

		const lift = Math.max(height, arrowSpread);

		this.renderVirtualSources({from, to, rendered}, env, clickable);

		clickable.add(env.svg.el('path')
			.attrs(OUTLINE_ATTRS)
			.attr('d', (
				'M' + x1 + ',' + (yBegin - lift) +
				'L' + x2 + ',' + (env.primaryY - lift) +
				'L' + x2 + ',' + (env.primaryY + arrowSpread) +
				'L' + x1 + ',' + (yBegin + arrowSpread) +
				'Z'
			)));

		this.renderSimpleLabel(label, {
			layer: clickable,
			x1,
			y1: yBegin,
			x2,
			y2: env.primaryY,
			height,
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

export class ConnectDelayBegin extends Connect {
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
			stage,
			from: Object.assign({}, env.agentInfos.get(stage.agentIDs[0])),
			y: env.primaryY,
		});
		return env.primaryY + env.theme.actionMargin;
	}

	renderHidden(stage, env) {
		this.render(stage, env);
	}
}

export class ConnectDelayEnd extends Connect {
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
