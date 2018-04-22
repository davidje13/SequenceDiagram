/* eslint-disable sort-keys */ // Maybe later

import {dom, textSizerFactory} from '../../../spec/stubs/TestDOM.mjs';
import SVG from '../../svg/SVG.mjs';
import parser from './MarkdownParser.mjs';

describe('Markdown Parser', () => {
	it('converts simple text', () => {
		const formatted = parser('hello everybody');

		expect(formatted).toEqual([[{text: 'hello everybody', attrs: null}]]);
	});

	it('produces an empty array given an empty input', () => {
		const formatted = parser('');

		expect(formatted).toEqual([]);
	});

	it('converts multiline text', () => {
		const formatted = parser('hello\neverybody');

		expect(formatted).toEqual([
			[{text: 'hello', attrs: null}],
			[{text: 'everybody', attrs: null}],
		]);
	});

	it('recognises bold styling', () => {
		const formatted = parser('a **b** c __d__ e');

		expect(formatted).toEqual([[
			{text: 'a ', attrs: null},
			{text: 'b', attrs: {'font-weight': 'bolder'}},
			{text: ' c ', attrs: null},
			{text: 'd', attrs: {'font-weight': 'bolder'}},
			{text: ' e', attrs: null},
		]]);
	});

	it('ignores styling marks inside words', () => {
		const formatted = parser('a**b**c__d__e');

		expect(formatted).toEqual([[
			{text: 'a**b**c__d__e', attrs: null},
		]]);
	});

	it('continues styling across lines', () => {
		const formatted = parser('a **b\nc** d');

		expect(formatted).toEqual([[
			{text: 'a ', attrs: null},
			{text: 'b', attrs: {'font-weight': 'bolder'}},
		], [
			{text: 'c', attrs: {'font-weight': 'bolder'}},
			{text: ' d', attrs: null},
		]]);
	});

	it('recognises italic styling', () => {
		const formatted = parser('a *b* c _d_ e');

		expect(formatted).toEqual([[
			{text: 'a ', attrs: null},
			{text: 'b', attrs: {'font-style': 'italic'}},
			{text: ' c ', attrs: null},
			{text: 'd', attrs: {'font-style': 'italic'}},
			{text: ' e', attrs: null},
		]]);
	});

	it('recognises strikethrough styling', () => {
		const formatted = parser('a ~b~ c');

		expect(formatted).toEqual([[
			{text: 'a ', attrs: null},
			{text: 'b', attrs: {'text-decoration': 'line-through'}},
			{text: ' c', attrs: null},
		]]);
	});

	it('recognises monospace styling', () => {
		const formatted = parser('a `b` c');

		expect(formatted).toEqual([[
			{text: 'a ', attrs: null},
			{text: 'b', attrs: {'font-family': 'monospace'}},
			{text: ' c', attrs: null},
		]]);
	});

	it('allows dots around monospace styling', () => {
		const formatted = parser('a.`b`.c');

		expect(formatted).toEqual([[
			{text: 'a.', attrs: null},
			{text: 'b', attrs: {'font-family': 'monospace'}},
			{text: '.c', attrs: null},
		]]);
	});

	it('recognises combined styling', () => {
		const formatted = parser('a **_b_ c**');

		expect(formatted).toEqual([[
			{text: 'a ', attrs: null},
			{text: 'b', attrs: {
				'font-weight': 'bolder',
				'font-style': 'italic',
			}},
			{text: ' c', attrs: {'font-weight': 'bolder'}},
		]]);
	});

	it('allows complex interactions between styles', () => {
		const formatted = parser('_a **b_ ~c~**');

		expect(formatted).toEqual([[
			{text: 'a ', attrs: {'font-style': 'italic'}},
			{text: 'b', attrs: {
				'font-weight': 'bolder',
				'font-style': 'italic',
			}},
			{text: ' ', attrs: {'font-weight': 'bolder'}},
			{text: 'c', attrs: {
				'font-weight': 'bolder',
				'text-decoration': 'line-through',
			}},
		]]);
	});

	it('produces a format compatible with SVG.formattedText', () => {
		const formatted = parser('hello everybody');
		const svg = new SVG(dom, textSizerFactory);
		const block = svg.formattedText({}, formatted).element;

		expect(block.outerHTML).toEqual(
			'<g><text x="0" y="1">hello everybody</text></g>'
		);
	});
});
