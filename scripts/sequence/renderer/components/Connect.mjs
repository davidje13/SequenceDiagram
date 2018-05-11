import BaseComponent, {register} from './BaseComponent.mjs';
import {mergeSets} from '../../../core/ArrayUtilities.mjs';

const OUTLINE_ATTRS = {
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
			env.svg.box(OUTLINE_ATTRS, {
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
			.attrs(OUTLINE_ATTRS)
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
