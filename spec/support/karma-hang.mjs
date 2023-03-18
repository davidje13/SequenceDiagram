/*
 * This file is used when running npm run web-test:manual
 * It causes the Karma runner to keep the results page open for 1 minute to
 * help with debugging test issues.
 */

const delay = 60000;

let originalTimeout = 0;

afterAll((done) => {
	window.console.log(
		'Waiting ' + delay / 1000 +
		' seconds before clearing (see karma-hang.mjs)...',
	);
	setTimeout(() => {
		jasmine.DEFAULT_TIMEOUT_INTERVAL = originalTimeout;
		done();
	}, delay);
});

// Appears to be called in reverse order
afterAll(() => {
	// Set timeout high for only this occurrence
	originalTimeout = jasmine.DEFAULT_TIMEOUT_INTERVAL;
	jasmine.DEFAULT_TIMEOUT_INTERVAL = delay + 1000;
});
