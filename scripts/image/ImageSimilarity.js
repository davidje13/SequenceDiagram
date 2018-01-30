define(['./ImageRegion', './Blur', './Composition'], (ImageRegion) => {
	'use strict';

	const VALUE_THRESH = 0.05;

	function calcDiff(region1, region2, {
		pixelThresh = 5,
		temp = null,
	} = {}) {
		region1.checkCompatible(region2);
		temp = region1.checkOrMakeTarget(temp);
		const b1 = region1.blur(pixelThresh, {temp});
		const b2 = region2.blur(pixelThresh, {temp});
		return b1.difference(b2, {target: b1});
	}

	function isSimilar(region1, region2, options = {}) {
		const diff = calcDiff(region1, region2, options);
		return diff.max() < (options.valueThresh || VALUE_THRESH);
	}

	ImageRegion.prototype.isSimilar = function(b, options) {
		return isSimilar(this, b, options);
	};

	function makeImageComparison(actual, expected, options, message) {
		const o = document.createElement('div');

		const cActual = actual.asCanvas();
		cActual.setAttribute('title', 'actual');

		const cExpected = expected.asCanvas();
		cExpected.setAttribute('title', 'expected');

		const diff = calcDiff(actual, expected, options);
		const cDiff = diff.asCanvas({
			rangeLow: 0,
			rangeHigh: options.valueThresh || VALUE_THRESH,
		});
		cDiff.setAttribute('title', 'difference');

		const diffSharp = actual.difference(expected);
		const cDiffSharp = diffSharp.asCanvas({
			rangeLow: 0,
			rangeHigh: options.valueThresh || VALUE_THRESH,
		});
		cDiffSharp.setAttribute('title', 'sharp difference');

		o.appendChild(document.createTextNode(message));
		o.appendChild(document.createElement('br'));
		o.appendChild(cActual);
		o.appendChild(cExpected);
		o.appendChild(cDiff);
		o.appendChild(cDiffSharp);
		return o;
	}

	const matchers = {
		toLookLike: () => {
			return {
				compare: (actual, expected, options = {}) => {
					if(actual.isSimilar(expected, options)) {
						return {pass: true};
					}

					document.body.appendChild(makeImageComparison(
						actual,
						expected,
						options,
						'Image comparison (expected similar)'
					));

					const details = (options.details ?
						'; details: ' + options.details : ''
					);

					return {
						pass: false,
						message: 'Expected images to be similar; ' +
							'see below for comparison' + details,
					};
				},

				negativeCompare: (actual, expected, options) => {
					if(!actual.isSimilar(expected, options)) {
						return {pass: true};
					}

					document.body.appendChild(makeImageComparison(
						actual,
						expected,
						options,
						'Image comparison (expected different)'
					));

					const details = (options.details ?
						'; details: ' + options.details : ''
					);

					return {
						pass: false,
						message: 'Expected images to differ; ' +
							'see below for comparison' + details,
					};
				},
			};
		},
	};

	return {
		isSimilar,
		matchers,
	};
});
