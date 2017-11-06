define(['core/ArrayUtilities'], (array) => {
	'use strict';

	const TRIMMER = /^([ \t]*)(.*)$/;
	const SQUASH_START = /^[ \t\r\n:,]/;
	const SQUASH_END = /[ \t\r\n]$/;

	function makeRanges(cm, line, chFrom, chTo) {
		const ln = cm.getLine(line);
		const ranges = {
			wordFrom: {line: line, ch: chFrom},
			squashFrom: {line: line, ch: chFrom},
			wordTo: {line: line, ch: chTo},
			squashTo: {line: line, ch: chTo},
		};
		if(chFrom > 0 && ln[chFrom - 1] === ' ') {
			ranges.squashFrom.ch --;
		}
		if(ln[chTo] === ' ') {
			ranges.squashTo.ch ++;
		}
		return ranges;
	}

	function makeHintItem(text, ranges) {
		return {
			text: text,
			displayText: (text === '\n') ? '<END>' : text.trim(),
			className: (text === '\n') ? 'pick-virtual' : null,
			from: SQUASH_START.test(text) ? ranges.squashFrom : ranges.wordFrom,
			to: SQUASH_END.test(text) ? ranges.squashTo : ranges.wordTo,
		};
	}

	function getGlobals({global, prefix = '', suffix = ''}, globals) {
		const identified = globals[global];
		if(!identified) {
			return [];
		}
		return identified.map((item) => (prefix + item + suffix));
	}

	function populateGlobals(suggestions, globals = {}) {
		for(let i = 0; i < suggestions.length;) {
			if(typeof suggestions[i] === 'object') {
				const identified = getGlobals(suggestions[i], globals);
				array.mergeSets(suggestions, identified);
				suggestions.splice(i, 1);
			} else {
				++ i;
			}
		}
	}

	function getHints(cm, options) {
		const cur = cm.getCursor();
		const token = cm.getTokenAt(cur);
		let partial = token.string;
		if(token.end > cur.ch) {
			partial = partial.substr(0, cur.ch - token.start);
		}
		const parts = TRIMMER.exec(partial);
		partial = parts[2];
		const from = token.start + parts[1].length;

		const continuation = (cur.ch > 0 && token.state.line.length > 0);
		let comp = (continuation ?
			token.state.completions :
			token.state.beginCompletions
		);
		if(!continuation) {
			comp = comp.concat(token.state.knownAgent);
		}

		populateGlobals(comp, cm.options.globals);

		const ranges = makeRanges(cm, cur.line, from, token.end);
		let selfValid = false;
		const list = (comp
			.filter((opt) => opt.startsWith(partial))
			.map((opt) => {
				if(opt === partial + ' ' && !options.completeSingle) {
					selfValid = true;
					return null;
				}
				return makeHintItem(opt, ranges);
			})
			.filter((opt) => (opt !== null))
		);
		if(selfValid && list.length > 0) {
			list.unshift(makeHintItem(partial + ' ', ranges));
		}

		return {
			list,
			from: ranges.wordFrom,
			to: ranges.wordTo,
		};
	}

	return {
		getHints,
	};
});
