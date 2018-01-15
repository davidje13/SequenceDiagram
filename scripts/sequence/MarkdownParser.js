define(() => {
	'use strict';

	const STYLES = [
		{
			begin: /[\s_~`]\*(?=\S)/g,
			end: /\S\*(?=[\s_~`])/g,
			attrs: {'font-style': 'italic'},
		}, {
			begin: /[\s*~`]_(?=\S)/g,
			end: /\S_(?=[\s*~`])/g,
			attrs: {'font-style': 'italic'},
		}, {
			begin: /[\s_~`]\*\*(?=\S)/g,
			end: /\S\*\*(?=[\s_~`])/g,
			attrs: {'font-weight': 'bolder'},
		}, {
			begin: /[\s*~`]__(?=\S)/g,
			end: /\S__(?=[\s*~`])/g,
			attrs: {'font-weight': 'bolder'},
		}, {
			begin: /[\s_*`]~(?=\S)/g,
			end: /\S~(?=[\s_*`])/g,
			attrs: {'text-decoration': 'line-through'},
		}, {
			begin: /[\s_*~.]`(?=\S)/g,
			end: /\S`(?=[\s_*~.])/g,
			attrs: {'font-family': 'monospace'},
		},
	];

	function findNext(line, p, active) {
		const virtLine = ' ' + line + ' ';
		let styleIndex = -1;
		let bestStart = virtLine.length;
		let bestEnd = 0;

		STYLES.forEach(({begin, end, attrs}, ind) => {
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

		return {styleIndex, start: bestStart, end: bestEnd - 1};
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

	function parseMarkdown(text) {
		if(!text) {
			return [];
		}

		const active = STYLES.map(() => false);
		let activeCount = 0;
		let attrs = null;
		const lines = text.split('\n');
		const result = [];
		lines.forEach((line) => {
			const parts = [];
			let p = 0;
			while(true) {
				const {styleIndex, start, end} = findNext(line, p, active);
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
					parts.push({text: line.substring(p, start), attrs});
				}
				attrs = combineAttrs(activeCount, active);
				p = end;
			}
			if(p < line.length) {
				parts.push({text: line.substr(p), attrs});
			}
			result.push(parts);
		});
		return result;
	}

	return parseMarkdown;
});
