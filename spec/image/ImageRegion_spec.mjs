import ImageRegion from './ImageRegion.mjs';
import {nodejs} from '../../scripts/core/browser.mjs';

describe('ImageRegion', () => {
	function makeCanvas(w, h) {
		if(nodejs) {
			return pending('No canvas support in NodeJS');
		}
		const canvas = document.createElement('canvas');
		canvas.width = w;
		canvas.height = h;
		const ctx = canvas.getContext('2d');
		const dat = ctx.createImageData(w, h);
		return {canvas, ctx, dat};
	}

	function setPix(dat, x, y, rgba) {
		const p = (y * dat.width + x) * 4;
		[dat.data[p], dat.data[p + 1], dat.data[p + 2], dat.data[p + 3]] = rgba;
	}

	const PRECISION = 0.01;

	describe('ofSize', () => {
		it('returns an empty region of the requested size', () => {
			const r = ImageRegion.ofSize(2, 2);

			expect(r.width).toEqual(2);
			expect(r.height).toEqual(2);
			expect(r.origin).toEqual(0);
			expect(r.stepX).toEqual(1);
			expect(r.stepY).toEqual(2);
			expect(r.dim).toEqual(1);
			expect(r.values[0]).toEqual(0);
			expect(r.values[1]).toEqual(0);
			expect(r.values[2]).toEqual(0);
			expect(r.values[3]).toEqual(0);
		});

		it('accepts an optional dimension value', () => {
			const r = ImageRegion.ofSize(2, 2, 2);

			expect(r.width).toEqual(2);
			expect(r.height).toEqual(2);
			expect(r.origin).toEqual(0);
			expect(r.stepX).toEqual(2);
			expect(r.stepY).toEqual(4);
			expect(r.dim).toEqual(2);
		});
	});

	describe('fromValues', () => {
		it('copies the given data', () => {
			const input = [
				3, 2,
				6, 9,
			];
			const r = ImageRegion.fromValues(2, 2, input);

			expect(r.width).toEqual(2);
			expect(r.height).toEqual(2);
			expect(r.origin).toEqual(0);
			expect(r.stepX).toEqual(1);
			expect(r.stepY).toEqual(2);
			expect(r.dim).toEqual(1);
			expect(r.values).not.toBe(input);
			expect(r.values[0]).toEqual(3);
			expect(r.values[1]).toEqual(2);
			expect(r.values[2]).toEqual(6);
			expect(r.values[3]).toEqual(9);
		});
	});

	describe('fromCanvas', () => {
		it('converts canvas image data into luminosity', () => {
			const {canvas, ctx, dat} = makeCanvas(3, 3);
			/* eslint-disable no-multi-spaces */
			/* eslint-disable array-bracket-spacing */
			setPix(dat, 0, 0, [  0,   0,   0,   0]);
			setPix(dat, 1, 0, [255,   0,   0,   0]);
			setPix(dat, 2, 0, [255, 255, 255,   0]);
			setPix(dat, 0, 1, [  0,   0,   0, 255]);
			setPix(dat, 1, 1, [255,   0,   0, 255]);
			setPix(dat, 2, 1, [255, 255, 255, 255]);
			setPix(dat, 0, 2, [  0,   0,   0, 128]);
			setPix(dat, 1, 2, [255,   0,   0, 128]);
			setPix(dat, 2, 2, [255, 255, 255, 128]);
			/* eslint-enable no-multi-spaces */
			/* eslint-enable array-bracket-spacing */
			ctx.putImageData(dat, 0, 0);

			const r = ImageRegion.fromCanvas(canvas);

			expect(r.width).toEqual(3);
			expect(r.height).toEqual(3);
			expect(r.origin).toEqual(0);
			expect(r.stepX).toEqual(1);
			expect(r.stepY).toEqual(3);
			expect(r.dim).toEqual(1);
			expect(r.values).toBeNear(
				[0, 0, 0, -1, -1 / 3, 1, -1 / 2, -1 / 6, 1 / 2],
				PRECISION
			);
		});
	});

	describe('get', () => {
		it('returns the pixel at the given location', () => {
			const r = ImageRegion.fromValues(2, 2, [
				3, 2,
				6, 9,
			]);

			expect(r.get(0, 0)).toEqual(3);
			expect(r.get(1, 0)).toEqual(2);
			expect(r.get(0, 1)).toEqual(6);
			expect(r.get(1, 1)).toEqual(9);
		});

		it('returns the given "outside" value for extreme coordinates', () => {
			const r = ImageRegion.fromValues(2, 2, [
				3, 2,
				6, 9,
			]);

			expect(r.get(-1, 0)).toEqual(0);
			expect(r.get(0, -1)).toEqual(0);
			expect(r.get(3, 0)).toEqual(0);
			expect(r.get(0, 3)).toEqual(0);
			expect(r.get(-1, -1, {outside: 3})).toEqual(3);
		});
	});

	describe('transposed', () => {
		it('returns a transposed view on the data', () => {
			const r = ImageRegion.fromValues(3, 2, [
				-9, 2, 1,
				6, 8, 0,
			]);
			const t = r.transposed();

			expect(t.width).toEqual(2);
			expect(t.height).toEqual(3);
			expect(t.stepX).toEqual(3);
			expect(t.stepY).toEqual(1);
			expect(t.origin).toEqual(0);
			expect(t.values).toBe(r.values);
			expect(t.get(0, 0)).toEqual(-9);
			expect(t.get(1, 0)).toEqual(6);
			expect(t.get(0, 1)).toEqual(2);
			expect(t.get(1, 1)).toEqual(8);
			expect(t.get(0, 2)).toEqual(1);
			expect(t.get(1, 2)).toEqual(0);
		});
	});

	describe('sum', () => {
		it('returns the sum of all pixel values', () => {
			const r = ImageRegion.fromValues(2, 2, [
				-9, 2,
				6, 8,
			]);

			expect(r.sum()).toEqual(7);
		});
	});

	describe('max', () => {
		it('returns the maximum pixel value', () => {
			const r = ImageRegion.fromValues(2, 2, [
				-9, 2,
				6, 8,
			]);

			expect(r.max()).toEqual(8);
		});
	});

	describe('min', () => {
		it('returns the minimum pixel value', () => {
			const r = ImageRegion.fromValues(2, 2, [
				-9, 2,
				6, 8,
			]);

			expect(r.min()).toEqual(-9);
		});
	});

	describe('absMax', () => {
		it('returns the maximum absolute pixel value', () => {
			const r = ImageRegion.fromValues(2, 2, [
				-9, 2,
				6, 8,
			]);

			expect(r.absMax()).toEqual(9);
		});
	});
});
