/* jshint -W072 */
defineDescribe('Sequence Renderer', [
	'./Parser',
	'./Generator',
	'./Renderer',
	'./themes/Basic',
	'stubs/SVGTextBlock',
], (
	Parser,
	Generator,
	Renderer,
	Theme,
	SVGTextBlock
) => {
	'use strict';

	let parser = null;
	let generator = null;
	let renderer = null;
	let theme = null;

	beforeEach(() => {
		theme = new Theme();
		parser = new Parser();
		generator = new Generator();
		renderer = new Renderer(theme, {SVGTextBlockClass: SVGTextBlock});
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
			'<svg width="100%" height="100%" viewBox="-5 -5 10 10">' +
			'</svg>'
		);
	});

	it('Renders simple metadata', () => {
		const parsed = parser.parse('title My title here');
		const sequence = generator.generate(parsed);
		renderer.render(sequence);

		expect(getSimplifiedContent(renderer)).toEqual(
			'<svg width="100%" height="100%" viewBox="-11.5 -16 23 21">' +
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
			'<svg width="100%" height="100%" viewBox="-5 -5 82 49">'
		);

		// Agent 1
		expect(content).toContain(
			'<line x1="20.5" y1="11" x2="20.5" y2="39" class="agent-1-line"'
		);
		expect(content).toContain(
			'<rect x="10" y="0" width="21" height="11"'
		);
		expect(content).toContain(
			'<text x="20.5"'
		);

		// Agent 2
		expect(content).toContain(
			'<line x1="51.5" y1="11" x2="51.5" y2="39" class="agent-2-line"'
		);
		expect(content).toContain(
			'<rect x="41" y="0" width="21" height="11"'
		);
		expect(content).toContain(
			'<text x="51.5"'
		);

		// Arrow
		expect(content).toContain(
			'<line x1="20.5" y1="20" x2="50.5" y2="20"'
		);
		expect(content).toContain(
			'<polygon points="46.5 16 50.5 20 46.5 24"'
		);
	});

	it('Renders the "Simple Usage" example without error', () => {
		const parsed = parser.parse(
			'title Labyrinth\n' +
			'\n' +
			'Bowie -> Gremlin: You remind me of the babe\n' +
			'Gremlin -> Bowie: What babe?\n' +
			'Bowie -> Gremlin: The babe with the power\n' +
			'Gremlin -> Bowie: What power?\n' +
			'note right of Bowie, Gremlin: Most people get muddled here!\n' +
			'Bowie -> Gremlin: \'The power of voodoo\'\n' +
			'Gremlin -> Bowie: "Who-do?"\n' +
			'Bowie -> Gremlin: You do!\n' +
			'Gremlin -> Bowie: Do what?\n' +
			'Bowie -> Gremlin: Remind me of the babe!\n' +
			'\n' +
			'Bowie -> Audience: Sings\n' +
			'\n' +
			'terminators box\n'
		);
		const sequence = generator.generate(parsed);
		expect(() => renderer.render(sequence)).not.toThrow();
	});

	it('Renders the "Connection Types" example without error', () => {
		const parsed = parser.parse(
			'title Connection Types\n' +
			'\n' +
			'Foo -> Bar: Simple arrow\n' +
			'Foo --> Bar: Dashed arrow\n' +
			'Foo <- Bar: Reversed arrow\n' +
			'Foo <-- Bar: Reversed dashed arrow\n' +
			'Foo <-> Bar: Double arrow\n' +
			'Foo <--> Bar: Double dashed arrow\n' +
			'\n' +
			'# An arrow with no label:\n' +
			'Foo -> Bar\n' +
			'\n' +
			'Foo -> Foo: Foo talks to itself\n' +
			'\n' +
			'# Arrows leaving on the left and right of the diagram\n' +
			'[ -> Foo: From the left\n' +
			'[ <- Foo: To the left\n' +
			'Foo -> ]: To the right\n' +
			'Foo <- ]: From the right\n' +
			'[ -> ]: Left to right!\n' +
			'# (etc.)\n'
		);
		const sequence = generator.generate(parsed);
		expect(() => renderer.render(sequence)).not.toThrow();
	});

	it('Renders the "Notes & State" example without error', () => {
		const parsed = parser.parse(
			'title Note Placements\n' +
			'\n' +
			'note over Foo: Foo says something\n' +
			'note left of Foo: Stuff\n' +
			'note right of Bar: More stuff\n' +
			'note over Foo, Bar: "Foo and Bar\n' +
			'on multiple lines"\n' +
			'note between Foo, Bar: Link\n' +
			'\n' +
			'text right: \'Comments\\nOver here\!\'\n' +
			'\n' +
			'state over Foo: Foo is ponderous'
		);
		const sequence = generator.generate(parsed);
		expect(() => renderer.render(sequence)).not.toThrow();
	});

	it('Renders the "Logic" example without error', () => {
		const parsed = parser.parse(
			'title At the Bank\n' +
			'\n' +
			'begin Person, ATM, Bank\n' +
			'Person -> ATM: Request money\n' +
			'ATM -> Bank: Check funds\n' +
			'if fraud detected\n' +
			'  Bank -> Police: "Get \'em!"\n' +
			'  Police -> Person: "You\'re nicked"\n' +
			'  end Police\n' +
			'else if sufficient funds\n' +
			'  ATM -> Bank: Withdraw funds\n' +
			'  repeat until "all requested money\n' +
			'                has been handed over"\n' +
			'    ATM -> Person: Dispense note\n' +
			'  end\n' +
			'else\n' +
			'  ATM -> Person: Error\n' +
			'end'
		);
		const sequence = generator.generate(parsed);
		expect(() => renderer.render(sequence)).not.toThrow();
	});

	it('Renders the "Multiline Text" example without error', () => {
		const parsed = parser.parse(
			'title \'My Multiline\n' +
			'Title\'\n' +
			'\n' +
			'note over Foo: \'Also possible\\nwith escapes\'\n' +
			'\n' +
			'Foo -> Bar: \'Lines of text\\non this arrow\'\n' +
			'\n' +
			'if \'Even multiline\\ninside conditions like this\'\n' +
			'  Foo -> \'Multiline\\nagent\'\n' +
			'end\n' +
			'\n' +
			'state over Foo: \'Newlines here,\\ntoo!\''
		);
		const sequence = generator.generate(parsed);
		expect(() => renderer.render(sequence)).not.toThrow();
	});

	it('Renders the "Short-Lived Agents" example without error', () => {
		const parsed = parser.parse(
			'title "Baz doesn\'t live long"\n' +
			'\n' +
			'Foo -> Bar\n' +
			'begin Baz\n' +
			'Bar -> Baz\n' +
			'Baz -> Foo\n' +
			'end Baz\n' +
			'Foo -> Bar\n' +
			'\n' +
			'# Foo and Bar end with black bars\n' +
			'terminators bar\n' +
			'# (options are: box, bar, cross, none)'
		);
		const sequence = generator.generate(parsed);
		expect(() => renderer.render(sequence)).not.toThrow();
	});

	it('Renders the "Alternative Agent Ordering" example without error', () => {
		const parsed = parser.parse(
			'define Baz, Foo\n' +
			'Foo -> Bar\n' +
			'Bar -> Baz\n'
		);
		const sequence = generator.generate(parsed);
		expect(() => renderer.render(sequence)).not.toThrow();
	});

	it('Renders the "Simultaneous Actions" example without error', () => {
		const parsed = parser.parse(
			'begin A, B, C, D\n' +
			'A -> C\n' +
			'\n' +
			'# Define a marker which can be returned to later\n' +
			'\n' +
			'some primary process:\n' +
			'A -> B\n' +
			'B -> A\n' +
			'A -> B\n' +
			'B -> A\n' +
			'\n' +
			'# Return to the defined marker\n' +
			'# (should be interpreted as no-higher-then the marker; may be\n' +
			'# pushed down to keep relative action ordering consistent)\n' +
			'\n' +
			'simultaneously with some primary process:\n' +
			'C -> D\n' +
			'D -> C\n' +
			'end D\n' +
			'C -> A\n' +
			'\n' +
			'# The marker name is optional; using "simultaneously:" with no\n' +
			'# marker will jump to the top of the entire sequence.'
		);
		const sequence = generator.generate(parsed);
		expect(() => renderer.render(sequence)).not.toThrow();
	});
});
