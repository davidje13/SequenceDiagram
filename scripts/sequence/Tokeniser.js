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
		{start: /(?=[^ \t\r\n:+\-*!<>,])/y, end: /(?=[ \t\r\n:+\-*!<>,])|$/y},
		{start: /(?=[\-<>])/y, end: /(?=[^\-<>])|$/y},
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
				appendValue: '',
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

	return class Tokeniser {
		tokenise(src) {
			const tokens = [];
			let block = null;
			let current = {s: '', v: '', q: false};
			for(let i = 0; i <= src.length;) {
				const advance = tokAdvance(src, i, block);
				if(advance.newBlock) {
					block = advance.newBlock;
					Object.assign(current, block.baseToken);
				}
				current.s += advance.appendSpace;
				current.v += advance.appendValue;
				i += advance.skip;
				if(advance.end) {
					if(!block.omit) {
						tokens.push(current);
					}
					current = {s: '', v: '', q: false};
					block = null;
				}
			}
			if(block) {
				throw new Error('Unterminated block');
			}
			return tokens;
		}

		getCodeMirrorMode() {
			return new CMMode(TOKENS);
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
