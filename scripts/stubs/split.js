define(() => {
	'use strict';

	function Split(elements, options) {
		const spy = jasmine.createSpyObj('Split', [
			'setSizes',
			'getSizes',
			'collapse',
			'destroy',
		]);
		spy.constructor = {
			elements,
			options,
		};
		return spy;
	}

	return Split;
});
