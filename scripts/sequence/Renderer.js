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

	const SEP_ZERO = {left: 0, right: 0};

	const NS = 'http://www.w3.org/2000/svg';

	const LINE_HEIGHT = 1.3;
	const TITLE_MARGIN = 10;
	const OUTER_MARGIN = 5;
	const BOX_PADDING = 10;
	const AGENT_MARGIN = 10;
	const AGENT_CROSS_SIZE = 20;
	const AGENT_NONE_HEIGHT = 10;
	const ACTION_MARGIN = 5;
	const CONNECT_HEIGHT = 8;
	const CONNECT_POINT = 4;
	const CONNECT_LABEL_PADDING = 6;
	const CONNECT_LABEL_MASK_PADDING = 3;
	const CONNECT_LABEL_MARGIN_TOP = 2;
	const CONNECT_LABEL_MARGIN_BOTTOM = 1;

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

		CONNECT_LINE_SOLID: {
			'fill': 'none',
			'stroke': '#000000',
			'stroke-width': 1,
		},
		CONNECT_LINE_DASH: {
			'fill': 'none',
			'stroke': '#000000',
			'stroke-width': 1,
			'stroke-dasharray': '2, 2',
		},
		CONNECT_LABEL: {
			'font-family': 'sans-serif',
			'font-size': 8,
			'text-anchor': 'middle',
		},
		CONNECT_LABEL_MASK: {
			'fill': '#FFFFFF',
		},
		CONNECT_HEAD: {
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
				'block': this.separationBlock.bind(this),
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
				'block': this.renderBlock.bind(this),
				'note over': this.renderNoteOver.bind(this),
				'note left': this.renderNoteLeft.bind(this),
				'note right': this.renderNoteRight.bind(this),
				'note between': this.renderNoteBetween.bind(this),
			};

			this.width = 0;
			this.height = 0;
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
			agents.forEach((agent1) => {
				const info1 = this.agentInfos.get(agent1);
				const sep1 = agentSpaces.get(agent1) || SEP_ZERO;
				agents.forEach((agent2) => {
					const info2 = this.agentInfos.get(agent2);
					if(info2.index >= info1.index) {
						return;
					}
					const sep2 = agentSpaces.get(agent2) || SEP_ZERO;
					this.addSeparation(
						agent1,
						agent2,
						sep1.right + sep2.left + AGENT_MARGIN
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
				mergeSets(this.visibleAgents, agents);
			}

			const agentSpaces = new Map();
			agents.forEach((agent) => {
				const info = this.agentInfos.get(agent);
				const separationFn = this.separationAgentCap[mode];
				agentSpaces.set(agent, separationFn(info));
			});
			this.addSeparations(this.visibleAgents, agentSpaces);

			if(type === 'agent end') {
				removeAll(this.visibleAgents, agents);
			}
		}

		separationConnection({agents, label}) {
			this.addSeparation(
				agents[0],
				agents[1],

				this.testTextWidth(this.testConnectWidth, label) +
				CONNECT_POINT * 2 +
				CONNECT_LABEL_PADDING * 2 +
				ATTRS.AGENT_LINE['stroke-width']
			);
		}

		separationBlock(/*stage*/) {
			// TODO
		}

		separationNoteOver(/*stage*/) {
			// TODO
		}

		separationNoteLeft(/*stage*/) {
			// TODO
		}

		separationNoteRight(/*stage*/) {
			// TODO
		}

		separationNoteBetween(/*stage*/) {
			// TODO
		}

		checkSeparation(stage) {
			this.separationAction[stage.type](stage);
		}

		renderAgentCapBox({x, labelWidth, label}) {
			this.agentDecor.appendChild(makeSVGNode('rect', Object.assign({
				'x': x - labelWidth / 2,
				'y': this.currentY,
				'width': labelWidth,
			}, ATTRS.AGENT_BOX)));

			const name = makeSVGNode('text', Object.assign({
				'x': x,
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
				this.agentLines.appendChild(makeSVGNode('path', Object.assign({
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

			const dy = CONNECT_HEIGHT / 2;
			const dx = CONNECT_POINT;
			const dir = (from.x < to.x) ? 1 : -1;
			const short = ATTRS.AGENT_LINE['stroke-width'];
			let y = this.currentY;

			const lineAttrs = {
				'solid': ATTRS.CONNECT_LINE_SOLID,
				'dash': ATTRS.CONNECT_LINE_DASH,
			};

			if(label) {
				const mask = makeSVGNode('rect', ATTRS.CONNECT_LABEL_MASK);
				const labelNode = makeSVGNode('text', ATTRS.CONNECT_LABEL);
				labelNode.appendChild(makeText(label));
				const sz = ATTRS.CONNECT_LABEL['font-size'];
				this.actions.appendChild(mask);
				this.actions.appendChild(labelNode);
				y += Math.max(
					dy,
					CONNECT_LABEL_MARGIN_TOP +
					sz * LINE_HEIGHT +
					CONNECT_LABEL_MARGIN_BOTTOM
				);
				const w = labelNode.getComputedTextLength();
				const x = (from.x + to.x) / 2;
				const yBase = (
					y -
					sz * (LINE_HEIGHT - 1) -
					CONNECT_LABEL_MARGIN_BOTTOM
				);
				labelNode.setAttribute('x', x);
				labelNode.setAttribute('y', yBase);
				mask.setAttribute('x', x - w / 2 - CONNECT_LABEL_MASK_PADDING);
				mask.setAttribute('y', yBase - sz);
				mask.setAttribute('width', w + CONNECT_LABEL_MASK_PADDING * 2);
				mask.setAttribute('height', sz * LINE_HEIGHT);
			} else {
				y += dy;
			}

			this.actions.appendChild(makeSVGNode('path', Object.assign({
				'd': (
					'M ' + (from.x + (left ? short : 0) * dir) + ' ' + y +
					' L ' + (to.x - (right ? short : 0) * dir) + ' ' + y
				),
			}, lineAttrs[line])));

			if(left) {
				this.actions.appendChild(makeSVGNode('path', Object.assign({
					'd': (
						'M ' + (from.x + (dx + short) * dir) + ' ' + (y - dy) +
						' L ' + (from.x + short * dir) + ' ' + y +
						' L ' + (from.x + (dx + short) * dir) + ' ' + (y + dy) +
						(ATTRS.CONNECT_HEAD.fill === 'none' ? '' : ' Z')
					),
				}, ATTRS.CONNECT_HEAD)));
			}

			if(right) {
				this.actions.appendChild(makeSVGNode('path', Object.assign({
					'd': (
						'M ' + (to.x - (dx + short) * dir) + ' ' + (y - dy) +
						' L ' + (to.x - short * dir) + ' ' + y +
						' L ' + (to.x - (dx + short) * dir) + ' ' + (y + dy) +
						(ATTRS.CONNECT_HEAD.fill === 'none' ? '' : ' Z')
					),
				}, ATTRS.CONNECT_HEAD)));
			}

			this.currentY = y + dy + ACTION_MARGIN;
		}

		renderBlock(/*stage*/) {
			// TODO
		}

		renderNoteOver(/*stage*/) {
			// TODO
		}

		renderNoteLeft(/*stage*/) {
			// TODO
		}

		renderNoteRight(/*stage*/) {
			// TODO
		}

		renderNoteBetween(/*stage*/) {
			// TODO
		}

		addAction(stage) {
			this.renderAction[stage.type](stage);
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

			this.agentInfos = new Map();
			agents.forEach((agent, index) => {
				this.agentInfos.set(agent, {
					label: agent,
					labelWidth: (
						this.testTextWidth(testNameWidth, agent) +
						BOX_PADDING * 2
					),
					index,
					x: null,
					latestYStart: null,
					separations: new Map(),
				});
			});
			this.agentInfos.get('[').labelWidth = 0;
			this.agentInfos.get(']').labelWidth = 0;

			this.removeTextTester(testNameWidth);

			this.testConnectWidth = this.makeTextTester(ATTRS.CONNECT_LABEL);
			this.visibleAgents = ['[', ']'];
			traverse(stages, this.checkSeparation.bind(this));
			this.removeTextTester(this.testConnectWidth);

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

			this.title.setAttribute('x', width / 2);
			this.base.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
			this.width = width;
			this.height = height;
		}

		render({meta, agents, stages}) {
			empty(this.agentLines);
			empty(this.agentDecor);
			empty(this.actions);

			this.titleText.nodeValue = meta.title || '';

			this.minX = 0;
			this.maxX = 0;
			this.buildAgentInfos(agents, stages);

			this.currentY = 0;
			traverse(stages, this.addAction.bind(this));

			this.updateBounds(Math.max(this.currentY - ACTION_MARGIN, 0));
		}

		getColumnX(name) {
			return this.agentInfos.get(name).x;
		}

		svg() {
			return this.base;
		}
	};
});
