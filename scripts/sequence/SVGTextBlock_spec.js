defineDescribe('SVGTextBlock', ['./SVGTextBlock'], (SVGTextBlock) => {
	'use strict';

	const attrs = {'font-size': 10};
	let hold = null;
	let block = null;

	beforeEach(() => {
		hold = document.createElement('p');
		document.body.appendChild(hold);
		block = new SVGTextBlock(hold, attrs, 1.5);
	});

	afterEach(() => {
		document.body.removeChild(hold);
	});

	describe('constructor', () => {
		it('defaults to blank text at 0, 0', () => {
			expect(block.text).toEqual('');
			expect(block.x).toEqual(0);
			expect(block.y).toEqual(0);
			expect(hold.children.length).toEqual(0);
		});

		it('adds the given text if specified', () => {
			block = new SVGTextBlock(hold, attrs, 1.5, {text: 'abc'});
			expect(block.text).toEqual('abc');
			expect(hold.children.length).toEqual(1);
		});

		it('uses the given coordinates if specified', () => {
			block = new SVGTextBlock(hold, attrs, 1.5, {x: 5, y: 7});
			expect(block.x).toEqual(5);
			expect(block.y).toEqual(7);
		});
	});

	describe('setText', () => {
		it('sets the text to the given content', () => {
			block.setText('foo');
			expect(block.text).toEqual('foo');
			expect(hold.children.length).toEqual(1);
			expect(hold.children[0].innerHTML).toEqual('foo');
		});

		it('renders multiline text', () => {
			block.setText('foo\nbar');
			expect(hold.children.length).toEqual(2);
			expect(hold.children[0].innerHTML).toEqual('foo');
			expect(hold.children[1].innerHTML).toEqual('bar');
		});

		it('re-uses text nodes when possible, adding more if needed', () => {
			block.setText('foo\nbar');
			const line0 = hold.children[0];
			const line1 = hold.children[1];

			block.setText('zig\nzag\nbaz');

			expect(hold.children.length).toEqual(3);
			expect(hold.children[0]).toEqual(line0);
			expect(hold.children[0].innerHTML).toEqual('zig');
			expect(hold.children[1]).toEqual(line1);
			expect(hold.children[1].innerHTML).toEqual('zag');
			expect(hold.children[2].innerHTML).toEqual('baz');
		});

		it('re-uses text nodes when possible, removing extra if needed', () => {
			block.setText('foo\nbar');
			const line0 = hold.children[0];

			block.setText('zig');

			expect(hold.children.length).toEqual(1);
			expect(hold.children[0]).toEqual(line0);
			expect(hold.children[0].innerHTML).toEqual('zig');
		});

		it('positions text nodes and applies attributes', () => {
			block.setText('foo\nbar');
			expect(hold.children.length).toEqual(2);
			expect(hold.children[0].getAttribute('x')).toEqual('0');
			expect(hold.children[0].getAttribute('y')).toEqual('10');
			expect(hold.children[0].getAttribute('font-size')).toEqual('10');
			expect(hold.children[1].getAttribute('x')).toEqual('0');
			expect(hold.children[1].getAttribute('y')).toEqual('25');
			expect(hold.children[1].getAttribute('font-size')).toEqual('10');
		});
	});

	describe('reanchor', () => {
		it('moves all nodes', () => {
			block.setText('foo\nbaz');
			block.reanchor(5, 7);
			expect(hold.children[0].getAttribute('x')).toEqual('5');
			expect(hold.children[0].getAttribute('y')).toEqual('17');
			expect(hold.children[1].getAttribute('x')).toEqual('5');
			expect(hold.children[1].getAttribute('y')).toEqual('32');
		});
	});

	describe('clear', () => {
		it('resets the text empty', () => {
			block.setText('foo\nbaz');
			block.setText('');
			expect(hold.children.length).toEqual(0);
			expect(block.text).toEqual('');
			expect(block.width).toEqual(0);
			expect(block.height).toEqual(0);
		});
	});
});
