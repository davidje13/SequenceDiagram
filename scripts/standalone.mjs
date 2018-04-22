import VirtualSequenceDiagram, {
	VirtualDocument,
	virtualTextSizerFactory,
} from './sequence/VirtualSequenceDiagram.mjs';
import SequenceDiagram from './sequence/SequenceDiagram.mjs';

const out = {
	SequenceDiagram,
	VirtualDocument,
	VirtualSequenceDiagram,
	virtualTextSizerFactory,
};

if(typeof exports !== 'undefined') {
	Object.assign(exports, out);
} else if(window.define && window.define.amd) {
	Object.assign(SequenceDiagram, out);
	window.define(() => SequenceDiagram);
} else {
	window.document.addEventListener('DOMContentLoaded', () => {
		SequenceDiagram.convertAll();
	}, {once: true});

	if(window.CodeMirror) {
		SequenceDiagram.registerCodeMirrorMode(window.CodeMirror);
	}

	Object.assign(window, out);
}
