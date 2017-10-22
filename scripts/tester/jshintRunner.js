define(['jshintConfig', 'specs'], (jshintConfig) => {
	'use strict';

	/* global JSHINT */

	// Thanks, https://opensoul.org/2011/02/20/jslint-and-jasmine/

	const extraFiles = [
		'scripts/main.js',
		'scripts/requireConfig.js',
	];

	const PREDEF = [
		'self',
		'define',
		'requirejs',
	];

	const PREDEF_TEST = [
		'jasmine',
		'beforeEach',
		'afterEach',
		'spyOn',
		'describe',
		'defineDescribe',
		'it',
		'expect',
		'fail',
	].concat(PREDEF);

	function formatError(error) {
		const evidence = (error.evidence || '').replace(/\t/g, '    ');
		if(error.code === 'W140') {
			// Don't warn about lack of trailing comma for inline objects/lists
			const c = evidence.charAt(error.character - 1);
			if(c === ']' || c === '}') {
				return null;
			}
		}
		return (
			error.code +
			' @' + error.line + ':' + error.character +
			': ' + error.reason +
			'\n' + evidence
		);
	}

	const lintTestName = 'conforms to the linter';

	// Until browsers support cache: 'no-cache'
	const noCacheSuffix = '?' + Math.random();

	function check(path, src) {
		describe(path, () => it(lintTestName, () => {
			const test = (
				path.endsWith('_spec.js') ||
				path.endsWith('jshintRunner.js') ||
				path.endsWith('specRunner.js') ||
				path.includes('/stubs/')
			);
			const predef = test ? PREDEF_TEST : PREDEF;
			JSHINT(src, Object.assign({predef}, jshintConfig));
			(JSHINT.errors
				.map(formatError)
				.filter((error) => (error !== null))
				.forEach(fail));
			JSHINT.errors.length = 0;
			expect(true).toBe(true); // prevent no-expectation warning
		}));
	}

	function trimPath(path) {
		if(path.indexOf('?') !== -1) {
			return path.substr(0, path.indexOf('?'));
		}
		return path;
	}

	function getSource(path) {
		return fetch(path + noCacheSuffix, {
			mode: 'no-cors',
			cache: 'no-cache',
		});
	}

	const scriptElements = document.getElementsByTagName('script');
	return Promise.all(Array.prototype.map.call(scriptElements,
		(scriptElement) => scriptElement.getAttribute('src'))
		.concat(extraFiles)
		.filter((path) => !path.includes('://'))
		.map(trimPath)
		.map((path) => (getSource(path)
			.then((response) => response.text())
			.then((src) => check(path, src))
		))
	).catch(() => describe('source code', () => it(lintTestName, () => {
		fail('Failed to run linter against source code');
	})));
});
