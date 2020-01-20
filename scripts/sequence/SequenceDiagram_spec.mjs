import {VirtualDocument, textSizerFactory} from '../../spec/stubs/TestDOM.mjs';
import Exporter from './exporter/Exporter.mjs';
import Generator from './generator/Generator.mjs';
import Parser from './parser/Parser.mjs';
import Renderer from './renderer/Renderer.mjs';
import SequenceDiagram from './SequenceDiagram.mjs';

function getSimplifiedContent(d) {
	return (d.dom().outerHTML
		.replace(/<g><\/g>/g, '')
		.replace(/<defs><\/defs>/g, '')
		.replace(' xmlns="http://www.w3.org/2000/svg" version="1.1"', '')
	);
}

function makeDiagram(code) {
	return new SequenceDiagram(code, {
		document: new VirtualDocument(),
		namespace: '',
		textSizerFactory,
	});
}

describe('SequenceDiagram', () => {
	it('contains references to core objects', () => {
		expect(SequenceDiagram.Parser).toBe(Parser);
		expect(SequenceDiagram.Generator).toBe(Generator);
		expect(SequenceDiagram.Renderer).toBe(Renderer);
		expect(SequenceDiagram.Exporter).toBe(Exporter);
	});

	it('provides default themes', () => {
		expect(SequenceDiagram.themes.length).toBeGreaterThan(1);
	});

	it('renders empty diagrams without error', () => {
		const diagram = makeDiagram('');

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
			'</svg>'
		);
	});

	it('renders simple metadata', () => {
		const diagram = makeDiagram('title My title here');

		expect(getSimplifiedContent(diagram)).toEqual(
			'<svg viewBox="-11.5 -16 23 21">' +
			'<metadata>title My title here</metadata>' +
			'<defs>' +
			'<mask id="FullMask" maskUnits="userSpaceOnUse">' +
			'<rect fill="#FFFFFF" height="21" width="23" x="-11.5" y="-16">' +
			'</rect>' +
			'</mask>' +
			'<mask id="LineMask" maskUnits="userSpaceOnUse">' +
			'<rect fill="#FFFFFF" height="21" width="23" x="-11.5" y="-16">' +
			'</rect>' +
			'</mask>' +
			'</defs>' +
			'<g>' +
			'<text' +
			' x="0"' +
			' class="title"' +
			' font-family="Helvetica,Arial,Liberation Sans,sans-serif"' +
			' font-size="20"' +
			' line-height="1.3"' +
			' text-anchor="middle"' +
			' y="-10">My title here</text>' +
			'</g>' +
			'<g mask="url(#FullMask)">' +
			'<g mask="url(#LineMask)"></g>' +
			'</g>' +
			'</svg>'
		);
	});

	it('re-renders when changed', () => {
		const diagram = makeDiagram('title My title here');
		diagram.set('title Another title');

		expect(getSimplifiedContent(diagram)).toContain('Another title');
	});

	it('renders simple components', () => {
		const diagram = makeDiagram('A -> B');

		const content = getSimplifiedContent(diagram);

		expect(content).toContain(
			'<svg viewBox="-5 -5 82 56">'
		);

		// Agent 1
		expect(content).toContain(
			'<line fill="none" stroke="#000000" stroke-width="1"' +
			' x1="20.5" x2="20.5" y1="11" y2="46" class="agent-1-line"'
		);

		expect(content).toContain(
			'<rect class="outline" fill="transparent"' +
			' height="11" width="21" x="10" y="0"'
		);

		expect(content).toContain(
			'<text x="20.5"'
		);

		// Agent 2
		expect(content).toContain(
			'<line fill="none" stroke="#000000" stroke-width="1"' +
			' x1="51.5" x2="51.5" y1="11" y2="46" class="agent-2-line"'
		);

		expect(content).toContain(
			'<rect class="outline" fill="transparent"' +
			' height="11" width="21" x="41" y="0"'
		);

		expect(content).toContain(
			'<text x="51.5"'
		);

		// Arrow
		expect(content).toContain(
			'<path d="M20.5 26L48.5 26"'
		);

		expect(content).toContain(
			'<polygon points="46 31 51 26 46 21"'
		);
	});

	it('renders collapsed blocks', () => {
		const diagram = makeDiagram('if\nA -> B\nend');
		diagram.setCollapsed(0, true);

		const content = getSimplifiedContent(diagram);

		expect(content).toContain('<svg viewBox="-5 -5 60 39">');

		expect(content).toContain(
			'<line fill="none" stroke="#000000" stroke-width="1"' +
			' x1="20" x2="20" y1="7" y2="29"'
		);

		expect(content).toContain(
			'<line fill="none" stroke="#000000" stroke-width="1"' +
			' x1="30" x2="30" y1="7" y2="29"'
		);

		expect(content).toContain(
			'<rect fill="none" stroke="#000000" stroke-width="1.5"' +
			' rx="2" ry="2"' +
			' height="9" width="30" x="10" y="0"'
		);

		expect(content).toContain('<g class="region collapsed"');
	});

	it('includes text filters if used', () => {
		const diagram = makeDiagram('title <highlight>foo</highlight>');
		const content = getSimplifiedContent(diagram);

		expect(content).toContain('<filter id="highlight"');
	});

	it('returns a full SVG with explicit sizes when exported', () => {
		const svg = makeDiagram('').getSVGCodeSynchronous();

		expect(svg).toContain('<?xml version="1.0" encoding="UTF-8" ?>');
		expect(svg).toContain('<svg width="');
	});

	it('makes the raw title text available', () => {
		const diagram = makeDiagram('title "foo **bold**\nbar"');

		expect(diagram.getTitle()).toEqual('foo bold bar');
	});
});
