import CMMode from '../codemirror/Mode.mjs';

function execAt(str, reg, i) {
	reg.lastIndex = i;
	return reg.exec(str);
}

function unescape(match) {
	if(match[1] === 'n') {
		return '\n';
	}
	if('"\\'.indexOf(match[1]) !== -1) {
		return match[1];
	}
	return '\u001B' + match[1];
}

const TOKENS = [
	{end: /(?=\n)|$/y, omit: true, start: /#/y},
	{
		baseToken: {q: true},
		end: /"/y,
		escape: /\\(.)/y,
		escapeWith: unescape,
		start: /"/y,
	},
	{baseToken: {v: '...'}, start: /\.\.\./y},
	{end: /(?=[ \t\r\n:+~\-*!<,])|$/y, start: /(?=[^ \t\r\n:+~\-*!<,])/y},
	{
		end: /(?=[^~\-<>x])|[-~]x|[<>](?=x)|$/y,
		includeEnd: true,
		start: /(?=[~\-<])/y,
	},
	{baseToken: {v: ','}, start: /,/y},
	{baseToken: {v: ':'}, start: /:/y},
	{baseToken: {v: '!'}, start: /!/y},
	{baseToken: {v: '+'}, start: /\+/y},
	{baseToken: {v: '*'}, start: /\*/y},
	{baseToken: {v: '\n'}, start: /\n/y},
];

/* eslint-disable no-control-regex */ // Removing control characters is the aim
const CONTROL_CHARS = /[\x00-\x08\x0E-\x1F]/g;
/* eslint-enable no-control-regex */

function tokFindBegin(src, i) {
	for(let j = 0; j < TOKENS.length; ++ j) {
		const block = TOKENS[j];
		const match = execAt(src, block.start, i);
		if(match) {
			return {
				appendSpace: '',
				appendValue: '',
				end: !block.end,
				newBlock: block,
				skip: match[0].length,
			};
		}
	}
	return {
		appendSpace: src[i],
		appendValue: '',
		end: false,
		newBlock: null,
		skip: 1,
	};
}

function tokContinuePart(src, i, block) {
	if(block.escape) {
		const match = execAt(src, block.escape, i);
		if(match) {
			return {
				appendSpace: '',
				appendValue: block.escapeWith(match),
				end: false,
				newBlock: null,
				skip: match[0].length,
			};
		}
	}
	const match = execAt(src, block.end, i);
	if(match) {
		return {
			appendSpace: '',
			appendValue: block.includeEnd ? match[0] : '',
			end: true,
			newBlock: null,
			skip: match[0].length,
		};
	}
	return {
		appendSpace: '',
		appendValue: src[i],
		end: false,
		newBlock: null,
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

function copyPos(pos) {
	return {ch: pos.ch, i: pos.i, ln: pos.ln};
}

function advancePos(pos, src, steps) {
	for(let i = 0; i < steps; ++ i) {
		++ pos.ch;
		if(src[pos.i + i] === '\n') {
			++ pos.ln;
			pos.ch = 0;
		}
	}
	pos.i += steps;
}

class TokenState {
	constructor(src) {
		this.src = src.replace(CONTROL_CHARS, '');
		this.block = null;
		this.token = null;
		this.pos = {ch: 0, i: 0, ln: 0};
		this.reset();
	}

	isOver() {
		return this.pos.i > this.src.length;
	}

	reset() {
		this.token = {b: null, e: null, q: false, s: '', v: ''};
		this.block = null;
	}

	beginToken(advance) {
		this.block = advance.newBlock;
		Object.assign(this.token, this.block.baseToken);
		this.token.b = copyPos(this.pos);
	}

	endToken() {
		let tok = null;
		if(!this.block.omit) {
			this.token.e = copyPos(this.pos);
			tok = this.token;
		}
		this.reset();
		return tok;
	}

	advance() {
		const advance = tokAdvance(this.src, this.pos.i, this.block);

		if(advance.newBlock) {
			this.beginToken(advance);
		}

		this.token.s += advance.appendSpace;
		this.token.v += advance.appendValue;
		advancePos(this.pos, this.src, advance.skip);

		if(advance.end) {
			return this.endToken();
		} else {
			return null;
		}
	}
}

function posStr(pos) {
	return 'line ' + (pos.ln + 1) + ', character ' + pos.ch;
}

export default class Tokeniser {
	tokenise(src) {
		const tokens = [];
		const state = new TokenState(src);
		while(!state.isOver()) {
			const token = state.advance();
			if(token) {
				tokens.push(token);
			}
		}
		if(state.block) {
			throw new Error(
				'Unterminated literal (began at ' +
				posStr(state.token.b) + ')',
			);
		}
		return tokens;
	}

	getCodeMirrorMode(arrows) {
		return new CMMode(TOKENS, arrows);
	}

	splitLines(tokens) {
		const lines = [];
		let line = [];
		tokens.forEach((token) => {
			if(!token.q && token.v === '\n') {
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
}
