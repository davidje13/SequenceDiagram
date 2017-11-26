define(['core/ArrayUtilities'], (array) => {
	'use strict';

	class AgentState {
		constructor({
			visible = false,
			locked = false,
			blocked = false,
			highlighted = false,
			group = null,
			covered = false,
		} = {}) {
			this.visible = visible;
			this.locked = locked;
			this.blocked = blocked;
			this.highlighted = highlighted;
			this.group = group;
			this.covered = covered;
		}
	}
	AgentState.LOCKED = new AgentState({locked: true});
	AgentState.DEFAULT = new AgentState();

	const Agent = {
		equals: (a, b) => {
			return a.name === b.name;
		},
		make: (name, {anchorRight = false} = {}) => {
			return {name, anchorRight};
		},
		getName: (agent) => {
			return agent.name;
		},
		hasFlag: (flag, has = true) => {
			return (agent) => (agent.flags.includes(flag) === has);
		},
	};

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

	function swapBegin(stage, mode) {
		if(stage.type === 'agent begin') {
			stage.mode = mode;
			return true;
		}
		if(stage.type === 'parallel') {
			let any = false;
			stage.stages.forEach((subStage) => {
				if(subStage.type === 'agent begin') {
					subStage.mode = mode;
					any = true;
				}
			});
			return any;
		}
		return false;
	}

	function swapFirstBegin(stages, mode) {
		for(let i = 0; i < stages.length; ++ i) {
			if(swapBegin(stages[i], mode)) {
				break;
			}
		}
	}

	function addBounds(target, agentL, agentR, involvedAgents = null) {
		array.remove(target, agentL, Agent.equals);
		array.remove(target, agentR, Agent.equals);

		let indexL = 0;
		let indexR = target.length;
		if(involvedAgents) {
			const found = (involvedAgents
				.map((agent) => array.indexOf(target, agent, Agent.equals))
				.filter((p) => (p !== -1))
			);
			indexL = found.reduce((a, b) => Math.min(a, b), target.length);
			indexR = found.reduce((a, b) => Math.max(a, b), indexL) + 1;
		}

		target.splice(indexL, 0, agentL);
		target.splice(indexR + 1, 0, agentR);

		return {indexL, indexR: indexR + 1};
	}

	const NOTE_DEFAULT_AGENTS = {
		'note over': [{name: '[', flags: []}, {name: ']', flags: []}],
		'note left': [{name: '[', flags: []}],
		'note right': [{name: ']', flags: []}],
	};

	return class Generator {
		constructor() {
			this.agentStates = new Map();
			this.agentAliases = new Map();
			this.activeGroups = new Map();
			this.agents = [];
			this.labelPattern = null;
			this.blockCount = 0;
			this.nesting = [];
			this.markers = new Set();
			this.currentSection = null;
			this.currentNest = null;

			this.stageHandlers = {
				'block begin': this.handleBlockBegin.bind(this),
				'block split': this.handleBlockSplit.bind(this),
				'block end': this.handleBlockEnd.bind(this),
				'group begin': this.handleGroupBegin.bind(this),
				'mark': this.handleMark.bind(this),
				'async': this.handleAsync.bind(this),
				'agent define': this.handleAgentDefine.bind(this),
				'agent begin': this.handleAgentBegin.bind(this),
				'agent end': this.handleAgentEnd.bind(this),
				'label pattern': this.handleLabelPattern.bind(this),
				'connect': this.handleConnect.bind(this),
				'note over': this.handleNote.bind(this),
				'note left': this.handleNote.bind(this),
				'note right': this.handleNote.bind(this),
				'note between': this.handleNote.bind(this),
			};
			this.expandGroupedAgent = this.expandGroupedAgent.bind(this);
			this.handleStage = this.handleStage.bind(this);
			this.convertAgent = this.convertAgent.bind(this);
			this.endGroup = this.endGroup.bind(this);
		}

		convertAgent({alias, name}) {
			if(alias) {
				if(this.agentAliases.has(name)) {
					throw new Error(
						'Cannot alias ' + name + '; it is already an alias'
					);
				}
				const old = this.agentAliases.get(alias);
				if(
					(old && old !== alias) ||
					this.agents.some((agent) => (agent.name === alias))
				) {
					throw new Error(
						'Cannot use ' + alias +
						' as an alias; it is already in use'
					);
				}
				this.agentAliases.set(alias, name);
			}
			return Agent.make(this.agentAliases.get(name) || name);
		}

		addStage(stage, isVisible = true) {
			if(!stage) {
				return;
			}
			if(stage.ln === undefined) {
				stage.ln = this.latestLine;
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
			viableStages.forEach((stage) => {
				if(stage.ln === undefined) {
					stage.ln = this.latestLine;
				}
			});
			return this.addStage({
				type: 'parallel',
				stages: viableStages,
			});
		}

		defineAgents(colAgents) {
			array.mergeSets(this.currentNest.agents, colAgents, Agent.equals);
			array.mergeSets(this.agents, colAgents, Agent.equals);
		}

		getAgentState(agent) {
			return this.agentStates.get(agent.name) || AgentState.DEFAULT;
		}

		updateAgentState(agent, change) {
			const state = this.agentStates.get(agent.name);
			if(state) {
				Object.assign(state, change);
			} else {
				this.agentStates.set(agent.name, new AgentState(change));
			}
		}

		validateAgents(agents, {
			allowGrouped = false,
			rejectGrouped = false,
		} = {}) {
			agents.forEach((agent) => {
				const state = this.getAgentState(agent);
				if(state.covered) {
					throw new Error(
						'Agent ' + agent.name + ' is hidden behind group'
					);
				}
				if(rejectGrouped && state.group !== null) {
					throw new Error('Agent ' + agent.name + ' is in a group');
				}
				if(state.blocked && (!allowGrouped || state.group === null)) {
					throw new Error('Duplicate agent name: ' + agent.name);
				}
				if(agent.name.startsWith('__')) {
					throw new Error(agent.name + ' is a reserved name');
				}
			});
		}

		setAgentVis(colAgents, visible, mode, checked = false) {
			const seen = new Set();
			const filteredAgents = colAgents.filter((agent) => {
				if(seen.has(agent.name)) {
					return false;
				}
				seen.add(agent.name);
				const state = this.getAgentState(agent);
				if(state.locked || state.blocked) {
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
				this.updateAgentState(agent, {visible});
			});
			this.defineAgents(filteredAgents);

			return {
				type: (visible ? 'agent begin' : 'agent end'),
				agentNames: filteredAgents.map(Agent.getName),
				mode,
			};
		}

		setAgentHighlight(colAgents, highlighted, checked = false) {
			const filteredAgents = colAgents.filter((agent) => {
				const state = this.getAgentState(agent);
				if(state.locked || state.blocked) {
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
				this.updateAgentState(agent, {highlighted});
			});

			return {
				type: 'agent highlight',
				agentNames: filteredAgents.map(Agent.getName),
				highlighted,
			};
		}

		beginNested(mode, label, name, ln) {
			const leftAgent = Agent.make(name + '[', {anchorRight: true});
			const rightAgent = Agent.make(name + ']');
			const agents = [leftAgent, rightAgent];
			const stages = [];
			this.currentSection = {
				header: {
					type: 'block begin',
					mode,
					label,
					left: leftAgent.name,
					right: rightAgent.name,
					ln,
				},
				stages,
			};
			this.currentNest = {
				mode,
				agents,
				leftAgent,
				rightAgent,
				hasContent: false,
				sections: [this.currentSection],
			};
			this.agentStates.set(leftAgent.name, AgentState.LOCKED);
			this.agentStates.set(rightAgent.name, AgentState.LOCKED);
			this.nesting.push(this.currentNest);

			return {agents, stages};
		}

		nextBlockName() {
			const name = '__BLOCK' + this.blockCount;
			++ this.blockCount;
			return name;
		}

		handleBlockBegin({ln, mode, label}) {
			this.beginNested(mode, label, this.nextBlockName(), ln);
		}

		handleBlockSplit({ln, mode, label}) {
			if(this.currentNest.mode !== 'if') {
				throw new Error(
					'Invalid block nesting ("else" inside ' +
					this.currentNest.mode + ')'
				);
			}
			optimiseStages(this.currentSection.stages);
			this.currentSection = {
				header: {
					type: 'block split',
					mode,
					label,
					left: this.currentNest.leftAgent.name,
					right: this.currentNest.rightAgent.name,
					ln,
				},
				stages: [],
			};
			this.currentNest.sections.push(this.currentSection);
		}

		handleBlockEnd() {
			if(this.nesting.length <= 1) {
				throw new Error('Invalid block nesting (too many "end"s)');
			}
			optimiseStages(this.currentSection.stages);
			const nested = this.nesting.pop();
			this.currentNest = array.last(this.nesting);
			this.currentSection = array.last(this.currentNest.sections);

			if(nested.hasContent) {
				this.defineAgents(nested.agents);
				addBounds(
					this.agents,
					nested.leftAgent,
					nested.rightAgent,
					nested.agents
				);
				nested.sections.forEach((section) => {
					this.currentSection.stages.push(section.header);
					this.currentSection.stages.push(...section.stages);
				});
				this.addStage({
					type: 'block end',
					left: nested.leftAgent.name,
					right: nested.rightAgent.name,
				});
			} else {
				throw new Error('Empty block');
			}
		}

		makeGroupDetails(agents, alias) {
			const colAgents = agents.map(this.convertAgent);
			this.validateAgents(colAgents, {rejectGrouped: true});
			if(this.agentStates.has(alias)) {
				throw new Error('Duplicate agent name: ' + alias);
			}
			const name = this.nextBlockName();
			const leftAgent = Agent.make(name + '[', {anchorRight: true});
			const rightAgent = Agent.make(name + ']');
			this.agentStates.set(leftAgent.name, AgentState.LOCKED);
			this.agentStates.set(rightAgent.name, AgentState.LOCKED);
			this.updateAgentState(
				{name: alias},
				{blocked: true, group: alias}
			);
			this.defineAgents(colAgents);
			const {indexL, indexR} = addBounds(
				this.agents,
				leftAgent,
				rightAgent,
				colAgents
			);

			const agentsCovered = [];
			const agentsContained = colAgents.slice();
			for(let i = indexL + 1; i < indexR; ++ i) {
				agentsCovered.push(this.agents[i]);
			}
			array.removeAll(agentsCovered, agentsContained, Agent.equals);

			return {
				colAgents,
				leftAgent,
				rightAgent,
				agentsContained,
				agentsCovered,
			};
		}

		handleGroupBegin({agents, mode, label, alias}) {
			const details = this.makeGroupDetails(agents, alias);

			details.agentsContained.forEach((agent) => {
				this.updateAgentState(agent, {group: alias});
			});
			details.agentsCovered.forEach((agent) => {
				this.updateAgentState(agent, {covered: true});
			});
			this.activeGroups.set(alias, details);
			this.addStage(this.setAgentVis(details.colAgents, true, 'box'));
			this.addStage({
				type: 'block begin',
				mode,
				label,
				left: details.leftAgent.name,
				right: details.rightAgent.name,
			});
		}

		endGroup({name}) {
			const details = this.activeGroups.get(name);
			if(!details) {
				return null;
			}
			this.activeGroups.delete(name);

			details.agentsContained.forEach((agent) => {
				this.updateAgentState(agent, {group: null});
			});
			details.agentsCovered.forEach((agent) => {
				this.updateAgentState(agent, {covered: false});
			});
			this.updateAgentState({name}, {group: null});

			return {
				type: 'block end',
				left: details.leftAgent.name,
				right: details.rightAgent.name,
			};
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

		handleLabelPattern({pattern}) {
			this.labelPattern = pattern.slice();
			for(let i = 0; i < this.labelPattern.length; ++ i) {
				const part = this.labelPattern[i];
				if(typeof part === 'object' && part.start !== undefined) {
					this.labelPattern[i] = Object.assign({
						current: part.start,
					}, part);
				}
			}
		}

		applyLabelPattern(label) {
			let result = '';
			const tokens = {
				'label': label,
			};
			this.labelPattern.forEach((part) => {
				if(typeof part === 'string') {
					result += part;
				} else if(part.token !== undefined) {
					result += tokens[part.token];
				} else if(part.current !== undefined) {
					result += part.current.toFixed(part.dp);
					part.current += part.inc;
				}
			});
			return result;
		}

		expandGroupedAgent(agent) {
			const group = this.getAgentState(agent).group;
			if(!group) {
				return [agent];
			}
			const details = this.activeGroups.get(group);
			return [details.leftAgent, details.rightAgent];
		}

		expandGroupedAgentConnection(agents) {
			const agents1 = this.expandGroupedAgent(agents[0]);
			const agents2 = this.expandGroupedAgent(agents[1]);
			let ind1 = array.indexOf(this.agents, agents1[0], Agent.equals);
			let ind2 = array.indexOf(this.agents, agents2[0], Agent.equals);
			if(ind1 === -1) {
				ind1 = this.agents.length;
			}
			if(ind2 === -1) {
				ind2 = this.agents.length;
			}
			if(ind1 === ind2) {
				// Self-connection
				return [array.last(agents1), array.last(agents2)];
			} else if(ind1 < ind2) {
				return [array.last(agents1), agents2[0]];
			} else {
				return [agents1[0], array.last(agents2)];
			}
		}

		filterConnectFlags(agents) {
			const beginAgents = (agents
				.filter(Agent.hasFlag('begin'))
				.map(this.convertAgent)
			);
			const endAgents = (agents
				.filter(Agent.hasFlag('end'))
				.map(this.convertAgent)
			);
			if(array.hasIntersection(beginAgents, endAgents, Agent.equals)) {
				throw new Error('Cannot set agent visibility multiple times');
			}

			const startAgents = (agents
				.filter(Agent.hasFlag('start'))
				.map(this.convertAgent)
			);
			const stopAgents = (agents
				.filter(Agent.hasFlag('stop'))
				.map(this.convertAgent)
			);
			array.mergeSets(stopAgents, endAgents);
			if(array.hasIntersection(startAgents, stopAgents, Agent.equals)) {
				throw new Error('Cannot set agent highlighting multiple times');
			}

			this.validateAgents(beginAgents);
			this.validateAgents(endAgents);
			this.validateAgents(startAgents);
			this.validateAgents(stopAgents);

			return {beginAgents, endAgents, startAgents, stopAgents};
		}

		handleConnect({agents, label, options}) {
			const flags = this.filterConnectFlags(agents);

			let colAgents = agents.map(this.convertAgent);
			this.validateAgents(colAgents, {allowGrouped: true});

			const allAgents = array.flatMap(colAgents, this.expandGroupedAgent);
			this.defineAgents(allAgents);

			colAgents = this.expandGroupedAgentConnection(colAgents);
			const agentNames = colAgents.map(Agent.getName);

			const implicitBegin = (agents
				.filter(Agent.hasFlag('begin', false))
				.map(this.convertAgent)
			);
			this.addStage(this.setAgentVis(implicitBegin, true, 'box'));

			const connectStage = {
				type: 'connect',
				agentNames,
				label: this.applyLabelPattern(label),
				options,
			};

			this.addParallelStages([
				this.setAgentVis(flags.beginAgents, true, 'box', true),
				this.setAgentHighlight(flags.startAgents, true, true),
				connectStage,
				this.setAgentHighlight(flags.stopAgents, false, true),
				this.setAgentVis(flags.endAgents, false, 'cross', true),
			]);
		}

		handleNote({type, agents, mode, label}) {
			let colAgents = null;
			if(agents.length === 0) {
				colAgents = NOTE_DEFAULT_AGENTS[type] || [];
			} else {
				colAgents = agents.map(this.convertAgent);
			}

			this.validateAgents(colAgents, {allowGrouped: true});
			colAgents = array.flatMap(colAgents, this.expandGroupedAgent);
			const agentNames = colAgents.map(Agent.getName);
			const uniqueAgents = new Set(agentNames).size;
			if(type === 'note between' && uniqueAgents < 2) {
				throw new Error('note between requires at least 2 agents');
			}

			this.addStage(this.setAgentVis(colAgents, true, 'box'));
			this.defineAgents(colAgents);

			this.addStage({
				type,
				agentNames,
				mode,
				label,
			});
		}

		handleAgentDefine({agents}) {
			const colAgents = agents.map(this.convertAgent);
			this.validateAgents(colAgents);
			this.defineAgents(colAgents);
		}

		handleAgentBegin({agents, mode}) {
			const colAgents = agents.map(this.convertAgent);
			this.validateAgents(colAgents);
			this.addStage(this.setAgentVis(colAgents, true, mode, true));
		}

		handleAgentEnd({agents, mode}) {
			const groupAgents = (agents
				.filter((agent) => this.activeGroups.has(agent.name))
			);
			const colAgents = (agents
				.filter((agent) => !this.activeGroups.has(agent.name))
				.map(this.convertAgent)
			);
			this.validateAgents(colAgents);
			this.addParallelStages([
				this.setAgentHighlight(colAgents, false),
				this.setAgentVis(colAgents, false, mode, true),
				...groupAgents.map(this.endGroup),
			]);
		}

		handleStage(stage) {
			this.latestLine = stage.ln;
			try {
				const handler = this.stageHandlers[stage.type];
				if(!handler) {
					throw new Error('Unknown command: ' + stage.type);
				}
				handler(stage);
			} catch(e) {
				if(typeof e === 'object' && e.message) {
					throw new Error(e.message + ' at line ' + (stage.ln + 1));
				}
			}
		}

		generate({stages, meta = {}}) {
			this.agentStates.clear();
			this.markers.clear();
			this.agentAliases.clear();
			this.activeGroups.clear();
			this.agents.length = 0;
			this.blockCount = 0;
			this.nesting.length = 0;
			this.labelPattern = [{token: 'label'}];
			const globals = this.beginNested('global', '', '', 0);

			stages.forEach(this.handleStage);

			if(this.nesting.length !== 1) {
				throw new Error(
					'Unterminated section at line ' +
					(this.currentSection.header.ln + 1)
				);
			}
			if(this.activeGroups.size > 0) {
				throw new Error('Unterminated group');
			}

			const terminators = meta.terminators || 'none';

			this.addParallelStages([
				this.setAgentHighlight(this.agents, false),
				this.setAgentVis(this.agents, false, terminators),
			]);

			addBounds(
				this.agents,
				this.currentNest.leftAgent,
				this.currentNest.rightAgent
			);
			optimiseStages(globals.stages);
			swapFirstBegin(globals.stages, meta.headers || 'box');

			return {
				meta: {
					title: meta.title,
					theme: meta.theme,
				},
				agents: this.agents.slice(),
				stages: globals.stages,
			};
		}
	};
});
