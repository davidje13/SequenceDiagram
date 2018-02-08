defineDescribe('SVGShapes', ['./SVGShapes'], (SVGShapes) => {
	'use strict';

	describe('renderBox', () => {
		it('returns a simple rect SVG element', () => {
			const node = SVGShapes.renderBox({
				'foo': 'bar',
			}, {
				'x': 10,
				'y': 20,
				'width': 30,
				'height': 40,
			});
			expect(node.tagName).toEqual('rect');
			expect(node.getAttribute('foo')).toEqual('bar');
			expect(node.getAttribute('x')).toEqual('10');
			expect(node.getAttribute('y')).toEqual('20');
			expect(node.getAttribute('width')).toEqual('30');
			expect(node.getAttribute('height')).toEqual('40');
		});
	});

	describe('renderNote', () => {
		it('returns a group containing a rectangle with a page flick', () => {
			const node = SVGShapes.renderNote({
				'foo': 'bar',
			}, {
				'zig': 'zag',
			}, {
				'x': 10,
				'y': 20,
				'width': 30,
				'height': 40,
			});
			expect(node.tagName).toEqual('g');
			expect(node.children.length).toEqual(2);
			const back = node.children[0];
			expect(back.getAttribute('foo')).toEqual('bar');
			expect(back.getAttribute('points')).toEqual(
				'10 20 ' +
				'33 20 ' +
				'40 27 ' +
				'40 60 ' +
				'10 60'
			);
			const flick = node.children[1];
			expect(flick.getAttribute('zig')).toEqual('zag');
			expect(flick.getAttribute('points')).toEqual(
				'33 20 ' +
				'33 27 ' +
				'40 27'
			);
		});
	});

	describe('renderBoxedText', () => {
		let o = null;
		let sizer = null;

		beforeEach(() => {
			o = document.createElement('p');
			sizer = {
				measure: () => ({width: 64, height: 128}),
			};
		});

		it('renders a label', () => {
			const rendered = SVGShapes.renderBoxedText([[{text: 'foo'}]], {
				x: 1,
				y: 2,
				padding: {left: 4, top: 8, right: 16, bottom: 32},
				boxAttrs: {},
				labelAttrs: {'font-size': 10, 'line-height': 1.5, 'foo': 'bar'},
				boxLayer: o,
				labelLayer: o,
				textSizer: sizer,
			});
			expect(rendered.label.state.formatted).toEqual([[{text: 'foo'}]]);
			expect(rendered.label.state.x).toEqual(5);
			expect(rendered.label.state.y).toEqual(10);
			expect(rendered.label.firstLine().parentNode).toEqual(o);
		});

		it('positions a box beneath the rendered label', () => {
			const rendered = SVGShapes.renderBoxedText([[{text: 'foo'}]], {
				x: 1,
				y: 2,
				padding: {left: 4, top: 8, right: 16, bottom: 32},
				boxAttrs: {'foo': 'bar'},
				labelAttrs: {'font-size': 10, 'line-height': 1.5},
				boxLayer: o,
				labelLayer: o,
				textSizer: sizer,
			});
			expect(rendered.box.getAttribute('x')).toEqual('1');
			expect(rendered.box.getAttribute('y')).toEqual('2');
			expect(rendered.box.getAttribute('width'))
				.toEqual(String(4 + 16 + 64));
			expect(rendered.box.getAttribute('height'))
				.toEqual(String(8 + 32 + 128));
			expect(rendered.box.getAttribute('foo')).toEqual('bar');
			expect(rendered.box.parentNode).toEqual(o);
		});

		it('returns the size of the rendered box', () => {
			const rendered = SVGShapes.renderBoxedText([[{text: 'foo'}]], {
				x: 1,
				y: 2,
				padding: {left: 4, top: 8, right: 16, bottom: 32},
				boxAttrs: {},
				labelAttrs: {'font-size': 10, 'line-height': 1.5},
				boxLayer: o,
				labelLayer: o,
				textSizer: sizer,
			});
			expect(rendered.width).toEqual(4 + 16 + 64);
			expect(rendered.height).toEqual(8 + 32 + 128);
		});
	});
});
