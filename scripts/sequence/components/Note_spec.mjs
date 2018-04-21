import {NoteBetween, NoteOver, NoteSide} from './Note.mjs';
import {getComponents} from './BaseComponent.mjs';

describe('NoteOver', () => {
	it('registers itself with the component store', () => {
		const components = getComponents();

		expect(components.get('note over')).toEqual(jasmine.any(NoteOver));
	});
});

describe('NoteSide', () => {
	it('registers itself with the component store', () => {
		const components = getComponents();

		expect(components.get('note left')).toEqual(jasmine.any(NoteSide));
		expect(components.get('note right')).toEqual(jasmine.any(NoteSide));
	});
});

describe('NoteBetween', () => {
	it('registers itself with the component store', () => {
		const components = getComponents();

		expect(components.get('note between')).toEqual(
			jasmine.any(NoteBetween)
		);
	});
});
