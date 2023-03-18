import SequenceDiagram from './sequence/SequenceDiagram.mjs';

if(typeof window !== 'undefined') {
	window.SequenceDiagram = SequenceDiagram;
	window.document.addEventListener('DOMContentLoaded', () => {
		if(window.CodeMirror) {
			SequenceDiagram.registerCodeMirrorMode(window.CodeMirror);
		}
		SequenceDiagram.convertAll();
	}, {once: true});
}

export { SequenceDiagram };
