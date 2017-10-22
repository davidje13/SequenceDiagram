define([], () => {
	'use strict';

	return function(container, options) {
		const spy = jasmine.createSpyObj('CodeMirror', ['on']);
		spy.constructor = {
			container,
			options,
		};
		spy.doc = jasmine.createSpyObj('CodeMirror document', ['getValue']);
		spy.getDoc = () => spy.doc;
		return spy;
	};
});
