defineDescribe('Note', [
	'./Note',
	'./BaseComponent',
], (
	Note,
	BaseComponent
) => {
	'use strict';

	describe('NoteOver', () => {
		it('registers itself with the component store', () => {
			const components = BaseComponent.getComponents();
			expect(components.get('note over')).toEqual(
				jasmine.any(Note.NoteOver)
			);
		});
	});

	describe('NoteSide', () => {
		it('registers itself with the component store', () => {
			const components = BaseComponent.getComponents();
			expect(components.get('note left')).toEqual(
				jasmine.any(Note.NoteSide)
			);
			expect(components.get('note right')).toEqual(
				jasmine.any(Note.NoteSide)
			);
		});
	});

	describe('NoteBetween', () => {
		it('registers itself with the component store', () => {
			const components = BaseComponent.getComponents();
			expect(components.get('note between')).toEqual(
				jasmine.any(Note.NoteBetween)
			);
		});
	});
});
