import ComponentsLibrary from './interface/ComponentsLibrary.mjs';
import Interface from './interface/Interface.mjs';
import LocalStorage from './storage/LocalStorage.mjs';
import SequenceDiagram from '../../scripts/sequence/SequenceDiagram.mjs';
import {require} from './requireCDN.mjs';

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

window.addEventListener('load', () => {
	const loader = window.document.getElementById('loader');
	const [nav] = loader.getElementsByTagName('nav');
	const linkElements = nav.getElementsByTagName('a');
	const links = [];
	for(let i = 0; i < linkElements.length; ++ i) {
		const element = linkElements[i];
		links.push({
			href: element.getAttribute('href'),
			label: element.textContent,
			touchLabel: element.dataset.touch,
		});
	}

	const storage = new LocalStorage('src');

	const ui = new Interface({
		defaultCode,
		library: ComponentsLibrary,
		links,
		require,
		sequenceDiagram: new SequenceDiagram(),
		storage,
		touchUI: ('ontouchstart' in window),
	});
	loader.parentNode.removeChild(loader);
	ui.build(window.document.body);
});
