/* eslint-disable max-lines */
/* eslint-disable sort-keys */ // Maybe later

import {
	flatMap,
	hasIntersection,
	indexOf,
	last,
	mergeSets,
	remove,
	removeAll,
} from '../../core/ArrayUtilities.mjs';

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

// Agent from Parser: {name, flags}
const PAgent = {
	equals: (a, b) => (a.name === b.name),
	hasFlag: (flag, has = true) => (pAgent) => (
		pAgent.flags.includes(flag) === has),
};

// Agent from Generator: {id, formattedLabel, anchorRight}
const GAgent = {
	addNearby: (target, reference, item, offset) => {
		const p = indexOf(target, reference, GAgent.equals);
		if(p === -1) {
			target.push(item);
		} else {
			target.splice(p + offset, 0, item);
		}
	},
	equals: (a, b) => (a.id === b.id),
	hasIntersection: (a, b) => hasIntersection(a, b, GAgent.equals),
	indexOf: (list, gAgent) => indexOf(list, gAgent, GAgent.equals),
	make: (id, {anchorRight = false, isVirtualSource = false} = {}) => ({
		anchorRight,
		id,
		isVirtualSource,
		options: [],
	}),
};

function isExpiredGroupAlias(state) {
	return state.blocked && state.group === null;
}

function isReservedAgentName(name) {
	return name.startsWith('__');
}

const NOTE_DEFAULT_G_AGENTS = {
	'note left': [GAgent.make('[')],
	'note over': [GAgent.make('['), GAgent.make(']')],
	'note right': [GAgent.make(']')],
};

const SPECIAL_AGENT_IDS = ['[', ']'];

const MERGABLE = {
	'agent begin': {
		check: ['mode'],
		merge: ['agentIDs'],
		siblings: new Set(['agent highlight']),
	},
	'agent end': {
		check: ['mode'],
		merge: ['agentIDs'],
		siblings: new Set(['agent highlight']),
	},
	'agent highlight': {
		check: ['highlighted'],
		merge: ['agentIDs'],
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
		mergeSets(target[m], copy[m]);
	});
}

function iterateRemoval(list, fn) {
	for(let i = 0; i < list.length;) {
		const rm = fn(list[i], i);
		if(rm) {
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
		if(types.every((t) => (type === t || info.siblings.has(t)))) {
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

		if(subStages.length === 0) {
			stages.splice(i, 1);
		} else {
			if(stage.type === 'parallel' && subStages.length === 1) {
				stages.splice(i, 1, subStages[0]);
			}
			lastViable = viable;
			lastStages = subStages;
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

function addBounds(allGAgents, gAgentL, gAgentR, involvedGAgents = null) {
	remove(allGAgents, gAgentL, GAgent.equals);
	remove(allGAgents, gAgentR, GAgent.equals);

	let indexL = 0;
	let indexR = allGAgents.length;
	if(involvedGAgents) {
		const found = (involvedGAgents
			.map((gAgent) => GAgent.indexOf(allGAgents, gAgent))
			.filter((p) => (p !== -1))
		);
		indexL = found.reduce((a, b) => Math.min(a, b), allGAgents.length);
		indexR = found.reduce((a, b) => Math.max(a, b), indexL) + 1;
	}

	allGAgents.splice(indexL, 0, gAgentL);
	allGAgents.splice(indexR + 1, 0, gAgentR);

	return {indexL, indexR: indexR + 1};
}

export default class Generator {
	constructor() {
		this.agentStates = new Map();
		this.agentAliases = new Map();
		this.activeGroups = new Map();
		this.gAgents = [];
		this.labelPattern = null;
		this.nextID = 0;
		this.nesting = [];
		this.markers = new Set();
		this.currentSection = null;
		this.currentNest = null;

		this.stageHandlers = {
			'agent begin': this.handleAgentBegin.bind(this),
			'agent define': this.handleAgentDefine.bind(this),
			'agent end': this.handleAgentEnd.bind(this),
			'agent options': this.handleAgentOptions.bind(this),
			'async': this.handleAsync.bind(this),
			'block begin': this.handleBlockBegin.bind(this),
			'block end': this.handleBlockEnd.bind(this),
			'block split': this.handleBlockSplit.bind(this),
			'connect': this.handleConnect.bind(this),
			'connect-delay-begin': this.handleConnectDelayBegin.bind(this),
			'connect-delay-end': this.handleConnectDelayEnd.bind(this),
			'divider': this.handleDivider.bind(this),
			'group begin': this.handleGroupBegin.bind(this),
			'label pattern': this.handleLabelPattern.bind(this),
			'mark': this.handleMark.bind(this),
			'note between': this.handleNote.bind(this),
			'note left': this.handleNote.bind(this),
			'note over': this.handleNote.bind(this),
			'note right': this.handleNote.bind(this),
		};
		this.expandGroupedGAgent = this.expandGroupedGAgent.bind(this);
		this.handleStage = this.handleStage.bind(this);
		this.toGAgent = this.toGAgent.bind(this);
		this.endGroup = this.endGroup.bind(this);
	}

	_aliasInUse(alias) {
		const old = this.agentAliases.get(alias);
		if(old && old !== alias) {
			return true;
		}
		return this.gAgents.some((gAgent) => (gAgent.id === alias));
	}

	toGAgent({name, alias, flags}) {
		if(alias) {
			if(this.agentAliases.has(name)) {
				throw new Error(
					'Cannot alias ' + name + '; it is already an alias'
				);
			}
			if(this._aliasInUse(alias)) {
				throw new Error(
					'Cannot use ' + alias +
					' as an alias; it is already in use'
				);
			}
			this.agentAliases.set(alias, name);
		}
		return GAgent.make(this.agentAliases.get(name) || name, {
			isVirtualSource: flags.includes('source'),
		});
	}

	addStage(stage, isVisible = true) {
		if(!stage) {
			return;
		}
		if(typeof stage.ln === 'undefined') {
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
			this.addStage(viableStages[0]);
			return;
		}
		viableStages.forEach((stage) => {
			if(typeof stage.ln === 'undefined') {
				stage.ln = this.latestLine;
			}
		});
		this.addStage({
			stages: viableStages,
			type: 'parallel',
		});
	}

	defineGAgents(gAgents) {
		mergeSets(
			this.currentNest.gAgents,
			gAgents.filter((gAgent) => !SPECIAL_AGENT_IDS.includes(gAgent.id)),
			GAgent.equals
		);
		mergeSets(this.gAgents, gAgents, GAgent.equals);
	}

	getGAgentState(gAgent) {
		return this.agentStates.get(gAgent.id) || AgentState.DEFAULT;
	}

	updateGAgentState(gAgent, change) {
		const state = this.agentStates.get(gAgent.id);
		if(state) {
			Object.assign(state, change);
		} else {
			this.agentStates.set(gAgent.id, new AgentState(change));
		}
	}

	replaceGAgentState(gAgent, state) {
		this.agentStates.set(gAgent.id, state);
	}

	validateGAgents(gAgents, {
		allowGrouped = false,
		allowCovered = false,
		allowVirtual = false,
	} = {}) {
		/* eslint-disable complexity */ // The checks are quite simple
		gAgents.forEach((gAgent) => {
			/* eslint-enable complexity */
			const state = this.getGAgentState(gAgent);
			const name = gAgent.id;

			if(isExpiredGroupAlias(state)) {
				// Used to be a group alias; can never be reused
				throw new Error('Duplicate agent name: ' + name);
			}
			if(!allowCovered && state.covered) {
				throw new Error('Agent ' + name + ' is hidden behind group');
			}
			if(!allowGrouped && state.group !== null) {
				throw new Error('Agent ' + name + ' is in a group');
			}
			if(!allowVirtual && gAgent.isVirtualSource) {
				throw new Error('Cannot use message source here');
			}
			if(isReservedAgentName(name)) {
				throw new Error(name + ' is a reserved name');
			}
		});
	}

	setGAgentVis(gAgents, visible, mode, checked = false) {
		const seen = new Set();
		const filteredGAgents = gAgents.filter((gAgent) => {
			if(seen.has(gAgent.id)) {
				return false;
			}
			seen.add(gAgent.id);
			const state = this.getGAgentState(gAgent);
			if(state.locked || state.blocked) {
				if(checked) {
					throw new Error('Cannot begin/end agent: ' + gAgent.id);
				} else {
					return false;
				}
			}
			return state.visible !== visible;
		});
		if(filteredGAgents.length === 0) {
			return null;
		}
		filteredGAgents.forEach((gAgent) => {
			this.updateGAgentState(gAgent, {visible});
		});
		this.defineGAgents(filteredGAgents);

		return {
			agentIDs: filteredGAgents.map((gAgent) => gAgent.id),
			mode,
			type: (visible ? 'agent begin' : 'agent end'),
		};
	}

	setGAgentHighlight(gAgents, highlighted, checked = false) {
		const filteredGAgents = gAgents.filter((gAgent) => {
			const state = this.getGAgentState(gAgent);
			if(state.locked || state.blocked) {
				if(checked) {
					throw new Error('Cannot highlight agent: ' + gAgent.id);
				} else {
					return false;
				}
			}
			return state.visible && (state.highlighted !== highlighted);
		});
		if(filteredGAgents.length === 0) {
			return null;
		}
		filteredGAgents.forEach((gAgent) => {
			this.updateGAgentState(gAgent, {highlighted});
		});

		return {
			agentIDs: filteredGAgents.map((gAgent) => gAgent.id),
			highlighted,
			type: 'agent highlight',
		};
	}

	_makeSection(header, stages) {
		return {
			delayedConnections: new Map(),
			header,
			stages,
		};
	}

	_checkSectionEnd() {
		const dcs = this.currentSection.delayedConnections;
		if(dcs.size > 0) {
			const dc = dcs.values().next().value;
			throw new Error(
				'Unused delayed connection "' + dc.tag +
				'" at line ' + (dc.ln + 1)
			);
		}
	}

	beginNested(blockType, {tag, label, name, ln}) {
		const leftGAgent = GAgent.make(name + '[', {anchorRight: true});
		const rightGAgent = GAgent.make(name + ']');
		const gAgents = [leftGAgent, rightGAgent];
		const stages = [];
		this.currentSection = this._makeSection({
			blockType,
			canHide: true,
			label: this.textFormatter(label),
			left: leftGAgent.id,
			ln,
			right: rightGAgent.id,
			tag: this.textFormatter(tag),
			type: 'block begin',
		}, stages);
		this.currentNest = {
			blockType,
			gAgents,
			hasContent: false,
			leftGAgent,
			rightGAgent,
			sections: [this.currentSection],
		};
		this.replaceGAgentState(leftGAgent, AgentState.LOCKED);
		this.replaceGAgentState(rightGAgent, AgentState.LOCKED);
		this.nesting.push(this.currentNest);

		return {stages};
	}

	nextBlockName() {
		const name = '__BLOCK' + this.nextID;
		++ this.nextID;
		return name;
	}

	nextVirtualAgentName() {
		const name = '__' + this.nextID;
		++ this.nextID;
		return name;
	}

	handleBlockBegin({ln, blockType, tag, label}) {
		this.beginNested(blockType, {
			label,
			ln,
			name: this.nextBlockName(),
			tag,
		});
	}

	handleBlockSplit({ln, blockType, tag, label}) {
		if(this.currentNest.blockType !== 'if') {
			throw new Error(
				'Invalid block nesting ("else" inside ' +
				this.currentNest.blockType + ')'
			);
		}
		this._checkSectionEnd();
		this.currentSection = this._makeSection({
			blockType,
			label: this.textFormatter(label),
			left: this.currentNest.leftGAgent.id,
			ln,
			right: this.currentNest.rightGAgent.id,
			tag: this.textFormatter(tag),
			type: 'block split',
		}, []);
		this.currentNest.sections.push(this.currentSection);
	}

	handleBlockEnd() {
		if(this.nesting.length <= 1) {
			throw new Error('Invalid block nesting (too many "end"s)');
		}
		this._checkSectionEnd();
		const nested = this.nesting.pop();
		this.currentNest = last(this.nesting);
		this.currentSection = last(this.currentNest.sections);

		if(nested.hasContent) {
			this.defineGAgents(nested.gAgents);
			addBounds(
				this.gAgents,
				nested.leftGAgent,
				nested.rightGAgent,
				nested.gAgents
			);
			nested.sections.forEach((section) => {
				this.currentSection.stages.push(section.header);
				this.currentSection.stages.push(...section.stages);
			});
			this.addStage({
				left: nested.leftGAgent.id,
				right: nested.rightGAgent.id,
				type: 'block end',
			});
		} else {
			throw new Error('Empty block');
		}
	}

	makeGroupDetails(pAgents, alias) {
		const gAgents = pAgents.map(this.toGAgent);
		this.validateGAgents(gAgents);
		if(this.agentStates.has(alias)) {
			throw new Error('Duplicate agent name: ' + alias);
		}
		const name = this.nextBlockName();
		const leftGAgent = GAgent.make(name + '[', {anchorRight: true});
		const rightGAgent = GAgent.make(name + ']');
		this.replaceGAgentState(leftGAgent, AgentState.LOCKED);
		this.replaceGAgentState(rightGAgent, AgentState.LOCKED);
		this.updateGAgentState(
			GAgent.make(alias),
			{blocked: true, group: alias}
		);
		this.defineGAgents([...gAgents, leftGAgent, rightGAgent]);
		const {indexL, indexR} = addBounds(
			this.gAgents,
			leftGAgent,
			rightGAgent,
			gAgents
		);

		const gAgentsCovered = [];
		const gAgentsContained = gAgents.slice();
		for(let i = indexL + 1; i < indexR; ++ i) {
			gAgentsCovered.push(this.gAgents[i]);
		}
		removeAll(gAgentsCovered, gAgentsContained, GAgent.equals);

		return {
			gAgents,
			gAgentsContained,
			gAgentsCovered,
			leftGAgent,
			rightGAgent,
		};
	}

	handleGroupBegin({agents, blockType, tag, label, alias}) {
		const details = this.makeGroupDetails(agents, alias);

		details.gAgentsContained.forEach((gAgent) => {
			this.updateGAgentState(gAgent, {group: alias});
		});
		details.gAgentsCovered.forEach((gAgent) => {
			this.updateGAgentState(gAgent, {covered: true});
		});
		this.activeGroups.set(alias, details);
		this.addStage(this.setGAgentVis(details.gAgents, true, 'box'));
		this.addStage({
			blockType,
			canHide: false,
			label: this.textFormatter(label),
			left: details.leftGAgent.id,
			right: details.rightGAgent.id,
			tag: this.textFormatter(tag),
			type: 'block begin',
		});
	}

	endGroup({name}) {
		const details = this.activeGroups.get(name);
		if(!details) {
			return null;
		}
		this.activeGroups.delete(name);

		details.gAgentsContained.forEach((gAgent) => {
			this.updateGAgentState(gAgent, {group: null});
		});
		details.gAgentsCovered.forEach((gAgent) => {
			this.updateGAgentState(gAgent, {covered: false});
		});
		this.updateGAgentState(GAgent.make(name), {group: null});

		return {
			left: details.leftGAgent.id,
			right: details.rightGAgent.id,
			type: 'block end',
		};
	}

	handleMark({name}) {
		this.markers.add(name);
		this.addStage({name, type: 'mark'}, false);
	}

	handleDivider({mode, height, label}) {
		this.addStage({
			formattedLabel: this.textFormatter(label),
			height,
			mode,
			type: 'divider',
		}, false);
	}

	handleAsync({target}) {
		if(target !== '' && !this.markers.has(target)) {
			throw new Error('Unknown marker: ' + target);
		}
		this.addStage({target, type: 'async'}, false);
	}

	handleLabelPattern({pattern}) {
		this.labelPattern = pattern.slice();
		for(let i = 0; i < this.labelPattern.length; ++ i) {
			const part = this.labelPattern[i];
			if(typeof part === 'object' && typeof part.start !== 'undefined') {
				this.labelPattern[i] = Object.assign({
					current: part.start,
				}, part);
			}
		}
	}

	applyLabelPattern(label) {
		let result = '';
		const tokens = {label};
		this.labelPattern.forEach((part) => {
			if(typeof part === 'string') {
				result += part;
			} else if(typeof part.token !== 'undefined') {
				result += tokens[part.token];
			} else if(typeof part.current !== 'undefined') {
				result += part.current.toFixed(part.dp);
				part.current += part.inc;
			}
		});
		return result;
	}

	expandGroupedGAgent(gAgent) {
		const {group} = this.getGAgentState(gAgent);
		if(!group) {
			return [gAgent];
		}
		const details = this.activeGroups.get(group);
		return [details.leftGAgent, details.rightGAgent];
	}

	expandGroupedGAgentConnection(gAgents) {
		const gAgents1 = this.expandGroupedGAgent(gAgents[0]);
		const gAgents2 = this.expandGroupedGAgent(gAgents[1]);
		let ind1 = GAgent.indexOf(this.gAgents, gAgents1[0]);
		let ind2 = GAgent.indexOf(this.gAgents, gAgents2[0]);
		if(ind1 === -1) {
			/*
			 * Virtual sources written as '* -> Ref' will spawn to the left,
			 * not the right (as non-virtual agents would)
			 */
			ind1 = gAgents1[0].isVirtualSource ? -1 : this.gAgents.length;
		}
		if(ind2 === -1) {
			/*
			 * Virtual and non-virtual agents written as 'Ref -> *' will
			 * spawn to the right
			 */
			ind2 = this.gAgents.length;
		}
		if(ind1 === ind2) {
			// Self-connection
			return [last(gAgents1), last(gAgents2)];
		} else if(ind1 < ind2) {
			return [last(gAgents1), gAgents2[0]];
		} else {
			return [gAgents1[0], last(gAgents2)];
		}
	}

	filterConnectFlags(pAgents) {
		const beginGAgents = (pAgents
			.filter(PAgent.hasFlag('begin'))
			.map(this.toGAgent)
		);
		const endGAgents = (pAgents
			.filter(PAgent.hasFlag('end'))
			.map(this.toGAgent)
		);
		if(GAgent.hasIntersection(beginGAgents, endGAgents)) {
			throw new Error('Cannot set agent visibility multiple times');
		}

		const startGAgents = (pAgents
			.filter(PAgent.hasFlag('start'))
			.map(this.toGAgent)
		);
		const stopGAgents = (pAgents
			.filter(PAgent.hasFlag('stop'))
			.map(this.toGAgent)
		);
		mergeSets(stopGAgents, endGAgents);
		if(GAgent.hasIntersection(startGAgents, stopGAgents)) {
			throw new Error('Cannot set agent highlighting multiple times');
		}

		this.validateGAgents(beginGAgents);
		this.validateGAgents(endGAgents);
		this.validateGAgents(startGAgents);
		this.validateGAgents(stopGAgents);

		return {beginGAgents, endGAgents, startGAgents, stopGAgents};
	}

	makeVirtualAgent(anchorRight) {
		const virtualGAgent = GAgent.make(this.nextVirtualAgentName(), {
			anchorRight,
			isVirtualSource: true,
		});
		this.replaceGAgentState(virtualGAgent, AgentState.LOCKED);
		return virtualGAgent;
	}

	addNearbyAgent(gAgentReference, gAgent, offset) {
		GAgent.addNearby(
			this.currentNest.gAgents,
			gAgentReference,
			gAgent,
			offset
		);
		GAgent.addNearby(
			this.gAgents,
			gAgentReference,
			gAgent,
			offset
		);
	}

	expandVirtualSourceAgents(gAgents) {
		if(gAgents[0].isVirtualSource) {
			if(gAgents[1].isVirtualSource) {
				throw new Error('Cannot connect found messages');
			}
			if(SPECIAL_AGENT_IDS.includes(gAgents[1].id)) {
				throw new Error(
					'Cannot connect found messages to special agents'
				);
			}
			const virtualGAgent = this.makeVirtualAgent(true);
			this.addNearbyAgent(gAgents[1], virtualGAgent, 0);
			return [virtualGAgent, gAgents[1]];
		}
		if(gAgents[1].isVirtualSource) {
			if(SPECIAL_AGENT_IDS.includes(gAgents[0].id)) {
				throw new Error(
					'Cannot connect found messages to special agents'
				);
			}
			const virtualGAgent = this.makeVirtualAgent(false);
			this.addNearbyAgent(gAgents[0], virtualGAgent, 1);
			return [gAgents[0], virtualGAgent];
		}
		return gAgents;
	}

	_handlePartialConnect(agents) {
		const flags = this.filterConnectFlags(agents);

		const gAgents = agents.map(this.toGAgent);
		this.validateGAgents(gAgents, {
			allowGrouped: true,
			allowVirtual: true,
		});

		this.defineGAgents(flatMap(gAgents, this.expandGroupedGAgent)
			.filter((gAgent) => !gAgent.isVirtualSource));

		const implicitBeginGAgents = (agents
			.filter(PAgent.hasFlag('begin', false))
			.map(this.toGAgent)
			.filter((gAgent) => !gAgent.isVirtualSource)
		);
		this.addStage(this.setGAgentVis(implicitBeginGAgents, true, 'box'));

		return {flags, gAgents};
	}

	_makeConnectParallelStages(flags, connectStage) {
		return [
			this.setGAgentVis(flags.beginGAgents, true, 'box', true),
			this.setGAgentHighlight(flags.startGAgents, true, true),
			connectStage,
			this.setGAgentHighlight(flags.stopGAgents, false, true),
			this.setGAgentVis(flags.endGAgents, false, 'cross', true),
		];
	}

	_isSelfConnect(agents) {
		const gAgents = agents.map(this.toGAgent);
		const expandedGAgents = this.expandGroupedGAgentConnection(gAgents);
		if(expandedGAgents[0].id !== expandedGAgents[1].id) {
			return false;
		}
		if(expandedGAgents.some((gAgent) => gAgent.isVirtualSource)) {
			return false;
		}
		return true;
	}

	handleConnect({agents, label, options}) {
		if(this._isSelfConnect(agents)) {
			const tag = {};
			this.handleConnectDelayBegin({
				agent: agents[0],
				ln: 0,
				options,
				tag,
			});
			this.handleConnectDelayEnd({
				agent: agents[1],
				label,
				options,
				tag,
			});
			return;
		}

		let {flags, gAgents} = this._handlePartialConnect(agents);

		gAgents = this.expandGroupedGAgentConnection(gAgents);
		gAgents = this.expandVirtualSourceAgents(gAgents);

		const connectStage = {
			agentIDs: gAgents.map((gAgent) => gAgent.id),
			label: this.textFormatter(this.applyLabelPattern(label)),
			options,
			type: 'connect',
		};

		this.addParallelStages(this._makeConnectParallelStages(
			flags,
			connectStage
		));
	}

	handleConnectDelayBegin({agent, tag, options, ln}) {
		const dcs = this.currentSection.delayedConnections;
		if(dcs.has(tag)) {
			throw new Error('Duplicate delayed connection "' + tag + '"');
		}

		const {flags, gAgents} = this._handlePartialConnect([agent]);
		const uniqueTag = this.nextVirtualAgentName();

		const connectStage = {
			agentIDs: null,
			label: null,
			options,
			tag: uniqueTag,
			type: 'connect-delay-begin',
		};

		dcs.set(tag, {connectStage, gAgents, ln, tag, uniqueTag});

		this.addParallelStages(this._makeConnectParallelStages(
			flags,
			connectStage
		));
	}

	handleConnectDelayEnd({agent, tag, label, options}) {
		const dcs = this.currentSection.delayedConnections;
		const dcInfo = dcs.get(tag);
		if(!dcInfo) {
			throw new Error('Unknown delayed connection "' + tag + '"');
		}

		let {flags, gAgents} = this._handlePartialConnect([agent]);

		gAgents = this.expandGroupedGAgentConnection([
			...dcInfo.gAgents,
			...gAgents,
		]);
		gAgents = this.expandVirtualSourceAgents(gAgents);

		let combinedOptions = dcInfo.connectStage.options;
		if(combinedOptions.line !== options.line) {
			throw new Error('Mismatched delayed connection arrows');
		}
		if(options.right) {
			combinedOptions = Object.assign({}, combinedOptions, {
				right: options.right,
			});
		}

		Object.assign(dcInfo.connectStage, {
			agentIDs: gAgents.map((gAgent) => gAgent.id),
			label: this.textFormatter(this.applyLabelPattern(label)),
			options: combinedOptions,
		});

		const connectEndStage = {
			tag: dcInfo.uniqueTag,
			type: 'connect-delay-end',
		};

		this.addParallelStages(this._makeConnectParallelStages(
			flags,
			connectEndStage
		));

		dcs.delete(tag);
	}

	handleNote({type, agents, mode, label}) {
		let gAgents = null;
		if(agents.length === 0) {
			gAgents = NOTE_DEFAULT_G_AGENTS[type] || [];
		} else {
			gAgents = agents.map(this.toGAgent);
		}

		this.validateGAgents(gAgents, {allowGrouped: true});
		gAgents = flatMap(gAgents, this.expandGroupedGAgent);
		const agentIDs = gAgents.map((gAgent) => gAgent.id);
		const uniqueAgents = new Set(agentIDs).size;
		if(type === 'note between' && uniqueAgents < 2) {
			throw new Error('note between requires at least 2 agents');
		}

		this.addStage(this.setGAgentVis(gAgents, true, 'box'));
		this.defineGAgents(gAgents);

		this.addStage({
			agentIDs,
			label: this.textFormatter(label),
			mode,
			type,
		});
	}

	handleAgentDefine({agents}) {
		const gAgents = agents.map(this.toGAgent);
		this.validateGAgents(gAgents, {
			allowCovered: true,
			allowGrouped: true,
		});
		mergeSets(this.gAgents, gAgents, GAgent.equals);
	}

	handleAgentOptions({agent, options}) {
		const gAgent = this.toGAgent(agent);
		const gAgents = [gAgent];
		this.validateGAgents(gAgents, {
			allowCovered: true,
			allowGrouped: true,
		});
		mergeSets(this.gAgents, gAgents, GAgent.equals);

		this.gAgents
			.filter(({id}) => (id === gAgent.id))
			.forEach((storedGAgent) => {
				mergeSets(storedGAgent.options, options);
			});
	}

	handleAgentBegin({agents, mode}) {
		const gAgents = agents.map(this.toGAgent);
		this.validateGAgents(gAgents);
		this.addStage(this.setGAgentVis(gAgents, true, mode, true));
	}

	handleAgentEnd({agents, mode}) {
		const groupPAgents = (agents
			.filter((pAgent) => this.activeGroups.has(pAgent.name))
		);
		const gAgents = (agents
			.filter((pAgent) => !this.activeGroups.has(pAgent.name))
			.map(this.toGAgent)
		);
		this.validateGAgents(gAgents);
		this.addParallelStages([
			this.setGAgentHighlight(gAgents, false),
			this.setGAgentVis(gAgents, false, mode, true),
			...groupPAgents.map(this.endGroup),
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
				e.message += ' at line ' + (stage.ln + 1);
				throw e;
			}
		}
	}

	_reset() {
		this.agentStates.clear();
		this.markers.clear();
		this.agentAliases.clear();
		this.activeGroups.clear();
		this.gAgents.length = 0;
		this.nextID = 0;
		this.nesting.length = 0;
		this.labelPattern = [{token: 'label'}];
	}

	_finalise(globals) {
		addBounds(
			this.gAgents,
			this.currentNest.leftGAgent,
			this.currentNest.rightGAgent
		);
		optimiseStages(globals.stages);

		this.gAgents.forEach((gAgent) => {
			gAgent.formattedLabel = this.textFormatter(gAgent.id);
		});
	}

	generate({stages, meta = {}}) {
		this._reset();

		this.textFormatter = meta.textFormatter;
		const globals = this.beginNested('global', {
			label: '',
			ln: 0,
			name: '',
			tag: '',
		});

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

		this._checkSectionEnd();

		const terminators = meta.terminators || 'none';
		this.addParallelStages([
			this.setGAgentHighlight(this.gAgents, false),
			this.setGAgentVis(this.gAgents, false, terminators),
		]);

		this._finalise(globals);

		swapFirstBegin(globals.stages, meta.headers || 'box');

		return {
			agents: this.gAgents.slice(),
			meta: {
				code: meta.code,
				theme: meta.theme,
				title: this.textFormatter(meta.title),
			},
			stages: globals.stages,
		};
	}
}
