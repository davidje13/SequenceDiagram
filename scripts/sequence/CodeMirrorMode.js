define(['core/ArrayUtilities'], (array) => {
	'use strict';

	function makeCMCommaBlock(type, exits = {}) {
		return {type, then: Object.assign({
			'': 0,
			',': {type: 'operator', then: {
				'': 1,
			}},
		}, exits)};
	}

	const CM_TEXT_TO_END = {type: 'string', then: {'': 0}};
	const CM_IDENT_LIST_TO_END = makeCMCommaBlock('variable');
	const CM_IDENT_LIST_TO_TEXT = makeCMCommaBlock('variable', {
		':': {type: 'operator', then: {'': CM_TEXT_TO_END}},
	});

	const CM_NOTE_SIDE = {type: 'keyword', then: {
		'of': {type: 'keyword', then: {'': CM_IDENT_LIST_TO_TEXT}},
		':': {type: 'operator', then: {'': CM_TEXT_TO_END}},
		'': CM_IDENT_LIST_TO_TEXT,
	}};

	const CM_CONNECT = {type: 'keyword', then: {
		'': CM_IDENT_LIST_TO_TEXT,
	}};

	const CM_COMMANDS = {type: 'error', then: {
		'title': {type: 'keyword', then: {'': CM_TEXT_TO_END}},
		'terminators': {type: 'keyword', then: {
			'none': {type: 'keyword', then: {}},
			'cross': {type: 'keyword', then: {}},
			'box': {type: 'keyword', then: {}},
			'bar': {type: 'keyword', then: {}},
		}},
		'define': {type: 'keyword', then: {'': CM_IDENT_LIST_TO_END}},
		'begin': {type: 'keyword', then: {'': CM_IDENT_LIST_TO_END}},
		'end': {type: 'keyword', then: {'': CM_IDENT_LIST_TO_END}},
		'if': {type: 'keyword', then: {
			'': CM_TEXT_TO_END,
			':': {type: 'operator', then: {'': CM_TEXT_TO_END}},
		}},
		'else': {type: 'keyword', then: {
			'if': {type: 'keyword', then: {
				'': CM_TEXT_TO_END,
				':': {type: 'operator', then: {'': CM_TEXT_TO_END}},
			}},
		}},
		'repeat': {type: 'keyword', then: {
			'': CM_TEXT_TO_END,
			':': {type: 'operator', then: {'': CM_TEXT_TO_END}},
		}},
		'note': {type: 'keyword', then: {
			'over': {type: 'keyword', then: {'': CM_IDENT_LIST_TO_TEXT}},
			'left': CM_NOTE_SIDE,
			'right': CM_NOTE_SIDE,
			'between': {type: 'keyword', then: {'': CM_IDENT_LIST_TO_TEXT}},
		}},
		'state': {type: 'keyword', then: {
			'over': {type: 'keyword', then: {'': CM_IDENT_LIST_TO_TEXT}},
		}},
		'text': {type: 'keyword', then: {
			'left': CM_NOTE_SIDE,
			'right': CM_NOTE_SIDE,
		}},
		'simultaneously': {type: 'keyword', then: {
			':': {type: 'operator', then: {}},
			'with': {type: 'keyword', then: {
				'': {type: 'variable', then: {
					'': 0,
					':': {type: 'operator', then: {}},
				}},
			}},
		}},
		'': {type: 'variable', then: {
			'->': CM_CONNECT,
			'-->': CM_CONNECT,
			'<-': CM_CONNECT,
			'<--': CM_CONNECT,
			'<->': CM_CONNECT,
			'<-->': CM_CONNECT,
			':': {type: 'operator', then: {}},
			'': 0,
		}},
	}};

	function cmCheckToken(state, partial) {
		if(!partial && state.current === '\n') {
			// quoted newline is interpreted as a command separator;
			// probably not what the writer expected, so highlight it
			state.line.length = 0;
			return 'warning';
		}

		let current = CM_COMMANDS;
		const path = [current];
		for(let i = 0; i < state.line.length; ++ i) {
			const token = state.line[i];
			let found = current.then[token] || current.then[''];
			if(found === undefined) {
				return 'error';
			}
			if(typeof found === 'number') {
				path.length -= found;
				current = array.last(path);
			} else {
				path.push(found);
				current = found;
			}
		}
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
			return cmCheckToken(state, false);
		}

		_tokenEOLFound(stream, state, block) {
			state.current += '\n';
			if(block.omit) {
				return 'comment';
			}
			state.line.push(state.current);
			const type = cmCheckToken(state, true);
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
