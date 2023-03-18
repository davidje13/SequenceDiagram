import {dom, textSizerFactory} from '../../spec/stubs/TestDOM.mjs';
import SVG from './SVG.mjs';

describe('SVG', () => {
	const expectedNS = 'http://www.w3.org/2000/svg';

	const svg = new SVG(dom, textSizerFactory);

	describe('.txt', () => {
		it('creates a text node with the given content', () => {
			const node = svg.txt('foo');

			expect(node.nodeValue).toEqual('foo');
		});

		it('defaults to empty', () => {
			const node = svg.txt();

			expect(node.nodeValue).toEqual('');
		});
	});

	describe('.el', () => {
		it('creates a wrapped node with the SVG namespace', () => {
			const node = svg.el('path').element;

			expect(node.namespaceURI).toEqual(expectedNS);
			expect(node.tagName).toEqual('path');
		});

		it('overrides the namespace if desired', () => {
			const node = svg.el('path', 'foo').element;

			expect(node.namespaceURI).toEqual('foo');
		});
	});

	describe('.body', () => {
		it('is a wrapped svg node with the SVG namespace', () => {
			const node = svg.body.element;

			expect(node.namespaceURI).toEqual(expectedNS);
			expect(node.getAttribute('xmlns')).toEqual(expectedNS);
			expect(node.getAttribute('version')).toEqual('1.1');
			expect(node.tagName).toEqual('svg');
		});
	});

	describe('.box', () => {
		it('returns a wrapped simple rect SVG element', () => {
			const node = svg.box({
				'foo': 'bar',
			}, {
				'height': 40,
				'width': 30,
				'x': 10,
				'y': 20,
			}).element;

			expect(node.tagName).toEqual('rect');
			expect(node.getAttribute('foo')).toEqual('bar');
			expect(node.getAttribute('x')).toEqual('10');
			expect(node.getAttribute('y')).toEqual('20');
			expect(node.getAttribute('width')).toEqual('30');
			expect(node.getAttribute('height')).toEqual('40');
		});
	});

	describe('.note', () => {
		it('returns a wrapped rectangle with a page flick', () => {
			const node = svg.note({
				'foo': 'bar',
			}, {
				'zig': 'zag',
			}, {
				'height': 40,
				'width': 30,
				'x': 10,
				'y': 20,
			}).element;

			expect(node.tagName).toEqual('g');
			expect(node.childNodes.length).toEqual(2);

			const [back, flick] = node.childNodes;

			expect(back.getAttribute('foo')).toEqual('bar');
			expect(back.getAttribute('points')).toEqual(
				'10 20 ' +
				'33 20 ' +
				'40 27 ' +
				'40 60 ' +
				'10 60',
			);

			expect(flick.getAttribute('zig')).toEqual('zag');
			expect(flick.getAttribute('points')).toEqual(
				'33 20 ' +
				'33 27 ' +
				'40 27',
			);
		});
	});

	describe('.boxedText', () => {
		const PADDING = {bottom: 32, left: 4, right: 16, top: 8};
		const LABEL_ATTRS = {'font-size': 10, 'foo': 'bar', 'line-height': 1.5};
		const LABEL = [[{text: 'foo'}]];

		beforeEach(() => {
			svg.textSizer.expectMeasure(LABEL_ATTRS, LABEL);
			svg.textSizer.performMeasurements();
		});

		it('renders a label', () => {
			const rendered = svg.boxedText({
				boxAttrs: {},
				labelAttrs: LABEL_ATTRS,
				padding: PADDING,
			}, LABEL, {x: 1, y: 2});
			const block = rendered.label.textBlock;

			expect(block.state.formatted).toEqual([[{text: 'foo'}]]);
			expect(block.state.x).toEqual(5);
			expect(block.state.y).toEqual(10);
		});

		it('positions a box beneath the rendered label', () => {
			const rendered = svg.boxedText({
				boxAttrs: {'foo': 'bar'},
				labelAttrs: LABEL_ATTRS,
				padding: PADDING,
			}, LABEL, {x: 1, y: 2});
			const [box] = rendered.element.childNodes;

			expect(box.getAttribute('x')).toEqual('1');
			expect(box.getAttribute('y')).toEqual('2');
			expect(box.getAttribute('width')).toEqual(String(4 + 16 + 3));
			expect(box.getAttribute('height')).toEqual(String(8 + 32 + 1));
			expect(box.getAttribute('foo')).toEqual('bar');
		});

		it('returns the size of the rendered box', () => {
			const rendered = svg.boxedText({
				boxAttrs: {},
				labelAttrs: LABEL_ATTRS,
				padding: PADDING,
			}, LABEL, {x: 1, y: 2});

			expect(rendered.width).toEqual(4 + 16 + 3);
			expect(rendered.height).toEqual(8 + 32 + 1);
		});
	});
});
