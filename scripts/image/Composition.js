define(['./ImageRegion'], (ImageRegion) => {
	'use strict';

	function compose(input1, input2, fn, {target = null} = {}) {
		input1.checkCompatible(input2);
		target = input1.checkOrMakeTarget(target);

		const {width, height, dim} = target;

		for(let x = 0; x < width; ++ x) {
			for(let y = 0; y < height; ++ y) {
				const pt = target.indexOf(x, y);
				const p1 = input1.indexOf(x, y);
				const p2 = input2.indexOf(x, y);
				for(let d = 0; d < dim; ++ d) {
					target.values[pt+d] = fn(
						input1.values[p1+d],
						input2.values[p2+d]
					);
				}
			}
		}

		return target;
	}

	function subtract(input1, input2, options) {
		return compose(input1, input2, (a, b) => (a - b), options);
	}

	function difference(input1, input2, options) {
		return compose(input1, input2, (a, b) => Math.abs(a - b), options);
	}

	ImageRegion.prototype.subtract = function(b, options) {
		return subtract(this, b, options);
	};

	ImageRegion.prototype.difference = function(b, options) {
		return difference(this, b, options);
	};

	return {
		subtract,
		difference,
	};
});
