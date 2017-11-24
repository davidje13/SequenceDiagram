requirejs(['sequence/SequenceDiagram'], (SequenceDiagram) => {
	'use strict';

	const def = window.define;
	if(def && def.amd) {
		def(() => {
			return SequenceDiagram;
		});
		return;
	}

	document.addEventListener('DOMContentLoaded', () => {
		SequenceDiagram.convertAll();
	}, {once: true});

	if(window.CodeMirror) {
		SequenceDiagram.registerCodeMirrorMode(window.CodeMirror);
	}

	window.SequenceDiagram = SequenceDiagram;
}, null, true);
