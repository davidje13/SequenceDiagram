((() => {
	'use strict';

	// Jasmine test configuration.
	// See specs.js for the list of spec files

	requirejs.config(Object.assign({
		baseUrl: 'scripts/',
		urlArgs: String(Math.random()), // Prevent cache
	}, window.getRequirejsCDN()));

	requirejs(['jasmineBoot'], () => {
		// Slightly hacky way of making jasmine work with asynchronously loaded
		// tests while keeping features of jasmine-boot
		const runner = window.onload;
		window.onload = undefined;

		// Convenience function wraps:
		//  define(['d1', 'd2'], (d1, d2) => describe('My Name', () => {...}));
		// as:
		//  defineDescribe('My Name', ['d1', 'd2'], (d1, d2) => {...});
		window.defineDescribe = (name, deps, fn) => {
			define(deps, function() {
				const args = arguments;
				describe(name, () => fn.apply(null, args));
			});
		};

		requirejs(['tester/jshintRunner'], (promise) => promise.then(runner));
	});
})());
