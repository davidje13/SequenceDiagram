// Jasmine test configuration.
// See specs.js for the list of spec files

jasmine.executeAllTests = window.onload;
window.onload = null;

const matchers = {
	toBeNear: () => ({
		compare: (actual, expected, range) => {
			if(
				typeof expected !== 'number' ||
				typeof range !== 'number' ||
				range < 0
			) {
				throw new Error(
					'Invalid toBeNear(' + expected + ',' + range + ')'
				);
			}
			if(typeof actual !== 'number') {
				throw new Error('Expected a number, got ' + actual);
			}
			return {
				pass: Math.abs(actual - expected) <= range,
			};
		},
	}),
};

beforeAll(() => {
	jasmine.addMatchers(matchers);
});
