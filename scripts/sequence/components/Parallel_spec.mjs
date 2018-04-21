import Parallel from './Parallel.mjs';
import {getComponents} from './BaseComponent.mjs';

describe('Parallel', () => {
	it('registers itself with the component store', () => {
		const components = getComponents();

		expect(components.get('parallel')).toEqual(jasmine.any(Parallel));
	});
});
