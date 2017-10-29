define(['core/ArrayUtilities'], (array) => {
	'use strict';

	const CM_END = {type: '', suggest: '\n', then: {}};
	const CM_ERROR = {type: 'error', then: {'': 0}};

	function makeCMCommaBlock(type, suggest, exits = {}) {
		return {type, suggest, then: Object.assign({
			'': 0,
			',': {type: 'operator', suggest: true, then: {
				'': 1,
			}},
		}, exits)};
	}

	const CM_TEXT_TO_END = {type: 'string', then: {'': 0, '\n': CM_END}};
	const CM_AGENT_LIST_TO_END = makeCMCommaBlock('variable', 'Agent', {
		'\n': CM_END,
	});
	const CM_AGENT_LIST_TO_TEXT = makeCMCommaBlock('variable', 'Agent', {
		':': {type: 'operator', suggest: true, then: {'': CM_TEXT_TO_END}},
	});
	const CM_AGENT_LIST_TO_OPTTEXT = makeCMCommaBlock('variable', 'Agent', {
		':': {type: 'operator', suggest: true, then: {'': CM_TEXT_TO_END}},
		'\n': CM_END,
	});

	const CM_NOTE_SIDE_THEN = {
		'of': {type: 'keyword', suggest: true, then: {
			'': CM_AGENT_LIST_TO_TEXT,
		}},
		':': {type: 'operator', suggest: true, then: {
			'': CM_TEXT_TO_END,
		}},
		'': CM_AGENT_LIST_TO_TEXT,
	};

	const CM_NOTE_LSIDE = {
		type: 'keyword',
		suggest: ['left of ', 'left: '],
		then: CM_NOTE_SIDE_THEN,
	};

	const CM_NOTE_RSIDE = {
		type: 'keyword',
		suggest: ['right of ', 'right: '],
		then: CM_NOTE_SIDE_THEN,
	};

	const CM_CONNECT = {type: 'keyword', suggest: true, then: {
		'': CM_AGENT_LIST_TO_OPTTEXT,
	}};

	const CM_COMMANDS = {type: 'error', then: {
		'title': {type: 'keyword', suggest: true, then: {
			'': CM_TEXT_TO_END,
		}},
		'terminators': {type: 'keyword', suggest: true, then: {
			'none': {type: 'keyword', suggest: true, then: {}},
			'cross': {type: 'keyword', suggest: true, then: {}},
			'box': {type: 'keyword', suggest: true, then: {}},
			'bar': {type: 'keyword', suggest: true, then: {}},
		}},
		'define': {type: 'keyword', suggest: true, then: {
			'': CM_AGENT_LIST_TO_END,
		}},
		'begin': {type: 'keyword', suggest: true, then: {
			'': CM_AGENT_LIST_TO_END,
		}},
		'end': {type: 'keyword', suggest: true, then: {
			'': CM_AGENT_LIST_TO_END,
			'\n': CM_END,
		}},
		'if': {type: 'keyword', suggest: true, then: {
			'': CM_TEXT_TO_END,
			':': {type: 'operator', suggest: true, then: {
				'': CM_TEXT_TO_END,
			}},
			'\n': CM_END,
		}},
		'else': {type: 'keyword', suggest: ['else\n', 'else if: '], then: {
			'if': {type: 'keyword', suggest: 'if: ', then: {
				'': CM_TEXT_TO_END,
				':': {type: 'operator', suggest: true, then: {
					'': CM_TEXT_TO_END,
				}},
			}},
			'\n': CM_END,
		}},
		'repeat': {type: 'keyword', suggest: true, then: {
			'': CM_TEXT_TO_END,
			':': {type: 'operator', suggest: true, then: {
				'': CM_TEXT_TO_END,
			}},
			'\n': CM_END,
		}},
		'note': {type: 'keyword', suggest: true, then: {
			'over': {type: 'keyword', suggest: true, then: {
				'': CM_AGENT_LIST_TO_TEXT,
			}},
			'left': CM_NOTE_LSIDE,
			'right': CM_NOTE_RSIDE,
			'between': {type: 'keyword', suggest: true, then: {
				'': CM_AGENT_LIST_TO_TEXT,
			}},
		}},
		'state': {type: 'keyword', suggest: 'state over ', then: {
			'over': {type: 'keyword', suggest: true, then: {
				'': CM_AGENT_LIST_TO_TEXT,
			}},
		}},
		'text': {type: 'keyword', suggest: true, then: {
			'left': CM_NOTE_LSIDE,
			'right': CM_NOTE_RSIDE,
		}},
		'simultaneously': {type: 'keyword', suggest: true, then: {
			':': {type: 'operator', suggest: true, then: {}},
			'with': {type: 'keyword', suggest: true, then: {
				'': {type: 'variable', suggest: 'Label', then: {
					'': 0,
					':': {type: 'operator', suggest: true, then: {}},
				}},
			}},
		}},
		'': {type: 'variable', suggest: 'Agent', then: {
			'->': CM_CONNECT,
			'-->': CM_CONNECT,
			'<-': CM_CONNECT,
			'<--': CM_CONNECT,
			'<->': CM_CONNECT,
			'<-->': CM_CONNECT,
			':': {type: 'operator', suggest: true, override: 'Label', then: {}},
			'': 0,
		}},
	}};

	function cmGetSuggestions(state, token, {suggest, then}) {
		if(token === '') {
			return state['known' + suggest];
		} else if(suggest === true) {
			if(Object.keys(then).length > 0) {
				return [token + ' '];
			} else {
				return [token + '\n'];
			}
		} else if(Array.isArray(suggest)) {
			return suggest;
		} else if(suggest) {
			return [suggest];
		} else {
			return null;
		}
	}

	function cmMakeCompletions(state, path) {
		const comp = [];
		const {then} = array.last(path);
		Object.keys(then).forEach((token) => {
			let next = then[token];
			if(typeof next === 'number') {
				next = path[path.length - next - 1];
			}
			array.mergeSets(comp, cmGetSuggestions(state, token, next));
		});
		return comp;
	}

	function updateSuggestion(state, locals, token, {suggest, override}) {
		if(locals.type) {
			if(suggest !== locals.type) {
				if(override) {
					locals.type = override;
				}
				array.mergeSets(
					state['known' + locals.type],
					[locals.value]
				);
				locals.type = '';
			} else {
				locals.value += token + ' ';
			}
		} else if(typeof suggest === 'string' && state['known' + suggest]) {
			locals.type = suggest;
			locals.value = token + ' ';
		}
	}

	function cmCheckToken(state, eol) {
		const suggestions = {
			type: '',
			value: '',
		};
		let current = CM_COMMANDS;
		const path = [current];

		state.line.forEach((token, i) => {
			if(i === state.line.length - 1) {
				state.completions = cmMakeCompletions(state, path);
			}
			const found = current.then[token] || current.then[''];
			if(typeof found === 'number') {
				path.length -= found;
			} else {
				path.push(found || CM_ERROR);
			}
			current = array.last(path);
			updateSuggestion(state, suggestions, token, current);
		});
		if(eol) {
			updateSuggestion(state, suggestions, '', {});
		}
		state.nextCompletions = cmMakeCompletions(state, path);
		return current.type;
	}

	return class Mode {
		constructor(tokenDefinitions) {
			this.tokenDefinitions = tokenDefinitions;
			this.lineComment = '#';
		}

		startState() {
			return {
				currentType: -1,
				current: '',
				knownAgent: [],
				knownLabel: [],
				beginCompletions: cmMakeCompletions({}, [CM_COMMANDS]),
				completions: [],
				nextCompletions: [],
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
			while(true) {
				if(stream.eol()) {
					return false;
				}
				for(let i = 0; i < this.tokenDefinitions.length; ++ i) {
					const block = this.tokenDefinitions[i];
					if(this._matchPattern(stream, block.start, true)) {
						state.currentType = i;
						state.current = block.prefix || '';
						return true;
					}
				}
				stream.next();
			}
		}

		_tokenCheckEscape(stream, state, block) {
			const match = this._matchPattern(stream, block.escape, true);
			if(match) {
				state.current += block.escapeWith(match);
			}
		}

		_tokenEndFound(stream, state, block) {
			state.currentType = -1;
			if(block.omit) {
				return 'comment';
			}
			state.line.push(state.current);
			if(state.current === '\n') {
				// quoted newline is interpreted as a command separator;
				// probably not what the writer expected, so highlight it
				state.line.length = 0;
				return 'warning';
			}
			return cmCheckToken(state, stream.eol());
		}

		_tokenEOLFound(stream, state, block) {
			state.current += '\n';
			if(block.omit) {
				return 'comment';
			}
			state.line.push(state.current);
			const type = cmCheckToken(state, false);
			state.line.pop();
			return type;
		}

		_tokenEnd(stream, state) {
			while(true) {
				const block = this.tokenDefinitions[state.currentType];
				this._tokenCheckEscape(stream, state, block);
				if(!block.end || this._matchPattern(stream, block.end, true)) {
					return this._tokenEndFound(stream, state, block);
				}
				if(stream.eol()) {
					return this._tokenEOLFound(stream, state, block);
				}
				state.current += stream.next();
			}
		}

		token(stream, state) {
			state.completions = state.nextCompletions;
			if(stream.sol() && state.currentType === -1) {
				state.line.length = 0;
			}
			if(state.currentType !== -1 || this._tokenBegin(stream, state)) {
				return this._tokenEnd(stream, state);
			} else {
				return null;
			}
		}

		indent(state) {
			return state.indent;
		}
	};
});