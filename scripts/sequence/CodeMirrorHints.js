define(() => {
	'use strict';

	const TRIMMER = /^([ \t]*)(.*)$/;
	const SQUASH_START = /^[ \t\r\n:,]/;

	function getHints(cm) {
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

		const ln = cm.getLine(cur.line);
		const wordFrom = {line: cur.line, ch: from};
		const squashFrom = {line: cur.line, ch: from};
		if(from > 0 && ln[from - 1] === ' ') {
			squashFrom.ch --;
		}
		const wordTo = {line: cur.line, ch: token.end};
		const list = (comp
			.filter((opt) => opt.startsWith(partial))
			.map((opt) => {
				return {
					text: opt,
					displayText: (opt === '\n') ? '<END>' : opt.trim(),
					className: (opt === '\n') ? 'pick-virtual' : null,
					from: SQUASH_START.test(opt) ? squashFrom : wordFrom,
					to: wordTo,
				};
			})
		);

		return {
			list,
			from: wordFrom,
			to: wordTo,
		};
	}

	return {
		getHints,
	};
});
