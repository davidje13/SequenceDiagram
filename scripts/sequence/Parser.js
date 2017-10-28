define(['core/ArrayUtilities'], (array) => {
	'use strict';

	function execAt(str, reg, i) {
		reg.lastIndex = i;
		return reg.exec(str);
	}

	function unescape(match) {
		const c = match[1];
		if(c === 'n') {
			return '\n';
		}
		return match[1];
	}

	const TOKENS = [
		{start: /#/y, end: /(?=\n)|$/y, omit: true},
		{start: /"/y, end: /"/y, escape: /\\(.)/y, escapeWith: unescape},
		{start: /'/y, end: /'/y, escape: /\\(.)/y, escapeWith: unescape},
		{start: /(?=[^ \t\r\n:+\-<>,])/y, end: /(?=[ \t\r\n:+\-<>,])|$/y},
		{start: /(?=[+\-<>])/y, end: /(?=[^+\-<>])|$/y},
		{start: /,/y, prefix: ','},
		{start: /:/y, prefix: ':'},
		{start: /\n/y, prefix: '\n'},
	];

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

	const TERMINATOR_TYPES = [
		'none',
		'box',
		'cross',
		'bar',
	];

	const NOTE_TYPES = {
		'note': {
			mode: 'note',
			types: {
				'over': {type: 'note over', skip: [], min: 1, max: null},
				'left': {type: 'note left', skip: ['of'], min: 1, max: null},
				'right': {type: 'note right', skip: ['of'], min: 1, max: null},
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

	function tokFindBegin(src, i) {
		for(let j = 0; j < TOKENS.length; ++ j) {
			const block = TOKENS[j];
			const match = execAt(src, block.start, i);
			if(match) {
				return {
					newBlock: block,
					end: !block.end,
					append: (block.prefix || ''),
					skip: match[0].length,
				};
			}
		}
		return {
			newBlock: null,
			end: false,
			append: '',
			skip: 1,
		};
	}

	function tokContinuePart(src, i, block) {
		if(block.escape) {
			const match = execAt(src, block.escape, i);
			if(match) {
				return {
					newBlock: null,
					end: false,
					append: block.escapeWith(match),
					skip: match[0].length,
				};
			}
		}
		const match = execAt(src, block.end, i);
		if(match) {
			return {
				newBlock: null,
				end: true,
				append: '',
				skip: match[0].length,
			};
		}
		return {
			newBlock: null,
			end: false,
			append: src[i],
			skip: 1,
		};
	}

	function tokAdvance(src, i, block) {
		if(block) {
			return tokContinuePart(src, i, block);
		} else {
			return tokFindBegin(src, i);
		}
	}

	function skipOver(line, start, skip, error = null) {
		if(skip.some((token, i) => (line[start + i] !== token))) {
			if(error) {
				throw new Error(error + ': ' + line.join(' '));
			} else {
				return start;
			}
		}
		return start + skip.length;
	}

	function parseCommaList(tokens) {
		const list = [];
		let current = '';
		tokens.forEach((token) => {
			if(token === ',') {
				if(current) {
					list.push(current);
					current = '';
				}
			} else {
				current += (current ? ' ' : '') + token;
			}
		});
		if(current) {
			list.push(current);
		}
		return list;
	}

	const PARSERS = [
		(line, meta) => { // title
			if(line[0] !== 'title') {
				return null;
			}

			meta.title = line.slice(1).join(' ');
			return true;
		},

		(line, meta) => { // terminators
			if(line[0] !== 'terminators') {
				return null;
			}

			if(TERMINATOR_TYPES.indexOf(line[1]) === -1) {
				throw new Error('Unknown termination: ' + line.join(' '));
			}
			meta.terminators = line[1];
			return true;
		},

		(line) => { // block
			if(line[0] === 'end' && line.length === 1) {
				return {type: 'block end'};
			}

			const type = BLOCK_TYPES[line[0]];
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
				label: line.slice(skip).join(' '),
			};
		},

		(line) => { // agent
			const type = AGENT_MANIPULATION_TYPES[line[0]];
			if(!type) {
				return null;
			}
			if(line.length <= 1) {
				return null;
			}
			return Object.assign({
				agents: parseCommaList(line.slice(1)),
			}, type);
		},

		(line) => { // async
			if(line[0] !== 'simultaneously') {
				return null;
			}
			if(array.last(line) !== ':') {
				return null;
			}
			let target = '';
			if(line.length > 2) {
				if(line[1] !== 'with') {
					return null;
				}
				target = line.slice(2, line.length - 1).join(' ');
			}
			return {
				type: 'async',
				target,
			};
		},

		(line) => { // note
			const mode = NOTE_TYPES[line[0]];
			const labelSplit = line.indexOf(':');
			if(!mode || labelSplit === -1) {
				return null;
			}
			const type = mode.types[line[1]];
			if(!type) {
				return null;
			}
			let skip = 2;
			skip = skipOver(line, skip, type.skip);
			const agents = parseCommaList(line.slice(skip, labelSplit));
			if(
				agents.length < type.min ||
				(type.max !== null && agents.length > type.max)
			) {
				throw new Error('Invalid ' + line[0] + ': ' + line.join(' '));
			}
			return {
				type: type.type,
				agents,
				mode: mode.mode,
				label: line.slice(labelSplit + 1).join(' '),
			};
		},

		(line) => { // connection
			let labelSplit = line.indexOf(':');
			if(labelSplit === -1) {
				labelSplit = line.length;
			}
			let typeSplit = -1;
			let options = null;
			for(let j = 0; j < line.length; ++ j) {
				const opts = CONNECTION_TYPES[line[j]];
				if(opts) {
					typeSplit = j;
					options = opts;
					break;
				}
			}
			if(typeSplit <= 0 || typeSplit >= labelSplit - 1) {
				return null;
			}
			return Object.assign({
				type: 'connection',
				agents: [
					line.slice(0, typeSplit).join(' '),
					line.slice(typeSplit + 1, labelSplit).join(' '),
				],
				label: line.slice(labelSplit + 1).join(' '),
			}, options);
		},

		(line) => { // marker
			if(line.length < 2 || array.last(line) !== ':') {
				return null;
			}
			return {
				type: 'mark',
				name: line.slice(0, line.length - 1).join(' '),
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
			throw new Error('Unrecognised command: ' + line.join(' '));
		}
		if(typeof stage === 'object') {
			stages.push(stage);
		}
	}

	return class Parser {
		tokenise(src) {
			const tokens = [];
			let block = null;
			let current = '';
			for(let i = 0; i <= src.length;) {
				const {newBlock, end, append, skip} = tokAdvance(src, i, block);
				if(newBlock) {
					block = newBlock;
					current = '';
				}
				current += append;
				i += skip;
				if(end) {
					if(!block.omit) {
						tokens.push(current);
					}
					block = null;
				}
			}
			if(block) {
				throw new Error('Unterminated block');
			}
			return tokens;
		}

		splitLines(tokens) {
			const lines = [];
			let line = [];
			tokens.forEach((token) => {
				if(token === '\n') {
					if(line.length > 0) {
						lines.push(line);
						line = [];
					}
				} else {
					line.push(token);
				}
			});
			if(line.length > 0) {
				lines.push(line);
			}
			return lines;
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
			const tokens = this.tokenise(src);
			const lines = this.splitLines(tokens);
			return this.parseLines(lines);
		}
	};
});

