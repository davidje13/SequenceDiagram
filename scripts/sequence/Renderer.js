/* jshint -W072 */ // Allow several required modules
define([
	'core/ArrayUtilities',
	'core/EventObject',
	'svg/SVGUtilities',
	'svg/SVGShapes',
	'./components/BaseComponent',
	'./components/Block',
	'./components/Parallel',
	'./components/Marker',
	'./components/AgentCap',
	'./components/AgentHighlight',
	'./components/Connect',
	'./components/Note',
	'./components/Divider',
], (
	array,
	EventObject,
	svg,
	SVGShapes,
	BaseComponent
) => {
	/* jshint +W072 */
	'use strict';

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
			namespace = 'R' + globalNamespace;
			++ globalNamespace;
		}
		return namespace;
	}

	return class Renderer extends EventObject {
		constructor({
			themes = [],
			namespace = null,
			components = null,
			SVGTextBlockClass = SVGShapes.TextBlock,
		} = {}) {
			super();

			if(components === null) {
				components = BaseComponent.getComponents();
			}

			this._bindMethods();

			this.state = {};
			this.width = 0;
			this.height = 0;
			this.themes = makeThemes(themes);
			this.theme = null;
			this.namespace = parseNamespace(namespace);
			this.components = components;
			this.SVGTextBlockClass = SVGTextBlockClass;
			this.knownThemeDefs = new Set();
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
			this.addDef = this.addDef.bind(this);
		}

		addTheme(theme) {
			this.themes.set(theme.name, theme);
		}

		buildMetadata() {
			this.metaCode = svg.makeText();
			return svg.make('metadata', {}, [this.metaCode]);
		}

		buildStaticElements() {
			this.base = svg.makeContainer();

			this.themeDefs = svg.make('defs');
			this.defs = svg.make('defs');
			this.fullMask = svg.make('mask', {
				'id': this.namespace + 'FullMask',
				'maskUnits': 'userSpaceOnUse',
			});
			this.lineMask = svg.make('mask', {
				'id': this.namespace + 'LineMask',
				'maskUnits': 'userSpaceOnUse',
			});
			this.fullMaskReveal = svg.make('rect', {'fill': '#FFFFFF'});
			this.lineMaskReveal = svg.make('rect', {'fill': '#FFFFFF'});
			this.backgroundFills = svg.make('g');
			this.agentLines = svg.make('g', {
				'mask': 'url(#' + this.namespace + 'LineMask)',
			});
			this.blocks = svg.make('g');
			this.shapes = svg.make('g');
			this.unmaskedShapes = svg.make('g');
			this.base.appendChild(this.buildMetadata());
			this.base.appendChild(this.themeDefs);
			this.base.appendChild(this.defs);
			this.base.appendChild(this.backgroundFills);
			this.base.appendChild(
				svg.make('g', {
					'mask': 'url(#' + this.namespace + 'FullMask)',
				}, [
					this.agentLines,
					this.blocks,
					this.shapes,
				])
			);
			this.base.appendChild(this.unmaskedShapes);
			this.title = new this.SVGTextBlockClass(this.base);

			this.sizer = new this.SVGTextBlockClass.SizeTester(this.base);
		}

		addThemeDef(name, generator) {
			const namespacedName = this.namespace + name;
			if(this.knownThemeDefs.has(name)) {
				return namespacedName;
			}
			this.knownThemeDefs.add(name);
			const def = generator();
			def.setAttribute('id', namespacedName);
			this.themeDefs.appendChild(def);
			return namespacedName;
		}

		addDef(name, generator) {
			if(typeof generator !== 'function') {
				const o = name;
				name = 'P' + this.knownDefs.size;
				generator = () => o;
			}

			const namespacedName = this.namespace + name;
			if(this.knownDefs.has(name)) {
				return namespacedName;
			}
			this.knownDefs.add(name);
			const def = generator();
			def.setAttribute('id', namespacedName);
			this.defs.appendChild(def);
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
				renderer: this,
				theme: this.theme,
				agentInfos: this.agentInfos,
				textSizer: this.sizer,
				state: this.state,
				components: this.components,
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
				renderer: this,
				theme: this.theme,
				agentInfos: this.agentInfos,
				visibleAgentIDs: this.visibleAgentIDs,
				momentaryAgentIDs: agentIDs,
				textSizer: this.sizer,
				addSpacing,
				addSeparation,
				state: this.state,
				components: this.components,
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

			array.mergeSets(agentIDs, this.visibleAgentIDs);

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
				renderer: this,
				theme: this.theme,
				agentInfos: this.agentInfos,
				textSizer: this.sizer,
				state: this.state,
				components: this.components,
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
				agentInfo.latestYStart === null ||
				toY <= agentInfo.latestYStart
			) {
				return;
			}

			this.agentLines.appendChild(this.theme.renderAgentLine({
				x: agentInfo.x,
				y0: agentInfo.latestYStart,
				y1: toY,
				width: agentInfo.currentRad * 2,
				className: 'agent-' + agentInfo.index + '-line',
				options: agentInfo.options,
			}));
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
			source.addEventListener(
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
				renderer: this,
				theme: this.theme,
				agentInfos: this.agentInfos,
				textSizer: this.sizer,
				state: this.state,
				components: this.components,
			};
			const component = this.components.get(stage.type);
			const result = component.renderPre(stage, envPre);
			const {agentIDs, topShift, asynchronousY} =
				BaseComponent.cleanRenderPreResult(result, this.currentY);

			const topY = this.checkAgentRange(agentIDs, asynchronousY);

			const makeRegion = ({
				stageOverride = null,
				unmasked = false,
			} = {}) => {
				const o = svg.make('g');
				const targetStage = (stageOverride || stage);
				this.addHighlightObject(targetStage.ln, o);
				o.setAttribute('class', 'region');
				this.forwardEvent(o, 'mouseenter', 'mouseover', [targetStage]);
				this.forwardEvent(o, 'mouseleave', 'mouseout', [targetStage]);
				this.forwardEvent(o, 'click', 'click', [targetStage]);
				this.forwardEvent(o, 'dblclick', 'dblclick', [targetStage]);
				(unmasked ? this.unmaskedShapes : this.shapes).appendChild(o);
				return o;
			};

			const env = {
				renderer: this,
				topY,
				primaryY: topY + topShift,
				fillLayer: this.backgroundFills,
				blockLayer: this.blocks,
				fullMaskLayer: this.fullMask,
				lineMaskLayer: this.lineMask,
				theme: this.theme,
				agentInfos: this.agentInfos,
				textSizer: this.sizer,
				SVGTextBlockClass: this.SVGTextBlockClass,
				state: this.state,
				drawAgentLine: (agentID, toY, andStop = false) => {
					const agentInfo = this.agentInfos.get(agentID);
					this.drawAgentLine(agentInfo, toY);
					agentInfo.latestYStart = andStop ? null : toY;
				},
				addDef: this.addDef,
				makeRegion,
				components: this.components,
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
					id: agent.id,
					formattedLabel: agent.formattedLabel,
					anchorRight: agent.anchorRight,
					isVirtualSource: agent.isVirtualSource,
					options: agent.options,
					index,
					x: null,
					latestYStart: null,
					currentRad: 0,
					currentMaxRad: 0,
					latestY: 0,
					maxRPad: 0,
					maxLPad: 0,
					separations: new Map(),
				});
			});
		}

		updateBounds(stagesHeight) {
			const cx = (this.minX + this.maxX) / 2;
			const titleSize = this.sizer.measure(this.title);
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
				'x': x0,
				'y': y0,
				'width': this.width,
				'height': this.height,
			};

			svg.setAttributes(this.fullMaskReveal, fullSize);
			svg.setAttributes(this.lineMaskReveal, fullSize);

			this.base.setAttribute('viewBox', (
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
				svg.empty(this.themeDefs);
			}

			this.knownDefs.clear();
			this.highlights.clear();
			svg.empty(this.defs);
			svg.empty(this.fullMask);
			svg.empty(this.lineMask);
			svg.empty(this.backgroundFills);
			svg.empty(this.agentLines);
			svg.empty(this.blocks);
			svg.empty(this.shapes);
			svg.empty(this.unmaskedShapes);
			this.fullMask.appendChild(this.fullMaskReveal);
			this.lineMask.appendChild(this.lineMaskReveal);
			this.defs.appendChild(this.fullMask);
			this.defs.appendChild(this.lineMask);
			this._resetState();
		}

		setHighlight(line = null) {
			if(line === null) {
				line = -1;
			}
			if(this.currentHighlight === line) {
				return;
			}
			if(this.highlights.has(this.currentHighlight)) {
				this.highlights.get(this.currentHighlight).forEach((o) => {
					o.setAttribute('class', 'region');
				});
			}
			if(this.highlights.has(line)) {
				this.highlights.get(line).forEach((o) => {
					o.setAttribute('class', 'region focus');
				});
			}
			this.currentHighlight = line;
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
			const oldTheme = this.theme;
			this.theme = this.getThemeNamed(name);
			this.theme.reset();

			return (this.theme !== oldTheme);
		}

		optimisedRenderPreReflow(sequence) {
			const themeChanged = this._switchTheme(sequence.meta.theme);
			this._reset(themeChanged);

			this.metaCode.nodeValue = sequence.meta.code;
			this.theme.addDefs(this.addThemeDef);

			this.title.set({
				attrs: this.theme.titleAttrs,
				formatted: sequence.meta.title,
			});
			this.sizer.expectMeasure(this.title);

			this.minX = 0;
			this.maxX = 0;

			this.buildAgentInfos(sequence.agents);

			sequence.stages.forEach(this.prepareMeasurementsStage);
			this._resetState();
			this.sizer.performMeasurementsPre();
		}

		optimisedRenderReflow() {
			this.sizer.performMeasurementsAct();
		}

		optimisedRenderPostReflow(sequence) {
			this.visibleAgentIDs = ['[', ']'];
			sequence.stages.forEach(this.separationStage);
			this._resetState();

			this.positionAgents();

			sequence.stages.forEach(this.renderStage);
			const bottomY = this.checkAgentRange(['[', ']'], this.currentY);

			const stagesHeight = Math.max(bottomY - this.theme.actionMargin, 0);
			this.updateBounds(stagesHeight);

			const prevHighlight = this.currentHighlight;
			this.currentHighlight = -1;
			this.setHighlight(prevHighlight);

			this.sizer.performMeasurementsPost();
			this.sizer.resetCache();
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

		svg() {
			return this.base;
		}
	};
});
