import ImageRegion from './ImageRegion.mjs';

function compose(input1, input2, fn, {target = null} = {}) {
	input1.checkCompatible(input2);
	const tgt = input1.checkOrMakeTarget(target);

	const {width, height, dim} = tgt;

	for(let x = 0; x < width; ++ x) {
		for(let y = 0; y < height; ++ y) {
			const pt = tgt.indexOf(x, y);
			const p1 = input1.indexOf(x, y);
			const p2 = input2.indexOf(x, y);
			for(let d = 0; d < dim; ++ d) {
				tgt.values[pt + d] = fn(
					input1.values[p1 + d],
					input2.values[p2 + d]
				);
			}
		}
	}

	return tgt;
}

export function subtract(input1, input2, options) {
	return compose(input1, input2, (a, b) => (a - b), options);
}

export function difference(input1, input2, options) {
	return compose(input1, input2, (a, b) => Math.abs(a - b), options);
}

ImageRegion.prototype.subtract = function(b, options) {
	return subtract(this, b, options);
};

ImageRegion.prototype.difference = function(b, options) {
	return difference(this, b, options);
};
