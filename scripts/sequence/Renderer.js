define([
	'./ArrayUtilities',
	'./SVGUtilities',
	'./SVGTextBlock',
], (
	array,
	svg,
	SVGTextBlock
) => {
	'use strict';

	function boxRenderer(attrs, position) {
		return svg.make('rect', Object.assign({}, position, attrs));
	}

	function noteRenderer(attrs, flickAttrs, position) {
		const g = svg.make('g');
		const x0 = position.x;
		const x1 = position.x + position.width;
		const y0 = position.y;
		const y1 = position.y + position.height;
		const flick = 7;

		g.appendChild(svg.make('path', Object.assign({
			'd': (
				'M ' + x0 + ' ' + y0 +
				' L ' + (x1 - flick) + ' ' + y0 +
				' L ' + x1 + ' ' + (y0 + flick) +
				' L ' + x1 + ' ' + y1 +
				' L ' + x0 + ' ' + y1 +
				' Z'
			),
		}, attrs)));

		g.appendChild(svg.make('path', Object.assign({
			'd': (
				'M ' + (x1 - flick) + ' ' + y0 +
				' L ' + (x1 - flick) + ' ' + (y0 + flick) +
				' L ' + x1 + ' ' + (y0 + flick)
			),
		}, flickAttrs)));

		return g;
	}

	const SEP_ZERO = {left: 0, right: 0};

	const LINE_HEIGHT = 1.3;
	const TITLE_MARGIN = 10;
	const OUTER_MARGIN = 5;
	const AGENT_BOX_PADDING = 10;
	const AGENT_MARGIN = 10;
	const AGENT_CROSS_SIZE = 20;
	const AGENT_NONE_HEIGHT = 10;
	const ACTION_MARGIN = 5;

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
				'text-anchor': 'middle',
			},
		},
		mask: {
			padding: 3,
			attrs: {
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
					'text-anchor': 'left',
				},
			},
			label: {
				maskPadding: {
					left: 3,
					right: 3,
				},
				maskAttrs: {
					'fill': '#FFFFFF',
				},
				labelPadding: {
					left: 5,
					right: 5,
				},
				labelAttrs: {
					'font-family': 'sans-serif',
					'font-size': 8,
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
			boxRenderer: noteRenderer.bind(null, {
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
			},
		},
		'state': {
			margin: {top: 0, left: 5, right: 5, bottom: 0},
			padding: {top: 7, left: 7, right: 7, bottom: 7},
			overlap: {left: 10, right: 10},
			boxRenderer: boxRenderer.bind(null, {
				'fill': '#FFFFFF',
				'stroke': '#000000',
				'stroke-width': 1,
				'rx': 10,
				'ry': 10,
			}),
			labelAttrs: {
				'font-family': 'sans-serif',
				'font-size': 8,
			},
		},
	};

	const ATTRS = {
		TITLE: {
			'font-family': 'sans-serif',
			'font-size': 20,
			'text-anchor': 'middle',
			'class': 'title',
		},

		AGENT_LINE: {
			'fill': 'none',
			'stroke': '#000000',
			'stroke-width': 1,
		},
		AGENT_BOX: {
			'fill': '#FFFFFF',
			'stroke': '#000000',
			'stroke-width': 1,
			'height': 24,
		},
		AGENT_BOX_LABEL: {
			'font-family': 'sans-serif',
			'font-size': 12,
			'text-anchor': 'middle',
		},
		AGENT_CROSS: {
			'fill': 'none',
			'stroke': '#000000',
			'stroke-width': 1,
		},
		AGENT_BAR: {
			'fill': '#000000',
			'height': 5,
		},
	};

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
			this.blocks = svg.make('g');
			this.sections = svg.make('g');
			this.agentDecor = svg.make('g');
			this.actions = svg.make('g');
			this.base.appendChild(this.agentLines);
			this.base.appendChild(this.blocks);
			this.base.appendChild(this.sections);
			this.base.appendChild(this.agentDecor);
			this.base.appendChild(this.actions);
			this.title = new SVGTextBlock(this.base, ATTRS.TITLE, LINE_HEIGHT);

			this.testers = svg.make('g');
			this.testersCache = new Map();
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

		separationAgentCapBox(agentInfo) {
			return {
				left: agentInfo.labelWidth / 2,
				right: agentInfo.labelWidth / 2,
			};
		}

		separationAgentCapCross() {
			return {
				left: AGENT_CROSS_SIZE / 2,
				right: AGENT_CROSS_SIZE / 2,
			};
		}

		separationAgentCapBar(agentInfo) {
			return {
				left: agentInfo.labelWidth / 2,
				right: agentInfo.labelWidth / 2,
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

				this.testTextWidth(CONNECT.label.attrs, label) +
				CONNECT.arrow.width * 2 +
				CONNECT.label.padding * 2 +
				ATTRS.AGENT_LINE['stroke-width']
			);
		}

		separationNoteOver({agents, mode, label}) {
			const config = NOTE[mode];
			const width = (
				this.testTextWidth(config.labelAttrs, label) +
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
					this.testTextWidth(config.labelAttrs, label) +
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
					this.testTextWidth(config.labelAttrs, label) +
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

				this.testTextWidth(config.labelAttrs, label) +
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
			const width = (
				this.testTextWidth(BLOCK.section.mode.labelAttrs, mode) +
				BLOCK.section.mode.padding.left +
				BLOCK.section.mode.padding.right +
				this.testTextWidth(BLOCK.section.label.labelAttrs, label) +
				BLOCK.section.label.labelPadding.left +
				BLOCK.section.label.labelPadding.right
			);
			this.addSeparation(left, right, width);
		}

		separationBlockEnd(scope, {left, right}) {
			array.removeAll(this.visibleAgents, [left, right]);
		}

		checkSeparation(stage) {
			this.separationAction[stage.type](stage);
		}

		renderAgentCapBox({x, labelWidth, label}) {
			this.agentDecor.appendChild(svg.make('rect', Object.assign({
				'x': x - labelWidth / 2,
				'y': this.currentY,
				'width': labelWidth,
			}, ATTRS.AGENT_BOX)));

			const name = svg.make('text', Object.assign({
				'x': x,
				'y': this.currentY + (
					ATTRS.AGENT_BOX.height +
					ATTRS.AGENT_BOX_LABEL['font-size'] * (2 - LINE_HEIGHT)
				) / 2,
			}, ATTRS.AGENT_BOX_LABEL));
			name.appendChild(svg.makeText(label));
			this.agentDecor.appendChild(name);

			return {
				lineTop: 0,
				lineBottom: ATTRS.AGENT_BOX.height,
				height: ATTRS.AGENT_BOX.height,
			};
		}

		renderAgentCapCross({x}) {
			const y = this.currentY;
			const d = AGENT_CROSS_SIZE / 2;

			this.agentDecor.appendChild(svg.make('path', Object.assign({
				'd': (
					'M ' + (x - d) + ' ' + y +
					' L ' + (x + d) + ' ' + (y + d * 2) +
					' M ' + (x + d) + ' ' + y +
					' L ' + (x - d) + ' ' + (y + d * 2)
				),
			}, ATTRS.AGENT_CROSS)));

			return {
				lineTop: d,
				lineBottom: d,
				height: d * 2,
			};
		}

		renderAgentCapBar({x, labelWidth}) {
			this.agentDecor.appendChild(svg.make('rect', Object.assign({
				'x': x - labelWidth / 2,
				'y': this.currentY,
				'width': labelWidth,
			}, ATTRS.AGENT_BAR)));

			return {
				lineTop: 0,
				lineBottom: ATTRS.AGENT_BAR.height,
				height: ATTRS.AGENT_BAR.height,
			};
		}

		renderAgentCapNone() {
			return {
				lineTop: AGENT_NONE_HEIGHT,
				lineBottom: 0,
				height: AGENT_NONE_HEIGHT,
			};
		}

		renderAgentBegin({mode, agents}) {
			let shifts = {height: 0};
			agents.forEach((agent) => {
				const agentInfo = this.agentInfos.get(agent);
				shifts = this.renderAgentCap[mode](agentInfo);
				agentInfo.latestYStart = this.currentY + shifts.lineBottom;
			});
			this.currentY += shifts.height + ACTION_MARGIN;
		}

		renderAgentEnd({mode, agents}) {
			let shifts = {height: 0};
			agents.forEach((agent) => {
				const agentInfo = this.agentInfos.get(agent);
				const x = agentInfo.x;
				shifts = this.renderAgentCap[mode](agentInfo);
				this.agentLines.appendChild(svg.make('path', Object.assign({
					'd': (
						'M ' + x + ' ' + agentInfo.latestYStart +
						' L ' + x + ' ' + (this.currentY + shifts.lineTop)
					),
					'class': 'agent-' + agentInfo.index + '-line',
				}, ATTRS.AGENT_LINE)));
				agentInfo.latestYStart = null;
			});
			this.currentY += shifts.height + ACTION_MARGIN;
		}

		renderConnection({label, agents, line, left, right}) {
			/* jshint -W074, -W071 */ // TODO: tidy this up
			const from = this.agentInfos.get(agents[0]);
			const to = this.agentInfos.get(agents[1]);

			const dy = CONNECT.arrow.height / 2;
			const dx = CONNECT.arrow.width;
			const dir = (from.x < to.x) ? 1 : -1;
			const short = ATTRS.AGENT_LINE['stroke-width'];
			let y = this.currentY;

			if(label) {
				const mask = svg.make('rect', CONNECT.mask.attrs);
				const labelNode = svg.make('text', CONNECT.label.attrs);
				labelNode.appendChild(svg.makeText(label));
				const sz = CONNECT.label.attrs['font-size'];
				this.actions.appendChild(mask);
				this.actions.appendChild(labelNode);
				y += Math.max(
					dy,
					CONNECT.label.margin.top +
					sz * LINE_HEIGHT +
					CONNECT.label.margin.bottom
				);
				const w = labelNode.getComputedTextLength();
				const x = (from.x + to.x) / 2;
				const yBase = (
					y -
					sz * (LINE_HEIGHT - 1) -
					CONNECT.label.margin.bottom
				);
				labelNode.setAttribute('x', x);
				labelNode.setAttribute('y', yBase);
				mask.setAttribute('x', x - w / 2 - CONNECT.mask.padding);
				mask.setAttribute('y', yBase - sz);
				mask.setAttribute('width', w + CONNECT.mask.padding * 2);
				mask.setAttribute('height', sz * LINE_HEIGHT);
			} else {
				y += dy;
			}

			this.actions.appendChild(svg.make('path', Object.assign({
				'd': (
					'M ' + (from.x + (left ? short : 0) * dir) + ' ' + y +
					' L ' + (to.x - (right ? short : 0) * dir) + ' ' + y
				),
			}, CONNECT.lineAttrs[line])));

			if(left) {
				this.actions.appendChild(svg.make('path', Object.assign({
					'd': (
						'M ' + (from.x + (dx + short) * dir) + ' ' + (y - dy) +
						' L ' + (from.x + short * dir) + ' ' + y +
						' L ' + (from.x + (dx + short) * dir) + ' ' + (y + dy) +
						(CONNECT.arrow.attrs.fill === 'none' ? '' : ' Z')
					),
				}, CONNECT.arrow.attrs)));
			}

			if(right) {
				this.actions.appendChild(svg.make('path', Object.assign({
					'd': (
						'M ' + (to.x - (dx + short) * dir) + ' ' + (y - dy) +
						' L ' + (to.x - short * dir) + ' ' + y +
						' L ' + (to.x - (dx + short) * dir) + ' ' + (y + dy) +
						(CONNECT.arrow.attrs.fill === 'none' ? '' : ' Z')
					),
				}, CONNECT.arrow.attrs)));
			}

			this.currentY = y + dy + ACTION_MARGIN;
		}

		renderNote({xMid = null, x0 = null, x1 = null}, anchor, mode, label) {
			const config = NOTE[mode];

			const sz = config.labelAttrs['font-size'];

			this.currentY += config.margin.top;

			const labelNode = svg.make('text', Object.assign({
				'y': this.currentY + config.padding.top + sz,
				'text-anchor': anchor,
			}, config.labelAttrs));
			labelNode.appendChild(svg.makeText(label));
			this.actions.appendChild(labelNode);

			const w = labelNode.getComputedTextLength();
			const fullW = w + config.padding.left + config.padding.right;
			if(x0 === null && xMid !== null) {
				x0 = xMid - fullW / 2;
			}
			if(x1 === null && x0 !== null) {
				x1 = x0 + fullW;
			} else if(x0 === null) {
				x0 = x1 - fullW;
			}
			switch(anchor) {
			case 'start':
				labelNode.setAttribute('x', x0 + config.padding.left);
				break;
			case 'end':
				labelNode.setAttribute('x', x1 - config.padding.right);
				break;
			default:
				labelNode.setAttribute('x', (
					x0 + config.padding.left +
					x1 - config.padding.right
				) / 2);
			}

			this.actions.insertBefore(config.boxRenderer({
				x: x0,
				y: this.currentY,
				width: x1 - x0,
				height: (
					config.padding.top +
					sz * LINE_HEIGHT +
					config.padding.bottom
				),
			}), labelNode);

			this.currentY += (
				config.padding.top +
				sz * LINE_HEIGHT +
				config.padding.bottom +
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
			/* jshint -W071 */ // TODO: tidy this up (split text rendering)

			const agentInfoL = this.agentInfos.get(left);
			const agentInfoR = this.agentInfos.get(right);

			if(scope.first) {
				scope.first = false;
			} else {
				this.currentY += BLOCK.section.padding.bottom;
				this.sections.appendChild(svg.make('path', Object.assign({
					'd': (
						'M' + agentInfoL.x + ' ' + this.currentY +
						' L' + agentInfoR.x + ' ' + this.currentY
					),
				}, BLOCK.separator.attrs)));
			}

			let x = agentInfoL.x;
			if(mode) {
				const sz = BLOCK.section.mode.labelAttrs['font-size'];
				const modeBox = svg.make('rect', Object.assign({
					'x': x,
					'y': this.currentY,
					'height': (
						sz * LINE_HEIGHT +
						BLOCK.section.mode.padding.top +
						BLOCK.section.mode.padding.bottom
					),
				}, BLOCK.section.mode.boxAttrs));
				const modeLabel = svg.make('text', Object.assign({
					'x': x + BLOCK.section.mode.padding.left,
					'y': (
						this.currentY + sz +
						BLOCK.section.mode.padding.top
					),
				}, BLOCK.section.mode.labelAttrs));
				modeLabel.appendChild(svg.makeText(mode));
				this.blocks.appendChild(modeBox);
				this.actions.appendChild(modeLabel);
				const w = (
					modeLabel.getComputedTextLength() +
					BLOCK.section.mode.padding.left +
					BLOCK.section.mode.padding.right
				);
				modeBox.setAttribute('width', w);
				x += w;

				this.currentY += sz * LINE_HEIGHT;
			}

			if(label) {
				x += BLOCK.section.label.labelPadding.left;
				const sz = BLOCK.section.label.labelAttrs['font-size'];
				const mask = svg.make('rect', Object.assign({
					'x': x - BLOCK.section.label.maskPadding.left,
					'y': this.currentY - sz * LINE_HEIGHT,
					'height': sz * LINE_HEIGHT,
				}, BLOCK.section.label.maskAttrs));
				const labelLabel = svg.make('text', Object.assign({
					'x': x,
					'y': this.currentY - sz * (LINE_HEIGHT - 1),
				}, BLOCK.section.label.labelAttrs));
				labelLabel.appendChild(svg.makeText(label));
				this.actions.appendChild(mask);
				this.actions.appendChild(labelLabel);
				const w = (
					labelLabel.getComputedTextLength() +
					BLOCK.section.label.maskPadding.left +
					BLOCK.section.label.maskPadding.right
				);
				mask.setAttribute('width', w);
			}

			this.currentY += BLOCK.section.padding.top;
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

		testTextWidth(attrs, content) {
			let tester = this.testersCache.get(attrs);
			if(!tester) {
				const text = svg.makeText();
				const node = svg.make('text', attrs);
				node.appendChild(text);
				this.testers.appendChild(node);
				tester = {text, node};
				this.testersCache.set(attrs, tester);
			}

			tester.text.nodeValue = content;
			return tester.node.getComputedTextLength();
		}

		buildAgentInfos(agents, stages) {
			svg.empty(this.testers);
			this.testersCache.clear();
			this.base.appendChild(this.testers);

			this.agentInfos = new Map();
			agents.forEach((agent, index) => {
				this.agentInfos.set(agent, {
					label: agent,
					labelWidth: (
						this.testTextWidth(ATTRS.AGENT_BOX_LABEL, agent) +
						AGENT_BOX_PADDING * 2
					),
					index,
					x: null,
					latestYStart: null,
					separations: new Map(),
				});
			});
			this.agentInfos.get('[').labelWidth = 0;
			this.agentInfos.get(']').labelWidth = 0;

			this.visibleAgents = ['[', ']'];
			traverse(stages, this.separationTraversalFns);
			this.base.removeChild(this.testers);

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
			svg.empty(this.blocks);
			svg.empty(this.sections);
			svg.empty(this.agentDecor);
			svg.empty(this.actions);

			this.title.setText(meta.title);

			this.minX = 0;
			this.maxX = 0;
			this.buildAgentInfos(agents, stages);

			this.currentY = 0;
			traverse(stages, this.renderTraversalFns);

			const stagesHeight = Math.max(this.currentY - ACTION_MARGIN, 0);
			this.updateBounds(stagesHeight);
		}

		getAgentX(name) {
			return this.agentInfos.get(name).x;
		}

		svg() {
			return this.base;
		}
	};
});
