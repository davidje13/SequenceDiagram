import Parallel from './Parallel.js';
import {getComponents} from './BaseComponent.js';

describe('Parallel', () => {
	it('registers itself with the component store', () => {
		const components = getComponents();

		expect(components.get('parallel')).toEqual(jasmine.any(Parallel));
	});
});
