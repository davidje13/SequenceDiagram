((() => {
	'use strict';

	requirejs.config(window.getRequirejsCDN());

	/* jshint -W072 */ // Allow several required modules
	requirejs([
		'interface/Interface',
		'interface/Exporter',
		'sequence/Parser',
		'sequence/Generator',
		'sequence/Renderer',
		'sequence/themes/Basic',
		'sequence/themes/Chunky',
	], (
		Interface,
		Exporter,
		Parser,
		Generator,
		Renderer,
		BasicTheme,
		ChunkyTheme
	) => {
		/* jshint +W072 */
		const defaultCode = (
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
		const ui = new Interface({
			defaultCode,
			parser: new Parser(),
			generator: new Generator(),
			renderer: new Renderer({themes: [
				new BasicTheme(),
				new ChunkyTheme(),
			]}),
			exporter: new Exporter(),
			localStorage: 'src',
		});
		ui.build(document.body);
	});
})());
