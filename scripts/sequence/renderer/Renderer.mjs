import './components/AgentCap.mjs';
import './components/AgentHighlight.mjs';
import './components/Block.mjs';
import './components/Connect.mjs';
import './components/Divider.mjs';
import './components/Marker.mjs';
import './components/Note.mjs';
import './components/Parallel.mjs';
import {
	cleanRenderPreResult,
	getComponents,
} from './components/BaseComponent.mjs';
import DOMWrapper from '../../core/DOMWrapper.mjs';
import EventObject from '../../core/EventObject.mjs';
import SVG from '../../svg/SVG.mjs';
import {mergeSets} from '../../core/ArrayUtilities.mjs';

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

export default class Renderer extends EventObject {
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
