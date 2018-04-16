export default function CodeMirror(container, options) {
	/* eslint-disable jasmine/no-unsafe-spy */ // Whole object is a spy
	const spy = jasmine.createSpyObj('CodeMirror', ['on']);
	spy.constructor = {
		container,
		options,
	};
	spy.doc = jasmine.createSpyObj('CodeMirror document', [
		'getValue',
		'setSelection',
	]);
	/* eslint-enable jasmine/no-unsafe-spy */
	spy.getDoc = () => spy.doc;
	return spy;
}

CodeMirror.defineMode = () => null;
CodeMirror.registerHelper = () => null;
