define(['core/ArrayUtilities'], (array) => {
	'use strict';

	class AgentState {
		constructor(visible, locked = false) {
			this.visible = visible;
			this.highlighted = false;
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

	function agentHasFlag(flag, has = true) {
		return (agent) => (agent.flags.includes(flag) === has);
	}

	const MERGABLE = {
		'agent begin': {
			check: ['mode'],
			merge: ['agentNames'],
			siblings: new Set(['agent highlight']),
		},
		'agent end': {
			check: ['mode'],
			merge: ['agentNames'],
			siblings: new Set(['agent highlight']),
		},
		'agent highlight': {
			check: ['highlighted'],
			merge: ['agentNames'],
			siblings: new Set(['agent begin', 'agent end']),
		},
	};

	function mergableParallel(target, copy) {
		const info = MERGABLE[target.type];
		if(!info || target.type !== copy.type) {
			return false;
		}
		if(info.check.some((c) => target[c] !== copy[c])) {
			return false;
		}
		return true;
	}

	function performMerge(target, copy) {
		const info = MERGABLE[target.type];
		info.merge.forEach((m) => {
			array.mergeSets(target[m], copy[m]);
		});
	}

	function iterateRemoval(list, fn) {
		for(let i = 0; i < list.length;) {
			const remove = fn(list[i], i);
			if(remove) {
				list.splice(i, 1);
			} else {
				++ i;
			}
		}
	}

	function performParallelMergers(stages) {
		iterateRemoval(stages, (stage, i) => {
			for(let j = 0; j < i; ++ j) {
				if(mergableParallel(stages[j], stage)) {
					performMerge(stages[j], stage);
					return true;
				}
			}
			return false;
		});
	}

	function findViableSequentialMergers(stages) {
		const mergers = new Set();
		const types = stages.map(({type}) => type);
		types.forEach((type) => {
			const info = MERGABLE[type];
			if(!info) {
				return;
			}
			if(types.every((sType) =>
				(type === sType || info.siblings.has(sType))
			)) {
				mergers.add(type);
			}
		});
		return mergers;
	}

	function performSequentialMergers(lastViable, viable, lastStages, stages) {
		iterateRemoval(stages, (stage) => {
			if(!lastViable.has(stage.type) || !viable.has(stage.type)) {
				return false;
			}
			for(let j = 0; j < lastStages.length; ++ j) {
				if(mergableParallel(lastStages[j], stage)) {
					performMerge(lastStages[j], stage);
					return true;
				}
			}
			return false;
		});
	}

	function optimiseStages(stages) {
		let lastStages = [];
		let lastViable = new Set();
		for(let i = 0; i < stages.length;) {
			const stage = stages[i];
			let subStages = null;
			if(stage.type === 'parallel') {
				subStages = stage.stages;
			} else {
				subStages = [stage];
			}

			performParallelMergers(subStages);
			const viable = findViableSequentialMergers(subStages);
			performSequentialMergers(lastViable, viable, lastStages, subStages);

			lastViable = viable;
			lastStages = subStages;

			if(subStages.length === 0) {
				stages.splice(i, 1);
			} else if(stage.type === 'parallel' && subStages.length === 1) {
				stages.splice(i, 1, subStages[0]);
				++ i;
			} else {
				++ i;
			}
		}
	}

	function addBounds(target, agentL, agentR, involvedAgents = null) {
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

	const LOCKED_AGENT = new AgentState(false, true);
	const DEFAULT_AGENT = new AgentState(false);

	const NOTE_DEFAULT_AGENTS = {
		'note over': [{name: '[', flags: []}, {name: ']', flags: []}],
		'note left': [{name: '[', flags: []}],
		'note right': [{name: ']', flags: []}],
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

		addStage(stage, isVisible = true) {
			if(!stage) {
				return;
			}
			this.currentSection.stages.push(stage);
			if(isVisible) {
				this.currentNest.hasContent = true;
			}
		}

		addParallelStages(stages) {
			const viableStages = stages.filter((stage) => Boolean(stage));
			if(viableStages.length === 0) {
				return;
			}
			if(viableStages.length === 1) {
				return this.addStage(viableStages[0]);
			}
			return this.addStage({
				type: 'parallel',
				stages: viableStages,
			});
		}

		defineAgents(agents) {
			array.mergeSets(this.currentNest.agents, agents, agentEqCheck);
			array.mergeSets(this.agents, agents, agentEqCheck);
		}

		setAgentVisRaw(agents, visible, mode, checked = false) {
			const filteredAgents = agents.filter((agent) => {
				const state = this.agentStates.get(agent.name) || DEFAULT_AGENT;
				if(state.locked) {
					if(checked) {
						throw new Error(
							'Cannot begin/end agent: ' + agent.name
						);
					} else {
						return false;
					}
				}
				return state.visible !== visible;
			});
			if(filteredAgents.length === 0) {
				return null;
			}
			filteredAgents.forEach((agent) => {
				const state = this.agentStates.get(agent.name);
				if(state) {
					state.visible = visible;
				} else {
					this.agentStates.set(agent.name, new AgentState(visible));
				}
			});
			this.defineAgents(filteredAgents);

			return {
				type: (visible ? 'agent begin' : 'agent end'),
				agentNames: filteredAgents.map(getAgentName),
				mode,
			};
		}

		setAgentVis(agents, visible, mode, checked = false) {
			return this.setAgentVisRaw(
				agents.map(convertAgent),
				visible,
				mode,
				checked
			);
		}

		setAgentHighlight(agents, highlighted, checked = false) {
			const filteredAgents = agents.filter((agent) => {
				const state = this.agentStates.get(agent.name) || DEFAULT_AGENT;
				if(state.locked) {
					if(checked) {
						throw new Error(
							'Cannot highlight agent: ' + agent.name
						);
					} else {
						return false;
					}
				}
				return state.visible && (state.highlighted !== highlighted);
			});
			if(filteredAgents.length === 0) {
				return null;
			}
			filteredAgents.forEach((agent) => {
				const state = this.agentStates.get(agent.name);
				state.highlighted = highlighted;
			});

			return {
				type: 'agent highlight',
				agentNames: filteredAgents.map(getAgentName),
				highlighted,
			};
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
			const beginAgents = agents.filter(agentHasFlag('begin'));
			const endAgents = agents.filter(agentHasFlag('end'));
			if(array.hasIntersection(beginAgents, endAgents, agentEqCheck)) {
				throw new Error('Cannot set agent visibility multiple times');
			}

			const startAgents = agents.filter(agentHasFlag('start'));
			const stopAgents = agents.filter(agentHasFlag('stop'));
			array.mergeSets(stopAgents, endAgents);
			if(array.hasIntersection(startAgents, stopAgents, agentEqCheck)) {
				throw new Error('Cannot set agent highlighting multiple times');
			}

			this.defineAgents(agents.map(convertAgent));

			const implicitBegin = agents.filter(agentHasFlag('begin', false));
			this.addStage(this.setAgentVis(implicitBegin, true, 'box'));

			const connectStage = {
				type: 'connect',
				agentNames: agents.map(getAgentName),
				label,
				options,
			};

			this.addParallelStages([
				this.setAgentVis(beginAgents, true, 'box', true),
				this.setAgentHighlight(startAgents, true, true),
				connectStage,
				this.setAgentHighlight(stopAgents, false, true),
				this.setAgentVis(endAgents, false, 'cross', true),
			]);
		}

		handleNote({type, agents, mode, label}) {
			let colAgents = null;
			if(agents.length === 0) {
				colAgents = NOTE_DEFAULT_AGENTS[type] || [];
			} else {
				colAgents = agents.map(convertAgent);
			}

			this.addStage(this.setAgentVisRaw(colAgents, true, 'box'));
			this.defineAgents(colAgents);

			this.addStage({
				type,
				agentNames: colAgents.map(getAgentName),
				mode,
				label,
			});
		}

		handleAgentDefine({agents}) {
			this.defineAgents(agents.map(convertAgent));
		}

		handleAgentBegin({agents, mode}) {
			this.addStage(this.setAgentVis(agents, true, mode, true));
		}

		handleAgentEnd({agents, mode}) {
			this.addParallelStages([
				this.setAgentHighlight(agents, false),
				this.setAgentVis(agents, false, mode, true),
			]);
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
			optimiseStages(this.currentSection.stages);
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
			optimiseStages(this.currentSection.stages);
			const nested = this.nesting.pop();
			this.currentNest = array.last(this.nesting);
			this.currentSection = array.last(this.currentNest.stage.sections);
			if(nested.hasContent) {
				this.defineAgents(nested.agents);
				addBounds(
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

			const terminators = meta.terminators || 'none';

			this.addParallelStages([
				this.setAgentHighlight(this.agents, false),
				this.setAgentVisRaw(this.agents, false, terminators),
			]);

			addBounds(
				this.agents,
				this.currentNest.leftAgent,
				this.currentNest.rightAgent
			);
			optimiseStages(globals.stages);

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
