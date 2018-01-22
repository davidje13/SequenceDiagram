defineDescribe('Divider', [
	'./Divider',
	'./BaseComponent',
], (
	Divider,
	BaseComponent
) => {
	'use strict';

	describe('Divider', () => {
		it('registers itself with the component store', () => {
			const components = BaseComponent.getComponents();
			expect(components.get('divider')).toEqual(jasmine.any(Divider));
		});
	});
});
