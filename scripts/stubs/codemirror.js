define([], () => {
	'use strict';

	function CodeMirror(container, options) {
		const spy = jasmine.createSpyObj('CodeMirror', ['on']);
		spy.constructor = {
			container,
			options,
		};
		spy.doc = jasmine.createSpyObj('CodeMirror document', ['getValue']);
		spy.getDoc = () => spy.doc;
		return spy;
	}

	CodeMirror.defineMode = () => null;

	return CodeMirror;
});
