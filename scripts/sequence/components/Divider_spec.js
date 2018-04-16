import Divider from './Divider.js';
import {getComponents} from './BaseComponent.js';

describe('Divider', () => {
	describe('Divider', () => {
		it('registers itself with the component store', () => {
			const components = getComponents();

			expect(components.get('divider')).toEqual(jasmine.any(Divider));
		});
	});
});
