import {combine, last} from '../../core/ArrayUtilities.mjs';
import Tokeniser from './Tokeniser.mjs';
import labelPatternParser from './LabelPatternParser.mjs';
import markdownParser from './MarkdownParser.mjs';

const BLOCK_TYPES = new Map();
BLOCK_TYPES.set('if', {
	blockType: 'if',
	skip: [],
	tag: 'if',
	type: 'block begin',
});
BLOCK_TYPES.set('else', {
	blockType: 'else',
	skip: ['if'],
	tag: 'else',
	type: 'block split',
});
BLOCK_TYPES.set('repeat', {
	blockType: 'repeat',
	skip: [],
	tag: 'repeat',
	type: 'block begin',
});
BLOCK_TYPES.set('group', {
	blockType: 'group',
	skip: [],
	tag: '',
	type: 'block begin',
});

const CONNECT = {
	agentFlags: {
		'!': {flag: 'end'},
		'*': {allowBlankName: true, blankNameFlag: 'source', flag: 'begin'},
		'+': {flag: 'start'},
		'-': {flag: 'stop'},
	},

	types: ((() => {
		const lTypes = [
			{tok: '', type: 0},
			{tok: '<', type: 1},
			{tok: '<<', type: 2},
		];
		const mTypes = [
			{tok: '-', type: 'solid'},
			{tok: '--', type: 'dash'},
			{tok: '~', type: 'wave'},
		];
		const rTypes = [
			{tok: '', type: 0},
			{tok: '>', type: 1},
			{tok: '>>', type: 2},
			{tok: 'x', type: 3},
		];
		const arrows = (combine([lTypes, mTypes, rTypes])
			.filter((arrow) => (arrow[0].type !== 0 || arrow[2].type !== 0))
		);

		const types = new Map();

		arrows.forEach((arrow) => {
			types.set(arrow.map((part) => part.tok).join(''), {
				left: arrow[0].type,
				line: arrow[1].type,
				right: arrow[2].type,
			});
		});

		return types;
	})()),
};

const TERMINATOR_TYPES = [
	'none',
	'box',
	'cross',
	'fade',
	'bar',
];

const NOTE_TYPES = new Map();
NOTE_TYPES.set('text', {
	mode: 'text',
	types: {
		'left': {
			max: Number.POSITIVE_INFINITY,
			min: 0,
			skip: ['of'],
			type: 'note left',
		},
		'right': {
			max: Number.POSITIVE_INFINITY,
			min: 0,
			skip: ['of'],
			type: 'note right',
		},
	},
});
NOTE_TYPES.set('note', {
	mode: 'note',
	types: {
		'between': {
			max: Number.POSITIVE_INFINITY,
			min: 2,
			skip: [],
			type: 'note between',
		},
		'left': {
			max: Number.POSITIVE_INFINITY,
			min: 0,
			skip: ['of'],
			type: 'note left',
		},
		'over': {
			max: Number.POSITIVE_INFINITY,
			min: 0,
			skip: [],
			type: 'note over',
		},
		'right': {
			max: Number.POSITIVE_INFINITY,
			min: 0,
			skip: ['of'],
			type: 'note right',
		},
	},
});
NOTE_TYPES.set('state', {
	mode: 'state',
	types: {
		'over': {max: 1, min: 1, skip: [], type: 'note over'},
	},
});

const DIVIDER_TYPES = new Map();
DIVIDER_TYPES.set('line', {defaultHeight: 6});
DIVIDER_TYPES.set('space', {defaultHeight: 6});
DIVIDER_TYPES.set('delay', {defaultHeight: 30});
DIVIDER_TYPES.set('tear', {defaultHeight: 6});

const AGENT_MANIPULATION_TYPES = new Map();
AGENT_MANIPULATION_TYPES.set('define', {type: 'agent define'});
AGENT_MANIPULATION_TYPES.set('begin', {mode: 'box', type: 'agent begin'});
AGENT_MANIPULATION_TYPES.set('end', {mode: 'cross', type: 'agent end'});

function makeError(message, token = null) {
	let suffix = '';
	if(token) {
		suffix = (
			' at line ' + (token.b.ln + 1) +
			', character ' + token.b.ch
		);
	}
	return new Error(message + suffix);
}

function endIndexInLine(line, end = null) {
	if(end === null) {
		return line.length;
	}
	return end;
}

function joinLabel(line, begin = 0, end = null) {
	const e = endIndexInLine(line, end);
	if(e <= begin) {
		return '';
	}
	let result = line[begin].v;
	for(let i = begin + 1; i < e; ++ i) {
		result += line[i].s + line[i].v;
	}
	return result;
}

function readNumber(line, begin = 0, end = null, def = Number.NAN) {
	const text = joinLabel(line, begin, end);
	return Number(text || def);
}

function tokenKeyword(token) {
	if(!token || token.q) {
		return null;
	}
	return token.v;
}

function skipOver(line, start, skip, error = null) {
	for(let i = 0; i < skip.length; ++ i) {
		const expected = skip[i];
		const token = line[start + i];
		if(tokenKeyword(token) !== expected) {
			if(error) {
				throw makeError(
					error + '; expected "' + expected + '"',
					token
				);
			} else {
				return start;
			}
		}
	}
	return start + skip.length;
}

function findTokens(line, tokens, {
	start = 0,
	limit = null,
	orEnd = false,
} = {}) {
	const e = endIndexInLine(line, limit);
	for(let i = start; i <= e - tokens.length; ++ i) {
		if(skipOver(line, i, tokens) !== i) {
			return i;
		}
	}
	return orEnd ? e : -1;
}

function findFirstToken(line, tokenMap, {start = 0, limit = null} = {}) {
	const e = endIndexInLine(line, limit);
	for(let pos = start; pos < e; ++ pos) {
		const value = tokenMap.get(tokenKeyword(line[pos]));
		if(value) {
			return {pos, value};
		}
	}
	return null;
}

function readAgentAlias(line, start, end, {enableAlias, allowBlankName}) {
	let aliasSep = end;
	if(enableAlias) {
		aliasSep = findTokens(line, ['as'], {limit: end, orEnd: true, start});
	}
	if(start >= aliasSep && !allowBlankName) {
		let errPosToken = line[start];
		if(!errPosToken) {
			errPosToken = {b: last(line).e};
		}
		throw makeError('Missing agent name', errPosToken);
	}
	return {
		alias: joinLabel(line, aliasSep + 1, end),
		name: joinLabel(line, start, aliasSep),
	};
}

function readAgent(line, start, end, {
	flagTypes = {},
	aliases = false,
} = {}) {
	const flags = [];
	const blankNameFlags = [];
	let p = start;
	let allowBlankName = false;
	for(; p < end; ++ p) {
		const token = line[p];
		const rawFlag = tokenKeyword(token);
		const flag = flagTypes[rawFlag];
		if(!flag) {
			break;
		}
		if(flags.includes(flag.flag)) {
			throw makeError('Duplicate agent flag: ' + rawFlag, token);
		}
		allowBlankName = allowBlankName || Boolean(flag.allowBlankName);
		flags.push(flag.flag);
		blankNameFlags.push(flag.blankNameFlag);
	}
	const {name, alias} = readAgentAlias(line, p, end, {
		allowBlankName,
		enableAlias: aliases,
	});
	return {
		alias,
		flags: name ? flags : blankNameFlags,
		name,
	};
}

function readAgentList(line, start, end, readAgentOpts) {
	const list = [];
	let currentStart = -1;
	for(let i = start; i < end; ++ i) {
		const token = line[i];
		if(tokenKeyword(token) === ',') {
			if(currentStart !== -1) {
				list.push(readAgent(line, currentStart, i, readAgentOpts));
				currentStart = -1;
			}
		} else if(currentStart === -1) {
			currentStart = i;
		}
	}
	if(currentStart !== -1) {
		list.push(readAgent(line, currentStart, end, readAgentOpts));
	}
	return list;
}

const PARSERS = [
	{begin: ['title'], fn: (line, meta) => { // Title
		meta.title = joinLabel(line, 1);
		return true;
	}},

	{begin: ['theme'], fn: (line, meta) => { // Theme
		meta.theme = joinLabel(line, 1);
		return true;
	}},

	{begin: ['terminators'], fn: (line, meta) => { // Terminators
		const type = tokenKeyword(line[1]);
		if(!type) {
			throw makeError('Unspecified termination', line[0]);
		}
		if(TERMINATOR_TYPES.indexOf(type) === -1) {
			throw makeError('Unknown termination "' + type + '"', line[1]);
		}
		meta.terminators = type;
		return true;
	}},

	{begin: ['headers'], fn: (line, meta) => { // Headers
		const type = tokenKeyword(line[1]);
		if(!type) {
			throw makeError('Unspecified header', line[0]);
		}
		if(TERMINATOR_TYPES.indexOf(type) === -1) {
			throw makeError('Unknown header "' + type + '"', line[1]);
		}
		meta.headers = type;
		return true;
	}},

	{begin: ['divider'], fn: (line) => { // Divider
		const labelSep = findTokens(line, [':'], {orEnd: true});
		const heightSep = findTokens(line, ['with', 'height'], {
			limit: labelSep,
			orEnd: true,
		});

		const mode = joinLabel(line, 1, heightSep) || 'line';
		if(!DIVIDER_TYPES.has(mode)) {
			throw makeError('Unknown divider type', line[1]);
		}

		const height = readNumber(
			line,
			heightSep + 2,
			labelSep,
			DIVIDER_TYPES.get(mode).defaultHeight
		);
		if(Number.isNaN(height) || height < 0) {
			throw makeError('Invalid divider height', line[heightSep + 2]);
		}

		return {
			height,
			label: joinLabel(line, labelSep + 1),
			mode,
			type: 'divider',
		};
	}},

	{begin: ['autolabel'], fn: (line) => { // Autolabel
		let raw = null;
		if(tokenKeyword(line[1]) === 'off') {
			raw = '<label>';
		} else {
			raw = joinLabel(line, 1);
		}
		return {
			pattern: labelPatternParser(raw),
			type: 'label pattern',
		};
	}},

	{begin: ['end'], fn: (line) => { // Block End
		if(line.length !== 1) {
			return null;
		}
		return {type: 'block end'};
	}},

	{begin: [], fn: (line) => { // Block
		const type = BLOCK_TYPES.get(tokenKeyword(line[0]));
		if(!type) {
			return null;
		}
		let skip = 1;
		if(line.length > skip) {
			skip = skipOver(line, skip, type.skip, 'Invalid block command');
		}
		skip = skipOver(line, skip, [':']);
		return {
			blockType: type.blockType,
			label: joinLabel(line, skip),
			tag: type.tag,
			type: type.type,
		};
	}},

	{begin: ['begin', 'reference'], fn: (line) => { // Begin reference
		let agents = [];
		const labelSep = findTokens(line, [':']);
		if(tokenKeyword(line[2]) === 'over' && labelSep > 3) {
			agents = readAgentList(line, 3, labelSep);
		} else if(labelSep !== 2) {
			throw makeError('Expected ":" or "over"', line[2]);
		}
		const def = readAgent(
			line,
			labelSep + 1,
			line.length,
			{aliases: true}
		);
		if(!def.alias) {
			throw makeError('Reference must have an alias', line[labelSep]);
		}
		return {
			agents,
			alias: def.alias,
			blockType: 'ref',
			label: def.name,
			tag: 'ref',
			type: 'group begin',
		};
	}},

	{begin: [], fn: (line) => { // Agent
		const type = AGENT_MANIPULATION_TYPES.get(tokenKeyword(line[0]));
		if(!type || line.length <= 1) {
			return null;
		}
		return Object.assign({
			agents: readAgentList(line, 1, line.length, {aliases: true}),
		}, type);
	}},

	{begin: ['simultaneously'], fn: (line) => { // Async
		if(tokenKeyword(last(line)) !== ':') {
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
			target,
			type: 'async',
		};
	}},

	{begin: [], fn: (line) => { // Note
		const mode = NOTE_TYPES.get(tokenKeyword(line[0]));
		const labelSep = findTokens(line, [':']);
		if(!mode || labelSep === -1) {
			return null;
		}
		const type = mode.types[tokenKeyword(line[1])];
		if(!type) {
			return null;
		}
		let skip = 2;
		skip = skipOver(line, skip, type.skip);
		const agents = readAgentList(line, skip, labelSep);
		if(agents.length < type.min) {
			throw makeError('Too few agents for ' + mode.mode, line[0]);
		}
		if(agents.length > type.max) {
			throw makeError('Too many agents for ' + mode.mode, line[0]);
		}
		return {
			agents,
			label: joinLabel(line, labelSep + 1),
			mode: mode.mode,
			type: type.type,
		};
	}},

	{begin: [], fn: (line) => { // Connect
		const labelSep = findTokens(line, [':'], {orEnd: true});
		const connectionToken = findFirstToken(
			line,
			CONNECT.types,
			{limit: labelSep - 1, start: 0}
		);
		if(!connectionToken) {
			return null;
		}

		const connectPos = connectionToken.pos;

		const readOpts = {
			flagTypes: CONNECT.agentFlags,
		};

		if(tokenKeyword(line[0]) === '...') {
			return {
				agent: readAgent(line, connectPos + 1, labelSep, readOpts),
				label: joinLabel(line, labelSep + 1),
				options: connectionToken.value,
				tag: joinLabel(line, 1, connectPos),
				type: 'connect-delay-end',
			};
		} else if(tokenKeyword(line[connectPos + 1]) === '...') {
			if(labelSep !== line.length) {
				throw makeError(
					'Cannot label beginning of delayed connection',
					line[labelSep]
				);
			}
			return {
				agent: readAgent(line, 0, connectPos, readOpts),
				options: connectionToken.value,
				tag: joinLabel(line, connectPos + 2, labelSep),
				type: 'connect-delay-begin',
			};
		} else {
			return {
				agents: [
					readAgent(line, 0, connectPos, readOpts),
					readAgent(line, connectPos + 1, labelSep, readOpts),
				],
				label: joinLabel(line, labelSep + 1),
				options: connectionToken.value,
				type: 'connect',
			};
		}
	}},

	{begin: [], fn: (line) => { // Marker
		if(line.length < 2 || tokenKeyword(last(line)) !== ':') {
			return null;
		}
		return {
			name: joinLabel(line, 0, line.length - 1),
			type: 'mark',
		};
	}},

	{begin: [], fn: (line) => { // Options
		const sepPos = findTokens(line, ['is']);
		if(sepPos < 1) {
			return null;
		}
		const indefiniteArticles = ['a', 'an'];
		let optionsBegin = sepPos + 1;
		if(indefiniteArticles.includes(tokenKeyword(line[optionsBegin]))) {
			++ optionsBegin;
		}
		if(optionsBegin === line.length) {
			throw makeError('Empty agent options', {b: last(line).e});
		}
		const agent = readAgent(line, 0, sepPos);
		const options = [];
		for(let i = optionsBegin; i < line.length; ++ i) {
			options.push(line[i].v);
		}
		return {
			agent,
			options,
			type: 'agent options',
		};
	}},
];

function stageFromLine(line, meta) {
	for(const {begin, fn} of PARSERS) {
		if(skipOver(line, 0, begin) !== begin.length) {
			continue;
		}
		const stage = fn(line, meta);
		if(stage) {
			return stage;
		}
	}
	return null;
}

function parseLine(line, {meta, stages}) {
	let parallel = false;
	const [start] = line;
	if(tokenKeyword(start) === '&') {
		parallel = true;
		line.splice(0, 1);
	}

	const stage = stageFromLine(line, meta);

	if(!stage) {
		throw makeError('Unrecognised command: ' + joinLabel(line), line[0]);
	} else if(typeof stage === 'object') {
		stage.ln = start.b.ln;
		stage.parallel = parallel;
		stages.push(stage);
	} else if(parallel) {
		throw makeError('Metadata cannot be parallel', start);
	}
}

const SHARED_TOKENISER = new Tokeniser();

export default class Parser {
	getCodeMirrorMode() {
		return SHARED_TOKENISER.getCodeMirrorMode(
			Array.from(CONNECT.types.keys())
		);
	}

	parseLines(lines, src) {
		const result = {
			meta: {
				code: src,
				headers: 'box',
				terminators: 'none',
				textFormatter: markdownParser,
				theme: '',
				title: '',
			},
			stages: [],
		};

		lines.forEach((line) => parseLine(line, result));

		return result;
	}

	parse(src) {
		const tokens = SHARED_TOKENISER.tokenise(src);
		const lines = SHARED_TOKENISER.splitLines(tokens);
		return this.parseLines(lines, src);
	}
}
