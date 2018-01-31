define(() => {
	'use strict';

	function makeCanvas(width, height) {
		window.devicePixelRatio = 1;
		const canvas = document.createElement('canvas');
		canvas.width = width;
		canvas.height = height;
		const context = canvas.getContext('2d');
		return {canvas, context};
	}

	function proportionalSize(
		baseWidth,
		baseHeight,
		{width = null, height = null} = {}
	) {
		if(width === null) {
			if(height === null) {
				return {
					width: baseWidth,
					height: baseHeight,
				};
			} else {
				return {
					width: Math.round(baseWidth * height / baseHeight),
					height,
				};
			}
		} else if(height === null) {
			return {
				width,
				height: Math.round(baseHeight * width / baseWidth),
			};
		} else {
			return {width, height};
		}
	}

	class ImageRegion {
		constructor(width, height, values, {
			origin = 0,
			stepX = 0,
			stepY = 0,
			dim = 1,
		} = {}) {
			this.width = width;
			this.height = height;
			this.values = values;
			this.origin = origin;
			this.stepX = stepX || dim;
			this.stepY = stepY || (width * dim);
			this.dim = dim;
		}

		hasSize(width, height, dim) {
			return (
				this.width === width &&
				this.height === height &&
				this.dim === dim
			);
		}

		checkCompatible(region, {dim = 0} = {}) {
			if(!dim) {
				dim = this.dim;
			} else if(this.dim !== dim) {
				throw new Error('Expected region with dimension ' + dim);
			}

			if(!region.hasSize(this.width, this.height, dim)) {
				throw new Error(
					'Region sizes do not match; ' +
					this.width + 'x' + this.height +
					' (dim ' + this.dim + ')' +
					' <> ' +
					region.width + 'x' + region.height +
					' (dim ' + region.dim + ')'
				);
			}
		}

		validateDimension(dim) {
			if(dim < 0 || dim >= this.dim) {
				throw new Error('Invalid dimension');
			}
		}

		inBounds(x, y) {
			return (
				x >= 0 &&
				x < this.width &&
				y >= 0 &&
				y < this.height
			);
		}

		indexOf(x, y, dim = 0) {
			return (
				this.origin +
				x * this.stepX +
				y * this.stepY +
				dim
			);
		}

		get(x, y, {dim = 0, outside = 0} = {}) {
			this.validateDimension(dim);
			if(!this.inBounds(x, y)) {
				return outside;
			}
			return this.getFast(x, y, dim);
		}

		getFast(x, y, dim = 0) {
			return this.values[this.indexOf(x, y, dim)];
		}

		set(x, y, value, {dim = 0} = {}) {
			this.validateDimension(dim);
			if(!this.inBounds(x, y)) {
				return;
			}
			return this.setFast(x, y, dim, value);
		}

		setFast(x, y, dim, value) {
			this.values[this.indexOf(x, y, dim)] = value;
		}

		fill(fn) {
			if(typeof fn === 'number') {
				const v = fn;
				fn = () => v;
			}
			for(let y = 0; y < this.height; ++ y) {
				const py = this.indexOf(0, y);
				for(let x = 0; x < this.width; ++ x) {
					for(let d = 0; d < this.dim; ++ d) {
						this.values[py + x * this.stepX + d] = fn({x, y, d});
					}
				}
			}
			return this;
		}

		fillVec(fn) {
			if(Array.isArray(fn)) {
				const v = fn;
				fn = () => v;
			}
			for(let y = 0; y < this.height; ++ y) {
				const py = this.indexOf(0, y);
				for(let x = 0; x < this.width; ++ x) {
					const r = fn({x, y});
					for(let d = 0; d < this.dim; ++ d) {
						this.values[py + x * this.stepX + d] = r[d];
					}
				}
			}
			return this;
		}

		reduce(fn, value = null) {
			for(let y = 0; y < this.height; ++ y) {
				const py = this.indexOf(0, y);
				for(let x = 0; x < this.width; ++ x) {
					for(let d = 0; d < this.dim; ++ d) {
						value = fn(
							value,
							{x, y, d, v: this.values[py + x * this.stepX + d]}
						);
					}
				}
			}
			return value;
		}

		sum() {
			return this.reduce((accum, {v}) => accum + v, 0);
		}

		average() {
			return this.sum() / (this.width * this.height * this.dim);
		}

		max() {
			return this.reduce(
				(accum, {v}) => Math.max(accum, v),
				this.values[this.origin]
			);
		}

		min() {
			return this.reduce(
				(accum, {v}) => Math.min(accum, v),
				this.values[this.origin]
			);
		}

		absMax() {
			return this.reduce((accum, {v}) => Math.max(accum, Math.abs(v)), 0);
		}

		checkOrMakeTarget(target, {dim = 0, fill = null} = {}) {
			if(!dim) {
				dim = this.dim;
			}

			if(!target) {
				return this.makeCopy({dim, fill: fill || 0});
			}

			if(!target.hasSize(this.width, this.height, dim)) {
				throw new Error(
					'Wanted region of size ' +
					this.width + 'x' + this.height +
					' (dim ' + dim + ')' +
					' but got ' +
					target.width + 'x' + target.height +
					' (dim ' + target.dim + ')'
				);
			}

			if(fill !== null) {
				target.fill(fill);
			}

			return target;
		}

		_copyData(target, dim) {
			const stepY = this.width * dim;
			for(let y = 0; y < this.height; ++ y) {
				const py = this.indexOf(0, y);
				for(let x = 0; x < this.width; ++ x) {
					const ps = py + x * this.stepX;
					const pd = y * stepY + x * dim;
					for(let d = 0; d < dim; ++ d) {
						target[pd + d] = this.values[ps + d];
					}
				}
			}
		}

		makeCopy({dim = 0, fill = null} = {}) {
			if(!dim) {
				dim = this.dim;
			}

			const stepY = this.width * dim;
			const values = new Float32Array(this.height * stepY);
			if(fill === null) {
				this._copyData(values, dim);
			} else if(fill) {
				values.fill(fill);
			}

			return new ImageRegion(this.width, this.height, values, {
				origin: 0,
				stepX: dim,
				stepY,
				dim,
			});
		}

		transposed() {
			return new ImageRegion(this.height, this.width, this.values, {
				origin: this.origin,
				stepX: this.stepY,
				stepY: this.stepX,
				dim: this.dim,
			});
		}

		channel(dim, count = 1) {
			this.validateDimension(dim);
			this.validateDimension(dim + count - 1);
			return new ImageRegion(this.width, this.height, this.values, {
				origin: this.origin + dim,
				stepX: this.stepX,
				stepY: this.stepY,
				dim: count,
			});
		}

		getProportionalSize(size) {
			return proportionalSize(this.width, this.height, size);
		}

		_sumIn(xr, yr, d) {
			let sum = 0;
			let my = yr.lm;
			for(let y = yr.li; y <= yr.hi; ++ y) {
				let mx = xr.lm;
				for(let x = xr.li; x <= xr.hi; ++ x) {
					sum += this.values[this.indexOf(x, y, d)] * mx * my;
					mx = (x + 1 === xr.hi) ? xr.hm : 1;
				}
				my = (y + 1 === yr.hi) ? yr.hm : 1;
			}
			return sum;
		}

		resize(size) {
			const {width, height} = this.getProportionalSize(size);
			if(width === this.width && height === this.height) {
				return this;
			}

			const dim = this.dim;
			const values = new Float32Array(width * height * dim);

			const mx = this.width / width;
			const my = this.height / height;
			const norm = 1 / (mx * my);

			function ranges(l, h) {
				/* jshint -W016 */ // faster than Math.floor
				const li = (l | 0);
				const hi = (h | 0);
				const lm = (hi === li) ? (h - l) : (li + 1 - l);
				const hm = h - hi;
				if(hm < 0.001) {
					return {li, hi: hi - 1, lm, hm: 1};
				} else {
					return {li, hi, lm, hm};
				}
			}

			const xrs = [];
			for(let x = 0; x < width; ++ x) {
				xrs[x] = ranges(x * mx, (x + 1) * mx);
			}

			for(let y = 0; y < height; ++ y) {
				const yr = ranges(y * my, (y + 1) * my);
				for(let x = 0; x < width; ++ x) {
					const xr = xrs[x];
					const p = (y * width + x) * dim;
					for(let d = 0; d < dim; ++ d) {
						values[p+d] = this._sumIn(xr, yr, d) * norm;
					}
				}
			}

			return new ImageRegion(width, height, values, {dim});
		}

		getSuggestedChannels({red = null, green = null, blue = null} = {}) {
			return {
				red: (red === null) ? 0 : red,
				green: (green === null) ? ((this.dim > 1) ? 1 : 0) : green,
				blue: (blue === null) ? (this.dim - 1) : blue,
			};
		}

		populateImageData(dat, {
			rangeLow = -1,
			rangeHigh = 1,
			channels = {},
		} = {}) {
			const {red, green, blue} = this.getSuggestedChannels(channels);
			const mult = 255 / (rangeHigh - rangeLow);
			for(let y = 0; y < this.height; ++ y) {
				const py = this.indexOf(0, y);
				for(let x = 0; x < this.width; ++ x) {
					const ps = py + x * this.stepX;
					const pd = (y * this.width + x) * 4;
					const r = this.values[ps+red];
					const g = this.values[ps+green];
					const b = this.values[ps+blue];
					if(Number.isNaN(r) || Number.isNaN(g) || Number.isNaN(b)) {
						dat.data[pd  ] = 255;
						dat.data[pd+1] = 0;
						dat.data[pd+2] = 0;
					} else {
						dat.data[pd  ] = (r - rangeLow) * mult;
						dat.data[pd+1] = (g - rangeLow) * mult;
						dat.data[pd+2] = (b - rangeLow) * mult;
					}
					dat.data[pd+3] = 255;
				}
			}
		}

		asCanvas(options) {
			const {canvas, context} = makeCanvas(this.width, this.height);
			const dat = context.createImageData(this.width, this.height);
			this.populateImageData(dat, options);
			context.putImageData(dat, 0, 0);
			return canvas;
		}
	}

	ImageRegion.ofSize = (width, height, dim = 1) => {
		const values = new Float32Array(width * height * dim);
		return new ImageRegion(width, height, values, {dim});
	};

	ImageRegion.fromValues = (width, height, values, dim = 1) => {
		const converted = new Float32Array(width * height * dim);
		for(let i = 0; i < width * height * dim; ++ i) {
			converted[i] = values[i];
		}

		return new ImageRegion(width, height, converted, {dim});
	};

	ImageRegion.fromFunction = (width, height, fn, dim = 1) => {
		return ImageRegion.ofSize(width, height, dim).fill(fn);
	};

	ImageRegion.fromCanvas = (canvas) => {
		let context;
		if(canvas.getContext) {
			context = canvas.getContext('2d');
		} else {
			context = canvas;
		}

		const width = context.canvas.width;
		const height = context.canvas.height;
		const dat = context.getImageData(0, 0, width, height);
		const d = dat.data;
		const values = new Float32Array(width * height);
		for(let y = 0; y < height; ++ y) {
			for(let x = 0; x < width; ++ x) {
				const pr = y * width + x;
				const ps = pr * 4;
				const lum = (d[ps] + d[ps+1] + d[ps+2]) / (255 * 3);
				const a = d[ps+3] / 255;
				values[pr] = (lum * 2 - 1) * a;
			}
		}

		return new ImageRegion(width, height, values);
	};

	ImageRegion.fromImage = (image, size) => {
		const {canvas, context} = makeCanvas(image.width, image.height);
		context.drawImage(image, 0, 0, image.width, image.height);
		return ImageRegion.fromCanvas(canvas).resize(size);
	};

	ImageRegion.loadURL = (url, size = {}) => {
		return new Promise((resolve, reject) => {
			const image = new Image();

			image.addEventListener('load', () => {
				image.removeEventListener('error', reject);
				const resolution = size.resolution || 1;
				image.width = image.naturalWidth * resolution;
				image.height = image.naturalHeight * resolution;

				document.body.appendChild(image);
				const canvas = ImageRegion.fromImage(image, size);
				document.body.removeChild(image);
				resolve(canvas);
			}, {once: true});

			image.addEventListener('error', reject);

			image.src = url;
		});
	};

	ImageRegion.loadSVG = (svg, size = {}) => {
		const blob = new Blob([svg], {type: 'image/svg+xml'});
		const url = URL.createObjectURL(blob);
		return ImageRegion.loadURL(url, size)
			.then((region) => {
				URL.revokeObjectURL(url);
				return region;
			});
	};

	return ImageRegion;
});
