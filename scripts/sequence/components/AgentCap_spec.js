defineDescribe('AgentCap', [
	'./AgentCap',
	'./BaseComponent',
], (
	AgentCap,
	BaseComponent
) => {
	'use strict';

	it('registers itself with the component store', () => {
		const components = BaseComponent.getComponents();
		expect(components.get('agent begin')).toEqual(jasmine.any(AgentCap));
		expect(components.get('agent end')).toEqual(jasmine.any(AgentCap));
	});
});
