define([
	'core/ArrayUtilities',
	'svg/SVGUtilities',
	'svg/SVGShapes',
	'./components/BaseComponent',
	'./components/Marker',
	'./components/AgentCap',
	'./components/AgentHighlight',
	'./components/Connect',
	'./components/Note',
], (
	array,
	svg,
	SVGShapes,
	BaseComponent
) => {
	'use strict';

	function traverse(stages, callbacks) {
		stages.forEach((stage) => {
			if(stage.type === 'block') {
				const scope = {};
				if(callbacks.blockBeginFn) {
					callbacks.blockBeginFn(scope, stage);
				}
				stage.sections.forEach((section) => {
					if(callbacks.sectionBeginFn) {
						callbacks.sectionBeginFn(scope, stage, section);
					}
					traverse(section.stages, callbacks);
					if(callbacks.sectionEndFn) {
						callbacks.sectionEndFn(scope, stage, section);
					}
				});
				if(callbacks.blockEndFn) {
					callbacks.blockEndFn(scope, stage);
				}
			} else if(callbacks.stagesFn) {
				if(stage.type === 'parallel') {
					callbacks.stagesFn(stage.stages);
				} else {
					callbacks.stagesFn([stage]);
				}
			}
		});
	}

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

	return class Renderer {
		constructor({
			themes = [],
			namespace = null,
			components = null,
			SVGTextBlockClass = SVGShapes.TextBlock,
		} = {}) {
			if(components === null) {
				components = BaseComponent.getComponents();
			}

			this.separationTraversalFns = {
				stagesFn: this.separationStages.bind(this),
				blockBeginFn: this.separationBlockBegin.bind(this),
				sectionBeginFn: this.separationSectionBegin.bind(this),
				blockEndFn: this.separationBlockEnd.bind(this),
			};

			this.renderTraversalFns = {
				stagesFn: this.renderStages.bind(this),
				blockBeginFn: this.renderBlockBegin.bind(this),
				sectionBeginFn: this.renderSectionBegin.bind(this),
				sectionEndFn: this.renderSectionEnd.bind(this),
				blockEndFn: this.renderBlockEnd.bind(this),
			};

			this.addSeparation = this.addSeparation.bind(this);
			this.addDef = this.addDef.bind(this);

			this.state = {};
			this.width = 0;
			this.height = 0;
			this.themes = makeThemes(themes);
			this.theme = null;
			this.namespace = namespace;
			if(namespace === null) {
				this.namespace = 'R' + globalNamespace;
				++ globalNamespace;
			}
			this.components = components;
			this.SVGTextBlockClass = SVGTextBlockClass;
			this.knownDefs = new Set();
			this.buildStaticElements();
			this.components.forEach((component) => {
				component.makeState(this.state);
			});
		}

		buildStaticElements() {
			this.base = svg.makeContainer({
				'width': '100%',
				'height': '100%',
			});

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
			this.sections = svg.make('g');
			this.actionShapes = svg.make('g');
			this.actionLabels = svg.make('g');
			this.base.appendChild(this.defs);
			this.base.appendChild(this.agentLines);
			this.base.appendChild(this.blocks);
			this.base.appendChild(this.sections);
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

		separationBlockBegin(scope, {left, right}) {
			array.mergeSets(this.visibleAgents, [left, right]);
		}

		separationSectionBegin(scope, {left, right}, {mode, label}) {
			const config = this.theme.block.section;
			const width = (
				this.sizer.measure(config.mode.labelAttrs, mode).width +
				config.mode.padding.left +
				config.mode.padding.right +
				this.sizer.measure(config.label.labelAttrs, label).width +
				config.label.padding.left +
				config.label.padding.right
			);
			this.addSeparation(left, right, width);
		}

		separationBlockEnd(scope, {left, right}) {
			array.removeAll(this.visibleAgents, [left, right]);
		}

		separationStages(stages) {
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
			};
			stages.forEach((stage) => {
				this.components.get(stage.type).separationPre(stage, env);
			});
			stages.forEach((stage) => {
				this.components.get(stage.type).separation(stage, env);
			});
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

			const r = agentInfo.currentRad;

			if(r > 0) {
				this.agentLines.appendChild(svg.make('rect', Object.assign({
					'x': agentInfo.x - r,
					'y': agentInfo.latestYStart,
					'width': r * 2,
					'height': toY - agentInfo.latestYStart,
					'class': 'agent-' + agentInfo.index + '-line',
				}, this.theme.agentLineAttrs)));
			} else {
				this.agentLines.appendChild(svg.make('line', Object.assign({
					'x1': agentInfo.x,
					'y1': agentInfo.latestYStart,
					'x2': agentInfo.x,
					'y2': toY,
					'class': 'agent-' + agentInfo.index + '-line',
				}, this.theme.agentLineAttrs)));
			}
		}

		renderBlockBegin(scope, {left, right}) {
			this.currentY = (
				this.checkAgentRange([left, right], this.currentY) +
				this.theme.block.margin.top
			);

			scope.y = this.currentY;
			scope.first = true;
			this.markAgentRange([left, right], this.currentY);
		}

		renderSectionBegin(scope, {left, right}, {mode, label}) {
			this.currentY = this.checkAgentRange([left, right], this.currentY);
			const config = this.theme.block;
			const agentInfoL = this.agentInfos.get(left);
			const agentInfoR = this.agentInfos.get(right);

			if(scope.first) {
				scope.first = false;
			} else {
				this.currentY += config.section.padding.bottom;
				this.sections.appendChild(svg.make('line', Object.assign({
					'x1': agentInfoL.x,
					'y1': this.currentY,
					'x2': agentInfoR.x,
					'y2': this.currentY,
				}, config.separator.attrs)));
			}

			const modeRender = SVGShapes.renderBoxedText(mode, {
				x: agentInfoL.x,
				y: this.currentY,
				padding: config.section.mode.padding,
				boxAttrs: config.section.mode.boxAttrs,
				labelAttrs: config.section.mode.labelAttrs,
				boxLayer: this.blocks,
				labelLayer: this.actionLabels,
				SVGTextBlockClass: this.SVGTextBlockClass,
			});

			const labelRender = SVGShapes.renderBoxedText(label, {
				x: agentInfoL.x + modeRender.width,
				y: this.currentY,
				padding: config.section.label.padding,
				boxAttrs: {'fill': '#000000'},
				labelAttrs: config.section.label.labelAttrs,
				boxLayer: this.mask,
				labelLayer: this.actionLabels,
				SVGTextBlockClass: this.SVGTextBlockClass,
			});

			this.currentY += (
				Math.max(modeRender.height, labelRender.height) +
				config.section.padding.top
			);
			this.markAgentRange([left, right], this.currentY);
		}

		renderSectionEnd(/*scope, block, section*/) {
		}

		renderBlockEnd(scope, {left, right}) {
			const config = this.theme.block;
			this.currentY = (
				this.checkAgentRange([left, right], this.currentY) +
				config.section.padding.bottom
			);

			const agentInfoL = this.agentInfos.get(left);
			const agentInfoR = this.agentInfos.get(right);
			this.blocks.appendChild(svg.make('rect', Object.assign({
				'x': agentInfoL.x,
				'y': scope.y,
				'width': agentInfoR.x - agentInfoL.x,
				'height': this.currentY - scope.y,
			}, config.boxAttrs)));

			this.currentY += config.margin.bottom + this.theme.actionMargin;
			this.markAgentRange([left, right], this.currentY);
		}

		renderStages(stages) {
			this.agentInfos.forEach((agentInfo) => {
				const rad = agentInfo.currentRad;
				agentInfo.currentMaxRad = rad;
			});

			let topY = 0;
			let maxTopShift = 0;
			let sequential = true;
			const envPre = {
				theme: this.theme,
				agentInfos: this.agentInfos,
				textSizer: this.sizer,
				state: this.state,
			};
			const touchedAgentNames = [];
			stages.forEach((stage) => {
				const component = this.components.get(stage.type);
				const r = component.renderPre(stage, envPre) || {};
				if(r.topShift !== undefined) {
					maxTopShift = Math.max(maxTopShift, r.topShift);
				}
				if(r.agentNames) {
					array.mergeSets(touchedAgentNames, r.agentNames);
				}
				if(r.asynchronousY !== undefined) {
					topY = Math.max(topY, r.asynchronousY);
					sequential = false;
				}
			});
			topY = this.checkAgentRange(touchedAgentNames, topY);
			if(sequential) {
				topY = Math.max(topY, this.currentY);
			}

			const env = {
				topY,
				primaryY: topY + maxTopShift,
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
			};
			let bottomY = topY;
			stages.forEach((stage) => {
				const component = this.components.get(stage.type);
				const baseY = component.render(stage, env);
				if(baseY !== undefined) {
					bottomY = Math.max(bottomY, baseY);
				}
			});
			this.markAgentRange(touchedAgentNames, bottomY);

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
			traverse(stages, this.separationTraversalFns);

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

		_reset() {
			this.knownDefs.clear();
			svg.empty(this.defs);
			svg.empty(this.mask);
			svg.empty(this.agentLines);
			svg.empty(this.blocks);
			svg.empty(this.sections);
			svg.empty(this.actionShapes);
			svg.empty(this.actionLabels);
			this.mask.appendChild(this.maskReveal);
			this.defs.appendChild(this.mask);
			this.components.forEach((component) => {
				component.resetState(this.state);
			});
		}

		render(sequence) {
			this._reset();

			const themeName = sequence.meta.theme;
			this.theme = this.themes.get(themeName);
			if(!this.theme) {
				this.theme = this.themes.get('');
			}

			this.title.set({
				attrs: this.theme.titleAttrs,
				text: sequence.meta.title,
			});

			this.minX = 0;
			this.maxX = 0;
			this.buildAgentInfos(sequence.agents, sequence.stages);

			this.currentY = 0;
			traverse(sequence.stages, this.renderTraversalFns);
			const bottomY = this.checkAgentRange(['[', ']'], this.currentY);

			const stagesHeight = Math.max(bottomY - this.theme.actionMargin, 0);
			this.updateBounds(stagesHeight);

			this.sizer.resetCache();
			this.sizer.detach();
		}

		getAgentX(name) {
			return this.agentInfos.get(name).x;
		}

		svg() {
			return this.base;
		}
	};
});
