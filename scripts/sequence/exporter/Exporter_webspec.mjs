import Exporter from './Exporter.mjs';

function makeRenderer(code, width, height) {
	return {dom: () => ({outerHTML: code}), height, width};
}

function getPixel(dat, x, y) {
	/* eslint-disable no-bitwise */ // Pixel channel manipulation
	const d = dat.data;
	const p = (y * dat.width + x) * 4;
	return ((d[p] << 24) | (d[p + 1] << 16) | (d[p + 2] << 8) | d[p + 3]) >>> 0;
	/* eslint-enable no-bitwise */
}

describe('Browser-backed Exporter', () => {
	const exporter = new Exporter();

	const svg = (
		'<svg xmlns="http://www.w3.org/2000/svg" version="1.1"' +
		' viewBox="0 0 20 25">' +
		'<rect fill="#C08040" x="5" y="5" width="10" height="15">' +
		'</rect>' +
		'</svg>'
	);
	const renderer = makeRenderer(svg, 20, 25);

	describe('.getSVGBlob', () => {
		it('returns an image/svg+xml blob containing the image', () => {
			const blob = exporter.getSVGBlob(renderer);

			expect(blob.type).toEqual('image/svg+xml');
			expect(blob.size).toEqual(exporter.getSVGContent(renderer).length);
		});
	});

	describe('.getSVGURL', () => {
		it('returns an object URL containing the image in SVG format', () => {
			const url = exporter.getSVGURL(renderer);

			expect(url).toContain('blob:');
		});
	});

	describe('.getCanvas', () => {
		it('asynchronously renders the SVG in a canvas', (done) => {
			exporter.getCanvas(renderer, 2, (canvas) => {
				const ctx = canvas.getContext('2d');
				const dat = ctx.getImageData(0, 0, 40, 50);

				expect(canvas.width).toEqual(40);
				expect(canvas.height).toEqual(50);
				expect(getPixel(dat, 0, 0)).toEqual(0x00000000);
				expect(getPixel(dat, 25, 20)).toEqual(0xC08040FF);

				done();
			});
		});
	});

	describe('.getPNGBlob', () => {
		it('asynchronously creates an image/png blob', (done) => {
			exporter.getPNGBlob(renderer, 2, (blob) => {
				expect(blob.type).toEqual('image/png');
				expect(blob.size).toBeGreaterThan(0);
				done();
			});
		});
	});

	describe('.getPNGURL', () => {
		it('asynchronously creates an object URL', (done) => {
			exporter.getPNGURL(renderer, 2, (url, latest) => {
				expect(latest).toEqual(true);
				expect(url).toContain('blob:');
				done();
			});
		});
	});
});
