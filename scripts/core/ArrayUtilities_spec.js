defineDescribe('ArrayUtilities', ['./ArrayUtilities'], (array) => {
	'use strict';

	function ignoreCase(a, b) {
		return a.toLowerCase() === b.toLowerCase();
	}

	describe('.indexOf', () => {
		it('returns the first index of the requested element', () => {
			const p1 = ['a', 'b'];
			expect(array.indexOf(p1, 'b')).toEqual(1);
		});

		it('returns -1 if the element is not found', () => {
			const p1 = ['a', 'b'];
			expect(array.indexOf(p1, 'c')).toEqual(-1);
		});

		it('uses the given equality check function', () => {
			const p1 = ['a', 'b', 'c', 'd'];
			expect(array.indexOf(p1, 'B', ignoreCase)).toEqual(1);
		});
	});

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

		it('uses the given equality check function', () => {
			const p1 = ['a', 'b', 'c', 'd'];
			const p2 = ['b', 'B', 'E', 'e'];
			array.mergeSets(p1, p2, ignoreCase);
			expect(p1).toEqual(['a', 'b', 'c', 'd', 'E']);
		});
	});

	describe('.hasIntersection', () => {
		it('returns true if any elements are shared between the sets', () => {
			const p1 = ['a', 'b'];
			const p2 = ['b', 'c'];
			expect(array.hasIntersection(p1, p2)).toEqual(true);
		});

		it('returns false if no elements are shared between the sets', () => {
			const p1 = ['a', 'b'];
			const p2 = ['c', 'd'];
			expect(array.hasIntersection(p1, p2)).toEqual(false);
		});

		it('uses the given equality check function', () => {
			const p1 = ['a', 'b'];
			const p2 = ['B', 'c'];
			expect(array.hasIntersection(p1, p2, ignoreCase)).toEqual(true);
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

		it('uses the given equality check function', () => {
			const p1 = ['a', 'b', 'c', 'd'];
			const p2 = ['B', 'e'];
			array.removeAll(p1, p2, ignoreCase);
			expect(p1).toEqual(['a', 'c', 'd']);
		});
	});

	describe('.remove', () => {
		it('removes one element matching the parameter', () => {
			const p1 = ['a', 'b'];
			array.remove(p1, 'b');
			expect(p1).toEqual(['a']);
		});

		it('removes only the first element matching the parameter', () => {
			const p1 = ['a', 'b', 'c', 'b'];
			array.remove(p1, 'b');
			expect(p1).toEqual(['a', 'c', 'b']);
		});

		it('ignores if not found', () => {
			const p1 = ['a', 'b', 'c'];
			array.remove(p1, 'nope');
			expect(p1).toEqual(['a', 'b', 'c']);
		});

		it('maintains input ordering', () => {
			const p1 = ['a', 'b', 'c'];
			array.remove(p1, 'b');
			expect(p1).toEqual(['a', 'c']);
		});

		it('uses the given equality check function', () => {
			const p1 = ['a', 'b', 'c', 'd'];
			array.remove(p1, 'B', ignoreCase);
			expect(p1).toEqual(['a', 'c', 'd']);
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

	describe('.combine', () => {
		it('returns all combinations of the given arguments', () => {
			const list = array.combine([
				['Aa', 'Bb'],
				['Cc', 'Dd'],
				'Ee',
				['Ff'],
			]);
			expect(list).toEqual([
				['Aa', 'Cc', 'Ee', 'Ff'],
				['Aa', 'Dd', 'Ee', 'Ff'],
				['Bb', 'Cc', 'Ee', 'Ff'],
				['Bb', 'Dd', 'Ee', 'Ff'],
			]);
		});
	});

	describe('.flatMap', () => {
		it('applies the given function to all elements of the input', () => {
			const fn = (x) => ([x + 1]);
			const p1 = [2, 7];
			expect(array.flatMap(p1, fn)).toEqual([3, 8]);
		});

		it('flattens the result', () => {
			const fn = (x) => ([x + 1, x + 2]);
			const p1 = [2, 7];
			expect(array.flatMap(p1, fn)).toEqual([3, 4, 8, 9]);
		});
	});
});
