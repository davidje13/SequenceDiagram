defineDescribe('Divider', [
	'./Divider',
	'./BaseComponent',
], (
	Divider,
	BaseComponent
) => {
	'use strict';

	const divider = new Divider();

	describe('Divider', () => {
		it('registers itself with the component store', () => {
			const components = BaseComponent.getComponents();
			expect(components.get('divider')).toEqual(jasmine.any(Divider));
		});
	});
});
