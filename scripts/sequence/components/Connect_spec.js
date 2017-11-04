defineDescribe('Connect', [
	'./Connect',
	'./BaseComponent',
], (
	Connect,
	BaseComponent
) => {
	'use strict';

	it('registers itself with the component store', () => {
		const components = BaseComponent.getComponents();
		expect(components.get('connect')).toEqual(jasmine.any(Connect));
	});
});
