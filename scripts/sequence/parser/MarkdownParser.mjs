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
	return text.replace(/[\f\n\r\t\v ]+/g, ' ');
}

function trimCollapsible(text) {
	return text.replace(/^[\f\n\r\t\v ]+|[\f\n\r\t\v ]+$/g, '');
}

export default function parseMarkdown(text) {
	if(!text) {
		return [];
	}

	const active = STYLES.map(() => false);
	let activeCount = 0;
	let attrs = null;
	const lines = trimCollapsible(text).split('\n');
	const result = [];
	lines.forEach((line) => {
		const ln = shrinkWhitespace(trimCollapsible(line));
		const parts = [];
		let p = 0;
		for(;;) {
			const {styleIndex, start, end} = findNext(ln, p, active);
			if(styleIndex === -1) {
				break;
			}
			if(active[styleIndex]) {
				active[styleIndex] = false;
				-- activeCount;
			} else {
				active[styleIndex] = true;
				++ activeCount;
			}
			if(start > p) {
				parts.push({attrs, text: ln.substring(p, start)});
			}
			attrs = combineAttrs(activeCount, active);
			p = end;
		}
		if(p < ln.length) {
			parts.push({attrs, text: ln.substr(p)});
		}
		result.push(parts);
	});
	return result;
}
