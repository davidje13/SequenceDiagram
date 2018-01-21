define(['core/ArrayUtilities'], (array) => {
	'use strict';

	const CM_ERROR = {type: 'error line-error', then: {'': 0}};

	function suggestionsEqual(a, b) {
		return (
			(a.v === b.v) &&
			(a.prefix === b.prefix) &&
			(a.suffix === b.suffix) &&
			(a.q === b.q)
		);
	}

	const makeCommands = ((() => {
		// The order of commands inside "then" blocks directly influences the
		// order they are displayed to the user in autocomplete menus.
		// This relies on the fact that common JS engines maintain insertion
		// order in objects, though this is not guaranteed. It could be switched
		// to use Map objects instead for strict compliance, at the cost of
		// extra syntax.

		const end = {type: '', suggest: '\n', then: {}};
		const hiddenEnd = {type: '', then: {}};

		function textTo(exit, suggest) {
			return {
				type: 'string',
				suggest,
				then: Object.assign({'': 0}, exit),
			};
		}

		const textToEnd = textTo({'\n': end});
		const aliasListToEnd = {
			type: 'variable',
			suggest: {known: 'Agent'},
			then: {
				'': 0,
				'\n': end,
				',': {type: 'operator', suggest: true, then: {'': 1}},
				'as': {type: 'keyword', suggest: true, then: {
					'': {type: 'variable', suggest: {known: 'Agent'}, then: {
						'': 0,
						',': {type: 'operator', suggest: true, then: {'': 3}},
						'\n': end,
					}},
				}},
			},
		};

		function agentListTo(exit) {
			return {
				type: 'variable',
				suggest: {known: 'Agent'},
				then: Object.assign({},
					exit,
					{
						'': 0,
						',': {type: 'operator', suggest: true, then: {'': 1}},
					}
				),
			};
		}

		const colonTextToEnd = {
			type: 'operator',
			suggest: true,
			then: {'': textToEnd, '\n': hiddenEnd},
		};
		const agentListToText = agentListTo({
			':': colonTextToEnd,
		});
		const agentList2ToText = {
			type: 'variable',
			suggest: {known: 'Agent'},
			then: {
				'': 0,
				',': {type: 'operator', suggest: true, then: {
					'': agentListToText,
				}},
				':': CM_ERROR,
			},
		};
		const singleAgentToText = {
			type: 'variable',
			suggest: {known: 'Agent'},
			then: {
				'': 0,
				',': CM_ERROR,
				':': colonTextToEnd,
			},
		};
		const agentToOptText = {
			type: 'variable',
			suggest: {known: 'Agent'},
			then: {
				'': 0,
				':': {type: 'operator', suggest: true, then: {
					'': textToEnd,
					'\n': hiddenEnd,
				}},
				'\n': end,
			},
		};
		const referenceName = {
			':': {type: 'operator', suggest: true, then: {
				'': textTo({
					'as': {type: 'keyword', suggest: true, then: {
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
		const refDef = {type: 'keyword', suggest: true, then: Object.assign({
			'over': {type: 'keyword', suggest: true, then: {
				'': agentListTo(referenceName),
			}},
		}, referenceName)};

		const divider = {
			'\n': end,
			':': {type: 'operator', suggest: true, then: {
				'': textToEnd,
				'\n': hiddenEnd,
			}},
			'with': {type: 'keyword', suggest: ['with height '], then: {
				'height': {type: 'keyword', suggest: true, then: {
					'': {type: 'number', suggest: ['6 ', '30 '], then: {
						'\n': end,
						':': {type: 'operator', suggest: true, then: {
							'': textToEnd,
							'\n': hiddenEnd,
						}},
					}},
				}},
			}},
		};

		function makeSideNote(side) {
			return {
				type: 'keyword',
				suggest: [side + ' of ', side + ': '],
				then: {
					'of': {type: 'keyword', suggest: true, then: {
						'': agentListToText,
					}},
					':': {type: 'operator', suggest: true, then: {
						'': textToEnd,
					}},
					'': agentListToText,
				},
			};
		}

		function makeOpBlock(exit, sourceExit) {
			const op = {type: 'operator', suggest: true, then: {
				'+': CM_ERROR,
				'-': CM_ERROR,
				'*': CM_ERROR,
				'!': CM_ERROR,
				'': exit,
			}};
			return {
				'+': {type: 'operator', suggest: true, then: {
					'+': CM_ERROR,
					'-': CM_ERROR,
					'*': op,
					'!': CM_ERROR,
					'': exit,
				}},
				'-': {type: 'operator', suggest: true, then: {
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
				'*': {type: 'operator', suggest: true, then: Object.assign({
					'+': op,
					'-': op,
					'*': CM_ERROR,
					'!': CM_ERROR,
					'': exit,
				}, sourceExit)},
				'!': op,
				'': exit,
			};
		}

		function makeCMConnect(arrows) {
			const connect = {
				type: 'keyword',
				suggest: true,
				then: makeOpBlock(agentToOptText, {
					':': colonTextToEnd,
					'\n': hiddenEnd,
				}),
			};

			const then = {'': 0};
			arrows.forEach((arrow) => (then[arrow] = connect));
			then[':'] = {
				type: 'operator',
				suggest: true,
				override: 'Label',
				then: {},
			};
			return makeOpBlock(
				{type: 'variable', suggest: {known: 'Agent'}, then},
				then
			);
		}

		const BASE_THEN = {
			'title': {type: 'keyword', suggest: true, then: {
				'': textToEnd,
			}},
			'theme': {type: 'keyword', suggest: true, then: {
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
			'headers': {type: 'keyword', suggest: true, then: {
				'none': {type: 'keyword', suggest: true, then: {}},
				'cross': {type: 'keyword', suggest: true, then: {}},
				'box': {type: 'keyword', suggest: true, then: {}},
				'fade': {type: 'keyword', suggest: true, then: {}},
				'bar': {type: 'keyword', suggest: true, then: {}},
			}},
			'terminators': {type: 'keyword', suggest: true, then: {
				'none': {type: 'keyword', suggest: true, then: {}},
				'cross': {type: 'keyword', suggest: true, then: {}},
				'box': {type: 'keyword', suggest: true, then: {}},
				'fade': {type: 'keyword', suggest: true, then: {}},
				'bar': {type: 'keyword', suggest: true, then: {}},
			}},
			'divider': {type: 'keyword', suggest: true, then: Object.assign({
				'space': {type: 'keyword', suggest: true, then: divider},
				'line': {type: 'keyword', suggest: true, then: divider},
				'delay': {type: 'keyword', suggest: true, then: divider},
				'tear': {type: 'keyword', suggest: true, then: divider},
			}, divider)},
			'define': {type: 'keyword', suggest: true, then: {
				'': aliasListToEnd,
				'as': CM_ERROR,
			}},
			'begin': {type: 'keyword', suggest: true, then: {
				'': aliasListToEnd,
				'reference': refDef,
				'as': CM_ERROR,
			}},
			'end': {type: 'keyword', suggest: true, then: {
				'': aliasListToEnd,
				'as': CM_ERROR,
				'\n': end,
			}},
			'if': {type: 'keyword', suggest: true, then: {
				'': textToEnd,
				':': {type: 'operator', suggest: true, then: {
					'': textToEnd,
				}},
				'\n': end,
			}},
			'else': {type: 'keyword', suggest: ['else\n', 'else if: '], then: {
				'if': {type: 'keyword', suggest: 'if: ', then: {
					'': textToEnd,
					':': {type: 'operator', suggest: true, then: {
						'': textToEnd,
					}},
				}},
				'\n': end,
			}},
			'repeat': {type: 'keyword', suggest: true, then: {
				'': textToEnd,
				':': {type: 'operator', suggest: true, then: {
					'': textToEnd,
				}},
				'\n': end,
			}},
			'note': {type: 'keyword', suggest: true, then: {
				'over': {type: 'keyword', suggest: true, then: {
					'': agentListToText,
				}},
				'left': makeSideNote('left'),
				'right': makeSideNote('right'),
				'between': {type: 'keyword', suggest: true, then: {
					'': agentList2ToText,
				}},
			}},
			'state': {type: 'keyword', suggest: 'state over ', then: {
				'over': {type: 'keyword', suggest: true, then: {
					'': singleAgentToText,
				}},
			}},
			'text': {type: 'keyword', suggest: true, then: {
				'left': makeSideNote('left'),
				'right': makeSideNote('right'),
			}},
			'autolabel': {type: 'keyword', suggest: true, then: {
				'off': {type: 'keyword', suggest: true, then: {}},
				'': textTo({'\n': end}, [
					{v: '<label>', suffix: '\n', q: true},
					{v: '[<inc>] <label>', suffix: '\n', q: true},
					{v: '[<inc 1,0.01>] <label>', suffix: '\n', q: true},
				]),
			}},
			'simultaneously': {type: 'keyword', suggest: true, then: {
				':': {type: 'operator', suggest: true, then: {}},
				'with': {type: 'keyword', suggest: true, then: {
					'': {type: 'variable', suggest: {known: 'Label'}, then: {
						'': 0,
						':': {type: 'operator', suggest: true, then: {}},
					}},
				}},
			}},
		};

		return (arrows) => {
			return {
				type: 'error line-error',
				then: Object.assign({}, BASE_THEN, makeCMConnect(arrows)),
			};
		};
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

		return array.flatMap(suggestions, (suggest) => {
			if(suggest === true) {
				return [cmCappedToken(token, current)];
			} else if(typeof suggest === 'object') {
				if(suggest.known) {
					return state['known' + suggest.known] || [];
				} else {
					return [suggest];
				}
			} else if(typeof suggest === 'string' && suggest) {
				return [{v: suggest, q: (token === '')}];
			} else {
				return [];
			}
		});
	}

	function cmMakeCompletions(state, path) {
		const comp = [];
		const current = array.last(path);
		Object.keys(current.then).forEach((token) => {
			let next = current.then[token];
			if(typeof next === 'number') {
				next = path[path.length - next - 1];
			}
			array.mergeSets(
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
			array.mergeSets(
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
			if(found === undefined) {
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
			current = array.last(path);
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

	return class Mode {
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
			let lastChar = '';
			while(true) {
				if(stream.eol()) {
					return false;
				}
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
				lastChar = stream.next();
			}
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
			while(true) {
				const block = this.tokenDefinitions[state.currentType];
				this._tokenCheckEscape(stream, state, block);
				if(!block.end) {
					return this._tokenEndFound(stream, state, block, null);
				} else {
					const match = this._matchPattern(stream, block.end, true);
					if(match) {
						return this._tokenEndFound(stream, state, block, match);
					}
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
	};
});
