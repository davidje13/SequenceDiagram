define(['core/ArrayUtilities'], (array) => {
	'use strict';

	class AgentState {
		constructor(visible, locked = false) {
			this.visible = visible;
			this.locked = locked;
		}
	}

	const LOCKED_AGENT = new AgentState(false, true);
	const DEFAULT_AGENT = new AgentState(false);

	const NOTE_DEFAULT_AGENTS = {
		'note over': [{name: '['}, {name: ']'}],
		'note left': [{name: '['}],
		'note right': [{name: ']'}],
	};

	return class Generator {
		constructor() {
			this.agentStates = new Map();
			this.agents = [];
			this.blockCount = 0;
			this.nesting = [];
			this.markers = new Set();
			this.currentSection = null;
			this.currentNest = null;

			this.stageHandlers = {
				'mark': this.handleMark.bind(this),
				'async': this.handleAsync.bind(this),
				'note over': this.handleNote.bind(this),
				'note left': this.handleNote.bind(this),
				'note right': this.handleNote.bind(this),
				'agent define': this.handleAgentDefine.bind(this),
				'agent begin': this.handleAgentBegin.bind(this),
				'agent end': this.handleAgentEnd.bind(this),
				'block begin': this.handleBlockBegin.bind(this),
				'block split': this.handleBlockSplit.bind(this),
				'block end': this.handleBlockEnd.bind(this),
			};
			this.handleStage = this.handleStage.bind(this);
		}

		addBounds(target, agentL, agentR, involvedAgents = null) {
			array.remove(target, agentL);
			array.remove(target, agentR);

			let indexL = 0;
			let indexR = target.length;
			if(involvedAgents) {
				const found = (involvedAgents
					.map((agent) => target.indexOf(agent))
					.filter((p) => (p !== -1))
				);
				indexL = found.reduce((a, b) => Math.min(a, b), target.length);
				indexR = found.reduce((a, b) => Math.max(a, b), indexL) + 1;
			}

			target.splice(indexL, 0, agentL);
			target.splice(indexR + 1, 0, agentR);
		}

		setAgentVis(agents, visible, mode, checked = false) {
			const filteredAgents = agents.filter((agent) => {
				const state = this.agentStates.get(agent) || DEFAULT_AGENT;
				if(state.locked) {
					if(checked) {
						throw new Error('Cannot modify agent ' + agent);
					} else {
						return false;
					}
				}
				return state.visible !== visible;
			});
			if(filteredAgents.length === 0) {
				return;
			}
			filteredAgents.forEach((agent) => {
				const state = this.agentStates.get(agent);
				if(state) {
					state.visible = visible;
				} else {
					this.agentStates.set(agent, new AgentState(visible));
				}
			});
			const type = (visible ? 'agent begin' : 'agent end');
			const existing = array.last(this.currentSection.stages) || {};
			if(existing.type === type && existing.mode === mode) {
				array.mergeSets(existing.agents, filteredAgents);
			} else {
				this.currentSection.stages.push({
					type,
					agents: filteredAgents,
					mode,
				});
				this.currentNest.hasContent = true;
			}
			array.mergeSets(this.currentNest.agents, filteredAgents);
			array.mergeSets(this.agents, filteredAgents);
		}

		beginNested(mode, label, name) {
			const nameL = name + '[';
			const nameR = name + ']';
			const agents = [nameL, nameR];
			const stages = [];
			this.currentSection = {
				mode,
				label,
				stages,
			};
			this.currentNest = {
				agents,
				hasContent: false,
				stage: {
					type: 'block',
					sections: [this.currentSection],
					left: nameL,
					right: nameR,
				},
			};
			this.agentStates.set(nameL, LOCKED_AGENT);
			this.agentStates.set(nameR, LOCKED_AGENT);
			this.nesting.push(this.currentNest);

			return {agents, stages};
		}

		handleMark(stage) {
			this.markers.add(stage.name);
			this.currentSection.stages.push(stage);
		}

		handleAsync(stage) {
			if(stage.target !== '' && !this.markers.has(stage.target)) {
				throw new Error('Unknown marker: ' + stage.target);
			}
			this.currentSection.stages.push(stage);
		}

		handleNote(stage) {
			if(stage.agents.length === 0) {
				this.handleUnknownStage(Object.assign({}, stage, {
					agents: NOTE_DEFAULT_AGENTS[stage.type] || [],
				}));
			} else {
				this.handleUnknownStage(stage);
			}
		}

		handleAgentDefine({agents}) {
			const agentNames = agents.map((agent) => agent.name);
			array.mergeSets(this.currentNest.agents, agentNames);
			array.mergeSets(this.agents, agentNames);
		}

		handleAgentBegin({agents, mode}) {
			const agentNames = agents.map((agent) => agent.name);
			this.setAgentVis(agentNames, true, mode, true);
		}

		handleAgentEnd({agents, mode}) {
			const agentNames = agents.map((agent) => agent.name);
			this.setAgentVis(agentNames, false, mode, true);
		}

		handleBlockBegin({mode, label}) {
			const name = '__BLOCK' + this.blockCount;
			this.beginNested(mode, label, name);
			++ this.blockCount;
		}

		handleBlockSplit({mode, label}) {
			if(this.currentNest.stage.sections[0].mode !== 'if') {
				throw new Error('Invalid block nesting');
			}
			this.currentSection = {
				mode,
				label,
				stages: [],
			};
			this.currentNest.stage.sections.push(this.currentSection);
		}

		handleBlockEnd() {
			if(this.nesting.length <= 1) {
				throw new Error('Invalid block nesting');
			}
			const {hasContent, stage, agents} = this.nesting.pop();
			this.currentNest = array.last(this.nesting);
			this.currentSection = array.last(this.currentNest.stage.sections);
			if(hasContent) {
				array.mergeSets(this.currentNest.agents, agents);
				array.mergeSets(this.agents, agents);
				this.addBounds(
					this.agents,
					stage.left,
					stage.right,
					agents
				);
				this.currentSection.stages.push(stage);
				this.currentNest.hasContent = true;
			}
		}

		handleUnknownStage(stage) {
			if(stage.agents) {
				const agentNames = stage.agents.map((agent) => agent.name);
				this.setAgentVis(agentNames, true, 'box');
				array.mergeSets(this.currentNest.agents, agentNames);
				array.mergeSets(this.agents, agentNames);
				this.currentSection.stages.push(Object.assign({}, stage, {
					agents: agentNames,
				}));
			} else {
				this.currentSection.stages.push(stage);
			}
			this.currentNest.hasContent = true;
		}

		handleStage(stage) {
			const handler = this.stageHandlers[stage.type];
			if(handler) {
				handler(stage);
			} else {
				this.handleUnknownStage(stage);
			}
		}

		generate({stages, meta = {}}) {
			this.agentStates.clear();
			this.markers.clear();
			this.agents.length = 0;
			this.blockCount = 0;
			this.nesting.length = 0;
			const globals = this.beginNested('global', '', '');

			stages.forEach(this.handleStage);

			if(this.nesting.length !== 1) {
				throw new Error('Invalid block nesting');
			}

			this.setAgentVis(this.agents, false, meta.terminators || 'none');

			this.addBounds(
				this.agents,
				this.currentNest.stage.left,
				this.currentNest.stage.right
			);

			return {
				meta: {
					title: meta.title,
				},
				agents: this.agents.slice(),
				stages: globals.stages,
			};
		}
	};
});

