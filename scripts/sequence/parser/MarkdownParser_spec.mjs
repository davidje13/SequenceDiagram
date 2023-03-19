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

	it('removes escape characters', () => {
		const formatted = parser('a\u001Bb');

		expect(formatted).toEqual([
			[{attrs: null, text: 'ab'}],
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
		const formatted = parser('a **b** c __d__ e <b>f</b> g');

		expect(formatted).toEqual([[
			{attrs: null, text: 'a '},
			{attrs: {'font-weight': 'bolder'}, text: 'b'},
			{attrs: null, text: ' c '},
			{attrs: {'font-weight': 'bolder'}, text: 'd'},
			{attrs: null, text: ' e '},
			{attrs: {'font-weight': 'bolder'}, text: 'f'},
			{attrs: null, text: ' g'},
		]]);
	});

	it('ignores style characters if preceded by an escape', () => {
		const formatted = parser('a \u001B*\u001B*b\u001B*\u001B* c');

		expect(formatted).toEqual([[
			{attrs: null, text: 'a **b** c'},
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
		const formatted = parser('a *b* c _d_ e <i>f</i> g');

		expect(formatted).toEqual([[
			{attrs: null, text: 'a '},
			{attrs: {'font-style': 'italic'}, text: 'b'},
			{attrs: null, text: ' c '},
			{attrs: {'font-style': 'italic'}, text: 'd'},
			{attrs: null, text: ' e '},
			{attrs: {'font-style': 'italic'}, text: 'f'},
			{attrs: null, text: ' g'},
		]]);
	});

	it('recognises strikethrough styling', () => {
		const formatted = parser('a ~b~ c <s>d</s> e');

		expect(formatted).toEqual([[
			{attrs: null, text: 'a '},
			{attrs: {'text-decoration': 'line-through'}, text: 'b'},
			{attrs: null, text: ' c '},
			{attrs: {'text-decoration': 'line-through'}, text: 'd'},
			{attrs: null, text: ' e'},
		]]);
	});

	it('recognises underline styling', () => {
		const formatted = parser('a <u>b</u> c');

		expect(formatted).toEqual([[
			{attrs: null, text: 'a '},
			{attrs: {'text-decoration': 'underline'}, text: 'b'},
			{attrs: null, text: ' c'},
		]]);
	});

	it('recognises overline styling', () => {
		const formatted = parser('a <o>b</o> c');

		expect(formatted).toEqual([[
			{attrs: null, text: 'a '},
			{attrs: {'text-decoration': 'overline'}, text: 'b'},
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

	it('recognises superscript styling', () => {
		const formatted = parser('a <sup>b</sup> c');

		expect(formatted).toEqual([[
			{attrs: null, text: 'a '},
			{
				attrs: {'baseline-shift': '70%', 'font-size': '0.6em'},
				text: 'b',
			},
			{attrs: null, text: ' c'},
		]]);
	});

	it('recognises subscript styling', () => {
		const formatted = parser('a <sub>b</sub> c');

		expect(formatted).toEqual([[
			{attrs: null, text: 'a '},
			{
				attrs: {'baseline-shift': '-20%', 'font-size': '0.6em'},
				text: 'b',
			},
			{attrs: null, text: ' c'},
		]]);
	});

	it('recognises red styling', () => {
		const formatted = parser('a <red>b</red> c');

		expect(formatted).toEqual([[
			{attrs: null, text: 'a '},
			{attrs: {'fill': '#DD0000'}, text: 'b'},
			{attrs: null, text: ' c'},
		]]);
	});

	it('recognises mark styling', () => {
		const formatted = parser('a <mark>b</mark> c');

		expect(formatted).toEqual([[
			{attrs: null, text: 'a '},
			{attrs: {'filter': 'mark'}, text: 'b'},
			{attrs: null, text: ' c'},
		]]);
	});

	it('recognises legacy highlight styling', () => {
		const formatted = parser('a <highlight>b</highlight> c');

		expect(formatted).toEqual([[
			{attrs: null, text: 'a '},
			{attrs: {'filter': 'mark'}, text: 'b'},
			{attrs: null, text: ' c'},
		]]);
	});

	it('recognises link styling', () => {
		const formatted = parser('a [b](c) d');

		expect(formatted).toEqual([[
			{attrs: null, text: 'a '},
			{attrs: {'href': 'c', 'text-decoration': 'underline'}, text: 'b'},
			{attrs: null, text: ' d'},
		]]);
	});

	it('silently ignores link titles', () => {
		// SVG has no concept of titles, so these serve no purpose

		const formatted = parser('a [b](c "d") e');

		expect(formatted).toEqual([[
			{attrs: null, text: 'a '},
			{attrs: {'href': 'c', 'text-decoration': 'underline'}, text: 'b'},
			{attrs: null, text: ' e'},
		]]);
	});

	it('removes escapes from link text and destination', () => {
		// SVG has no concept of titles, so these serve no purpose

		const formatted = parser('a [b\u001Bc](d\u001Be) f');

		expect(formatted).toEqual([[
			{attrs: null, text: 'a '},
			{attrs: {'href': 'de', 'text-decoration': 'underline'}, text: 'bc'},
			{attrs: null, text: ' f'},
		]]);
	});

	it('recognises short link styling', () => {
		const formatted = parser('a <http://b> c');

		expect(formatted).toEqual([[
			{attrs: null, text: 'a '},
			{attrs: {
				'href': 'http://b',
				'text-decoration': 'underline',
			}, text: 'http://b'},
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

	it('recognises heavily combined styling', () => {
		const formatted = parser('**_`abc`_**');

		expect(formatted).toEqual([[
			{attrs: {
				'font-family': MONO_FONT,
				'font-style': 'italic',
				'font-weight': 'bolder',
			}, text: 'abc'},
		]]);
	});

	it('combines text decorations', () => {
		const formatted = parser('a <s><u>b</u></s> c');

		expect(formatted).toEqual([[
			{attrs: null, text: 'a '},
			{attrs: {'text-decoration': 'line-through underline'}, text: 'b'},
			{attrs: null, text: ' c'},
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
			'<g><text x="0" y="1">hello everybody</text></g>',
		);
	});
});
