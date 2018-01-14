defineDescribe('Markdown Parser', [
	'./MarkdownParser',
	'svg/SVGTextBlock',
	'svg/SVGUtilities',
], (
	parser,
	SVGTextBlock,
	svg
) => {
	'use strict';

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

	describe('SVGTextBlock interaction', () => {
		let hold = null;
		let block = null;

		beforeEach(() => {
			hold = svg.makeContainer();
			document.body.appendChild(hold);
			block = new SVGTextBlock(hold, {attrs: {'font-size': 12}});
		});

		afterEach(() => {
			document.body.removeChild(hold);
		});

		it('produces a format compatible with SVGTextBlock', () => {
			const formatted = parser('hello everybody');
			block.set({formatted});
			expect(hold.children.length).toEqual(1);
			expect(hold.children[0].innerHTML).toEqual('hello everybody');
		});
	});
});
