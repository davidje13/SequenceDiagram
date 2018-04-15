defineDescribe('SVGTextBlock', [
	'./SVGTextBlock',
	'./SVG',
	'stubs/TestDOM',
], (
	SVGTextBlock,
	SVG,
	TestDOM
) => {
	'use strict';


	const attrs = {'font-size': 10, 'line-height': 1.5};
	let svg = null;
	let block = null;
	let hold = null;

	beforeEach(() => {
		svg = new SVG(TestDOM.dom, TestDOM.textSizerFactory);
		block = new SVGTextBlock(svg.body, svg, {attrs});
		hold = svg.body.element;
	});

	describe('constructor', () => {
		it('defaults to blank text at 0, 0', () => {
			expect(block.state.formatted).toEqual([]);
			expect(block.state.x).toEqual(0);
			expect(block.state.y).toEqual(0);
			expect(hold.childNodes.length).toEqual(0);
		});

		it('does not explode if given no setup', () => {
			block = new SVGTextBlock(svg.body, svg);
			expect(block.state.formatted).toEqual([]);
			expect(block.state.x).toEqual(0);
			expect(block.state.y).toEqual(0);
			expect(hold.childNodes.length).toEqual(0);
		});

		it('adds the given formatted text if specified', () => {
			block = new SVGTextBlock(svg.body, svg, {
				attrs,
				formatted: [[{text: 'abc'}]],
			});
			expect(block.state.formatted).toEqual([[{text: 'abc'}]]);
			expect(hold.childNodes.length).toEqual(1);
		});

		it('uses the given coordinates if specified', () => {
			block = new SVGTextBlock(svg.body, svg, {attrs, x: 5, y: 7});
			expect(block.state.x).toEqual(5);
			expect(block.state.y).toEqual(7);
		});
	});

	describe('.set', () => {
		it('sets the text to the given content', () => {
			block.set({formatted: [[{text: 'foo'}]]});
			expect(block.state.formatted).toEqual([[{text: 'foo'}]]);
			expect(hold.childNodes.length).toEqual(1);
			expect(hold.childNodes[0].innerHTML).toEqual('foo');
		});

		it('renders multiline text', () => {
			block.set({formatted: [[{text: 'foo'}], [{text: 'bar'}]]});
			expect(hold.childNodes.length).toEqual(2);
			expect(hold.childNodes[0].innerHTML).toEqual('foo');
			expect(hold.childNodes[1].innerHTML).toEqual('bar');
		});

		it('re-uses text nodes when possible, adding more if needed', () => {
			block.set({formatted: [[{text: 'foo'}], [{text: 'bar'}]]});
			const line0 = hold.childNodes[0];
			const line1 = hold.childNodes[1];

			block.set({formatted: [
				[{text: 'zig'}],
				[{text: 'zag'}],
				[{text: 'baz'}],
			]});

			expect(hold.childNodes.length).toEqual(3);
			expect(hold.childNodes[0]).toEqual(line0);
			expect(hold.childNodes[0].innerHTML).toEqual('zig');
			expect(hold.childNodes[1]).toEqual(line1);
			expect(hold.childNodes[1].innerHTML).toEqual('zag');
			expect(hold.childNodes[2].innerHTML).toEqual('baz');
		});

		it('re-uses text nodes when possible, removing extra if needed', () => {
			block.set({formatted: [[{text: 'foo'}], [{text: 'bar'}]]});
			const line0 = hold.childNodes[0];

			block.set({formatted: [[{text: 'zig'}]]});

			expect(hold.childNodes.length).toEqual(1);
			expect(hold.childNodes[0]).toEqual(line0);
			expect(hold.childNodes[0].innerHTML).toEqual('zig');
		});

		it('positions text nodes and applies attributes', () => {
			block.set({formatted: [[{text: 'foo'}], [{text: 'bar'}]]});
			expect(hold.childNodes.length).toEqual(2);
			expect(hold.childNodes[0].getAttribute('x')).toEqual('0');
			expect(hold.childNodes[0].getAttribute('y')).toEqual('1');
			expect(hold.childNodes[0].getAttribute('font-size')).toEqual('10');
			expect(hold.childNodes[1].getAttribute('x')).toEqual('0');
			expect(hold.childNodes[1].getAttribute('y')).toEqual('2');
			expect(hold.childNodes[1].getAttribute('font-size')).toEqual('10');
		});

		it('moves all nodes', () => {
			block.set({formatted: [[{text: 'foo'}], [{text: 'bar'}]]});
			block.set({x: 5, y: 7});
			expect(hold.childNodes[0].getAttribute('x')).toEqual('5');
			expect(hold.childNodes[0].getAttribute('y')).toEqual('8');
			expect(hold.childNodes[1].getAttribute('x')).toEqual('5');
			expect(hold.childNodes[1].getAttribute('y')).toEqual('9');
		});

		it('clears if the text is empty', () => {
			block.set({formatted: [[{text: 'foo'}], [{text: 'bar'}]]});
			block.set({formatted: []});
			expect(hold.childNodes.length).toEqual(0);
			expect(block.state.formatted).toEqual([]);
			expect(block.lines.length).toEqual(0);
		});
	});

	describe('TextSizer', () => {
		beforeEach(() => {
			svg = new SVG(
				new TestDOM.DOMWrapper(window.document),
				(svgBase) => new SVGTextBlock.TextSizer(svgBase)
			);
			document.body.appendChild(svg.body.element);
		});

		afterEach(() => {
			document.body.removeChild(svg.body.element);
		});

		describe('.measure', () => {
			it('calculates the size of the formatted text', () => {
				const size = svg.textSizer.measure(attrs, [[{text: 'foo'}]]);
				expect(size.width).toBeGreaterThan(0);
				expect(size.height).toEqual(15);
			});

			it('calculates the size of text blocks', () => {
				block.set({formatted: [[{text: 'foo'}]]});
				const size = svg.textSizer.measure(block);
				expect(size.width).toBeGreaterThan(0);
				expect(size.height).toEqual(15);
			});

			it('measures multiline text', () => {
				const size = svg.textSizer.measure(attrs, [
					[{text: 'foo'}],
					[{text: 'bar'}],
				]);
				expect(size.width).toBeGreaterThan(0);
				expect(size.height).toEqual(30);
			});

			it('returns 0, 0 for empty content', () => {
				const size = svg.textSizer.measure(attrs, []);
				expect(size.width).toEqual(0);
				expect(size.height).toEqual(0);
			});

			it('returns the maximum width for multiline text', () => {
				const size0 = svg.textSizer.measure(attrs, [
					[{text: 'foo'}],
				]);
				const size1 = svg.textSizer.measure(attrs, [
					[{text: 'longline'}],
				]);
				const size = svg.textSizer.measure(attrs, [
					[{text: 'foo'}],
					[{text: 'longline'}],
					[{text: 'foo'}],
				]);
				expect(size1.width).toBeGreaterThan(size0.width);
				expect(size.width).toEqual(size1.width);
			});
		});

		describe('.measureHeight', () => {
			it('calculates the height of the rendered text', () => {
				const height = svg.textSizer.measureHeight(attrs, [
					[{text: 'foo'}],
				]);
				expect(height).toEqual(15);
			});

			it('measures multiline text', () => {
				const height = svg.textSizer.measureHeight(attrs, [
					[{text: 'foo'}],
					[{text: 'bar'}],
				]);
				expect(height).toEqual(30);
			});

			it('returns 0 for empty content', () => {
				const height = svg.textSizer.measureHeight(attrs, []);
				expect(height).toEqual(0);
			});

			it('does not require the container', () => {
				svg.textSizer.measureHeight(attrs, [[{text: 'foo'}]]);
				expect(svg.body.element.childNodes.length).toEqual(0);
			});
		});
	});
});
