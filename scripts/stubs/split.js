export default function Split(elements, options) {
	/* eslint-disable jasmine/no-unsafe-spy */ // Whole object is a spy
	const spy = jasmine.createSpyObj('Split', [
		'setSizes',
		'getSizes',
		'collapse',
		'destroy',
	]);
	/* eslint-enable jasmine/no-unsafe-spy */
	spy.constructor = {
		elements,
		options,
	};
	return spy;
}
