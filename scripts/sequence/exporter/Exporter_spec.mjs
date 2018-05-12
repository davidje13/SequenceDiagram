import Exporter from './Exporter.mjs';

function makeRenderer(code, width, height) {
	return {dom: () => ({outerHTML: code}), height, width};
}

describe('Exporter', () => {
	const exporter = new Exporter();

	const renderer = makeRenderer('<svg foo="bar"><abc></abc></svg>', 100, 200);

	describe('.getSVGContent', () => {
		it('returns the XML representation of the given renderer', () => {
			const xml = exporter.getSVGContent(renderer);

			expect(xml).toContain('<abc></abc>');
		});

		it('includes an XML header', () => {
			const xml = exporter.getSVGContent(renderer);

			expect(xml).toContain('<?xml version="1.0" encoding="UTF-8" ?>');
		});

		it('adds the width and height explicitly', () => {
			const xml = exporter.getSVGContent(renderer);

			expect(xml).toContain('<svg width="100" height="200" foo="bar">');
		});
	});
});
