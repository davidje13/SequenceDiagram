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
		findAgents(stages) {
			const agents = ['['];
			stages.forEach((stage) => {
				if(stage.agents) {
					mergeSets(agents, stage.agents);
				}
			});

			if(agents.indexOf(']') !== -1) {
				agents.splice(agents.indexOf(']'), 1);
			}
			agents.push(']');

			return agents;
		}

		generate({meta = {}, stages}) {
			const agents = this.findAgents(stages);

			const agentStates = new Map();
			agents.forEach((agent) => {
				agentStates.set(agent, {visible: false, locked: false});
			});
			agentStates.get('[').locked = true;
			agentStates.get(']').locked = true;

			const rootStages = [];
			let currentSection = {
				mode: 'global',
				label: '',
				stages: rootStages,
			};
			let currentNest = {
				type: 'block',
				agents: [],
				root: true,
				sections: [currentSection],
			};
			const nesting = [currentNest];

			function beginNested(stage) {
				currentSection = {
					mode: stage.mode,
					label: stage.label,
					stages: [],
				};
				currentNest = {
					type: 'block',
					agents: [],
					sections: [currentSection],
				};
				nesting.push(currentNest);
			}

			function splitNested(stage) {
				if(currentNest.sections[0].mode !== 'if') {
					throw new Error('Invalid block nesting');
				}
				currentSection = {
					mode: stage.mode,
					label: stage.label,
					stages: [],
				};
				currentNest.sections.push(currentSection);
			}

			function addStage(stage) {
				currentSection.stages.push(stage);
				mergeSets(currentNest.agents, stage.agents);
			}

			function endNested() {
				if(currentNest.root) {
					throw new Error('Invalid block nesting');
				}
				const subNest = nesting.pop();
				currentNest = lastElement(nesting);
				currentSection = lastElement(currentNest.sections);
				if(subNest.agents.length > 0) {
					addStage(subNest);
				}
			}

			function addAgentMod(stageAgents, markVisible, mode) {
				if(stageAgents.length === 0) {
					return;
				}
				stageAgents.forEach((agent) => {
					agentStates.get(agent).visible = markVisible;
				});
				const type = (markVisible ? 'agent begin' : 'agent end');
				const existing = lastElement(currentSection.stages) || {};
				if(existing.type === type && existing.mode === mode) {
					mergeSets(existing.agents, stageAgents);
					mergeSets(currentNest.agents, stageAgents);
				} else {
					addStage({
						type,
						agents: stageAgents,
						mode,
					});
				}
			}

			function filterVis(stageAgents, visible, implicit = false) {
				return stageAgents.filter((agent) => {
					const state = agentStates.get(agent);
					if(!state.locked) {
						return state.visible === visible;
					} else if(!implicit) {
						throw new Error('Cannot modify agent ' + agent);
					} else {
						return false;
					}
				});
			}

			stages.forEach((stage) => {
				/* jshint -W074 */ // It's only a switch statement
				switch(stage.type) {
				case 'agent define':
					break;
				case 'agent begin':
					addAgentMod(
						filterVis(stage.agents, false),
						true,
						stage.mode
					);
					break;
				case 'agent end':
					addAgentMod(
						filterVis(stage.agents, true),
						false,
						stage.mode
					);
					break;
				case 'block begin':
					beginNested(stage);
					break;
				case 'block split':
					splitNested(stage);
					break;
				case 'block end':
					endNested(stage);
					break;
				default:
					addAgentMod(
						filterVis(stage.agents, false, true),
						true,
						'box'
					);
					addStage(stage);
					break;
				}
			});

			if(nesting.length !== 1) {
				throw new Error('Invalid block nesting');
			}

			addAgentMod(
				filterVis(agents, true, true),
				false,
				meta.terminators || 'none'
			);

			return {
				meta: {
					title: meta.title,
				},
				agents,
				stages: rootStages,
			};
		}
	};
});

