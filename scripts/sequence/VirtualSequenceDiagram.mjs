import SequenceDiagram from './SequenceDiagram.mjs';
import {VirtualDocument} from '../core/documents/VirtualDocument.mjs';
import VirtualTextSizer from '../svg/VirtualTextSizer.mjs';

export {VirtualDocument};

export const virtualTextSizerFactory = () => new VirtualTextSizer();

export default class VirtualSequenceDiagram extends SequenceDiagram {
	constructor(code = null, options = {}) {
		const opts = {
			document: new VirtualDocument(),
			namespace: '',
			textSizerFactory: virtualTextSizerFactory,
		};

		if(code && typeof code === 'object') {
			Object.assign(opts, code);
		} else {
			Object.assign(opts, options, {code});
		}

		Object.assign(opts, {
			container: null,
			interactive: false,
		});

		super(opts);
	}
}

function render(code, options = {}) {
	return new VirtualSequenceDiagram(code, options).getSVGCodeSynchronous();
}

Object.assign(VirtualSequenceDiagram, {
	Exporter: SequenceDiagram.Exporter,
	Generator: SequenceDiagram.Generator,
	Parser: SequenceDiagram.Parser,
	Renderer: SequenceDiagram.Renderer,
	addTheme: SequenceDiagram.addTheme,
	getDefaultThemeNames: SequenceDiagram.getDefaultThemeNames,
	render,
	themes: SequenceDiagram.themes,
});
