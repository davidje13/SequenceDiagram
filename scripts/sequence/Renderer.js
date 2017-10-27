define([
	'./ArrayUtilities',
	'./SVGUtilities',
	'./SVGTextBlock',
	'./SVGShapes',
], (
	array,
	svg,
	SVGTextBlock,
	SVGShapes
) => {
	'use strict';

	const SEP_ZERO = {left: 0, right: 0};

	const LINE_HEIGHT = 1.3;
	const TITLE_MARGIN = 10;
	const OUTER_MARGIN = 5;
	const AGENT_MARGIN = 10;
	const ACTION_MARGIN = 5;

	const AGENT_CAP = {
		box: {
			padding: {
				top: 5,
				left: 10,
				right: 10,
				bottom: 5,
			},
			boxAttrs: {
				'fill': '#FFFFFF',
				'stroke': '#000000',
				'stroke-width': 1,
			},
			labelAttrs: {
				'font-family': 'sans-serif',
				'font-size': 12,
				'line-height': LINE_HEIGHT,
				'text-anchor': 'middle',
			},
		},
		cross: {
			size: 20,
			attrs: {
				'fill': 'none',
				'stroke': '#000000',
				'stroke-width': 1,
			},
		},
		bar: {
			attrs: {
				'fill': '#000000',
				'height': 5,
			},
		},
		none: {
			height: 10,
		},
	};

	const CONNECT = {
		lineAttrs: {
			'solid': {
				'fill': 'none',
				'stroke': '#000000',
				'stroke-width': 1,
			},
			'dash': {
				'fill': 'none',
				'stroke': '#000000',
				'stroke-width': 1,
				'stroke-dasharray': '4, 2',
			},
		},
		arrow: {
			width: 4,
			height: 8,
			attrs: {
				'fill': '#000000',
				'stroke': '#000000',
				'stroke-width': 1,
				'stroke-linejoin': 'miter',
			},
		},
		label: {
			padding: 6,
			margin: {top: 2, bottom: 1},
			attrs: {
				'font-family': 'sans-serif',
				'font-size': 8,
				'line-height': LINE_HEIGHT,
				'text-anchor': 'middle',
			},
		},
		mask: {
			padding: {
				top: 0,
				left: 3,
				right: 3,
				bottom: 0,
			},
			maskAttrs: {
				'fill': '#FFFFFF',
			},
		},
	};

	const BLOCK = {
		margin: {
			top: 0,
			bottom: 0,
		},
		boxAttrs: {
			'fill': 'none',
			'stroke': '#000000',
			'stroke-width': 1.5,
			'rx': 2,
			'ry': 2,
		},
		section: {
			padding: {
				top: 3,
				bottom: 2,
			},
			mode: {
				padding: {
					top: 1,
					left: 3,
					right: 3,
					bottom: 0,
				},
				boxAttrs: {
					'fill': '#FFFFFF',
					'stroke': '#000000',
					'stroke-width': 1,
					'rx': 2,
					'ry': 2,
				},
				labelAttrs: {
					'font-family': 'sans-serif',
					'font-weight': 'bold',
					'font-size': 9,
					'line-height': LINE_HEIGHT,
					'text-anchor': 'left',
				},
			},
			label: {
				padding: {
					top: 1,
					left: 5,
					right: 3,
					bottom: 0,
				},
				maskAttrs: {
					'fill': '#FFFFFF',
				},
				labelAttrs: {
					'font-family': 'sans-serif',
					'font-size': 8,
					'line-height': LINE_HEIGHT,
					'text-anchor': 'left',
				},
			},
		},
		separator: {
			attrs: {
				'stroke': '#000000',
				'stroke-width': 1.5,
				'stroke-dasharray': '4, 2',
			},
		},
	};

	const NOTE = {
		'note': {
			margin: {top: 0, left: 5, right: 5, bottom: 0},
			padding: {top: 5, left: 5, right: 10, bottom: 5},
			overlap: {left: 10, right: 10},
			boxRenderer: SVGShapes.renderNote.bind(null, {
				'fill': '#FFFFFF',
				'stroke': '#000000',
				'stroke-width': 1,
			}, {
				'fill': 'none',
				'stroke': '#000000',
				'stroke-width': 1,
			}),
			labelAttrs: {
				'font-family': 'sans-serif',
				'font-size': 8,
				'line-height': LINE_HEIGHT,
			},
		},
		'state': {
			margin: {top: 0, left: 5, right: 5, bottom: 0},
			padding: {top: 7, left: 7, right: 7, bottom: 7},
			overlap: {left: 10, right: 10},
			boxRenderer: SVGShapes.renderBox.bind(null, {
				'fill': '#FFFFFF',
				'stroke': '#000000',
				'stroke-width': 1,
				'rx': 10,
				'ry': 10,
			}),
			labelAttrs: {
				'font-family': 'sans-serif',
				'font-size': 8,
				'line-height': LINE_HEIGHT,
			},
		},
	};

	const ATTRS = {
		TITLE: {
			'font-family': 'sans-serif',
			'font-size': 20,
			'line-height': LINE_HEIGHT,
			'text-anchor': 'middle',
			'class': 'title',
		},

		AGENT_LINE: {
			'fill': 'none',
			'stroke': '#000000',
			'stroke-width': 1,
		},
	};

	function drawHorizontalArrowHead(container, {x, y, dx, dy, attrs}) {
		container.appendChild(svg.make(
			attrs.fill === 'none' ? 'polyline' : 'polygon',
			Object.assign({
				'points': (
					(x + dx) + ' ' + (y - dy) + ' ' +
					x + ' ' + y + ' ' +
					(x + dx) + ' ' + (y + dy)
				),
			}, attrs)
		));
	}

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
			} else if(callbacks.stageFn) {
				callbacks.stageFn(stage);
			}
		});
	}

	return class Renderer {
		constructor() {
			this.separationAgentCap = {
				'box': this.separationAgentCapBox.bind(this),
				'cross': this.separationAgentCapCross.bind(this),
				'bar': this.separationAgentCapBar.bind(this),
				'none': this.separationAgentCapNone.bind(this),
			};

			this.separationAction = {
				'agent begin': this.separationAgent.bind(this),
				'agent end': this.separationAgent.bind(this),
				'connection': this.separationConnection.bind(this),
				'note over': this.separationNoteOver.bind(this),
				'note left': this.separationNoteLeft.bind(this),
				'note right': this.separationNoteRight.bind(this),
				'note between': this.separationNoteBetween.bind(this),
			};

			this.renderAgentCap = {
				'box': this.renderAgentCapBox.bind(this),
				'cross': this.renderAgentCapCross.bind(this),
				'bar': this.renderAgentCapBar.bind(this),
				'none': this.renderAgentCapNone.bind(this),
			};

			this.renderAction = {
				'agent begin': this.renderAgentBegin.bind(this),
				'agent end': this.renderAgentEnd.bind(this),
				'connection': this.renderConnection.bind(this),
				'note over': this.renderNoteOver.bind(this),
				'note left': this.renderNoteLeft.bind(this),
				'note right': this.renderNoteRight.bind(this),
				'note between': this.renderNoteBetween.bind(this),
			};

			this.separationTraversalFns = {
				stageFn: this.checkSeparation.bind(this),
				blockBeginFn: this.separationBlockBegin.bind(this),
				sectionBeginFn: this.separationSectionBegin.bind(this),
				blockEndFn: this.separationBlockEnd.bind(this),
			};

			this.renderTraversalFns = {
				stageFn: this.addAction.bind(this),
				blockBeginFn: this.renderBlockBegin.bind(this),
				sectionBeginFn: this.renderSectionBegin.bind(this),
				sectionEndFn: this.renderSectionEnd.bind(this),
				blockEndFn: this.renderBlockEnd.bind(this),
			};

			this.width = 0;
			this.height = 0;
			this.buildStaticElements();
		}

		buildStaticElements() {
			this.base = svg.makeContainer({
				'width': '100%',
				'height': '100%',
			});

			this.agentLines = svg.make('g');
			this.mask = svg.make('g');
			this.blocks = svg.make('g');
			this.sections = svg.make('g');
			this.actionShapes = svg.make('g');
			this.actionLabels = svg.make('g');
			this.base.appendChild(this.agentLines);
			this.base.appendChild(this.mask);
			this.base.appendChild(this.blocks);
			this.base.appendChild(this.sections);
			this.base.appendChild(this.actionShapes);
			this.base.appendChild(this.actionLabels);
			this.title = new SVGTextBlock(this.base, ATTRS.TITLE);

			this.sizer = new SVGTextBlock.SizeTester(this.base);
		}

		findExtremes(agents) {
			let min = null;
			let max = null;
			agents.forEach((agent) => {
				const info = this.agentInfos.get(agent);
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

		addSeparation(agent1, agent2, dist) {
			const info1 = this.agentInfos.get(agent1);
			const info2 = this.agentInfos.get(agent2);

			const d1 = info1.separations.get(agent2) || 0;
			info1.separations.set(agent2, Math.max(d1, dist));

			const d2 = info2.separations.get(agent1) || 0;
			info2.separations.set(agent1, Math.max(d2, dist));
		}

		addSeparations(agents, agentSpaces) {
			agents.forEach((agentR) => {
				const infoR = this.agentInfos.get(agentR);
				const sepR = agentSpaces.get(agentR) || SEP_ZERO;
				agents.forEach((agentL) => {
					const infoL = this.agentInfos.get(agentL);
					if(infoL.index >= infoR.index) {
						return;
					}
					const sepL = agentSpaces.get(agentL) || SEP_ZERO;
					this.addSeparation(
						agentR,
						agentL,
						sepR.left + sepL.right + AGENT_MARGIN
					);
				});
			});
		}

		separationAgentCapBox({label}) {
			const width = (
				this.sizer.measure(AGENT_CAP.box.labelAttrs, label).width +
				AGENT_CAP.box.padding.left +
				AGENT_CAP.box.padding.right
			);

			return {
				left: width / 2,
				right: width / 2,
			};
		}

		separationAgentCapCross() {
			return {
				left: AGENT_CAP.cross.size / 2,
				right: AGENT_CAP.cross.size / 2,
			};
		}

		separationAgentCapBar({label}) {
			const width = (
				this.sizer.measure(AGENT_CAP.box.labelAttrs, label).width +
				AGENT_CAP.box.padding.left +
				AGENT_CAP.box.padding.right
			);

			return {
				left: width / 2,
				right: width / 2,
			};
		}

		separationAgentCapNone() {
			return {left: 0, right: 0};
		}

		separationAgent({type, mode, agents}) {
			if(type === 'agent begin') {
				array.mergeSets(this.visibleAgents, agents);
			}

			const agentSpaces = new Map();
			agents.forEach((agent) => {
				const info = this.agentInfos.get(agent);
				const separationFn = this.separationAgentCap[mode];
				agentSpaces.set(agent, separationFn(info));
			});
			this.addSeparations(this.visibleAgents, agentSpaces);

			if(type === 'agent end') {
				array.removeAll(this.visibleAgents, agents);
			}
		}

		separationConnection({agents, label}) {
			this.addSeparation(
				agents[0],
				agents[1],

				this.sizer.measure(CONNECT.label.attrs, label).width +
				CONNECT.arrow.width * 2 +
				CONNECT.label.padding * 2 +
				ATTRS.AGENT_LINE['stroke-width']
			);
		}

		separationNoteOver({agents, mode, label}) {
			const config = NOTE[mode];
			const width = (
				this.sizer.measure(config.labelAttrs, label).width +
				config.padding.left +
				config.padding.right
			);

			const agentSpaces = new Map();
			if(agents.length > 1) {
				const {left, right} = this.findExtremes(agents);

				this.addSeparation(
					left,
					right,

					width -
					config.overlap.left -
					config.overlap.right
				);

				agentSpaces.set(left, {left: config.overlap.left, right: 0});
				agentSpaces.set(right, {left: 0, right: config.overlap.right});
			} else {
				agentSpaces.set(agents[0], {
					left: width / 2,
					right: width / 2,
				});
			}
			this.addSeparations(this.visibleAgents, agentSpaces);
		}

		separationNoteLeft({agents, mode, label}) {
			const config = NOTE[mode];
			const {left} = this.findExtremes(agents);

			const agentSpaces = new Map();
			agentSpaces.set(left, {
				left: (
					this.sizer.measure(config.labelAttrs, label).width +
					config.padding.left +
					config.padding.right +
					config.margin.left +
					config.margin.right
				),
				right: 0,
			});
			this.addSeparations(this.visibleAgents, agentSpaces);
		}

		separationNoteRight({agents, mode, label}) {
			const config = NOTE[mode];
			const {right} = this.findExtremes(agents);

			const agentSpaces = new Map();
			agentSpaces.set(right, {
				left: 0,
				right: (
					this.sizer.measure(config.labelAttrs, label).width +
					config.padding.left +
					config.padding.right +
					config.margin.left +
					config.margin.right
				),
			});
			this.addSeparations(this.visibleAgents, agentSpaces);
		}

		separationNoteBetween({agents, mode, label}) {
			const config = NOTE[mode];
			const {left, right} = this.findExtremes(agents);

			this.addSeparation(
				left,
				right,

				this.sizer.measure(config.labelAttrs, label).width +
				config.padding.left +
				config.padding.right +
				config.margin.left +
				config.margin.right
			);
		}

		separationBlockBegin(scope, {left, right}) {
			array.mergeSets(this.visibleAgents, [left, right]);
			this.addSeparations(this.visibleAgents, new Map());
		}

		separationSectionBegin(scope, {left, right}, {mode, label}) {
			const config = BLOCK.section;
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

		checkSeparation(stage) {
			this.separationAction[stage.type](stage);
		}

		renderAgentCapBox({x, label}) {
			const {height} = SVGShapes.renderBoxedText(label, {
				x,
				y: this.currentY,
				padding: AGENT_CAP.box.padding,
				boxAttrs: AGENT_CAP.box.boxAttrs,
				labelAttrs: AGENT_CAP.box.labelAttrs,
				boxLayer: this.actionShapes,
				labelLayer: this.actionLabels,
			});

			return {
				lineTop: 0,
				lineBottom: height,
				height,
			};
		}

		renderAgentCapCross({x}) {
			const y = this.currentY;
			const d = AGENT_CAP.cross.size / 2;

			this.actionShapes.appendChild(svg.make('path', Object.assign({
				'd': (
					'M ' + (x - d) + ' ' + y +
					' L ' + (x + d) + ' ' + (y + d * 2) +
					' M ' + (x + d) + ' ' + y +
					' L ' + (x - d) + ' ' + (y + d * 2)
				),
			}, AGENT_CAP.cross.attrs)));

			return {
				lineTop: d,
				lineBottom: d,
				height: d * 2,
			};
		}

		renderAgentCapBar({x, label}) {
			const width = (
				this.sizer.measure(AGENT_CAP.box.labelAttrs, label).width +
				AGENT_CAP.box.padding.left +
				AGENT_CAP.box.padding.right
			);

			this.actionShapes.appendChild(svg.make('rect', Object.assign({
				'x': x - width / 2,
				'y': this.currentY,
				'width': width,
			}, AGENT_CAP.bar.attrs)));

			return {
				lineTop: 0,
				lineBottom: AGENT_CAP.bar.attrs.height,
				height: AGENT_CAP.bar.attrs.height,
			};
		}

		renderAgentCapNone() {
			return {
				lineTop: AGENT_CAP.none.height,
				lineBottom: 0,
				height: AGENT_CAP.none.height,
			};
		}

		renderAgentBegin({mode, agents}) {
			let maxHeight = 0;
			agents.forEach((agent) => {
				const agentInfo = this.agentInfos.get(agent);
				const shifts = this.renderAgentCap[mode](agentInfo);
				maxHeight = Math.max(maxHeight, shifts.height);
				agentInfo.latestYStart = this.currentY + shifts.lineBottom;
			});
			this.currentY += maxHeight + ACTION_MARGIN;
		}

		renderAgentEnd({mode, agents}) {
			let maxHeight = 0;
			agents.forEach((agent) => {
				const agentInfo = this.agentInfos.get(agent);
				const x = agentInfo.x;
				const shifts = this.renderAgentCap[mode](agentInfo);
				maxHeight = Math.max(maxHeight, shifts.height);
				this.agentLines.appendChild(svg.make('line', Object.assign({
					'x1': x,
					'y1': agentInfo.latestYStart,
					'x2': x,
					'y2': this.currentY + shifts.lineTop,
					'class': 'agent-' + agentInfo.index + '-line',
				}, ATTRS.AGENT_LINE)));
				agentInfo.latestYStart = null;
			});
			this.currentY += maxHeight + ACTION_MARGIN;
		}

		renderConnection({label, agents, line, left, right}) {
			const from = this.agentInfos.get(agents[0]);
			const to = this.agentInfos.get(agents[1]);

			const dy = CONNECT.arrow.height / 2;
			const dir = (from.x < to.x) ? 1 : -1;
			const short = ATTRS.AGENT_LINE['stroke-width'];

			const height = (
				this.sizer.measureHeight(CONNECT.label.attrs, label) +
				CONNECT.label.margin.top +
				CONNECT.label.margin.bottom
			);

			let y = this.currentY + Math.max(dy, height);

			SVGShapes.renderBoxedText(label, {
				x: (from.x + to.x) / 2,
				y: y - height + CONNECT.label.margin.top,
				padding: CONNECT.mask.padding,
				boxAttrs: CONNECT.mask.maskAttrs,
				labelAttrs: CONNECT.label.attrs,
				boxLayer: this.mask,
				labelLayer: this.actionLabels,
			});

			this.actionShapes.appendChild(svg.make('line', Object.assign({
				'x1': from.x + (left ? short : 0) * dir,
				'y1': y,
				'x2': to.x - (right ? short : 0) * dir,
				'y2': y,
			}, CONNECT.lineAttrs[line])));

			if(left) {
				drawHorizontalArrowHead(this.actionShapes, {
					x: from.x + short * dir,
					y,
					dx: CONNECT.arrow.width * dir,
					dy,
					attrs: CONNECT.arrow.attrs,
				});
			}

			if(right) {
				drawHorizontalArrowHead(this.actionShapes, {
					x: to.x - short * dir,
					y,
					dx: -CONNECT.arrow.width * dir,
					dy,
					attrs: CONNECT.arrow.attrs,
				});
			}

			this.currentY = y + dy + ACTION_MARGIN;
		}

		renderNote({xMid = null, x0 = null, x1 = null}, anchor, mode, label) {
			const config = NOTE[mode];

			this.currentY += config.margin.top;

			const y = this.currentY + config.padding.top;
			const labelNode = new SVGTextBlock(
				this.actionLabels,
				config.labelAttrs,
				{text: label, y}
			);

			const fullW = (
				labelNode.width +
				config.padding.left +
				config.padding.right
			);
			const fullH = (
				config.padding.top +
				labelNode.height +
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
				labelNode.reanchor((
					x0 + config.padding.left +
					x1 - config.padding.right
				) / 2, y);
				break;
			case 'end':
				labelNode.reanchor(x1 - config.padding.right, y);
				break;
			default:
				labelNode.reanchor(x0 + config.padding.left, y);
				break;
			}

			this.actionShapes.appendChild(config.boxRenderer({
				x: x0,
				y: this.currentY,
				width: x1 - x0,
				height: fullH,
			}));

			this.currentY += (
				fullH +
				config.margin.bottom +
				ACTION_MARGIN
			);
		}

		renderNoteOver({agents, mode, label}) {
			const config = NOTE[mode];

			if(agents.length > 1) {
				const {left, right} = this.findExtremes(agents);
				this.renderNote({
					x0: this.agentInfos.get(left).x - config.overlap.left,
					x1: this.agentInfos.get(right).x + config.overlap.right,
				}, 'middle', mode, label);
			} else {
				const xMid = this.agentInfos.get(agents[0]).x;
				this.renderNote({xMid}, 'middle', mode, label);
			}
		}

		renderNoteLeft({agents, mode, label}) {
			const config = NOTE[mode];

			const {left} = this.findExtremes(agents);
			const x1 = this.agentInfos.get(left).x - config.margin.right;
			this.renderNote({x1}, 'end', mode, label);
		}

		renderNoteRight({agents, mode, label}) {
			const config = NOTE[mode];

			const {right} = this.findExtremes(agents);
			const x0 = this.agentInfos.get(right).x + config.margin.left;
			this.renderNote({x0}, 'start', mode, label);
		}

		renderNoteBetween({agents, mode, label}) {
			const {left, right} = this.findExtremes(agents);
			const xMid = (
				this.agentInfos.get(left).x +
				this.agentInfos.get(right).x
			) / 2;

			this.renderNote({xMid}, 'middle', mode, label);
		}

		renderBlockBegin(scope) {
			this.currentY += BLOCK.margin.top;

			scope.y = this.currentY;
			scope.first = true;
		}

		renderSectionBegin(scope, {left, right}, {mode, label}) {
			const agentInfoL = this.agentInfos.get(left);
			const agentInfoR = this.agentInfos.get(right);

			if(scope.first) {
				scope.first = false;
			} else {
				this.currentY += BLOCK.section.padding.bottom;
				this.sections.appendChild(svg.make('line', Object.assign({
					'x1': agentInfoL.x,
					'y1': this.currentY,
					'x2': agentInfoR.x,
					'y2': this.currentY,
				}, BLOCK.separator.attrs)));
			}

			const modeRender = SVGShapes.renderBoxedText(mode, {
				x: agentInfoL.x,
				y: this.currentY,
				padding: BLOCK.section.mode.padding,
				boxAttrs: BLOCK.section.mode.boxAttrs,
				labelAttrs: BLOCK.section.mode.labelAttrs,
				boxLayer: this.blocks,
				labelLayer: this.actionLabels,
			});

			const labelRender = SVGShapes.renderBoxedText(label, {
				x: agentInfoL.x + modeRender.width,
				y: this.currentY,
				padding: BLOCK.section.label.padding,
				boxAttrs: BLOCK.section.label.maskAttrs,
				labelAttrs: BLOCK.section.label.labelAttrs,
				boxLayer: this.mask,
				labelLayer: this.actionLabels,
			});

			this.currentY += (
				Math.max(modeRender.height, labelRender.height) +
				BLOCK.section.padding.top
			);
		}

		renderSectionEnd(/*scope, block, section*/) {
		}

		renderBlockEnd(scope, {left, right}) {
			this.currentY += BLOCK.section.padding.bottom;

			const agentInfoL = this.agentInfos.get(left);
			const agentInfoR = this.agentInfos.get(right);
			this.blocks.appendChild(svg.make('rect', Object.assign({
				'x': agentInfoL.x,
				'y': scope.y,
				'width': agentInfoR.x - agentInfoL.x,
				'height': this.currentY - scope.y,
			}, BLOCK.boxAttrs)));

			this.currentY += BLOCK.margin.bottom + ACTION_MARGIN;
		}

		addAction(stage) {
			this.renderAction[stage.type](stage);
		}

		buildAgentInfos(agents, stages) {
			this.agentInfos = new Map();
			agents.forEach((agent, index) => {
				this.agentInfos.set(agent, {
					label: agent,
					index,
					x: null,
					latestYStart: null,
					separations: new Map(),
				});
			});

			this.visibleAgents = ['[', ']'];
			traverse(stages, this.separationTraversalFns);

			agents.forEach((agent) => {
				const agentInfo = this.agentInfos.get(agent);
				let currentX = 0;
				agentInfo.separations.forEach((dist, otherAgent) => {
					const otherAgentInfo = this.agentInfos.get(otherAgent);
					if(otherAgentInfo.x !== null) {
						currentX = Math.max(currentX, otherAgentInfo.x + dist);
					}
				});
				agentInfo.x = currentX;
				this.minX = Math.min(this.minX, currentX);
				this.maxX = Math.max(this.maxX, currentX);
			});
		}

		updateBounds(stagesHeight) {
			const cx = (this.minX + this.maxX) / 2;
			const titleY = ((this.title.height > 0) ?
				(-TITLE_MARGIN - this.title.height) : 0
			);
			this.title.reanchor(cx, titleY);

			const halfTitleWidth = this.title.width / 2;
			const x0 = Math.min(this.minX, cx - halfTitleWidth) - OUTER_MARGIN;
			const x1 = Math.max(this.maxX, cx + halfTitleWidth) + OUTER_MARGIN;
			const y0 = titleY - OUTER_MARGIN;
			const y1 = stagesHeight + OUTER_MARGIN;

			this.base.setAttribute('viewBox', (
				x0 + ' ' + y0 + ' ' +
				(x1 - x0) + ' ' + (y1 - y0)
			));
			this.width = (x1 - x0);
			this.height = (y1 - y0);
		}

		render({meta, agents, stages}) {
			svg.empty(this.agentLines);
			svg.empty(this.mask);
			svg.empty(this.blocks);
			svg.empty(this.sections);
			svg.empty(this.actionShapes);
			svg.empty(this.actionLabels);

			this.title.setText(meta.title);

			this.minX = 0;
			this.maxX = 0;
			this.buildAgentInfos(agents, stages);

			this.currentY = 0;
			traverse(stages, this.renderTraversalFns);

			const stagesHeight = Math.max(this.currentY - ACTION_MARGIN, 0);
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
