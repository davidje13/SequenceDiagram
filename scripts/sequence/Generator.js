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

	function lastElement(list) {
		return list[list.length - 1];
	}

	return class Generator {
		constructor() {
			this.agentStates = new Map();
			this.blockCount = 0;
			this.nesting = [];

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
			const oldL = target.indexOf(agentL);
			if(oldL !== -1) {
				target.splice(oldL, 1);
			}
			const oldR = target.indexOf(agentR);
			if(oldR !== -1) {
				target.splice(oldR, 1);
			}

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

		addAgentMod(stageAgents, markVisible, mode) {
			if(stageAgents.length === 0) {
				return;
			}
			stageAgents.forEach((agent) => {
				const state = this.agentStates.get(agent);
				if(state) {
					state.visible = markVisible;
				} else {
					this.agentStates.set(agent, {
						visible: markVisible,
						locked: false,
					});
				}
			});
			const type = (markVisible ? 'agent begin' : 'agent end');
			const existing = lastElement(this.currentSection.stages) || {};
			if(existing.type === type && existing.mode === mode) {
				mergeSets(existing.agents, stageAgents);
				mergeSets(this.currentNest.agents, stageAgents);
			} else {
				this.addStage({
					type,
					agents: stageAgents,
					mode,
				});
			}
		}

		filterVis(stageAgents, visible, implicit = false) {
			return stageAgents.filter((agent) => {
				const state = this.agentStates.get(agent);
				if(!state) {
					return !visible;
				} else if(!state.locked) {
					return state.visible === visible;
				} else if(!implicit) {
					throw new Error('Cannot modify agent ' + agent);
				} else {
					return false;
				}
			});
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
			this.agentStates.set(name + '[', {visible: false, locked: true});
			this.agentStates.set(name + ']', {visible: false, locked: true});
			this.nesting.push(this.currentNest);

			return {agents, stages};
		}

		handleAgentDefine() {
		}

		handleAgentBegin({agents, mode}) {
			this.addAgentMod(this.filterVis(agents, false), true, mode);
		}

		handleAgentEnd({agents, mode}) {
			this.addAgentMod(this.filterVis(agents, true), false, mode);
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
			this.addAgentMod(
				this.filterVis(stage.agents, false, true),
				true,
				'box'
			);
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

			this.addAgentMod(
				this.filterVis(globals.agents, true, true),
				false,
				meta.terminators || 'none'
			);

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

