define(['./CodeMirrorMode'], (CMMode) => {
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
		{
			start: /"/y,
			end: /"/y,
			escape: /\\(.)/y,
			escapeWith: unescape,
			baseToken: {q: true},
		},
		{
			start: /'/y,
			end: /'/y,
			escape: /\\(.)/y,
			escapeWith:
			unescape,
			baseToken: {q: true},
		},
		{start: /(?=[^ \t\r\n:+\-~*!<>,])/y, end: /(?=[ \t\r\n:+\-~*!<>,])|$/y},
		{
			start: /(?=[\-~<])/y,
			end: /(?=[^\-~<>x])|[\-~]x|[<>](?=x)|$/y,
			includeEnd: true,
		},
		{start: /,/y, baseToken: {v: ','}},
		{start: /:/y, baseToken: {v: ':'}},
		{start: /!/y, baseToken: {v: '!'}},
		{start: /\+/y, baseToken: {v: '+'}},
		{start: /\*/y, baseToken: {v: '*'}},
		{start: /\n/y, baseToken: {v: '\n'}},
	];

	function tokFindBegin(src, i) {
		for(let j = 0; j < TOKENS.length; ++ j) {
			const block = TOKENS[j];
			const match = execAt(src, block.start, i);
			if(match) {
				return {
					newBlock: block,
					end: !block.end,
					appendSpace: '',
					appendValue: '',
					skip: match[0].length,
				};
			}
		}
		return {
			newBlock: null,
			end: false,
			appendSpace: src[i],
			appendValue: '',
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
					appendSpace: '',
					appendValue: block.escapeWith(match),
					skip: match[0].length,
				};
			}
		}
		const match = execAt(src, block.end, i);
		if(match) {
			return {
				newBlock: null,
				end: true,
				appendSpace: '',
				appendValue: block.includeEnd ? match[0] : '',
				skip: match[0].length,
			};
		}
		return {
			newBlock: null,
			end: false,
			appendSpace: '',
			appendValue: src[i],
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
		return {i: pos.i, ln: pos.ln, ch: pos.ch};
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
			this.src = src;
			this.block = null;
			this.token = null;
			this.pos = {i: 0, ln: 0, ch: 0};
			this.reset();
		}

		isOver() {
			return this.pos.i > this.src.length;
		}

		reset() {
			this.token = {s: '', v: '', q: false, b: null, e: null};
			this.block = null;
		}

		beginToken(advance) {
			this.block = advance.newBlock;
			Object.assign(this.token, this.block.baseToken);
			this.token.b = copyPos(this.pos);
		}

		endToken() {
			let token = null;
			if(!this.block.omit) {
				this.token.e = copyPos(this.pos);
				token = this.token;
			}
			this.reset();
			return token;
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

	return class Tokeniser {
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
					posStr(state.token.b) + ')'
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
	};
});
