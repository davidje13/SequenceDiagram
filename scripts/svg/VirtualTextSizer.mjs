export default class VirtualTextSizer {
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
