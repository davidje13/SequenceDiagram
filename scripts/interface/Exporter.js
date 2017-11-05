define(() => {
	'use strict';

	return class Exporter {
		constructor() {
			this.latestSVG = null;
			this.canvas = null;
			this.context = null;
			this.indexPNG = 0;
			this.latestPNGIndex = 0;
			this.latestPNG = null;
		}

		getSVGContent(renderer) {
			return renderer.svg().outerHTML;
		}

		getSVGBlob(renderer) {
			return new Blob(
				[this.getSVGContent(renderer)],
				{type: 'image/svg+xml'}
			);
		}

		getSVGURL(renderer) {
			const blob = this.getSVGBlob(renderer);
			if(this.latestSVG) {
				URL.revokeObjectURL(this.latestSVG);
			}
			this.latestSVG = URL.createObjectURL(blob);
			return this.latestSVG;
		}

		getPNGBlob(renderer, resolution, callback) {
			if(!this.canvas) {
				window.devicePixelRatio = 1;
				this.canvas = document.createElement('canvas');
				this.context = this.canvas.getContext('2d');
			}

			const width = renderer.width * resolution;
			const height = renderer.height * resolution;
			const img = new Image(width, height);

			img.addEventListener('load', () => {
				this.canvas.width = width;
				this.canvas.height = height;
				this.context.drawImage(img, 0, 0);
				this.canvas.toBlob(callback, 'image/png');
			}, {once: true});

			img.src = this.getSVGURL(renderer);
		}

		getPNGURL(renderer, resolution, callback) {
			++ this.indexPNG;
			const index = this.indexPNG;

			this.getPNGBlob(renderer, resolution, (blob) => {
				const url = URL.createObjectURL(blob);
				const isLatest = index >= this.latestPNGIndex;
				if(isLatest) {
					if(this.latestPNG) {
						URL.revokeObjectURL(this.latestPNG);
					}
					this.latestPNG = url;
					this.latestPNGIndex = index;
					callback(url, true);
				} else {
					callback(url, false);
					URL.revokeObjectURL(url);
				}
			});
		}
	};
});
