import {dom, textSizerFactory} from '../../../spec/stubs/TestDOM.mjs';
import SVG from '../../svg/SVG.mjs';
import parser from './MarkdownParser.mjs';

const MONO_FONT = 'Courier New,Liberation Mono,monospace';

describe('Markdown Parser', () => {
	it('converts simple text', () => {
		const formatted = parser('hello everybody');

		expect(formatted).toEqual([[{attrs: null, text: 'hello everybody'}]]);
	});

	it('produces an empty array given an empty input', () => {
		const formatted = parser('');

		expect(formatted).toEqual([]);
	});

	it('converts multiline text', () => {
		const formatted = parser('hello\neverybody');

		expect(formatted).toEqual([
			[{attrs: null, text: 'hello'}],
			[{attrs: null, text: 'everybody'}],
		]);
	});

	it('trims leading and trailing whitespace', () => {
		const formatted = parser('  a \n \u00A0b \n  ');

		expect(formatted).toEqual([
			[{attrs: null, text: 'a'}],
			[{attrs: null, text: '\u00A0b'}],
		]);
	});

	it('replaces sequences of whitespace with a single space', () => {
		const formatted = parser('abc  \t \v def');

		expect(formatted).toEqual([
			[{attrs: null, text: 'abc def'}],
		]);
	});

	it('maintains internal blank lines', () => {
		const formatted = parser('abc\n\ndef');

		expect(formatted).toEqual([
			[{attrs: null, text: 'abc'}],
			[],
			[{attrs: null, text: 'def'}],
		]);
	});

	it('recognises bold styling', () => {
		const formatted = parser('a **b** c __d__ e');

		expect(formatted).toEqual([[
			{attrs: null, text: 'a '},
			{attrs: {'font-weight': 'bolder'}, text: 'b'},
			{attrs: null, text: ' c '},
			{attrs: {'font-weight': 'bolder'}, text: 'd'},
			{attrs: null, text: ' e'},
		]]);
	});

	it('ignores styling marks inside words', () => {
		const formatted = parser('a**b**c__d__e');

		expect(formatted).toEqual([[
			{attrs: null, text: 'a**b**c__d__e'},
		]]);
	});

	it('continues styling across lines', () => {
		const formatted = parser('a **b\nc** d');

		expect(formatted).toEqual([[
			{attrs: null, text: 'a '},
			{attrs: {'font-weight': 'bolder'}, text: 'b'},
		], [
			{attrs: {'font-weight': 'bolder'}, text: 'c'},
			{attrs: null, text: ' d'},
		]]);
	});

	it('recognises italic styling', () => {
		const formatted = parser('a *b* c _d_ e');

		expect(formatted).toEqual([[
			{attrs: null, text: 'a '},
			{attrs: {'font-style': 'italic'}, text: 'b'},
			{attrs: null, text: ' c '},
			{attrs: {'font-style': 'italic'}, text: 'd'},
			{attrs: null, text: ' e'},
		]]);
	});

	it('recognises strikethrough styling', () => {
		const formatted = parser('a ~b~ c');

		expect(formatted).toEqual([[
			{attrs: null, text: 'a '},
			{attrs: {'text-decoration': 'line-through'}, text: 'b'},
			{attrs: null, text: ' c'},
		]]);
	});

	it('recognises monospace styling', () => {
		const formatted = parser('a `b` c');

		expect(formatted).toEqual([[
			{attrs: null, text: 'a '},
			{attrs: {'font-family': MONO_FONT}, text: 'b'},
			{attrs: null, text: ' c'},
		]]);
	});

	it('allows dots around monospace styling', () => {
		const formatted = parser('a.`b`.c');

		expect(formatted).toEqual([[
			{attrs: null, text: 'a.'},
			{attrs: {'font-family': MONO_FONT}, text: 'b'},
			{attrs: null, text: '.c'},
		]]);
	});

	it('recognises combined styling', () => {
		const formatted = parser('a **_b_ c**');

		expect(formatted).toEqual([[
			{attrs: null, text: 'a '},
			{attrs: {
				'font-style': 'italic',
				'font-weight': 'bolder',
			}, text: 'b'},
			{attrs: {'font-weight': 'bolder'}, text: ' c'},
		]]);
	});

	it('allows complex interactions between styles', () => {
		const formatted = parser('_a **b_ ~c~**');

		expect(formatted).toEqual([[
			{attrs: {'font-style': 'italic'}, text: 'a '},
			{attrs: {
				'font-style': 'italic',
				'font-weight': 'bolder',
			}, text: 'b'},
			{attrs: {'font-weight': 'bolder'}, text: ' '},
			{attrs: {
				'font-weight': 'bolder',
				'text-decoration': 'line-through',
			}, text: 'c'},
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
