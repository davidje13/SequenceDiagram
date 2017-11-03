define(['core/ArrayUtilities'], (array) => {
	'use strict';

	class AgentState {
		constructor(visible, locked = false) {
			this.visible = visible;
			this.locked = locked;
		}
	}

	function agentEqCheck(a, b) {
		return a.name === b.name;
	}

	function makeAgent(name, {anchorRight = false} = {}) {
		return {name, anchorRight};
	}

	function convertAgent(agent) {
		return makeAgent(agent.name);
	}

	function getAgentName(agent) {
		return agent.name;
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
				'agent define': this.handleAgentDefine.bind(this),
				'agent begin': this.handleAgentBegin.bind(this),
				'agent end': this.handleAgentEnd.bind(this),
				'connect': this.handleConnect.bind(this),
				'note over': this.handleNote.bind(this),
				'note left': this.handleNote.bind(this),
				'note right': this.handleNote.bind(this),
				'note between': this.handleNote.bind(this),
				'block begin': this.handleBlockBegin.bind(this),
				'block split': this.handleBlockSplit.bind(this),
				'block end': this.handleBlockEnd.bind(this),
			};
			this.handleStage = this.handleStage.bind(this);
		}

		addBounds(target, agentL, agentR, involvedAgents = null) {
			array.remove(target, agentL, agentEqCheck);
			array.remove(target, agentR, agentEqCheck);

			let indexL = 0;
			let indexR = target.length;
			if(involvedAgents) {
				const found = (involvedAgents
					.map((agent) => array.indexOf(target, agent, agentEqCheck))
					.filter((p) => (p !== -1))
				);
				indexL = found.reduce((a, b) => Math.min(a, b), target.length);
				indexR = found.reduce((a, b) => Math.max(a, b), indexL) + 1;
			}

			target.splice(indexL, 0, agentL);
			target.splice(indexR + 1, 0, agentR);
		}

		addStage(stage, isVisible = true) {
			this.currentSection.stages.push(stage);
			if(isVisible) {
				this.currentNest.hasContent = true;
			}
		}

		defineAgents(agents) {
			array.mergeSets(this.currentNest.agents, agents, agentEqCheck);
			array.mergeSets(this.agents, agents, agentEqCheck);
		}

		setAgentVis(agents, visible, mode, checked = false) {
			const filteredAgents = agents.filter((agent) => {
				const state = this.agentStates.get(agent.name) || DEFAULT_AGENT;
				if(state.locked) {
					if(checked) {
						throw new Error('Cannot begin/end agent: ' + agent);
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
				const state = this.agentStates.get(agent.name);
				if(state) {
					state.visible = visible;
				} else {
					this.agentStates.set(agent.name, new AgentState(visible));
				}
			});
			const type = (visible ? 'agent begin' : 'agent end');
			const existing = array.last(this.currentSection.stages) || {};
			const agentNames = filteredAgents.map(getAgentName);
			if(existing.type === type && existing.mode === mode) {
				array.mergeSets(existing.agentNames, agentNames);
			} else {
				this.addStage({
					type,
					agentNames,
					mode,
				});
			}
			this.defineAgents(filteredAgents);
		}

		beginNested(mode, label, name) {
			const leftAgent = makeAgent(name + '[', {anchorRight: true});
			const rightAgent = makeAgent(name + ']');
			const agents = [leftAgent, rightAgent];
			const stages = [];
			this.currentSection = {
				mode,
				label,
				stages,
			};
			this.currentNest = {
				agents,
				leftAgent,
				rightAgent,
				hasContent: false,
				stage: {
					type: 'block',
					sections: [this.currentSection],
					left: leftAgent.name,
					right: rightAgent.name,
				},
			};
			this.agentStates.set(leftAgent.name, LOCKED_AGENT);
			this.agentStates.set(rightAgent.name, LOCKED_AGENT);
			this.nesting.push(this.currentNest);

			return {agents, stages};
		}

		handleMark({name}) {
			this.markers.add(name);
			this.addStage({type: 'mark', name}, false);
		}

		handleAsync({target}) {
			if(target !== '' && !this.markers.has(target)) {
				throw new Error('Unknown marker: ' + target);
			}
			this.addStage({type: 'async', target}, false);
		}

		handleConnect({agents, label, options}) {
			const colAgents = agents.map(convertAgent);
			this.setAgentVis(colAgents, true, 'box');
			this.defineAgents(colAgents);

			this.addStage({
				type: 'connect',
				agentNames: agents.map(getAgentName),
				label,
				options,
			});
		}

		handleNote({type, agents, mode, label}) {
			let colAgents = null;
			if(agents.length === 0) {
				colAgents = NOTE_DEFAULT_AGENTS[type] || [];
			} else {
				colAgents = agents.map(convertAgent);
			}

			this.setAgentVis(colAgents, true, 'box');
			this.defineAgents(colAgents);

			this.addStage({
				type,
				agentNames: colAgents.map(getAgentName),
				mode,
				label,
			});
		}

		handleAgentDefine({agents}) {
			const colAgents = agents.map(convertAgent);
			this.defineAgents(colAgents);
		}

		handleAgentBegin({agents, mode}) {
			this.setAgentVis(agents.map(convertAgent), true, mode, true);
		}

		handleAgentEnd({agents, mode}) {
			this.setAgentVis(agents.map(convertAgent), false, mode, true);
		}

		handleBlockBegin({mode, label}) {
			const name = '__BLOCK' + this.blockCount;
			this.beginNested(mode, label, name);
			++ this.blockCount;
		}

		handleBlockSplit({mode, label}) {
			const containerMode = this.currentNest.stage.sections[0].mode;
			if(containerMode !== 'if') {
				throw new Error(
					'Invalid block nesting ("else" inside ' +
					containerMode + ')'
				);
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
				throw new Error('Invalid block nesting (too many "end"s)');
			}
			const nested = this.nesting.pop();
			this.currentNest = array.last(this.nesting);
			this.currentSection = array.last(this.currentNest.stage.sections);
			if(nested.hasContent) {
				this.defineAgents(nested.agents);
				this.addBounds(
					this.agents,
					nested.leftAgent,
					nested.rightAgent,
					nested.agents
				);
				this.addStage(nested.stage);
			}
		}

		handleStage(stage) {
			this.stageHandlers[stage.type](stage);
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
				throw new Error(
					'Invalid block nesting (' +
					(this.nesting.length - 1) + ' unclosed)'
				);
			}

			this.setAgentVis(this.agents, false, meta.terminators || 'none');

			this.addBounds(
				this.agents,
				this.currentNest.leftAgent,
				this.currentNest.rightAgent
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

