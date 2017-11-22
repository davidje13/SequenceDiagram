/* jshint -W072 */ // Allow several required modules
defineDescribe('Sequence Integration', [
	'./Parser',
	'./Generator',
	'./Renderer',
	'./themes/Basic',
	'stubs/SVGTextBlock',
], (
	Parser,
	Generator,
	Renderer,
	BasicTheme,
	SVGTextBlock
) => {
	/* jshint +W072 */
	'use strict';

	let parser = null;
	let generator = null;
	let renderer = null;
	let theme = null;

	beforeEach(() => {
		theme = new BasicTheme();
		parser = new Parser();
		generator = new Generator();
		renderer = new Renderer({
			themes: [new BasicTheme()],
			namespace: '',
			SVGTextBlockClass: SVGTextBlock,
		});
		document.body.appendChild(renderer.svg());
	});

	afterEach(() => {
		document.body.removeChild(renderer.svg());
	});

	function getSimplifiedContent(r) {
		return (r.svg().outerHTML
			.replace(/<g><\/g>/g, '')
			.replace(' xmlns="http://www.w3.org/2000/svg" version="1.1"', '')
		);
	}

	it('Renders empty diagrams without error', () => {
		const parsed = parser.parse('');
		const sequence = generator.generate(parsed);
		renderer.render(sequence);
		expect(getSimplifiedContent(renderer)).toEqual(
			'<svg viewBox="-5 -5 10 10">' +
			'<defs>' +
			'<mask id="LineMask" maskUnits="userSpaceOnUse">' +
			'<rect fill="#FFFFFF" x="-5" y="-5" width="10" height="10">' +
			'</rect>' +
			'</mask>' +
			'</defs>' +
			'<g mask="url(#LineMask)"></g>' +
			'</svg>'
		);
	});

	it('Renders simple metadata', () => {
		const parsed = parser.parse('title My title here');
		const sequence = generator.generate(parsed);
		renderer.render(sequence);

		expect(getSimplifiedContent(renderer)).toEqual(
			'<svg viewBox="-11.5 -16 23 21">' +
			'<defs>' +
			'<mask id="LineMask" maskUnits="userSpaceOnUse">' +
			'<rect fill="#FFFFFF" x="-11.5" y="-16" width="23" height="21">' +
			'</rect>' +
			'</mask>' +
			'</defs>' +
			'<g mask="url(#LineMask)"></g>' +
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

	it('Renders simple components', () => {
		const parsed = parser.parse('A -> B');
		const sequence = generator.generate(parsed);
		renderer.render(sequence);

		const content = getSimplifiedContent(renderer);
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
			'<line x1="20.5" y1="26" x2="48.5" y2="26"'
		);
		expect(content).toContain(
			'<polygon points="46 21 51 26 46 31"'
		);
	});

	const SAMPLE_REGEX = new RegExp(
		/```(?!shell).*\n([^]+?)```/g
	);

	function findSamples(content) {
		SAMPLE_REGEX.lastIndex = 0;
		const results = [];
		while(true) {
			const match = SAMPLE_REGEX.exec(content);
			if(!match) {
				break;
			}
			results.push(match[1]);
		}
		return results;
	}

	return (fetch('README.md')
		.then((response) => response.text())
		.then(findSamples)
		.then((samples) => samples.forEach((code, i) => {
			it('Renders readme example #' + (i + 1) + ' without error', () => {
				const parsed = parser.parse(code);
				const sequence = generator.generate(parsed);
				expect(() => renderer.render(sequence)).not.toThrow();
			});
		}))
	);
});
