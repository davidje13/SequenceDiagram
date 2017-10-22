define(() => {
	'use strict';

	/* jshint -W071 */ // TODO: break up rendering logic

	function empty(node) {
		while(node.childNodes.length > 0) {
			node.removeChild(node.lastChild);
		}
	}

	function mergeSets(target, b) {
		if(!b) {
			return;
		}
		for(let i = 0; i < b.length; ++ i) {
			if(target.indexOf(b[i]) === -1) {
				target.push(b[i]);
			}
		}
	}

	function removeAll(target, b) {
		if(!b) {
			return;
		}
		for(let i = 0; i < b.length; ++ i) {
			const p = target.indexOf(b[i]);
			if(p !== -1) {
				target.splice(p, 1);
			}
		}
	}

	const NS = 'http://www.w3.org/2000/svg';

	const LINE_HEIGHT = 1.3;
	const TITLE_MARGIN = 10;
	const OUTER_MARGIN = 5;
	const BOX_PADDING = 10;
	const AGENT_MARGIN = 10;
	const AGENT_CROSS_SIZE = 20;
	const AGENT_NONE_HEIGHT = 10;
	const ACTION_MARGIN = 5;
	const ARROW_HEIGHT = 8;
	const ARROW_POINT = 4;
	const ARROW_LABEL_PADDING = 6;
	const ARROW_LABEL_MASK_PADDING = 3;
	const ARROW_LABEL_MARGIN_TOP = 2;
	const ARROW_LABEL_MARGIN_BOTTOM = 1;

	const ATTRS = {
		TITLE: {
			'font-family': 'sans-serif',
			'font-size': 20,
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

		ARROW_LINE_SOLID: {
			'fill': 'none',
			'stroke': '#000000',
			'stroke-width': 1,
		},
		ARROW_LINE_DASH: {
			'fill': 'none',
			'stroke': '#000000',
			'stroke-width': 1,
			'stroke-dasharray': '2, 2',
		},
		ARROW_LABEL: {
			'font-family': 'sans-serif',
			'font-size': 8,
		},
		ARROW_LABEL_MASK: {
			'fill': '#FFFFFF',
		},
		ARROW_HEAD: {
			'fill': '#000000',
			'stroke': '#000000',
			'stroke-width': 1,
			'stroke-linejoin': 'miter',
		},
	};

	function makeText(text = '') {
		return document.createTextNode(text);
	}

	function makeSVGNode(type, attrs = {}) {
		const o = document.createElementNS(NS, type);
		for(let k in attrs) {
			if(attrs.hasOwnProperty(k)) {
				o.setAttribute(k, attrs[k]);
			}
		}
		return o;
	}

	function traverse(stages, fn) {
		stages.forEach((stage) => {
			fn(stage);
			if(stage.type === 'block') {
				stage.sections.forEach((section) => {
					traverse(section.stages, fn);
				});
			}
		});
	}

	return class Renderer {
		constructor() {
			this.base = makeSVGNode('svg', {
				'xmlns': NS,
				'version': '1.1',
				'width': '100%',
				'height': '100%',
			});

			this.title = makeSVGNode('text', Object.assign({
				'y': ATTRS.TITLE['font-size'] + OUTER_MARGIN,
			}, ATTRS.TITLE));
			this.titleText = makeText();
			this.title.appendChild(this.titleText);
			this.base.appendChild(this.title);

			this.diagram = makeSVGNode('g');
			this.agentLines = makeSVGNode('g');
			this.agentDecor = makeSVGNode('g');
			this.actions = makeSVGNode('g');
			this.diagram.appendChild(this.agentLines);
			this.diagram.appendChild(this.agentDecor);
			this.diagram.appendChild(this.actions);
			this.base.appendChild(this.diagram);

			this.renderAgentCap = {
				'box': this.renderAgentCapBox.bind(this),
				'cross': this.renderAgentCapCross.bind(this),
				'bar': this.renderAgentCapBar.bind(this),
				'none': this.renderAgentCapNone.bind(this),
			};

			this.renderAction = {
				'agent begin': this.renderAgentBegin.bind(this),
				'agent end': this.renderAgentEnd.bind(this),
				'->': this.renderArrow.bind(this, {
					lineAttrs: ATTRS.ARROW_LINE_SOLID, left: false, right: true,
				}),
				'<-': this.renderArrow.bind(this, {
					lineAttrs: ATTRS.ARROW_LINE_SOLID, left: true, right: false,
				}),
				'<->': this.renderArrow.bind(this, {
					lineAttrs: ATTRS.ARROW_LINE_SOLID, left: true, right: true,
				}),
				'-->': this.renderArrow.bind(this, {
					lineAttrs: ATTRS.ARROW_LINE_DASH, left: false, right: true,
				}),
				'<--': this.renderArrow.bind(this, {
					lineAttrs: ATTRS.ARROW_LINE_DASH, left: true, right: false,
				}),
				'<-->': this.renderArrow.bind(this, {
					lineAttrs: ATTRS.ARROW_LINE_DASH, left: true, right: true,
				}),
				'block': this.renderBlock.bind(this),
				'note over': this.renderNoteOver.bind(this),
				'note left': this.renderNoteLeft.bind(this),
				'note right': this.renderNoteRight.bind(this),
				'note between': this.renderNoteBetween.bind(this),
			};

			this.separationAction = {
				'agent begin': this.separationAgentCap.bind(this),
				'agent end': this.separationAgentCap.bind(this),
				'->': this.separationArrow.bind(this),
				'<-': this.separationArrow.bind(this),
				'<->': this.separationArrow.bind(this),
				'-->': this.separationArrow.bind(this),
				'<--': this.separationArrow.bind(this),
				'<-->': this.separationArrow.bind(this),
				'block': this.separationBlock.bind(this),
				'note over': this.separationNoteOver.bind(this),
				'note left': this.separationNoteLeft.bind(this),
				'note right': this.separationNoteRight.bind(this),
				'note between': this.separationNoteBetween.bind(this),
			};

			this.width = 0;
			this.height = 0;
		}

		addSeparation(agentInfo, agent, dist) {
			let d = agentInfo.separations.get(agent) || 0;
			agentInfo.separations.set(agent, Math.max(d, dist));
		}

		separationAgentCap(agentInfos, stage) {
			switch(stage.mode) {
			case 'box':
			case 'bar':
				stage.agents.forEach((agent1) => {
					const info1 = agentInfos.get(agent1);
					const sep1 = (
						info1.labelWidth / 2 +
						AGENT_MARGIN
					);
					stage.agents.forEach((agent2) => {
						if(agent1 === agent2) {
							return;
						}
						const info2 = agentInfos.get(agent2);
						this.addSeparation(info1, agent2,
							sep1 + info2.labelWidth / 2
						);
					});
					this.visibleAgents.forEach((agent2) => {
						if(stage.agents.indexOf(agent2) === -1) {
							const info2 = agentInfos.get(agent2);
							this.addSeparation(info1, agent2, sep1);
							this.addSeparation(info2, agent1, sep1);
						}
					});
				});
				break;
			case 'cross':
				stage.agents.forEach((agent1) => {
					const info1 = agentInfos.get(agent1);
					const sep1 = (
						AGENT_CROSS_SIZE / 2 +
						AGENT_MARGIN
					);
					stage.agents.forEach((agent2) => {
						if(agent1 === agent2) {
							return;
						}
						this.addSeparation(info1, agent2,
							sep1 + AGENT_CROSS_SIZE / 2
						);
					});
					this.visibleAgents.forEach((agent2) => {
						if(stage.agents.indexOf(agent2) === -1) {
							const info2 = agentInfos.get(agent2);
							this.addSeparation(info1, agent2, sep1);
							this.addSeparation(info2, agent1, sep1);
						}
					});
				});
				break;
			}
			if(stage.type === 'agent begin') {
				mergeSets(this.visibleAgents, stage.agents);
			} else if(stage.type === 'agent end') {
				removeAll(this.visibleAgents, stage.agents);
			}
		}

		separationArrow(agentInfos, stage) {
			const w = (
				this.testTextWidth(this.testArrowWidth, stage.label) +
				ARROW_POINT * 2 +
				ARROW_LABEL_PADDING * 2 +
				ATTRS.AGENT_LINE['stroke-width']
			);
			const agent1 = stage.agents[0];
			const agent2 = stage.agents[1];
			this.addSeparation(agentInfos.get(agent1), agent2, w);
			this.addSeparation(agentInfos.get(agent2), agent1, w);
		}

		separationBlock(/*agentInfos, stage*/) {
			// TODO
		}

		separationNoteOver(/*agentInfos, stage*/) {
			// TODO
		}

		separationNoteLeft(/*agentInfos, stage*/) {
			// TODO
		}

		separationNoteRight(/*agentInfos, stage*/) {
			// TODO
		}

		separationNoteBetween(/*agentInfos, stage*/) {
			// TODO
		}

		checkSeparation(agentInfos, stage) {
			this.separationAction[stage.type](agentInfos, stage);
		}

		renderAgentCapBox({x, labelWidth, label}) {
			this.agentDecor.appendChild(makeSVGNode('rect', Object.assign({
				'x': x - labelWidth / 2,
				'y': this.currentY,
				'width': labelWidth,
			}, ATTRS.AGENT_BOX)));

			const name = makeSVGNode('text', Object.assign({
				'x': x - labelWidth / 2 + BOX_PADDING,
				'y': this.currentY + (
					ATTRS.AGENT_BOX.height +
					ATTRS.AGENT_BOX_LABEL['font-size'] * (2 - LINE_HEIGHT)
				) / 2,
			}, ATTRS.AGENT_BOX_LABEL));
			name.appendChild(makeText(label));
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

			this.agentDecor.appendChild(makeSVGNode('path', Object.assign({
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
			this.agentDecor.appendChild(makeSVGNode('rect', Object.assign({
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

		renderAgentBegin(agentInfos, stage) {
			let shifts = {height: 0};
			stage.agents.forEach((agent) => {
				const agentInfo = agentInfos.get(agent);
				shifts = this.renderAgentCap[stage.mode](agentInfo);
				agentInfo.latestYStart = this.currentY + shifts.lineBottom;
			});
			this.currentY += shifts.height + ACTION_MARGIN;
		}

		renderAgentEnd(agentInfos, stage) {
			let shifts = {height: 0};
			stage.agents.forEach((agent) => {
				const agentInfo = agentInfos.get(agent);
				const x = agentInfo.x;
				shifts = this.renderAgentCap[stage.mode](agentInfo);
				this.agentLines.appendChild(makeSVGNode('path', Object.assign({
					'd': (
						'M ' + x + ' ' + agentInfo.latestYStart +
						' L ' + x + ' ' + (this.currentY + shifts.lineTop)
					),
				}, ATTRS.AGENT_LINE)));
				agentInfo.latestYStart = null;
			});
			this.currentY += shifts.height + ACTION_MARGIN;
		}

		renderArrow({lineAttrs, left, right}, agentInfos, stage) {
			/* jshint -W074, -W071 */ // TODO: tidy this up
			const from = agentInfos.get(stage.agents[0]);
			const to = agentInfos.get(stage.agents[1]);

			const dy = ARROW_HEIGHT / 2;
			const dx = ARROW_POINT;
			const dir = (from.x < to.x) ? 1 : -1;
			const short = ATTRS.AGENT_LINE['stroke-width'];
			let y = this.currentY;

			if(stage.label) {
				const mask = makeSVGNode('rect', ATTRS.ARROW_LABEL_MASK);
				const label = makeSVGNode('text', ATTRS.ARROW_LABEL);
				label.appendChild(makeText(stage.label));
				const sz = ATTRS.ARROW_LABEL['font-size'];
				this.actions.appendChild(mask);
				this.actions.appendChild(label);
				y += Math.max(
					dy,
					ARROW_LABEL_MARGIN_TOP +
					sz * LINE_HEIGHT +
					ARROW_LABEL_MARGIN_BOTTOM
				);
				const w = label.getComputedTextLength();
				const x = (from.x + to.x - w) / 2;
				const yBase = (
					y -
					sz * (LINE_HEIGHT - 1) -
					ARROW_LABEL_MARGIN_BOTTOM
				);
				label.setAttribute('x', x);
				label.setAttribute('y', yBase);
				mask.setAttribute('x', x - ARROW_LABEL_MASK_PADDING);
				mask.setAttribute('y', yBase - sz);
				mask.setAttribute('width', w + ARROW_LABEL_MASK_PADDING * 2);
				mask.setAttribute('height', sz * LINE_HEIGHT);
			} else {
				y += dy;
			}

			this.actions.appendChild(makeSVGNode('path', Object.assign({
				'd': (
					'M ' + (from.x + (left ? short : 0) * dir) + ' ' + y +
					' L ' + (to.x - (right ? short : 0) * dir) + ' ' + y
				),
			}, lineAttrs)));

			if(left) {
				this.actions.appendChild(makeSVGNode('path', Object.assign({
					'd': (
						'M ' + (from.x + (dx + short) * dir) + ' ' + (y - dy) +
						' L ' + (from.x + short * dir) + ' ' + y +
						' L ' + (from.x + (dx + short) * dir) + ' ' + (y + dy) +
						(ATTRS.ARROW_HEAD.fill === 'none' ? '' : ' Z')
					),
				}, ATTRS.ARROW_HEAD)));
			}

			if(right) {
				this.actions.appendChild(makeSVGNode('path', Object.assign({
					'd': (
						'M ' + (to.x - (dx + short) * dir) + ' ' + (y - dy) +
						' L ' + (to.x - short * dir) + ' ' + y +
						' L ' + (to.x - (dx + short) * dir) + ' ' + (y + dy) +
						(ATTRS.ARROW_HEAD.fill === 'none' ? '' : ' Z')
					),
				}, ATTRS.ARROW_HEAD)));
			}

			this.currentY = y + dy + ACTION_MARGIN;
		}

		renderBlock(/*agentInfos, stage*/) {
			// TODO
		}

		renderNoteOver(/*agentInfos, stage*/) {
			// TODO
		}

		renderNoteLeft(/*agentInfos, stage*/) {
			// TODO
		}

		renderNoteRight(/*agentInfos, stage*/) {
			// TODO
		}

		renderNoteBetween(/*agentInfos, stage*/) {
			// TODO
		}

		addAction(agentInfos, stage) {
			this.renderAction[stage.type](agentInfos, stage);
		}

		makeTextTester(attrs) {
			const text = makeText();
			const node = makeSVGNode('text', attrs);
			node.appendChild(text);
			this.agentDecor.appendChild(node);
			return {text, node};
		}

		testTextWidth(tester, text) {
			tester.text.nodeValue = text;
			return tester.node.getComputedTextLength();
		}

		removeTextTester(tester) {
			this.agentDecor.removeChild(tester.node);
		}

		buildAgentInfos(agents, stages) {
			const testNameWidth = this.makeTextTester(ATTRS.AGENT_BOX_LABEL);

			const agentInfos = new Map();
			agents.forEach((agent) => {
				agentInfos.set(agent, {
					label: agent,
					labelWidth: (
						this.testTextWidth(testNameWidth, agent) +
						BOX_PADDING * 2
					),
					x: null,
					latestYStart: null,
					separations: new Map(),
				});
			});
			agentInfos.get('[').labelWidth = 0;
			agentInfos.get(']').labelWidth = 0;

			this.removeTextTester(testNameWidth);

			this.testArrowWidth = this.makeTextTester(ATTRS.ARROW_LABEL);
			this.visibleAgents = ['[', ']'];
			traverse(stages, this.checkSeparation.bind(this, agentInfos));
			this.removeTextTester(this.testArrowWidth);

			let currentX = 0;
			agents.forEach((agent) => {
				const agentInfo = agentInfos.get(agent);
				agentInfo.separations.forEach((dist, otherAgent) => {
					const otherAgentInfo = agentInfos.get(otherAgent);
					if(otherAgentInfo.x !== null) {
						currentX = Math.max(currentX, otherAgentInfo.x + dist);
					}
				});
				agentInfo.x = currentX;
			});

			return {agentInfos, minX: 0, maxX: currentX};
		}

		updateBounds(stagesHeight) {
			const titleWidth = this.title.getComputedTextLength();
			const stagesWidth = (this.maxX - this.minX);

			const width = Math.ceil(
				Math.max(stagesWidth, titleWidth) +
				OUTER_MARGIN * 2
			);
			const height = Math.ceil(
				ATTRS.TITLE['font-size'] * LINE_HEIGHT +
				TITLE_MARGIN +
				stagesHeight +
				OUTER_MARGIN * 2
			);

			this.diagram.setAttribute('transform',
				'translate(' + ((width - stagesWidth) / 2 - this.minX) + ',' + (
					OUTER_MARGIN +
					ATTRS.TITLE['font-size'] * LINE_HEIGHT +
					TITLE_MARGIN
				) + ')'
			);

			this.title.setAttribute('x', (width - titleWidth) / 2);
			this.base.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
			this.width = width;
			this.height = height;
		}

		render({meta, agents, stages}) {
			empty(this.agentLines);
			empty(this.agentDecor);
			empty(this.actions);

			this.titleText.nodeValue = meta.title || '';

			const info = this.buildAgentInfos(agents, stages);

			this.minX = info.minX;
			this.maxX = info.maxX;
			this.currentY = 0;

			traverse(stages, this.addAction.bind(this, info.agentInfos));

			this.updateBounds(Math.max(this.currentY - ACTION_MARGIN, 0));
		}

		svg() {
			return this.base;
		}
	};
});
