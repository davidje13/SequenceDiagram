import Divider from './Divider.mjs';
import {getComponents} from './BaseComponent.mjs';

describe('Divider', () => {
	describe('Divider', () => {
		it('registers itself with the component store', () => {
			const components = getComponents();

			expect(components.get('divider')).toEqual(jasmine.any(Divider));
		});
	});
});
