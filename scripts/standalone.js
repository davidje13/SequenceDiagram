requirejs(['sequence/SequenceDiagram'], (SequenceDiagram) => {
	'use strict';

	document.addEventListener('DOMContentLoaded', () => {
		SequenceDiagram.convertAll();
	}, {once: true});

	if(window.CodeMirror) {
		SequenceDiagram.registerCodeMirrorMode(window.CodeMirror);
	}

	window.SequenceDiagram = SequenceDiagram;
}, null, true);
