import {dom, textSizerFactory} from '../../spec/stubs/TestDOM.mjs';
import SVG from './SVG.mjs';
import {SVGTextBlock} from './SVGTextBlock.mjs';

describe('SVGTextBlock', () => {
	const attrs = {'font-size': 10, 'line-height': 1.5};
	let svg = null;
	let block = null;
	let hold = null;

	beforeEach(() => {
		svg = new SVG(dom, textSizerFactory);
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

		it('renders with tspans if the formatting changes', () => {
			block.set({formatted: [[
				{text: 'foo'},
				{attrs: {zig: 'zag'}, text: 'bar'},
			]]});

			expect(hold.childNodes[0].innerHTML)
				.toEqual('foo<tspan zig="zag">bar</tspan>');
		});

		it('converts filter attributes using the registered filters', () => {
			svg.registerTextFilter('foo', 'local-foobar');
			block.set({formatted: [[
				{text: 'foo'},
				{attrs: {'filter': 'foo'}, text: 'bar'},
			]]});

			expect(hold.childNodes[0].innerHTML)
				.toEqual('foo<tspan filter="url(#local-foobar)">bar</tspan>');
		});

		it('re-uses text nodes when possible, adding more if needed', () => {
			block.set({formatted: [[{text: 'foo'}], [{text: 'bar'}]]});
			const [line0, line1] = hold.childNodes;

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
			const [line0] = hold.childNodes;

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
});
