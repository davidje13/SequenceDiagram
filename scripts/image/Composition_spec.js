defineDescribe('Composition', [
	'./Composition',
	'./ImageRegion',
], (
	Composition,
	ImageRegion
) => {
	'use strict';

	let inputA;
	let inputB;

	beforeEach(() => {
		inputA = ImageRegion.fromValues(2, 2, [
			0, 1,
			0, 1,
		]);
		inputB = ImageRegion.fromValues(2, 2, [
			0, 0,
			1, 1,
		]);
	});

	describe('subtract', () => {
		it('returns a new image of the same size', () => {
			const output = Composition.subtract(inputA, inputB);
			expect(output).not.toBe(inputA);
			expect(output).not.toBe(inputB);
			expect(output.width).toEqual(inputA.width);
			expect(output.height).toEqual(inputA.height);
			expect(output.dim).toEqual(inputA.dim);
			expect(output.values).not.toBe(inputA.values);
			expect(output.values).not.toBe(inputB.values);
		});

		it('uses the given target if specified', () => {
			const output = Composition.subtract(
				inputA,
				inputB,
				{target: inputA}
			);
			expect(output).toBe(inputA);
		});

		it('calculates the difference for each pixel', () => {
			const output = Composition.subtract(inputA, inputB);
			expect(output.get(0, 0)).toEqual(0);
			expect(output.get(1, 0)).toEqual(1);
			expect(output.get(0, 1)).toEqual(-1);
			expect(output.get(1, 1)).toEqual(0);
		});
	});

	describe('ImageRegion.subtract', () => {
		it('is added to the ImageRegion prototype', () => {
			expect(inputA.subtract).toEqual(jasmine.any(Function));
		});

		it('invokes subtract', () => {
			const output = inputA.subtract(inputB);
			expect(output.get(0, 1)).toEqual(-1);
		});
	});

	describe('ImageRegion.difference', () => {
		it('is added to the ImageRegion prototype', () => {
			expect(inputA.difference).toEqual(jasmine.any(Function));
		});

		it('invokes abs(subtract)', () => {
			const output = inputA.difference(inputB);
			expect(output.get(0, 1)).toEqual(1);
		});
	});
});
