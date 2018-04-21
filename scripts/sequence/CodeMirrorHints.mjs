/* eslint-disable complexity */ // Temporary ignore while switching linter

import {last, mergeSets} from '../core/ArrayUtilities.mjs';

const TRIMMER = /^([ \t]*)(.*)$/;
const SQUASH = {
	after: '.!+', // Cannot squash after * or - in all cases
	end: /[ \t\r\n]$/,
	start: /^[ \t\r\n:,]/,
};
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
		squash: {ch: chFrom, line},
		word: {ch: chFrom, line},
	};
	if(chFrom > 0 && ln[chFrom - 1] === ' ') {
		if(SQUASH.after.includes(ln[chFrom - 2])) {
			ranges.word.ch --;
		}
		ranges.squash.ch --;
	}
	return ranges;
}

function makeRangeTo(cm, line, chTo) {
	const ln = cm.getLine(line);
	const ranges = {
		squash: {ch: chTo, line},
		word: {ch: chTo, line},
	};
	if(ln[chTo] === ' ') {
		ranges.squash.ch ++;
	}
	return ranges;
}

function wrapQuote({v, q, prefix = '', suffix = ''}, quote) {
	const quo = (quote || !REQUIRED_QUOTED.test(v)) ? quote : '"';
	return (
		prefix +
		((quo && q) ? (quo + v.replace(QUOTE_ESCAPE, '\\$&') + quo) : v) +
		suffix
	);
}

function makeHintItem(entry, ranges, quote) {
	const quoted = wrapQuote(entry, quote);
	const from = entry.q ? ranges.fromVar : ranges.fromKey;
	if(quoted === '\n') {
		return {
			className: 'pick-virtual',
			displayFrom: null,
			displayText: '<END>',
			from: from.squash,
			text: '\n',
			to: ranges.to.squash,
		};
	} else {
		return {
			className: null,
			displayFrom: from.word,
			displayText: quoted.trim(),
			from: SQUASH.start.test(quoted) ? from.squash : from.word,
			text: quoted,
			to: SQUASH.end.test(quoted) ? ranges.to.squash : ranges.to.word,
		};
	}
}

function getGlobals({global, prefix = '', suffix = ''}, globals) {
	const identified = globals[global];
	if(!identified) {
		return [];
	}
	return identified.map((item) => ({prefix, q: true, suffix, v: item}));
}

function populateGlobals(suggestions, globals = {}) {
	for(let i = 0; i < suggestions.length;) {
		if(suggestions[i].global) {
			const identified = getGlobals(suggestions[i], globals);
			mergeSets(suggestions, identified, suggestionsEqual);
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
	let partial = '';
	let start = 0;
	let fin = 0;
	tokens.forEach((token) => {
		if(token.state.isVar) {
			partial += token.string;
			fin = token.end;
		} else {
			partial = '';
			start = token.end;
		}
	});
	if(fin > pos.ch) {
		partial = partial.substr(0, pos.ch - start);
	}
	const parts = TRIMMER.exec(partial);
	partial = parts[2];
	let quote = '';
	if(ONGOING_QUOTE.test(partial)) {
		quote = partial.charAt(0);
		partial = partial.substr(1);
	}
	return {
		from: start + parts[1].length,
		partial,
		quote,
		valid: fin >= start,
	};
}

function getKeywordPartial(token, pos) {
	let partial = token.string;
	if(token.end > pos.ch) {
		partial = partial.substr(0, pos.ch - token.start);
	}
	const parts = TRIMMER.exec(partial);
	return {
		from: token.start + parts[1].length,
		partial: parts[2],
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

export function getHints(cm, options) {
	const cur = cm.getCursor();
	const tokens = getTokensUpTo(cm, cur);
	const token = last(tokens) || cm.getTokenAt(cur);
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
		fromKey: makeRangeFrom(cm, cur.line, pKey.from),
		fromVar: makeRangeFrom(cm, cur.line, pVar.from),
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
		from: suggestDropdownLocation(list, ranges.fromKey),
		list,
		to: ranges.to.word,
	};
}
