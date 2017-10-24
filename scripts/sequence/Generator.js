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

		addStage(stage) {
			this.currentSection.stages.push(stage);
			mergeSets(this.currentNest.agents, stage.agents);
		}

		addColumnBounds(target, agentL, agentR, involvedAgents = []) {
			removeElement(target, agentL);
			removeElement(target, agentR);

			let indexL = 0;
			let indexR = target.length;
			if(involvedAgents.length > 0) {
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
				mergeSets(this.currentNest.agents, filteredAgents);
			} else {
				this.addStage({
					type,
					agents: filteredAgents,
					mode,
				});
			}
		}

		beginNested(mode, label, name) {
			const agents = [];
			const stages = [];
			this.currentSection = {
				mode,
				label,
				stages,
			};
			this.currentNest = {
				type: 'block',
				agents,
				sections: [this.currentSection],
				leftColumn: name + '[',
				rightColumn: name + ']',
			};
			this.agentStates.set(name + '[', LOCKED_AGENT);
			this.agentStates.set(name + ']', LOCKED_AGENT);
			this.nesting.push(this.currentNest);

			return {agents, stages};
		}

		handleAgentDefine() {
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
			if(this.currentNest.sections[0].mode !== 'if') {
				throw new Error('Invalid block nesting');
			}
			this.currentSection = {
				mode,
				label,
				stages: [],
			};
			this.currentNest.sections.push(this.currentSection);
		}

		handleBlockEnd() {
			if(this.nesting.length <= 1) {
				throw new Error('Invalid block nesting');
			}
			const subNest = this.nesting.pop();
			this.currentNest = lastElement(this.nesting);
			this.currentSection = lastElement(this.currentNest.sections);
			if(subNest.agents.length > 0) {
				this.addStage(subNest);
				this.addColumnBounds(
					this.currentNest.agents,
					subNest.leftColumn,
					subNest.rightColumn,
					subNest.agents
				);
				this.addColumnBounds(
					subNest.agents,
					subNest.leftColumn,
					subNest.rightColumn
				);
			}
		}

		handleUnknownStage(stage) {
			this.setAgentVis(stage.agents, true, 'box');
			this.addStage(stage);
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
			this.blockCount = 0;
			this.nesting.length = 0;
			const globals = this.beginNested('global', '', '');

			stages.forEach(this.handleStage);

			if(this.nesting.length !== 1) {
				throw new Error('Invalid block nesting');
			}

			this.setAgentVis(globals.agents, false, meta.terminators || 'none');

			this.addColumnBounds(
				globals.agents,
				this.currentNest.leftColumn,
				this.currentNest.rightColumn
			);

			return {
				meta: {
					title: meta.title,
				},
				agents: globals.agents,
				stages: globals.stages,
			};
		}
	};
});

