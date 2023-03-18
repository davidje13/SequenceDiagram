import {SVGTextBlock, TextSizer} from './SVGTextBlock.mjs';
import {DOMWrapper} from '../../spec/stubs/TestDOM.mjs';
import SVG from './SVG.mjs';

const MONO_FONT = 'Courier New,Liberation Mono,monospace';

describe('TextSizer', () => {
	const attrs = {'font-size': 10, 'line-height': 1.5};
	let svg = null;

	beforeEach(() => {
		svg = new SVG(
			new DOMWrapper(window.document),
			(svgBase) => new TextSizer(svgBase),
		);
		document.body.appendChild(svg.body.element);
	});

	afterEach(() => {
		document.body.removeChild(svg.body.element);
	});

	function safeMeasure(attributes, formatted) {
		svg.textSizer.expectMeasure(attributes, formatted);
		svg.textSizer.performMeasurements();
		return svg.textSizer.measure(attributes, formatted);
	}

	describe('.measure', () => {
		it('calculates the size of the formatted text', () => {
			const size = safeMeasure(attrs, [[{text: 'foo'}]]);

			expect(size.width).toBeGreaterThan(0);
			expect(size.height).toEqual(15);
		});

		it('calculates the size of text blocks', () => {
			const block = new SVGTextBlock(svg.body, svg, {attrs});
			block.set({formatted: [[{text: 'foo'}]]});
			const size = safeMeasure(block);

			expect(size.width).toBeGreaterThan(0);
			expect(size.height).toEqual(15);
		});

		it('measures multiline text', () => {
			const size = safeMeasure(attrs, [
				[{text: 'foo'}],
				[{text: 'bar'}],
			]);

			expect(size.width).toBeGreaterThan(0);
			expect(size.height).toEqual(30);
		});

		it('uses font styles where available', () => {
			const sizeRegular = safeMeasure(attrs, [[
				{text: 'foo'},
				{text: 'bar'},
			]]);

			const sizeBold = safeMeasure(attrs, [[
				{text: 'foo'},
				{attrs: {'font-weight': 'bolder'}, text: 'bar'},
			]]);

			const sizeMono = safeMeasure(attrs, [[
				{text: 'foo'},
				{attrs: {'font-family': MONO_FONT}, text: 'bar'},
			]]);

			const sizeMonoBold = safeMeasure(attrs, [[
				{text: 'foo'},
				{attrs: {
					'font-family': MONO_FONT,
					'font-weight': 'bolder',
				}, text: 'bar'},
			]]);

			expect(sizeBold.width).toBeGreaterThan(sizeRegular.width);

			expect(sizeMono.width).toBeGreaterThan(sizeRegular.width);
			expect(sizeMonoBold.width).toBeNear(sizeMono.width, 1e-1);
		});

		it('returns 0, 0 for empty content', () => {
			const size = safeMeasure(attrs, []);

			expect(size.width).toEqual(0);
			expect(size.height).toEqual(0);
		});

		it('returns the maximum width for multiline text', () => {
			const size0 = safeMeasure(attrs, [
				[{text: 'foo'}],
			]);
			const size1 = safeMeasure(attrs, [
				[{text: 'longline'}],
			]);
			const size = safeMeasure(attrs, [
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
