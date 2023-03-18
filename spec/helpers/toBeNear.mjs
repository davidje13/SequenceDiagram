function checkNear(actual, expected, range) {
	if(
		typeof expected !== 'number' ||
		typeof range !== 'number' ||
		range < 0
	) {
		throw new Error(
			'Invalid toBeNear(' + expected + ',' + range + ')',
		);
	}
	if(typeof actual !== 'number') {
		throw new Error('Expected a number, got ' + actual);
	}
	return Math.abs(actual - expected) <= range;
}

beforeAll(() => {
	jasmine.addMatchers({
		toBeNear: () => ({
			compare: (actual, expected, range) => {
				if(Array.isArray(expected)) {
					if(typeof actual !== 'object') {
						throw new Error('Expected an array, got ' + actual);
					}
					if(actual.length !== expected.length) {
						throw new Error(
							'Expected an array of size ' + expected.length +
							', got ' + actual,
						);
					}
					for(let i = 0; i < expected.length; ++ i) {
						if(!checkNear(actual[i], expected[i], range)) {
							return {pass: false};
						}
					}
					return {pass: true};
				}

				return {pass: checkNear(actual, expected, range)};
			},
		}),
	});
});
