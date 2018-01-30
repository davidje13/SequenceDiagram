define(['./ImageRegion'], (ImageRegion) => {
	'use strict';

	function makeGaussianKernel(size) {
		const sz = Math.ceil(size * 3);
		const kernel = new Float32Array(sz * 2 + 1);
		const norm = 1 / (size * Math.sqrt(Math.PI * 2));
		const expNorm = -0.5 / (size * size);
		for(let i = -sz; i <= sz; ++ i) {
			kernel[i+sz] = Math.exp(i * i * expNorm) * norm;
		}
		return {kernel, sz};
	}

	function blur1D(region, size, {target = null} = {}) {
		/* jshint -W073 */ // There are 4 dimensions to traverse in a hot loop

		target = region.checkOrMakeTarget(target);

		const {width, height, stepX, stepY, dim} = region;
		const {kernel, sz} = makeGaussianKernel(size);

		for(let x = 0; x < width; ++ x) {
			const i0 = -Math.min(sz, x);
			const i1 = Math.min(sz, width - x);
			for(let d = 0; d < dim; ++ d) {
				const psx = region.indexOf(x, 0, d);
				const ptx = target.indexOf(x, 0, d);
				for(let y = 0; y < height; ++ y) {
					const ps = psx + y * stepY;
					let accum = 0;
					for(let i = i0; i < i1; ++ i) {
						accum += region.values[ps+i*stepX] * kernel[i+sz];
					}
					target.values[ptx + y * target.stepY] = accum;
				}
			}
		}

		return target;
	}

	function blur2D(region, size, {target = null, temp = null} = {}) {
		target = region.checkOrMakeTarget(target);

		temp = blur1D(region, size, {target: temp});
		blur1D(temp.transposed(), size, {target: target.transposed()});
		return target;
	}

	ImageRegion.prototype.blur = function(size, options) {
		return blur2D(this, size, options);
	};

	return {
		makeGaussianKernel,
		blur1D,
		blur2D,
	};
});
