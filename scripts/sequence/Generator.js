define(() => {
	'use strict';

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

	function removeElement(list, item) {
		const p = list.indexOf(item);
		if(p !== -1) {
			list.splice(p, 1);
		}
	}

	function lastElement(list) {
		return list[list.length - 1];
	}

	class AgentState {
		constructor(visible, locked = false) {
			this.visible = visible;
			this.locked = locked;
		}
	}

	const LOCKED_AGENT = new AgentState(false, true);
	const DEFAULT_AGENT = new AgentState(false);

	return class Generator {
		constructor() {
			this.agentStates = new Map();
			this.agents = [];
			this.blockCount = 0;
			this.nesting = [];
			this.currentSection = null;
			this.currentNest = null;

			this.stageHandlers = {
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
			removeElement(target, agentL);
			removeElement(target, agentR);

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
			const existing = lastElement(this.currentSection.stages) || {};
			if(existing.type === type && existing.mode === mode) {
				mergeSets(existing.agents, filteredAgents);
			} else {
				this.currentSection.stages.push({
					type,
					agents: filteredAgents,
					mode,
				});
			}
			mergeSets(this.currentNest.agents, filteredAgents);
			mergeSets(this.agents, filteredAgents);
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

		handleAgentDefine({agents}) {
			mergeSets(this.currentNest.agents, agents);
			mergeSets(this.agents, agents);
		}

		handleAgentBegin({agents, mode}) {
			this.setAgentVis(agents, true, mode, true);
		}

		handleAgentEnd({agents, mode}) {
			this.setAgentVis(agents, false, mode, true);
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
			const {stage, agents} = this.nesting.pop();
			this.currentNest = lastElement(this.nesting);
			this.currentSection = lastElement(this.currentNest.stage.sections);
			if(stage.sections.some((section) => section.stages.length > 0)) {
				mergeSets(this.currentNest.agents, agents);
				mergeSets(this.agents, agents);
				this.addBounds(
					this.agents,
					stage.left,
					stage.right,
					agents
				);
				this.currentSection.stages.push(stage);
			}
		}

		handleUnknownStage(stage) {
			this.setAgentVis(stage.agents, true, 'box');
			this.currentSection.stages.push(stage);
			mergeSets(this.currentNest.agents, stage.agents);
			mergeSets(this.agents, stage.agents);
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
				agents: this.agents,
				stages: globals.stages,
			};
		}
	};
});

