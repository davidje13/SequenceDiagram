import AgentCap from './AgentCap.js';
import {getComponents} from './BaseComponent.js';

describe('AgentCap', () => {
	it('registers itself with the component store', () => {
		const components = getComponents();

		expect(components.get('agent begin')).toEqual(jasmine.any(AgentCap));
		expect(components.get('agent end')).toEqual(jasmine.any(AgentCap));
	});
});
