defineDescribe('Blur', [
	'./Blur',
	'./ImageRegion',
], (
	Blur,
	ImageRegion
) => {
	'use strict';

	const PRECISION = 0.01;

	function diracDelta(pad) {
		const values = [];
		const dim = pad * 2 + 1;
		for(let y = 0; y < dim; ++ y) {
			for(let x = 0; x < dim; ++ x) {
				values[y*dim+x] = (y === pad && x === pad) ? 1 : 0;
			}
		}
		return ImageRegion.fromValues(dim, dim, values);
	}

	describe('blur2D', () => {
		it('returns a new image of the same size', () => {
			const input = diracDelta(20);
			const output = Blur.blur2D(input, 1);
			expect(output).not.toBe(input);
			expect(output.width).toEqual(input.width);
			expect(output.height).toEqual(input.height);
			expect(output.dim).toEqual(input.dim);
			expect(output.values).not.toBe(input.values);
		});

		it('uses the given target if specified', () => {
			const input = diracDelta(20);
			const target = ImageRegion.ofSize(41, 41, 1);
			const output = Blur.blur2D(input, 1, {target});
			expect(output).toBe(target);
		});

		it('blurs the given image using a gaussian kernel', () => {
			const output = Blur.blur2D(diracDelta(20), 1);

			expect(output.sum()).toBeNear(1, PRECISION);

			expect(output.get(20, 20)).toBeNear(0.159, PRECISION);

			const v01 = output.get(20, 21);
			expect(v01).toBeNear(0.096, PRECISION);
			expect(output.get(21, 20)).toBeNear(v01, PRECISION);
			expect(output.get(19, 20)).toBeNear(v01, PRECISION);
			expect(output.get(20, 19)).toBeNear(v01, PRECISION);

			const v11 = output.get(21, 21);
			expect(v11).toBeNear(0.058, PRECISION);
			expect(output.get(21, 19)).toBeNear(v11, PRECISION);
			expect(output.get(19, 21)).toBeNear(v11, PRECISION);
			expect(output.get(19, 19)).toBeNear(v11, PRECISION);

			expect(output.get(20, 22)).toBeNear(0.021, PRECISION);
			expect(output.get(21, 22)).toBeNear(0.013, PRECISION);
			expect(output.get(22, 22)).toBeNear(0.002, PRECISION);

			expect(output.get(10, 10)).toBeNear(0, PRECISION);
		});

		it('fills in 0s outside the region', () => {
			const output = Blur.blur2D(diracDelta(0), 1);
			expect(output.get(0, 0)).toBeNear(0.159, PRECISION);
		});
	});

	describe('ImageRegion.blur', () => {
		it('is added to the ImageRegion prototype', () => {
			expect(diracDelta(0).blur).toEqual(jasmine.any(Function));
		});

		it('invokes blur2D', () => {
			const output = diracDelta(0).blur(1);
			expect(output.get(0, 0)).toBeNear(0.159, PRECISION);
		});
	});
});
