defineDescribe('Parallel', [
	'./Parallel',
	'./BaseComponent',
], (
	Parallel,
	BaseComponent
) => {
	'use strict';

	it('registers itself with the component store', () => {
		const components = BaseComponent.getComponents();
		expect(components.get('parallel')).toEqual(jasmine.any(Parallel));
	});
});
