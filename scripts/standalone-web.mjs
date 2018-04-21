import SequenceDiagram from './sequence/SequenceDiagram.mjs';

if(typeof exports !== 'undefined') {
	exports.SequenceDiagram = SequenceDiagram;
} else if(window.define && window.define.amd) {
	window.define(() => SequenceDiagram);
} else {
	window.document.addEventListener('DOMContentLoaded', () => {
		SequenceDiagram.convertAll();
	}, {once: true});

	if(window.CodeMirror) {
		SequenceDiagram.registerCodeMirrorMode(window.CodeMirror);
	}

	window.SequenceDiagram = SequenceDiagram;
}
