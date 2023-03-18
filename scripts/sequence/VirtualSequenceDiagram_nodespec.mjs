import Exporter from './exporter/Exporter.mjs';
import Generator from './generator/Generator.mjs';
import Parser from './parser/Parser.mjs';
import Renderer from './renderer/Renderer.mjs';
import VirtualSequenceDiagram from './VirtualSequenceDiagram.mjs';

function getSimplifiedContent(d) {
	return (d.dom().outerHTML
		.replace(/<g><\/g>/g, '')
		.replace(/<defs><\/defs>/g, '')
		.replace(' xmlns="http://www.w3.org/2000/svg" version="1.1"', '')
	);
}

describe('VirtualSequenceDiagram', () => {
	it('contains references to core objects', () => {
		expect(VirtualSequenceDiagram.Parser).toBe(Parser);
		expect(VirtualSequenceDiagram.Generator).toBe(Generator);
		expect(VirtualSequenceDiagram.Renderer).toBe(Renderer);
		expect(VirtualSequenceDiagram.Exporter).toBe(Exporter);
	});

	it('provides default themes', () => {
		expect(VirtualSequenceDiagram.themes.length).toBeGreaterThan(1);
	});

	it('renders empty diagrams without error', () => {
		const diagram = new VirtualSequenceDiagram();
		diagram.set('');

		expect(getSimplifiedContent(diagram)).toEqual(
			'<svg viewBox="-5 -5 10 10">' +
			'<metadata></metadata>' +
			'<defs>' +
			'<mask id="FullMask" maskUnits="userSpaceOnUse">' +
			'<rect fill="#FFFFFF" height="10" width="10" x="-5" y="-5">' +
			'</rect>' +
			'</mask>' +
			'<mask id="LineMask" maskUnits="userSpaceOnUse">' +
			'<rect fill="#FFFFFF" height="10" width="10" x="-5" y="-5">' +
			'</rect>' +
			'</mask>' +
			'</defs>' +
			'<g mask="url(#FullMask)">' +
			'<g mask="url(#LineMask)"></g>' +
			'</g>' +
			'</svg>',
		);
	});

	it('re-renders when changed', () => {
		const diagram = new VirtualSequenceDiagram('title My title here');
		diagram.set('title Another title');

		expect(getSimplifiedContent(diagram)).toContain('Another title');
	});

	it('measures OS fonts correctly on the first render', (done) => {
		const code = 'title message';
		const sd = new VirtualSequenceDiagram(code);
		const widthImmediate = sd.getSize().width;

		expect(widthImmediate).toBeNear(91.2, 1e-1);

		sd.set(code);

		expect(sd.getSize().width).toEqual(widthImmediate);

		setTimeout(() => {
			sd.set(code);

			expect(sd.getSize().width).toEqual(widthImmediate);

			done();
		}, 500);
	});

	it('measures embedded fonts correctly on the first render', (done) => {
		const code = 'theme sketch\ntitle message';
		const sd = new VirtualSequenceDiagram(code);
		const widthImmediate = sd.getSize().width;

		expect(widthImmediate).toBeNear(78.0, 1e-1);

		sd.set(code);

		expect(sd.getSize().width).toEqual(widthImmediate);

		setTimeout(() => {
			sd.set(code);

			expect(sd.getSize().width).toEqual(widthImmediate);

			done();
		}, 500);
	});
});
