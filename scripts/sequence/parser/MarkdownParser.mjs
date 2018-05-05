const STYLES = [
	{
		attrs: {'font-style': 'italic'},
		begin: {matcher: /[\s_~`>]\*(?=\S)/g, skip: 1},
		end: {matcher: /\S\*(?=[\s_~`<])/g, skip: 1},
	}, {
		attrs: {'font-style': 'italic'},
		begin: {matcher: /[\s*~`>]_(?=\S)/g, skip: 1},
		end: {matcher: /\S_(?=[\s*~`<])/g, skip: 1},
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
		begin: {matcher: /[\s_*`>]~(?=\S)/g, skip: 1},
		end: {matcher: /\S~(?=[\s_*`<])/g, skip: 1},
	}, {
		attrs: {'font-family': 'Courier New,Liberation Mono,monospace'},
		begin: {matcher: /[\s_*~.>]`(?=\S)/g, skip: 1},
		end: {matcher: /\S`(?=[\s_*~.<])/g, skip: 1},
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
	active.forEach((on, ind) => {
		if(on) {
			Object.assign(attrs, STYLES[ind].attrs);
		}
	});
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
