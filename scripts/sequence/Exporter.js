define(() => {
	'use strict';

	// Thanks, https://stackoverflow.com/a/23522755/1180785
	const safari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

	// Thanks, https://stackoverflow.com/a/9851769/1180785
	const firefox = (typeof window.InstallTrigger !== 'undefined');

	return class Exporter {
		constructor() {
			this.latestSVG = null;
			this.latestInternalSVG = null;
			this.canvas = null;
			this.context = null;
			this.indexPNG = 0;
			this.latestPNGIndex = 0;
			this.latestPNG = null;
		}

		getSVGContent(renderer, size = null) {
			let code = renderer.svg().outerHTML;
			if(firefox && size) {
				// Firefox fails to render SVGs unless they have size
				// attributes on the <svg> tag
				code = code.replace(
					/^<svg/,
					'<svg width="' + size.width +
					'" height="' + size.height + '" '
				);
			}
			return code;
		}

		getSVGBlob(renderer, size = null) {
			return new Blob(
				[this.getSVGContent(renderer, size)],
				{type: 'image/svg+xml'}
			);
		}

		getSVGURL(renderer, size = null) {
			const blob = this.getSVGBlob(renderer, size);
			if(size) {
				if(this.latestInternalSVG) {
					URL.revokeObjectURL(this.latestInternalSVG);
				}
				this.latestInternalSVG = URL.createObjectURL(blob);
				return this.latestInternalSVG;
			} else {
				if(this.latestSVG) {
					URL.revokeObjectURL(this.latestSVG);
				}
				this.latestSVG = URL.createObjectURL(blob);
				return this.latestSVG;
			}
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
			let safariHackaround = null;
			if(safari) {
				// Safari fails to resize SVG images unless they are displayed
				// on the page somewhere, so we must add it before drawing the
				// image. For some reason, doing this inside the load listener
				// is too late, so we do it here and do our best to ensure it
				// doesn't change the page rendering (display:none fails too)
				safariHackaround = document.createElement('div');
				safariHackaround.style.position = 'absolute';
				safariHackaround.style.visibility = 'hidden';
				safariHackaround.appendChild(img);
				document.body.appendChild(safariHackaround);
			}

			const render = () => {
				this.canvas.width = width;
				this.canvas.height = height;
				this.context.drawImage(img, 0, 0);
				if(safariHackaround) {
					document.body.removeChild(safariHackaround);
				}
				this.canvas.toBlob(callback, 'image/png');
			};

			img.addEventListener('load', () => {
				if(safariHackaround) {
					// Wait for custom fonts to load (Safari takes a moment)
					setTimeout(render, 50);
				} else {
					render();
				}
			}, {once: true});

			img.src = this.getSVGURL(renderer, {width, height});
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
