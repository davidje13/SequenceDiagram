/* jshint -W072 */ // Allow several required modules
defineDescribe('SequenceDiagram', [
	'./SequenceDiagram',
	'./Parser',
	'./Generator',
	'./Renderer',
	'./Exporter',
	'stubs/SVGTextBlock',
], (
	SequenceDiagram,
	Parser,
	Generator,
	Renderer,
	Exporter,
	SVGTextBlock
) => {
	/* jshint +W072 */
	'use strict';

	function getSimplifiedContent(d) {
		return (d.dom().outerHTML
			.replace(/<g><\/g>/g, '')
			.replace(/<defs><\/defs>/g, '')
			.replace(' xmlns="http://www.w3.org/2000/svg" version="1.1"', '')
		);
	}

	let diagram = null;

	beforeEach(() => {
		diagram = new SequenceDiagram({
			namespace: '',
			SVGTextBlockClass: SVGTextBlock,
		});
	});

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
		diagram.set('');

		expect(getSimplifiedContent(diagram)).toEqual(
			'<svg viewBox="-5 -5 10 10">' +
			'<metadata></metadata>' +
			'<defs>' +
			'<mask id="FullMask" maskUnits="userSpaceOnUse">' +
			'<rect fill="#FFFFFF" x="-5" y="-5" width="10" height="10">' +
			'</rect>' +
			'</mask>' +
			'<mask id="LineMask" maskUnits="userSpaceOnUse">' +
			'<rect fill="#FFFFFF" x="-5" y="-5" width="10" height="10">' +
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
		diagram.set('title My title here');

		expect(getSimplifiedContent(diagram)).toEqual(
			'<svg viewBox="-11.5 -16 23 21">' +
			'<metadata>title My title here</metadata>' +
			'<defs>' +
			'<mask id="FullMask" maskUnits="userSpaceOnUse">' +
			'<rect fill="#FFFFFF" x="-11.5" y="-16" width="23" height="21">' +
			'</rect>' +
			'</mask>' +
			'<mask id="LineMask" maskUnits="userSpaceOnUse">' +
			'<rect fill="#FFFFFF" x="-11.5" y="-16" width="23" height="21">' +
			'</rect>' +
			'</mask>' +
			'</defs>' +
			'<g mask="url(#FullMask)">' +
			'<g mask="url(#LineMask)"></g>' +
			'</g>' +
			'<text' +
			' x="0"' +
			' font-family="sans-serif"' +
			' font-size="20"' +
			' line-height="1.3"' +
			' text-anchor="middle"' +
			' class="title"' +
			' y="-11">My title here</text>' +
			'</svg>'
		);
	});

	it('renders simple components', () => {
		diagram.set('A -> B');

		const content = getSimplifiedContent(diagram);

		expect(content).toContain(
			'<svg viewBox="-5 -5 82 56">'
		);

		// Agent 1
		expect(content).toContain(
			'<line x1="20.5" y1="11" x2="20.5" y2="46" class="agent-1-line"'
		);
		expect(content).toContain(
			'<rect x="10" y="0" width="21" height="11"'
		);
		expect(content).toContain(
			'<text x="20.5"'
		);

		// Agent 2
		expect(content).toContain(
			'<line x1="51.5" y1="11" x2="51.5" y2="46" class="agent-2-line"'
		);
		expect(content).toContain(
			'<rect x="41" y="0" width="21" height="11"'
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
		diagram.set('if\nA -> B\nend');
		diagram.setCollapsed(0, true);

		const content = getSimplifiedContent(diagram);

		expect(content).toContain('<svg viewBox="-5 -5 60 37">');

		expect(content).toContain('<line x1="20" y1="5" x2="20" y2="27"');
		expect(content).toContain('<line x1="30" y1="5" x2="30" y2="27"');
		expect(content).toContain('<rect x="10" y="0" width="30" height="7"');
		expect(content).toContain('<g class="region collapsed"');
	});

});
