defineDescribe('SVGTextBlock', [
	'./SVGTextBlock',
	'./SVGUtilities',
], (
	SVGTextBlock,
	svg
) => {
	'use strict';

	const attrs = {'font-size': 10, 'line-height': 1.5};
	let hold = null;
	let block = null;

	beforeEach(() => {
		hold = svg.makeContainer();
		document.body.appendChild(hold);
		block = new SVGTextBlock(hold, {attrs});
	});

	afterEach(() => {
		document.body.removeChild(hold);
	});

	describe('constructor', () => {
		it('defaults to blank text at 0, 0', () => {
			expect(block.state.text).toEqual('');
			expect(block.state.x).toEqual(0);
			expect(block.state.y).toEqual(0);
			expect(hold.children.length).toEqual(0);
		});

		it('does not explode if given no setup', () => {
			block = new SVGTextBlock(hold);
			expect(block.state.text).toEqual('');
			expect(block.state.x).toEqual(0);
			expect(block.state.y).toEqual(0);
			expect(hold.children.length).toEqual(0);
		});

		it('adds the given text if specified', () => {
			block = new SVGTextBlock(hold, {attrs, text: 'abc'});
			expect(block.state.text).toEqual('abc');
			expect(hold.children.length).toEqual(1);
		});

		it('uses the given coordinates if specified', () => {
			block = new SVGTextBlock(hold, {attrs, x: 5, y: 7});
			expect(block.state.x).toEqual(5);
			expect(block.state.y).toEqual(7);
		});
	});

	describe('.set', () => {
		it('sets the text to the given content', () => {
			block.set({text: 'foo'});
			expect(block.state.text).toEqual('foo');
			expect(hold.children.length).toEqual(1);
			expect(hold.children[0].innerHTML).toEqual('foo');
		});

		it('renders multiline text', () => {
			block.set({text: 'foo\nbar'});
			expect(hold.children.length).toEqual(2);
			expect(hold.children[0].innerHTML).toEqual('foo');
			expect(hold.children[1].innerHTML).toEqual('bar');
		});

		it('populates width and height with the size of the text', () => {
			block.set({text: 'foo\nbar'});
			expect(block.width).toBeGreaterThan(0);
			expect(block.height).toEqual(30);
		});

		it('re-uses text nodes when possible, adding more if needed', () => {
			block.set({text: 'foo\nbar'});
			const line0 = hold.children[0];
			const line1 = hold.children[1];

			block.set({text: 'zig\nzag\nbaz'});

			expect(hold.children.length).toEqual(3);
			expect(hold.children[0]).toEqual(line0);
			expect(hold.children[0].innerHTML).toEqual('zig');
			expect(hold.children[1]).toEqual(line1);
			expect(hold.children[1].innerHTML).toEqual('zag');
			expect(hold.children[2].innerHTML).toEqual('baz');
		});

		it('re-uses text nodes when possible, removing extra if needed', () => {
			block.set({text: 'foo\nbar'});
			const line0 = hold.children[0];

			block.set({text: 'zig'});

			expect(hold.children.length).toEqual(1);
			expect(hold.children[0]).toEqual(line0);
			expect(hold.children[0].innerHTML).toEqual('zig');
		});

		it('positions text nodes and applies attributes', () => {
			block.set({text: 'foo\nbar'});
			expect(hold.children.length).toEqual(2);
			expect(hold.children[0].getAttribute('x')).toEqual('0');
			expect(hold.children[0].getAttribute('y')).toEqual('10');
			expect(hold.children[0].getAttribute('font-size')).toEqual('10');
			expect(hold.children[1].getAttribute('x')).toEqual('0');
			expect(hold.children[1].getAttribute('y')).toEqual('25');
			expect(hold.children[1].getAttribute('font-size')).toEqual('10');
		});

		it('moves all nodes', () => {
			block.set({text: 'foo\nbaz'});
			block.set({x: 5, y: 7});
			expect(hold.children[0].getAttribute('x')).toEqual('5');
			expect(hold.children[0].getAttribute('y')).toEqual('17');
			expect(hold.children[1].getAttribute('x')).toEqual('5');
			expect(hold.children[1].getAttribute('y')).toEqual('32');
		});

		it('clears if the text is empty', () => {
			block.set({text: 'foo\nbaz'});
			block.set({text: ''});
			expect(hold.children.length).toEqual(0);
			expect(block.state.text).toEqual('');
			expect(block.width).toEqual(0);
			expect(block.height).toEqual(0);
		});
	});

	describe('SizeTester', () => {
		let tester = null;

		beforeEach(() => {
			tester = new SVGTextBlock.SizeTester(hold);
		});

		describe('.measure', () => {
			it('calculates the size of the rendered text', () => {
				const size = tester.measure(attrs, 'foo');
				expect(size.width).toBeGreaterThan(0);
				expect(size.height).toEqual(15);
			});

			it('measures multiline text', () => {
				const size = tester.measure(attrs, 'foo\nbar');
				expect(size.width).toBeGreaterThan(0);
				expect(size.height).toEqual(30);
			});

			it('returns 0, 0 for empty content', () => {
				const size = tester.measure(attrs, '');
				expect(size.width).toEqual(0);
				expect(size.height).toEqual(0);
			});

			it('returns the maximum width for multiline text', () => {
				const size0 = tester.measure(attrs, 'foo');
				const size1 = tester.measure(attrs, 'longline');
				const size = tester.measure(attrs, 'foo\nlongline\nfoo');
				expect(size1.width).toBeGreaterThan(size0.width);
				expect(size.width).toEqual(size1.width);
			});
		});

		describe('.measureHeight', () => {
			it('calculates the height of the rendered text', () => {
				const height = tester.measureHeight(attrs, 'foo');
				expect(height).toEqual(15);
			});

			it('measures multiline text', () => {
				const height = tester.measureHeight(attrs, 'foo\nbar');
				expect(height).toEqual(30);
			});

			it('returns 0 for empty content', () => {
				const height = tester.measureHeight(attrs, '');
				expect(height).toEqual(0);
			});

			it('does not require the container', () => {
				tester.measureHeight(attrs, 'foo');
				expect(hold.children.length).toEqual(0);
			});
		});

		describe('.detach', () => {
			it('removes the test node from the DOM', () => {
				tester.measure(attrs, 'foo');
				expect(hold.children.length).toEqual(1);
				tester.detach();
				expect(hold.children.length).toEqual(0);
			});

			it('does not prevent using the tester again later', () => {
				tester.measure(attrs, 'foo');
				tester.detach();

				const size = tester.measure(attrs, 'foo');
				expect(hold.children.length).toEqual(1);
				expect(size.width).toBeGreaterThan(0);
			});
		});
	});
});
