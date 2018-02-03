((() => {
	'use strict';

	requirejs.config(window.getRequirejsCDN());

	// Set to false during development to avoid need to minify sources
	const release = !window.location.href.includes('editor-dev.htm');

	requirejs([
		'interface/Interface',
		'interface/ComponentsLibrary',
		release ? '../lib/sequence-diagram.min' : 'sequence/SequenceDiagram',
	], (
		Interface,
		ComponentsLibrary,
		SequenceDiagram
	) => {
		const defaultCode = (
			'title Labyrinth\n' +
			'\n' +
			'Bowie -> Goblin: You remind me of the babe\n' +
			'Goblin -> Bowie: What babe?\n' +
			'Bowie -> Goblin: The babe with the power\n' +
			'Goblin -> Bowie: What power?\n' +
			'note right of Bowie, Goblin: Most people get muddled here!\n' +
			'Bowie -> Goblin: "The power of voodoo"\n' +
			'Goblin -> Bowie: "Who-do?"\n' +
			'Bowie -> Goblin: You do!\n' +
			'Goblin -> Bowie: Do what?\n' +
			'Bowie -> Goblin: Remind me of the babe!\n' +
			'\n' +
			'Bowie -> Audience: Sings\n' +
			'\n' +
			'terminators box\n'
		);

		const loader = document.getElementById('loader');
		const nav = loader.getElementsByTagName('nav')[0];
		const linkElements = nav.getElementsByTagName('a');
		const links = [];
		for(let i = 0; i < linkElements.length; ++ i) {
			links.push({
				label: linkElements[i].innerText,
				href: linkElements[i].getAttribute('href'),
			});
		}

		const ui = new Interface({
			defaultCode,
			sequenceDiagram: new SequenceDiagram(),
			library: ComponentsLibrary,
			links,
			localStorage: 'src',
		});
		loader.parentNode.removeChild(loader);
		ui.build(document.body);
	});
})());
