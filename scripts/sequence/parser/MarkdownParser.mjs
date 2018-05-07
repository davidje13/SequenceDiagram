/* eslint-disable no-control-regex */ // Removing control characters is the aim
const CONTROL_CHARS = /[\x00-\x08\x0E-\x1F]/g;
/* eslint-enable no-control-regex */

const STYLES = [
	{
		attrs: {'font-style': 'italic'},
		begin: {matcher: /<i>/g, skip: 0},
		end: {matcher: /<\/i>/g, skip: 0},
	}, {
		attrs: {'font-style': 'italic'},
		begin: {matcher: /[\s_~`>]\*(?=\S)/g, skip: 1},
		end: {matcher: /\S\*(?=[\s_~`<])/g, skip: 1},
	}, {
		attrs: {'font-style': 'italic'},
		begin: {matcher: /[\s*~`>]_(?=\S)/g, skip: 1},
		end: {matcher: /\S_(?=[\s*~`<])/g, skip: 1},
	}, {
		attrs: {'font-weight': 'bolder'},
		begin: {matcher: /<b>/g, skip: 0},
		end: {matcher: /<\/b>/g, skip: 0},
	}, {
		attrs: {'font-weight': 'bolder'},
		begin: {matcher: /[\s_~`>]\*\*(?=\S)/g, skip: 1},
		end: {matcher: /\S\*\*(?=[\s_~`<])/g, skip: 1},
	}, {
		attrs: {'font-weight': 'bolder'},
		begin: {matcher: /[\s*~`>]__(?=\S)/g, skip: 1},
		end: {matcher: /\S__(?=[\s*~`<])/g, skip: 1},
	}, {
		attrs: {'text-decoration': 'line-through'},
		begin: {matcher: /<s>/g, skip: 0},
		end: {matcher: /<\/s>/g, skip: 0},
	}, {
		attrs: {'text-decoration': 'line-through'},
		begin: {matcher: /[\s_*`>]~(?=\S)/g, skip: 1},
		end: {matcher: /\S~(?=[\s_*`<])/g, skip: 1},
	}, {
		attrs: {'text-decoration': 'overline'},
		begin: {matcher: /<o>/g, skip: 0},
		end: {matcher: /<\/o>/g, skip: 0},
	}, {
		attrs: {'font-family': 'Courier New,Liberation Mono,monospace'},
		begin: {matcher: /[\s_*~.>]`(?=\S)/g, skip: 1},
		end: {matcher: /\S`(?=[\s_*~.<])/g, skip: 1},
	}, {
		attrs: {'text-decoration': 'underline'},
		begin: {matcher: /<u>/g, skip: 0},
		end: {matcher: /<\/u>/g, skip: 0},
	}, {
		attrs: {'baseline-shift': '70%', 'font-size': '0.6em'},
		begin: {matcher: /<sup>/g, skip: 0},
		end: {matcher: /<\/sup>/g, skip: 0},
	}, {
		attrs: {'baseline-shift': '-20%', 'font-size': '0.6em'},
		begin: {matcher: /<sub>/g, skip: 0},
		end: {matcher: /<\/sub>/g, skip: 0},
	}, {
		attrs: {'fill': '#DD0000'},
		begin: {matcher: /<red>/g, skip: 0},
		end: {matcher: /<\/red>/g, skip: 0},
	}, {
		attrs: {'filter': 'highlight'},
		begin: {matcher: /<highlight>/g, skip: 0},
		end: {matcher: /<\/highlight>/g, skip: 0},
	}, {
		all: {matcher: /\[([^\]]+)\]\(([^)]+?)(?: "([^"]+)")?\)/g, skip: 0},
		attrs: (m) => ({
			'href': m[2].replace(CONTROL_CHARS, ''),
			'text-decoration': 'underline',
		}),
		text: (m) => m[1].replace(CONTROL_CHARS, ''),
	}, {
		all: {matcher: /<([a-z]+:\/\/[^>]*)>/g, skip: 0},
		attrs: (m) => ({
			'href': m[1].replace(CONTROL_CHARS, ''),
			'text-decoration': 'underline',
		}),
		text: (m) => m[1].replace(CONTROL_CHARS, ''),
	},
];

const WHITE = /[\f\n\r\t\v ]+/g;
const WHITE_END = /^[\t-\r ]+|[\t-\r ]+$/g;

const ESC = -2;

function pickBest(best, styleIndex, search, match) {
	if(!match) {
		return best;
	}

	const start = match.index + search.skip;
	const end = search.matcher.lastIndex;
	if(start < best.start || (start === best.start && end > best.end)) {
		return {end, match, start, styleIndex};
	}
	return best;
}

function findNext(line, p, active) {
	const virtLine = ' ' + line + ' ';
	const pos = p + 1;
	let best = {
		end: 0,
		match: null,
		start: virtLine.length,
		styleIndex: -1,
	};

	const escIndex = virtLine.indexOf('\u001B', pos);
	if(escIndex !== -1) {
		best = {
			end: escIndex + 1,
			match: null,
			start: escIndex,
			styleIndex: ESC,
		};
	}

	STYLES.forEach(({all, begin, end}, ind) => {
		const search = all || (active[ind] === null ? begin : end);
		search.matcher.lastIndex = pos - search.skip;
		best = pickBest(best, ind, search, search.matcher.exec(virtLine));
	});

	if(best.styleIndex === -1) {
		return null;
	}

	-- best.end;
	-- best.start;
	return best;
}

function combineAttrs(active) {
	const attrs = {};
	const decorations = [];
	let any = false;
	active.forEach((activeAttrs) => {
		if(!activeAttrs) {
			return;
		}
		const decoration = activeAttrs['text-decoration'];
		if(decoration && !decorations.includes(decoration)) {
			decorations.push(decoration);
		}
		Object.assign(attrs, activeAttrs);
		any = true;
	});
	if(decorations.length > 1) {
		attrs['text-decoration'] = decorations.join(' ');
	}
	return any ? attrs : null;
}

function shrinkWhitespace(text) {
	return text.replace(WHITE, ' ');
}

function trimCollapsible(text) {
	return text.replace(WHITE_END, '');
}

function getOrCall(v, params) {
	if(typeof v === 'function') {
		return v(...params);
	}
	return v;
}

function findStyles(line, active, textCallback) {
	let ln = line;
	let p = 0;
	let s = 0;
	for(let next = null; (next = findNext(ln, p, active));) {
		const {styleIndex, start, end, match} = next;

		if(styleIndex === ESC) {
			ln = ln.substr(0, start) + ln.substr(end);
			p = start + 1;
			continue;
		}

		textCallback(ln.substring(s, start));

		if(active[styleIndex] === null) {
			const style = STYLES[styleIndex];

			active[styleIndex] = getOrCall(style.attrs, [match]);
			if(style.all) {
				textCallback(getOrCall(style.text, [match]));
				active[styleIndex] = null;
			}
		} else {
			active[styleIndex] = null;
		}

		s = end;
		p = end;
	}
	textCallback(ln.substr(s));
}

export default function parseMarkdown(markdown) {
	if(!markdown) {
		return [];
	}

	const active = STYLES.map(() => null);
	const lines = trimCollapsible(markdown).split('\n');
	return lines.map((line) => {
		const parts = [];
		findStyles(shrinkWhitespace(trimCollapsible(line)), active, (text) => {
			if(text) {
				parts.push({attrs: combineAttrs(active), text});
			}
		});
		return parts;
	});
}
