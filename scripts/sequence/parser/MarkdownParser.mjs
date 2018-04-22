const STYLES = [
	{
		attrs: {'font-style': 'italic'},
		begin: /[\s_~`]\*(?=\S)/g,
		end: /\S\*(?=[\s_~`])/g,
	}, {
		attrs: {'font-style': 'italic'},
		begin: /[\s*~`]_(?=\S)/g,
		end: /\S_(?=[\s*~`])/g,
	}, {
		attrs: {'font-weight': 'bolder'},
		begin: /[\s_~`]\*\*(?=\S)/g,
		end: /\S\*\*(?=[\s_~`])/g,
	}, {
		attrs: {'font-weight': 'bolder'},
		begin: /[\s*~`]__(?=\S)/g,
		end: /\S__(?=[\s*~`])/g,
	}, {
		attrs: {'text-decoration': 'line-through'},
		begin: /[\s_*`]~(?=\S)/g,
		end: /\S~(?=[\s_*`])/g,
	}, {
		attrs: {'font-family': 'monospace'},
		begin: /[\s_*~.]`(?=\S)/g,
		end: /\S`(?=[\s_*~.])/g,
	},
];

function findNext(line, p, active) {
	const virtLine = ' ' + line + ' ';
	let styleIndex = -1;
	let bestStart = virtLine.length;
	let bestEnd = 0;

	STYLES.forEach(({begin, end}, ind) => {
		const search = active[ind] ? end : begin;
		search.lastIndex = p;
		const m = search.exec(virtLine);
		if(m && (
			m.index < bestStart ||
			(m.index === bestStart && search.lastIndex > bestEnd)
		)) {
			styleIndex = ind;
			bestStart = m.index;
			bestEnd = search.lastIndex;
		}
	});

	return {end: bestEnd - 1, start: bestStart, styleIndex};
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
