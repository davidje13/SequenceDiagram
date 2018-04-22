import {safari} from '../../core/browser.mjs';

export default class Exporter {
	constructor() {
		this.latestSVG = null;
		this.latestInternalSVG = null;
		this.canvas = null;
		this.context = null;
		this.indexPNG = 0;
		this.latestPNGIndex = 0;
		this.latestPNG = null;
	}

	getSVGContent(renderer) {
		let code = renderer.dom().outerHTML;

		/*
		 * Firefox fails to render SVGs as <img> unless they have size
		 * attributes on the <svg> tag, so we must set this when
		 * exporting from any environment, in case it is opened in FireFox
		 */
		code = code.replace(
			(/^<svg/),
			'<svg width="' + (renderer.width || 1) +
			'" height="' + (renderer.height || 1) + '" '
		);

		return code;
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

	getCanvas(renderer, resolution, callback) {
		if(!this.canvas) {
			window.devicePixelRatio = 1;
			this.canvas = document.createElement('canvas');
			this.context = this.canvas.getContext('2d');
		}

		const width = (renderer.width || 1) * resolution;
		const height = (renderer.height || 1) * resolution;
		const img = new Image(width, height);
		let safariHackaround = null;
		if(safari) {
			/*
			 * Safari fails to resize SVG images unless they are displayed
			 * on the page somewhere, so we must add it before drawing the
			 * image. For some reason, doing this inside the load listener
			 * is too late, so we do it here and do our best to ensure it
			 * doesn't change the page rendering (display:none fails too)
			 */
			safariHackaround = document.createElement('div');
			safariHackaround.style.position = 'absolute';
			safariHackaround.style.visibility = 'hidden';
			safariHackaround.appendChild(img);
			document.body.appendChild(safariHackaround);
		}

		const render = () => {
			this.canvas.width = width;
			this.canvas.height = height;
			this.context.drawImage(img, 0, 0, width, height);
			if(safariHackaround) {
				document.body.removeChild(safariHackaround);
			}
			callback(this.canvas);
		};

		img.addEventListener('load', () => {
			if(safariHackaround) {
				// Wait for custom fonts to load (Safari takes a moment)
				setTimeout(render, 50);
			} else {
				render();
			}
		}, {once: true});

		img.src = this.getSVGURL(renderer);
	}

	getPNGBlob(renderer, resolution, callback) {
		this.getCanvas(renderer, resolution, (canvas) => {
			canvas.toBlob(callback, 'image/png');
		});
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
}
