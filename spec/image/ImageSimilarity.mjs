import './Blur.mjs';
import './Composition.mjs';
import ImageRegion from './ImageRegion.mjs';
import {headless} from '../../scripts/core/browser.mjs';

function getThresholds({
	pixelThresh = 2,
	valueThresh = 0.6,
} = {}) {
	const blurSize = pixelThresh * 2;
	const norm1D = 1 / (blurSize * Math.sqrt(Math.PI * 2));

	return {
		blurSize,
		valueThresh: valueThresh * norm1D,
	};
}

function calcDiff(region1, region2, options = {}) {
	region1.checkCompatible(region2);
	const {blurSize} = getThresholds(options);
	const temp = region1.checkOrMakeTarget(options.temp);
	const b1 = region1.blur(blurSize, {temp});
	const b2 = region2.blur(blurSize, {temp});
	return b1.difference(b2, {target: b1});
}

export function isSimilar(region1, region2, options) {
	const {valueThresh} = getThresholds(options);
	const diff = calcDiff(region1, region2, options);
	return diff.max() < valueThresh;
}

ImageRegion.prototype.isSimilar = function(b, options) {
	return isSimilar(this, b, options);
};

function makeImageComparison(actual, expected, options, message) {
	const {valueThresh} = getThresholds(options);
	const o = document.createElement('div');

	const cActual = actual.asCanvas();
	cActual.setAttribute('title', 'actual');

	const cExpected = expected.asCanvas();
	cExpected.setAttribute('title', 'expected');

	const diff = calcDiff(actual, expected, options);
	const cDiff = diff.asCanvas({
		rangeHigh: valueThresh,
		rangeLow: 0,
	});
	cDiff.setAttribute('title', 'difference');

	const diffSharp = actual.difference(expected);
	const cDiffSharp = diffSharp.asCanvas({
		rangeHigh: valueThresh,
		rangeLow: 0,
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

export const matchers = {
	toLookLike: () => ({
		compare: (actual, expected, options = {}) => {
			if(actual.isSimilar(expected, options)) {
				return {pass: true};
			}

			let message = 'Expected images to be similar';
			if(!headless) {
				document.body.appendChild(makeImageComparison(
					actual,
					expected,
					options,
					'Image comparison (expected similar)'
				));
				message += ' (see below for comparison)';
			}
			message += '.' + (options.details ?
				' Details: ' + options.details : ''
			);

			return {
				message,
				pass: false,
			};
		},

		negativeCompare: (actual, expected, options) => {
			if(!actual.isSimilar(expected, options)) {
				return {pass: true};
			}

			let message = 'Expected images to differ';
			if(!headless) {
				document.body.appendChild(makeImageComparison(
					actual,
					expected,
					options,
					'Image comparison (expected different)'
				));
				message += ' (see below for comparison)';
			}
			message += '.' + (options.details ?
				' Details: ' + options.details : ''
			);

			return {
				message,
				pass: false,
			};
		},
	}),
};
