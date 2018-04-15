define([
	'core/documents/VirtualDocument',
	'core/DOMWrapper',
], (
	VirtualDocument,
	DOMWrapper
) => {
	'use strict';

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
		}

		performMeasurement(data) {
			return data.reduce((total, part) => total + part.text.length, 0);
		}

		teardown() {
		}
	}

	return {
		VirtualDocument,
		UnitaryTextSizer,
		DOMWrapper,
		textSizerFactory: () => new UnitaryTextSizer(),
		dom: new DOMWrapper(new VirtualDocument()),
	};
});
