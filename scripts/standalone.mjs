import SequenceDiagram from './sequence/SequenceDiagram.mjs';
import {VirtualDocument} from './core/documents/VirtualDocument.mjs';

class UnitaryTextSizer {
	// Simplified text sizer, which assumes all characters render as
	// 1x1 px squares for repeatable renders in all browsers

	baseline() {
		return 1;
	}

	measureHeight({formatted}) {
		return formatted.length;
	}

	prepMeasurement(attrs, formatted) {
		return formatted;
	}

	prepComplete() {
		// No-op
	}

	performMeasurement(data) {
		return data.reduce((total, part) => total + part.text.length, 0);
	}

	teardown() {
		// No-op
	}
}

if(typeof exports !== 'undefined') {
	exports.SequenceDiagram = SequenceDiagram;
	exports.VirtualDocument = VirtualDocument;
	exports.headlessTextSizerFactory = () => new UnitaryTextSizer();
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
