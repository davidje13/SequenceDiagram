define(['core/ArrayUtilities'], (array) => {
	'use strict';

	const TRIMMER = /^([ \t]*)(.*)$/;
	const SQUASH_START = /^[ \t\r\n:,]/;
	const SQUASH_END = /[ \t\r\n]$/;
	const ONGOING_QUOTE = /^"(\\.|[^"])*$/;
	const REQUIRED_QUOTED = /[\r\n:,"<>\-~]/;
	const QUOTE_ESCAPE = /["\\]/g;

	function suggestionsEqual(a, b) {
		return (
			(a.v === b.v) &&
			(a.prefix === b.prefix) &&
			(a.suffix === b.suffix) &&
			(a.q === b.q)
		);
	}

	function makeRangeFrom(cm, line, chFrom) {
		const ln = cm.getLine(line);
		const ranges = {
			word: {line: line, ch: chFrom},
			squash: {line: line, ch: chFrom},
		};
		if(chFrom > 0 && ln[chFrom - 1] === ' ') {
			ranges.squash.ch --;
		}
		return ranges;
	}

	function makeRangeTo(cm, line, chTo) {
		const ln = cm.getLine(line);
		const ranges = {
			word: {line: line, ch: chTo},
			squash: {line: line, ch: chTo},
		};
		if(ln[chTo] === ' ') {
			ranges.squash.ch ++;
		}
		return ranges;
	}

	function wrapQuote(entry, quote) {
		if(!quote && REQUIRED_QUOTED.test(entry.v)) {
			quote = '"';
		}
		let inner = entry.v;
		if(quote && entry.q) {
			inner = quote + inner.replace(QUOTE_ESCAPE, '\\$&') + quote;
		}
		return (entry.prefix || '') + inner + (entry.suffix || '');
	}

	function makeHintItem(entry, ranges, quote) {
		const quoted = wrapQuote(entry, quote);
		const from = entry.q ? ranges.fromVar : ranges.fromKey;
		if(quoted === '\n') {
			return {
				text: '\n',
				displayText: '<END>',
				className: 'pick-virtual',
				from: from.squash,
				to: ranges.to.squash,
				displayFrom: null,
			};
		} else {
			return {
				text: quoted,
				displayText: quoted.trim(),
				className: null,
				from: SQUASH_START.test(quoted) ? from.squash : from.word,
				to: SQUASH_END.test(quoted) ? ranges.to.squash : ranges.to.word,
				displayFrom: from.word,
			};
		}
	}

	function getGlobals({global, prefix = '', suffix = ''}, globals) {
		const identified = globals[global];
		if(!identified) {
			return [];
		}
		return identified.map((item) => ({v: item, prefix, suffix, q: true}));
	}

	function populateGlobals(suggestions, globals = {}) {
		for(let i = 0; i < suggestions.length;) {
			if(suggestions[i].global) {
				const identified = getGlobals(suggestions[i], globals);
				array.mergeSets(suggestions, identified, suggestionsEqual);
				suggestions.splice(i, 1);
			} else {
				++ i;
			}
		}
	}

	function getTokensUpTo(cm, pos) {
		const tokens = cm.getLineTokens(pos.line);
		for(let p = 0; p < tokens.length; ++ p) {
			if(tokens[p].end >= pos.ch) {
				tokens.length = p + 1;
				break;
			}
		}
		return tokens;
	}

	function getVariablePartial(tokens, pos) {
		let lastVariable = 0;
		let partial = '';
		let start = 0;
		let end = 0;
		tokens.forEach((token, p) => {
			if(token.state.isVar) {
				partial += token.string;
				end = token.end;
			} else {
				lastVariable = p + 1;
				partial = '';
				start = token.end;
			}
		});
		if(end > pos.ch) {
			partial = partial.substr(0, pos.ch - start);
		}
		const parts = TRIMMER.exec(partial);
		partial = parts[2];
		let quote = '';
		if(ONGOING_QUOTE.test(partial)) {
			quote = partial[0];
			partial = partial.substr(1);
		}
		return {
			partial,
			quote,
			from: start + parts[1].length,
			valid: end >= start,
		};
	}

	function getKeywordPartial(token, pos) {
		let partial = token.string;
		if(token.end > pos.ch) {
			partial = partial.substr(0, pos.ch - token.start);
		}
		const parts = TRIMMER.exec(partial);
		return {
			partial: parts[2],
			from: token.start + parts[1].length,
			valid: true,
		};
	}

	function suggestDropdownLocation(list, fromKey) {
		let p = null;
		list.forEach(({displayFrom}) => {
			if(displayFrom) {
				if(
					!p ||
					displayFrom.line > p.line ||
					(displayFrom.line === p.line && displayFrom.ch > p.ch)
				) {
					p = displayFrom;
				}
			}
		});
		return p || fromKey.word;
	}

	function partialMatch(v, p) {
		return p.valid && v.startsWith(p.partial);
	}

	function getHints(cm, options) {
		const cur = cm.getCursor();
		const tokens = getTokensUpTo(cm, cur);
		const token = array.last(tokens) || cm.getTokenAt(cur);
		const pVar = getVariablePartial(tokens, cur);
		const pKey = getKeywordPartial(token, cur);

		const continuation = (cur.ch > 0 && token.state.line.length > 0);
		let comp = (continuation ?
			token.state.completions :
			token.state.beginCompletions
		);
		if(!continuation) {
			comp = comp.concat(token.state.knownAgent);
		}

		populateGlobals(comp, cm.options.globals);

		const ranges = {
			fromVar: makeRangeFrom(cm, cur.line, pVar.from),
			fromKey: makeRangeFrom(cm, cur.line, pKey.from),
			to: makeRangeTo(cm, cur.line, token.end),
		};
		let selfValid = null;
		const list = (comp
			.filter((o) => (
				(o.q || !pVar.quote) &&
				partialMatch(o.v, o.q ? pVar : pKey)
			))
			.map((o) => {
				if(!options.completeSingle) {
					if(o.v === (o.q ? pVar : pKey).partial) {
						selfValid = o;
						return null;
					}
				}
				return makeHintItem(o, ranges, pVar.quote);
			})
			.filter((opt) => (opt !== null))
		);
		if(selfValid && list.length > 0) {
			list.unshift(makeHintItem(selfValid, ranges, pVar.quote));
		}

		return {
			list,
			from: suggestDropdownLocation(list, ranges.fromKey),
			to: ranges.to.word,
		};
	}

	return {
		getHints,
	};
});
