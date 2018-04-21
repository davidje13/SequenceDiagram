import {isSimilar, matchers} from './ImageSimilarity.mjs';
import ImageRegion from './ImageRegion.mjs';

describe('ImageSimilarity', () => {
	let inputA = null;
	let inputB = null;
	let inputC = null;

	beforeEach(() => {
		inputA = ImageRegion.fromFunction(100, 100,
			({x, y}) => (Math.sin(x * 0.2) * Math.cos(y * 0.3)));
		inputB = ImageRegion.fromFunction(100, 100,
			({x, y}) => (Math.sin(x * 0.2 + 0.1) * Math.cos(y * 0.3 - 0.1)));
		inputC = ImageRegion.fromFunction(100, 100,
			({x}) => (Math.sin(x * 0.2)));
	});

	describe('isSimilar', () => {
		it('returns true for identical images', () => {
			expect(isSimilar(inputA, inputA)).toBe(true);
		});

		it('returns true for similar images', () => {
			expect(isSimilar(inputA, inputB)).toBe(true);
		});

		it('returns false for different images', () => {
			expect(isSimilar(inputA, inputC)).toBe(false);
		});
	});

	describe('ImageRegion.isSimilar', () => {
		it('is added to the ImageRegion prototype', () => {
			expect(inputA.isSimilar).toEqual(jasmine.any(Function));
		});

		it('invokes isSimilar', () => {
			const output = inputA.isSimilar(inputA);

			expect(output).toEqual(true);
		});
	});

	describe('jasmine.toLookLike', () => {
		it('can be registered with Jasmine', () => {
			jasmine.addMatchers(matchers);

			expect(inputA).toLookLike(inputB);
			expect(inputA).not.toLookLike(inputC);
		});
	});
});
