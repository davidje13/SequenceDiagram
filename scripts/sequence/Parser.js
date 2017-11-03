define([
	'core/ArrayUtilities',
	'./Tokeniser',
	'./CodeMirrorHints',
], (
	array,
	Tokeniser,
	CMHints
) => {
	'use strict';

	const BLOCK_TYPES = {
		'if': {type: 'block begin', mode: 'if', skip: []},
		'else': {type: 'block split', mode: 'else', skip: ['if']},
		'elif': {type: 'block split', mode: 'else', skip: []},
		'repeat': {type: 'block begin', mode: 'repeat', skip: []},
	};

	const CONNECTION_TYPES = {
		'->': {line: 'solid', left: false, right: true},
		'<-': {line: 'solid', left: true, right: false},
		'<->': {line: 'solid', left: true, right: true},
		'-->': {line: 'dash', left: false, right: true},
		'<--': {line: 'dash', left: true, right: false},
		'<-->': {line: 'dash', left: true, right: true},
	};

	const AGENT_OPTIONS = {
		'+': 'start',
		'-': 'stop',
	};

	const TERMINATOR_TYPES = [
		'none',
		'box',
		'cross',
		'bar',
	];

	const NOTE_TYPES = {
		'text': {
			mode: 'text',
			types: {
				'left': {type: 'note left', skip: ['of'], min: 0, max: null},
				'right': {type: 'note right', skip: ['of'], min: 0, max: null},
			},
		},
		'note': {
			mode: 'note',
			types: {
				'over': {type: 'note over', skip: [], min: 0, max: null},
				'left': {type: 'note left', skip: ['of'], min: 0, max: null},
				'right': {type: 'note right', skip: ['of'], min: 0, max: null},
				'between': {type: 'note between', skip: [], min: 2, max: null},
			},
		},
		'state': {
			mode: 'state',
			types: {
				'over': {type: 'note over', skip: [], min: 1, max: 1},
			},
		},
	};

	const AGENT_MANIPULATION_TYPES = {
		'define': {type: 'agent define'},
		'begin': {type: 'agent begin', mode: 'box'},
		'end': {type: 'agent end', mode: 'cross'},
	};

	function joinLabel(line, begin = 0, end = null) {
		if(end === null) {
			end = line.length;
		}
		if(end <= begin) {
			return '';
		}
		let result = line[begin].v;
		for(let i = begin + 1; i < end; ++ i) {
			result += line[i].s + line[i].v;
		}
		return result;
	}

	function tokenKeyword(token) {
		if(!token || token.q) {
			return null;
		}
		return token.v;
	}

	function skipOver(line, start, skip, error = null) {
		const pass = skip.every((expected, i) => (
			tokenKeyword(line[start + i]) === expected
		));
		if(!pass) {
			if(error) {
				throw new Error(error + ': ' + joinLabel(line));
			} else {
				return start;
			}
		}
		return start + skip.length;
	}

	function findToken(line, token, start = 0) {
		for(let i = start; i < line.length; ++ i) {
			if(tokenKeyword(line[i]) === token) {
				return i;
			}
		}
		return -1;
	}

	function parseAgentList(line, start, end) {
		const list = [];
		let current = '';
		let first = true;
		for(let i = start; i < end; ++ i) {
			const token = line[i];
			if(tokenKeyword(token) === ',') {
				if(current) {
					list.push({name: current});
					current = '';
					first = true;
				}
			} else {
				if(!first) {
					current += token.s;
				} else {
					first = false;
				}
				current += token.v;
			}
		}
		if(current) {
			list.push({name: current});
		}
		return list;
	}

	function readAgentDetails(line, begin, end) {
		const options = [];
		let p = begin;
		for(; p < end; ++ p) {
			const option = AGENT_OPTIONS[tokenKeyword(line[p])];
			if(option) {
				options.push(option);
			} else {
				break;
			}
		}
		return {
			agent: {name: joinLabel(line, p, end)},
			options,
		};
	}

	const PARSERS = [
		(line, meta) => { // title
			if(tokenKeyword(line[0]) !== 'title') {
				return null;
			}

			meta.title = joinLabel(line, 1);
			return true;
		},

		(line, meta) => { // terminators
			if(tokenKeyword(line[0]) !== 'terminators') {
				return null;
			}

			const type = tokenKeyword(line[1]);
			if(TERMINATOR_TYPES.indexOf(type) === -1) {
				throw new Error('Unknown termination: ' + joinLabel(line));
			}
			meta.terminators = type;
			return true;
		},

		(line) => { // block
			if(tokenKeyword(line[0]) === 'end' && line.length === 1) {
				return {type: 'block end'};
			}

			const type = BLOCK_TYPES[tokenKeyword(line[0])];
			if(!type) {
				return null;
			}
			let skip = 1;
			if(line.length > skip) {
				skip = skipOver(line, skip, type.skip, 'Invalid block command');
			}
			skip = skipOver(line, skip, [':']);
			return {
				type: type.type,
				mode: type.mode,
				label: joinLabel(line, skip),
			};
		},

		(line) => { // agent
			const type = AGENT_MANIPULATION_TYPES[tokenKeyword(line[0])];
			if(!type || line.length <= 1) {
				return null;
			}
			return Object.assign({
				agents: parseAgentList(line, 1, line.length),
			}, type);
		},

		(line) => { // async
			if(tokenKeyword(line[0]) !== 'simultaneously') {
				return null;
			}
			if(tokenKeyword(array.last(line)) !== ':') {
				return null;
			}
			let target = '';
			if(line.length > 2) {
				if(tokenKeyword(line[1]) !== 'with') {
					return null;
				}
				target = joinLabel(line, 2, line.length - 1);
			}
			return {
				type: 'async',
				target,
			};
		},

		(line) => { // note
			const mode = NOTE_TYPES[tokenKeyword(line[0])];
			const labelSplit = findToken(line, ':');
			if(!mode || labelSplit === -1) {
				return null;
			}
			const type = mode.types[tokenKeyword(line[1])];
			if(!type) {
				return null;
			}
			let skip = 2;
			skip = skipOver(line, skip, type.skip);
			const agents = parseAgentList(line, skip, labelSplit);
			if(
				agents.length < type.min ||
				(type.max !== null && agents.length > type.max)
			) {
				throw new Error(
					'Invalid ' + mode.mode +
					': ' + joinLabel(line)
				);
			}
			return {
				type: type.type,
				agents,
				mode: mode.mode,
				label: joinLabel(line, labelSplit + 1),
			};
		},

		(line) => { // connection
			let labelSplit = findToken(line, ':');
			if(labelSplit === -1) {
				labelSplit = line.length;
			}
			let typeSplit = -1;
			let options = null;
			for(let j = 0; j < line.length; ++ j) {
				const opts = CONNECTION_TYPES[tokenKeyword(line[j])];
				if(opts) {
					typeSplit = j;
					options = opts;
					break;
				}
			}
			if(typeSplit <= 0 || typeSplit >= labelSplit - 1) {
				return null;
			}
			const from = readAgentDetails(line, 0, typeSplit);
			const to = readAgentDetails(line, typeSplit + 1, labelSplit);
			return {
				type: 'connection',
				agents: [
					from.agent,
					to.agent,
				],
				label: joinLabel(line, labelSplit + 1),
				options,
			};
		},

		(line) => { // marker
			if(line.length < 2 || tokenKeyword(array.last(line)) !== ':') {
				return null;
			}
			return {
				type: 'mark',
				name: joinLabel(line, 0, line.length - 1),
			};
		},
	];

	function parseLine(line, {meta, stages}) {
		let stage = null;
		for(let i = 0; i < PARSERS.length; ++ i) {
			stage = PARSERS[i](line, meta);
			if(stage) {
				break;
			}
		}
		if(!stage) {
			throw new Error('Unrecognised command: ' + joinLabel(line));
		}
		if(typeof stage === 'object') {
			stages.push(stage);
		}
	}

	const SHARED_TOKENISER = new Tokeniser();

	return class Parser {
		getCodeMirrorMode() {
			return SHARED_TOKENISER.getCodeMirrorMode();
		}

		getCodeMirrorHints() {
			return CMHints.getHints;
		}

		parseLines(lines) {
			const result = {
				meta: {
					title: '',
					terminators: 'none',
				},
				stages: [],
			};

			lines.forEach((line) => parseLine(line, result));

			return result;
		}

		parse(src) {
			const tokens = SHARED_TOKENISER.tokenise(src);
			const lines = SHARED_TOKENISER.splitLines(tokens);
			return this.parseLines(lines);
		}
	};
});
