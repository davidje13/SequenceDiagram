/* eslint-disable max-lines */
/* eslint-disable sort-keys */ // Maybe later
/* eslint-disable complexity */ // Temporary ignore while switching linter

import {flatMap, last, mergeSets} from '../core/ArrayUtilities.js';

const CM_ERROR = {type: 'error line-error', suggest: false, then: {'': 0}};

function textTo(exit, suggest = false) {
	return {
		type: 'string',
		suggest,
		then: Object.assign({'': 0}, exit),
	};
}

function suggestionsEqual(a, b) {
	return (
		(a.v === b.v) &&
		(a.prefix === b.prefix) &&
		(a.suffix === b.suffix) &&
		(a.q === b.q)
	);
}

const AGENT_INFO_TYPES = [
	'database',
	'red',
];

const makeCommands = ((() => {
	/*
	 * The order of commands inside "then" blocks directly influences the
	 * order they are displayed to the user in autocomplete menus.
	 * This relies on the fact that common JS engines maintain insertion
	 * order in objects, though this is not guaranteed. It could be switched
	 * to use Map objects instead for strict compliance, at the cost of
	 * extra syntax.
	 */

	function agentListTo(exit, next = 1) {
		return {
			type: 'variable',
			suggest: {known: 'Agent'},
			then: Object.assign({}, exit, {
				'': 0,
				',': {type: 'operator', then: {'': next}},
			}),
		};
	}

	const end = {type: '', suggest: '\n', then: {}};
	const hiddenEnd = {type: '', suggest: false, then: {}};
	const textToEnd = textTo({'\n': end});
	const colonTextToEnd = {
		type: 'operator',
		then: {'': textToEnd, '\n': hiddenEnd},
	};
	const aliasListToEnd = agentListTo({
		'\n': end,
		'as': {type: 'keyword', then: {
			'': {type: 'variable', suggest: {known: 'Agent'}, then: {
				'': 0,
				',': {type: 'operator', then: {'': 3}},
				'\n': end,
			}},
		}},
	});
	const agentListToText = agentListTo({':': colonTextToEnd});

	const agentToOptText = {
		type: 'variable',
		suggest: {known: 'Agent'},
		then: {
			'': 0,
			':': {type: 'operator', then: {
				'': textToEnd,
				'\n': hiddenEnd,
			}},
			'\n': end,
		},
	};
	const referenceName = {
		':': {type: 'operator', then: {
			'': textTo({
				'as': {type: 'keyword', then: {
					'': {
						type: 'variable',
						suggest: {known: 'Agent'},
						then: {
							'': 0,
							'\n': end,
						},
					},
				}},
			}),
		}},
	};
	const refDef = {type: 'keyword', then: Object.assign({
		'over': {type: 'keyword', then: {
			'': agentListTo(referenceName),
		}},
	}, referenceName)};

	const divider = {
		'\n': end,
		':': {type: 'operator', then: {
			'': textToEnd,
			'\n': hiddenEnd,
		}},
		'with': {type: 'keyword', suggest: ['with height '], then: {
			'height': {type: 'keyword', then: {
				'': {type: 'number', suggest: ['6 ', '30 '], then: {
					'\n': end,
					':': {type: 'operator', then: {
						'': textToEnd,
						'\n': hiddenEnd,
					}},
				}},
			}},
		}},
	};

	function simpleList(type, keywords, exit) {
		const first = {};
		const recur = Object.assign({}, exit);

		keywords.forEach((keyword) => {
			first[keyword] = {type, then: recur};
			recur[keyword] = 0;
		});

		return first;
	}

	function optionalKeywords(type, keywords, then) {
		const result = Object.assign({}, then);
		keywords.forEach((keyword) => {
			result[keyword] = {type, then};
		});
		return result;
	}

	const agentInfoList = optionalKeywords(
		'keyword',
		['a', 'an'],
		simpleList('keyword', AGENT_INFO_TYPES, {'\n': end})
	);

	function makeSideNote(side) {
		return {
			type: 'keyword',
			suggest: [side + ' of ', side + ': '],
			then: {
				'of': {type: 'keyword', then: {
					'': agentListToText,
				}},
				':': {type: 'operator', then: {
					'': textToEnd,
				}},
				'': agentListToText,
			},
		};
	}

	function makeOpBlock({exit, sourceExit, blankExit}) {
		const op = {type: 'operator', then: {
			'+': CM_ERROR,
			'-': CM_ERROR,
			'*': CM_ERROR,
			'!': CM_ERROR,
			'': exit,
		}};
		return {
			'+': {type: 'operator', then: {
				'+': CM_ERROR,
				'-': CM_ERROR,
				'*': op,
				'!': CM_ERROR,
				'': exit,
			}},
			'-': {type: 'operator', then: {
				'+': CM_ERROR,
				'-': CM_ERROR,
				'*': op,
				'!': {type: 'operator', then: {
					'+': CM_ERROR,
					'-': CM_ERROR,
					'*': CM_ERROR,
					'!': CM_ERROR,
					'': exit,
				}},
				'': exit,
			}},
			'*': {type: 'operator', then: Object.assign({
				'+': op,
				'-': op,
				'*': CM_ERROR,
				'!': CM_ERROR,
				'': exit,
			}, sourceExit || exit)},
			'!': op,
			'': blankExit || exit,
		};
	}

	function makeCMConnect(arrows) {
		const connect = {
			type: 'keyword',
			then: Object.assign({}, makeOpBlock({
				exit: agentToOptText,
				sourceExit: {
					':': colonTextToEnd,
					'\n': hiddenEnd,
				},
			}), {
				'...': {type: 'operator', then: {
					'': {
						type: 'variable',
						suggest: {known: 'DelayedAgent'},
						then: {
							'': 0,
							':': CM_ERROR,
							'\n': end,
						},
					},
				}},
			}),
		};

		const connectors = {};
		arrows.forEach((arrow) => (connectors[arrow] = connect));

		const labelIndicator = {
			type: 'operator',
			override: 'Label',
			then: {},
		};

		const hiddenLabelIndicator = {
			type: 'operator',
			suggest: false,
			override: 'Label',
			then: {},
		};

		const firstAgent = {
			type: 'variable',
			suggest: {known: 'Agent'},
			then: Object.assign({
				'': 0,
			}, connectors, {
				':': labelIndicator,
			}),
		};

		const firstAgentDelayed = {
			type: 'variable',
			suggest: {known: 'DelayedAgent'},
			then: Object.assign({
				'': 0,
				':': hiddenLabelIndicator,
			}, connectors),
		};

		const firstAgentNoFlags = Object.assign({}, firstAgent, {
			then: Object.assign({}, firstAgent.then, {
				'is': {type: 'keyword', then: agentInfoList},
			}),
		});

		return Object.assign({
			'...': {type: 'operator', then: {
				'': firstAgentDelayed,
			}},
		}, makeOpBlock({
			exit: firstAgent,
			sourceExit: Object.assign({
				'': firstAgent,
				':': hiddenLabelIndicator,
			}, connectors),
			blankExit: firstAgentNoFlags,
		}));
	}

	const commonGroup = {type: 'keyword', then: {
		'': textToEnd,
		':': {type: 'operator', then: {
			'': textToEnd,
		}},
		'\n': end,
	}};

	const BASE_THEN = {
		'title': {type: 'keyword', then: {
			'': textToEnd,
		}},
		'theme': {type: 'keyword', then: {
			'': {
				type: 'string',
				suggest: {
					global: 'themes',
					suffix: '\n',
				},
				then: {
					'': 0,
					'\n': end,
				},
			},
		}},
		'headers': {type: 'keyword', then: {
			'none': {type: 'keyword', then: {}},
			'cross': {type: 'keyword', then: {}},
			'box': {type: 'keyword', then: {}},
			'fade': {type: 'keyword', then: {}},
			'bar': {type: 'keyword', then: {}},
		}},
		'terminators': {type: 'keyword', then: {
			'none': {type: 'keyword', then: {}},
			'cross': {type: 'keyword', then: {}},
			'box': {type: 'keyword', then: {}},
			'fade': {type: 'keyword', then: {}},
			'bar': {type: 'keyword', then: {}},
		}},
		'divider': {type: 'keyword', then: Object.assign({
			'line': {type: 'keyword', then: divider},
			'space': {type: 'keyword', then: divider},
			'delay': {type: 'keyword', then: divider},
			'tear': {type: 'keyword', then: divider},
		}, divider)},
		'define': {type: 'keyword', then: {
			'': aliasListToEnd,
			'as': CM_ERROR,
		}},
		'begin': {type: 'keyword', then: {
			'': aliasListToEnd,
			'reference': refDef,
			'as': CM_ERROR,
		}},
		'end': {type: 'keyword', then: {
			'': aliasListToEnd,
			'as': CM_ERROR,
			'\n': end,
		}},
		'if': commonGroup,
		'else': {type: 'keyword', suggest: ['else\n', 'else if: '], then: {
			'if': {type: 'keyword', suggest: 'if: ', then: {
				'': textToEnd,
				':': {type: 'operator', then: {
					'': textToEnd,
				}},
			}},
			'\n': end,
		}},
		'repeat': commonGroup,
		'group': commonGroup,
		'note': {type: 'keyword', then: {
			'over': {type: 'keyword', then: {
				'': agentListToText,
			}},
			'left': makeSideNote('left'),
			'right': makeSideNote('right'),
			'between': {type: 'keyword', then: {
				'': agentListTo({':': CM_ERROR}, agentListToText),
			}},
		}},
		'state': {type: 'keyword', suggest: 'state over ', then: {
			'over': {type: 'keyword', then: {
				'': {
					type: 'variable',
					suggest: {known: 'Agent'},
					then: {
						'': 0,
						',': CM_ERROR,
						':': colonTextToEnd,
					},
				},
			}},
		}},
		'text': {type: 'keyword', then: {
			'left': makeSideNote('left'),
			'right': makeSideNote('right'),
		}},
		'autolabel': {type: 'keyword', then: {
			'off': {type: 'keyword', then: {}},
			'': textTo({'\n': end}, [
				{v: '<label>', suffix: '\n', q: true},
				{v: '[<inc>] <label>', suffix: '\n', q: true},
				{v: '[<inc 1,0.01>] <label>', suffix: '\n', q: true},
			]),
		}},
		'simultaneously': {type: 'keyword', then: {
			':': {type: 'operator', then: {}},
			'with': {type: 'keyword', then: {
				'': {type: 'variable', suggest: {known: 'Label'}, then: {
					'': 0,
					':': {type: 'operator', then: {}},
				}},
			}},
		}},
	};

	return (arrows) => ({
		type: 'error line-error',
		then: Object.assign({}, BASE_THEN, makeCMConnect(arrows)),
	});
})());

function cmCappedToken(token, current) {
	if(Object.keys(current.then).length > 0) {
		return {v: token, suffix: ' ', q: false};
	} else {
		return {v: token, suffix: '\n', q: false};
	}
}

function cmGetSuggestions(state, token, current) {
	let suggestions = current.suggest;
	if(!Array.isArray(suggestions)) {
		suggestions = [suggestions];
	}

	return flatMap(suggestions, (suggest) => {
		if(suggest === false) {
			return [];
		} else if(typeof suggest === 'object') {
			if(suggest.known) {
				return state['known' + suggest.known] || [];
			} else {
				return [suggest];
			}
		} else if(typeof suggest === 'string' && suggest) {
			return [{v: suggest, q: (token === '')}];
		} else {
			return [cmCappedToken(token, current)];
		}
	});
}

function cmMakeCompletions(state, path) {
	const comp = [];
	const current = last(path);
	Object.keys(current.then).forEach((token) => {
		let next = current.then[token];
		if(typeof next === 'number') {
			next = path[path.length - next - 1];
		}
		mergeSets(
			comp,
			cmGetSuggestions(state, token, next),
			suggestionsEqual
		);
	});
	return comp;
}

function updateSuggestion(state, locals, token, {suggest, override}) {
	let known = null;
	if(typeof suggest === 'object' && suggest.known) {
		known = suggest.known;
	}
	if(locals.type && known !== locals.type) {
		if(override) {
			locals.type = override;
		}
		mergeSets(
			state['known' + locals.type],
			[{v: locals.value, suffix: ' ', q: true}],
			suggestionsEqual
		);
		locals.type = '';
		locals.value = '';
	}
	if(known) {
		locals.type = known;
		if(locals.value) {
			locals.value += token.s;
		}
		locals.value += token.v;
	}
}

function cmCheckToken(state, eol, commands) {
	const suggestions = {
		type: '',
		value: '',
	};
	let current = commands;
	const path = [current];

	state.line.forEach((token, i) => {
		if(i === state.line.length - 1) {
			state.completions = cmMakeCompletions(state, path);
		}
		const keywordToken = token.q ? '' : token.v;
		let found = current.then[keywordToken];
		if(typeof found === 'undefined') {
			found = current.then[''];
			state.isVar = true;
		} else {
			state.isVar = token.q;
		}
		if(typeof found === 'number') {
			path.length -= found;
		} else {
			path.push(found || CM_ERROR);
		}
		current = last(path);
		updateSuggestion(state, suggestions, token, current);
	});
	if(eol) {
		updateSuggestion(state, suggestions, null, {});
	}
	state.nextCompletions = cmMakeCompletions(state, path);
	state.valid = (
		Boolean(current.then['\n']) ||
		Object.keys(current.then).length === 0
	);
	return current.type;
}

function getInitialToken(block) {
	const baseToken = (block.baseToken || {});
	return {
		value: baseToken.v || '',
		quoted: baseToken.q || false,
	};
}

export default class Mode {
	constructor(tokenDefinitions, arrows) {
		this.tokenDefinitions = tokenDefinitions;
		this.commands = makeCommands(arrows);
		this.lineComment = '#';
	}

	startState() {
		return {
			currentType: -1,
			current: '',
			currentSpace: '',
			currentQuoted: false,
			knownAgent: [],
			knownDelayedAgent: [],
			knownLabel: [],
			beginCompletions: cmMakeCompletions({}, [this.commands]),
			completions: [],
			nextCompletions: [],
			valid: true,
			isVar: true,
			line: [],
			indent: 0,
		};
	}

	_matchPattern(stream, pattern, consume) {
		if(!pattern) {
			return null;
		}
		pattern.lastIndex = 0;
		return stream.match(pattern, consume);
	}

	_tokenBegin(stream, state) {
		state.currentSpace = '';
		for(let lastChar = ''; !stream.eol(); lastChar = stream.next()) {
			state.currentSpace += lastChar;
			for(let i = 0; i < this.tokenDefinitions.length; ++ i) {
				const block = this.tokenDefinitions[i];
				if(this._matchPattern(stream, block.start, true)) {
					state.currentType = i;
					const {value, quoted} = getInitialToken(block);
					state.current = value;
					state.currentQuoted = quoted;
					return true;
				}
			}
		}
		return false;
	}

	_tokenCheckEscape(stream, state, block) {
		const match = this._matchPattern(stream, block.escape, true);
		if(match) {
			state.current += block.escapeWith(match);
		}
	}

	_addToken(state) {
		state.line.push({
			v: state.current,
			s: state.currentSpace,
			q: state.currentQuoted,
		});
	}

	_tokenEndFound(stream, state, block, match) {
		state.currentType = -1;
		if(block.includeEnd) {
			state.current += match[0];
		}
		if(block.omit) {
			return 'comment';
		}
		this._addToken(state);
		return cmCheckToken(state, stream.eol(), this.commands);
	}

	_tokenEOLFound(stream, state, block) {
		state.current += '\n';
		if(block.omit) {
			return 'comment';
		}
		this._addToken(state);
		const type = cmCheckToken(state, false, this.commands);
		state.line.pop();
		return type;
	}

	_tokenEnd(stream, state) {
		for(;;) {
			const block = this.tokenDefinitions[state.currentType];
			this._tokenCheckEscape(stream, state, block);
			if(block.end) {
				const match = this._matchPattern(stream, block.end, true);
				if(match) {
					return this._tokenEndFound(stream, state, block, match);
				}
			} else {
				return this._tokenEndFound(stream, state, block, null);
			}
			if(stream.eol()) {
				return this._tokenEOLFound(stream, state, block);
			}
			state.current += stream.next();
		}
	}

	token(stream, state) {
		state.completions = state.nextCompletions;
		state.isVar = true;
		if(stream.sol() && state.currentType === -1) {
			state.line.length = 0;
		}
		let type = '';
		if(state.currentType !== -1 || this._tokenBegin(stream, state)) {
			type = this._tokenEnd(stream, state);
		}
		if(state.currentType === -1 && stream.eol() && !state.valid) {
			return 'line-error ' + type;
		} else {
			return type;
		}
	}

	indent(state) {
		return state.indent;
	}
}
