import {Connect, ConnectDelayBegin, ConnectDelayEnd} from './Connect.mjs';
import {getComponents} from './BaseComponent.mjs';

describe('Connect', () => {
	it('registers itself with the component store', () => {
		const components = getComponents();

		expect(components.get('connect')).toEqual(jasmine.any(Connect));

		expect(components.get('connect-delay-begin'))
			.toEqual(jasmine.any(ConnectDelayBegin));

		expect(components.get('connect-delay-end'))
			.toEqual(jasmine.any(ConnectDelayEnd));
	});
});
