defineDescribe('ArrayUtilities', ['./ArrayUtilities'], (array) => {
	'use strict';

	describe('.mergeSets', () => {
		it('adds elements from the second array into the first', () => {
			const p1 = ['a', 'b'];
			const p2 = ['c', 'd'];
			array.mergeSets(p1, p2);
			expect(p1).toEqual(['a', 'b', 'c', 'd']);
		});

		it('ignores null parameters', () => {
			const p1 = ['a', 'b'];
			array.mergeSets(p1, null);
			expect(p1).toEqual(['a', 'b']);
		});

		it('leaves the second parameter unchanged', () => {
			const p1 = ['a', 'b'];
			const p2 = ['c', 'd'];
			array.mergeSets(p1, p2);
			expect(p2).toEqual(['c', 'd']);
		});

		it('ignores duplicates', () => {
			const p1 = ['a', 'b'];
			const p2 = ['b', 'c'];
			array.mergeSets(p1, p2);
			expect(p1).toEqual(['a', 'b', 'c']);
		});

		it('maintains input ordering', () => {
			const p1 = ['a', 'x', 'c', 'd'];
			const p2 = ['d', 'x', 'e', 'a'];
			array.mergeSets(p1, p2);
			expect(p1).toEqual(['a', 'x', 'c', 'd', 'e']);
		});
	});

	describe('.removeAll', () => {
		it('removes elements from the first array', () => {
			const p1 = ['a', 'b', 'c'];
			const p2 = ['a', 'b'];
			array.removeAll(p1, p2);
			expect(p1).toEqual(['c']);
		});

		it('ignores null parameters', () => {
			const p1 = ['a', 'b'];
			array.removeAll(p1, null);
			expect(p1).toEqual(['a', 'b']);
		});

		it('leaves the second parameter unchanged', () => {
			const p1 = ['a', 'b', 'c'];
			const p2 = ['a', 'b'];
			array.removeAll(p1, p2);
			expect(p2).toEqual(['a', 'b']);
		});

		it('ignores duplicates', () => {
			const p1 = ['a', 'b', 'c'];
			const p2 = ['a', 'b', 'b'];
			array.removeAll(p1, p2);
			expect(p1).toEqual(['c']);
		});

		it('maintains input ordering', () => {
			const p1 = ['a', 'x', 'c', 'd'];
			const p2 = ['c'];
			array.removeAll(p1, p2);
			expect(p1).toEqual(['a', 'x', 'd']);
		});
	});

	describe('.remove', () => {
		it('removes one element matching the parameter', () => {
			const p1 = ['a', 'b'];
			array.removeAll(p1, 'b');
			expect(p1).toEqual(['a']);
		});

		it('removes only the first element matching the parameter', () => {
			const p1 = ['a', 'b', 'c', 'b'];
			array.removeAll(p1, 'b');
			expect(p1).toEqual(['a', 'c', 'b']);
		});

		it('ignores if not found', () => {
			const p1 = ['a', 'b', 'c'];
			array.removeAll(p1, 'nope');
			expect(p1).toEqual(['a', 'b', 'c']);
		});

		it('maintains input ordering', () => {
			const p1 = ['a', 'b', 'c'];
			array.removeAll(p1, 'b');
			expect(p1).toEqual(['a', 'c']);
		});
	});

	describe('.last', () => {
		it('returns the last element of the array', () => {
			expect(array.last(['a', 'b'])).toEqual('b');
		});

		it('returns undefined for empty arrays', () => {
			expect(array.last([])).toEqual(undefined);
		});
	});
});
