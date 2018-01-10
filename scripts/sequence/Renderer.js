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
], (
	array,
	EventObject,
	svg,
	SVGShapes,
	BaseComponent
) => {
	/* jshint +W072 */
	'use strict';

	function findExtremes(agentInfos, agentNames) {
		let min = null;
		let max = null;
		agentNames.forEach((name) => {
			const info = agentInfos.get(name);
			if(min === null || info.index < min.index) {
				min = info;
			}
			if(max === null || info.index > max.index) {
				max = info;
			}
		});
		return {
			left: min.label,
			right: max.label,
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

			this.separationStage = this.separationStage.bind(this);
			this.renderStage = this.renderStage.bind(this);

			this.addSeparation = this.addSeparation.bind(this);
			this.addDef = this.addDef.bind(this);

			this.state = {};
			this.width = 0;
			this.height = 0;
			this.themes = makeThemes(themes);
			this.theme = null;
			this.namespace = parseNamespace(namespace);
			this.components = components;
			this.SVGTextBlockClass = SVGTextBlockClass;
			this.knownDefs = new Set();
			this.highlights = new Map();
			this.currentHighlight = -1;
			this.buildStaticElements();
			this.components.forEach((component) => {
				component.makeState(this.state);
			});
		}

		addTheme(theme) {
			this.themes.set(theme.name, theme);
		}

		buildStaticElements() {
			this.base = svg.makeContainer();

			this.defs = svg.make('defs');
			this.mask = svg.make('mask', {
				'id': this.namespace + 'LineMask',
				'maskUnits': 'userSpaceOnUse',
			});
			this.maskReveal = svg.make('rect', {'fill': '#FFFFFF'});
			this.agentLines = svg.make('g', {
				'mask': 'url(#' + this.namespace + 'LineMask)',
			});
			this.blocks = svg.make('g');
			this.actionShapes = svg.make('g');
			this.actionLabels = svg.make('g');
			this.base.appendChild(this.defs);
			this.base.appendChild(this.agentLines);
			this.base.appendChild(this.blocks);
			this.base.appendChild(this.actionShapes);
			this.base.appendChild(this.actionLabels);
			this.title = new this.SVGTextBlockClass(this.base);

			this.sizer = new this.SVGTextBlockClass.SizeTester(this.base);
		}

		addDef(name, generator) {
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

		addSeparation(agentName1, agentName2, dist) {
			const info1 = this.agentInfos.get(agentName1);
			const info2 = this.agentInfos.get(agentName2);

			const d1 = info1.separations.get(agentName2) || 0;
			info1.separations.set(agentName2, Math.max(d1, dist));

			const d2 = info2.separations.get(agentName1) || 0;
			info2.separations.set(agentName1, Math.max(d2, dist));
		}

		separationStage(stage) {
			const agentSpaces = new Map();
			const agentNames = this.visibleAgents.slice();

			const addSpacing = (agentName, {left, right}) => {
				const current = agentSpaces.get(agentName);
				current.left = Math.max(current.left, left);
				current.right = Math.max(current.right, right);
			};

			this.agentInfos.forEach((agentInfo) => {
				const rad = agentInfo.currentRad;
				agentInfo.currentMaxRad = rad;
				agentSpaces.set(agentInfo.label, {left: rad, right: rad});
			});
			const env = {
				theme: this.theme,
				agentInfos: this.agentInfos,
				visibleAgents: this.visibleAgents,
				textSizer: this.sizer,
				addSpacing,
				addSeparation: this.addSeparation,
				state: this.state,
				components: this.components,
			};
			const component = this.components.get(stage.type);
			if(!component) {
				throw new Error('Unknown component: ' + stage.type);
			}
			component.separationPre(stage, env);
			component.separation(stage, env);
			array.mergeSets(agentNames, this.visibleAgents);

			agentNames.forEach((agentNameR) => {
				const infoR = this.agentInfos.get(agentNameR);
				const sepR = agentSpaces.get(agentNameR);
				infoR.maxRPad = Math.max(infoR.maxRPad, sepR.right);
				infoR.maxLPad = Math.max(infoR.maxLPad, sepR.left);
				agentNames.forEach((agentNameL) => {
					const infoL = this.agentInfos.get(agentNameL);
					if(infoL.index >= infoR.index) {
						return;
					}
					const sepL = agentSpaces.get(agentNameL);
					this.addSeparation(
						agentNameR,
						agentNameL,
						sepR.left + sepL.right + this.theme.agentMargin
					);
				});
			});
		}

		checkAgentRange(agentNames, topY = 0) {
			if(agentNames.length === 0) {
				return topY;
			}
			const {left, right} = findExtremes(this.agentInfos, agentNames);
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

		markAgentRange(agentNames, y) {
			if(agentNames.length === 0) {
				return;
			}
			const {left, right} = findExtremes(this.agentInfos, agentNames);
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

		renderStage(stage) {
			this.agentInfos.forEach((agentInfo) => {
				const rad = agentInfo.currentRad;
				agentInfo.currentMaxRad = rad;
			});

			const envPre = {
				theme: this.theme,
				agentInfos: this.agentInfos,
				textSizer: this.sizer,
				state: this.state,
				components: this.components,
			};
			const component = this.components.get(stage.type);
			const result = component.renderPre(stage, envPre);
			const {topShift, agentNames, asynchronousY} =
				BaseComponent.cleanRenderPreResult(result, this.currentY);

			const topY = this.checkAgentRange(agentNames, asynchronousY);

			const eventOut = () => {
				this.trigger('mouseout');
			};

			const makeRegion = (o, stageOverride = null) => {
				if(!o) {
					o = svg.make('g');
				}
				const targetStage = (stageOverride || stage);
				this.addHighlightObject(targetStage.ln, o);
				o.setAttribute('class', 'region');
				o.addEventListener('mouseenter', () => {
					this.trigger('mouseover', [targetStage]);
				});
				o.addEventListener('mouseleave', eventOut);
				o.addEventListener('click', () => {
					this.trigger('click', [targetStage]);
				});
				this.actionLabels.appendChild(o);
				return o;
			};

			const env = {
				topY,
				primaryY: topY + topShift,
				blockLayer: this.blocks,
				shapeLayer: this.actionShapes,
				labelLayer: this.actionLabels,
				maskLayer: this.mask,
				theme: this.theme,
				agentInfos: this.agentInfos,
				textSizer: this.sizer,
				SVGTextBlockClass: this.SVGTextBlockClass,
				state: this.state,
				drawAgentLine: (agentName, toY, andStop = false) => {
					const agentInfo = this.agentInfos.get(agentName);
					this.drawAgentLine(agentInfo, toY);
					agentInfo.latestYStart = andStop ? null : toY;
				},
				addDef: this.addDef,
				makeRegion,
				components: this.components,
			};

			const bottomY = Math.max(topY, component.render(stage, env) || 0);
			this.markAgentRange(agentNames, bottomY);

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

			this.agentInfos.forEach(({label, x, maxRPad, maxLPad}) => {
				this.minX = Math.min(this.minX, x - maxLPad);
				this.maxX = Math.max(this.maxX, x + maxRPad);
			});
		}

		buildAgentInfos(agents, stages) {
			this.agentInfos = new Map();
			agents.forEach((agent, index) => {
				this.agentInfos.set(agent.name, {
					label: agent.name,
					anchorRight: agent.anchorRight,
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

			this.visibleAgents = ['[', ']'];
			stages.forEach(this.separationStage);

			this.positionAgents();
		}

		updateBounds(stagesHeight) {
			const cx = (this.minX + this.maxX) / 2;
			const titleY = ((this.title.height > 0) ?
				(-this.theme.titleMargin - this.title.height) : 0
			);
			this.title.set({x: cx, y: titleY});

			const halfTitleWidth = this.title.width / 2;
			const margin = this.theme.outerMargin;
			const x0 = Math.min(this.minX, cx - halfTitleWidth) - margin;
			const x1 = Math.max(this.maxX, cx + halfTitleWidth) + margin;
			const y0 = titleY - margin;
			const y1 = stagesHeight + margin;

			this.maskReveal.setAttribute('x', x0);
			this.maskReveal.setAttribute('y', y0);
			this.maskReveal.setAttribute('width', x1 - x0);
			this.maskReveal.setAttribute('height', y1 - y0);

			this.base.setAttribute('viewBox', (
				x0 + ' ' + y0 + ' ' +
				(x1 - x0) + ' ' + (y1 - y0)
			));
			this.width = (x1 - x0);
			this.height = (y1 - y0);
		}

		_resetState() {
			this.components.forEach((component) => {
				component.resetState(this.state);
			});
			this.currentY = 0;
		}

		_reset() {
			this.knownDefs.clear();
			this.highlights.clear();
			this.currentHighlight = -1;
			svg.empty(this.defs);
			svg.empty(this.mask);
			svg.empty(this.agentLines);
			svg.empty(this.blocks);
			svg.empty(this.actionShapes);
			svg.empty(this.actionLabels);
			this.mask.appendChild(this.maskReveal);
			this.defs.appendChild(this.mask);
			this._resetState();
		}

		setHighlight(line = null) {
			if(line === null || !this.highlights.has(line)) {
				line = -1;
			}
			if(this.currentHighlight === line) {
				return;
			}
			if(this.currentHighlight !== -1) {
				this.highlights.get(this.currentHighlight).forEach((o) => {
					o.setAttribute('class', 'region');
				});
			}
			if(line !== -1) {
				this.highlights.get(line).forEach((o) => {
					o.setAttribute('class', 'region focus');
				});
			}
			this.currentHighlight = line;
		}

		render(sequence) {
			const prevHighlight = this.currentHighlight;
			this._reset();

			const themeName = sequence.meta.theme;
			this.theme = this.themes.get(themeName);
			if(!this.theme) {
				this.theme = this.themes.get('');
			}

			this.theme.reset();
			this.theme.addDefs(this.addDef);

			this.title.set({
				attrs: this.theme.titleAttrs,
				text: sequence.meta.title,
			});

			this.minX = 0;
			this.maxX = 0;
			this.buildAgentInfos(sequence.agents, sequence.stages);

			this._resetState();
			sequence.stages.forEach(this.renderStage);
			const bottomY = this.checkAgentRange(['[', ']'], this.currentY);

			const stagesHeight = Math.max(bottomY - this.theme.actionMargin, 0);
			this.updateBounds(stagesHeight);

			this.sizer.resetCache();
			this.sizer.detach();
			this.setHighlight(prevHighlight);
		}

		getThemeNames() {
			return (Array.from(this.themes.keys())
				.filter((name) => (name !== ''))
			);
		}

		getThemes() {
			return this.getThemeNames().map((name) => this.themes.get(name));
		}

		getAgentX(name) {
			return this.agentInfos.get(name).x;
		}

		svg() {
			return this.base;
		}
	};
});
