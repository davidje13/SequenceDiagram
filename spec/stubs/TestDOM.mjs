import {
	Event,
	VirtualDocument,
} from '../../scripts/core/documents/VirtualDocument.mjs';
import DOMWrapper from '../../scripts/core/DOMWrapper.mjs';

export class UnitaryTextSizer {
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

export function textSizerFactory() {
	return new UnitaryTextSizer();
}

export const dom = new DOMWrapper(new VirtualDocument());

export {
	Event,
	VirtualDocument,
	DOMWrapper,
};
