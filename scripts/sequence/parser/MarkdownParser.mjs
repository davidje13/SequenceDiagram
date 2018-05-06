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
	},
];

const WHITE = /[\f\n\r\t\v ]+/g;
const WHITE_END = /^[\t-\r ]+|[\t-\r ]+$/g;

const ESC = -2;

function findNext(line, p, active) {
	const virtLine = ' ' + line + ' ';
	let styleIndex = -1;
	let bestStart = virtLine.length;
	let bestEnd = 0;

	STYLES.forEach(({begin, end}, ind) => {
		const search = active[ind] ? end : begin;
		search.matcher.lastIndex = p + 1 - search.skip;
		const m = search.matcher.exec(virtLine);
		const beginInd = m ? (m.index + search.skip) : Number.POSITIVE_INFINITY;
		if(
			beginInd < bestStart ||
			(beginInd === bestStart && search.matcher.lastIndex > bestEnd)
		) {
			styleIndex = ind;
			bestStart = beginInd;
			bestEnd = search.matcher.lastIndex;
		}
	});

	const escIndex = virtLine.indexOf('\u001B', p + 1);
	if(escIndex !== -1 && escIndex < bestStart) {
		styleIndex = ESC;
		bestStart = escIndex;
		bestEnd = escIndex + 1;
	}

	if(styleIndex === -1) {
		return null;
	}

	return {end: bestEnd - 1, start: bestStart - 1, styleIndex};
}

function combineAttrs(activeCount, active) {
	if(!activeCount) {
		return null;
	}
	const attrs = {};
	const decorations = [];
	active.forEach((on, ind) => {
		if(!on) {
			return;
		}
		const activeAttrs = STYLES[ind].attrs;
		const decoration = activeAttrs['text-decoration'];
		if(decoration && !decorations.includes(decoration)) {
			decorations.push(decoration);
		}
		Object.assign(attrs, activeAttrs);
	});
	if(decorations.length > 1) {
		attrs['text-decoration'] = decorations.join(' ');
	}
	return attrs;
}

function shrinkWhitespace(text) {
	return text.replace(WHITE, ' ');
}

function trimCollapsible(text) {
	return text.replace(WHITE_END, '');
}

function findStyles(line, active, toggleCallback, textCallback) {
	let ln = line;
	let p = 0;
	let s = 0;
	let match = null;
	while((match = findNext(ln, p, active))) {
		const {styleIndex, start, end} = match;
		if(styleIndex === ESC) {
			ln = ln.substr(0, start) + ln.substr(end);
			p = start + 1;
		} else {
			if(start > s) {
				textCallback(ln.substring(s, start));
			}
			active[styleIndex] = !active[styleIndex];
			toggleCallback(styleIndex);
			s = end;
			p = end;
		}
	}
	if(s < ln.length) {
		textCallback(ln.substr(s));
	}
}

export default function parseMarkdown(markdown) {
	if(!markdown) {
		return [];
	}

	const active = STYLES.map(() => false);
	let activeCount = 0;
	let attrs = null;
	const lines = trimCollapsible(markdown).split('\n');
	return lines.map((line) => {
		const parts = [];
		findStyles(
			shrinkWhitespace(trimCollapsible(line)),
			active,
			(styleIndex) => {
				activeCount += active[styleIndex] ? 1 : -1;
				attrs = combineAttrs(activeCount, active);
			},
			(text) => parts.push({attrs, text})
		);
		return parts;
	});
}
