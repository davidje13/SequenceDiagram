define(['codemirror'], (CodeMirror) => {
	'use strict';

	const DELAY_AGENTCHANGE = 500;
	const DELAY_STAGECHANGE = 250;
	const PNG_RESOLUTION = 4;

	function makeText(text = '') {
		return document.createTextNode(text);
	}

	function makeNode(type, attrs = {}) {
		const o = document.createElement(type);
		for(let k in attrs) {
			if(attrs.hasOwnProperty(k)) {
				o.setAttribute(k, attrs[k]);
			}
		}
		return o;
	}

	function on(element, events, fn) {
		events.forEach((event) => element.addEventListener(event, fn));
	}

	return class Interface {
		constructor({
			parser,
			generator,
			renderer,
			defaultCode = '',
		}) {
			window.devicePixelRatio = 1;
			this.canvas = makeNode('canvas');
			this.context = this.canvas.getContext('2d');

			this.parser = parser;
			this.generator = generator;
			this.renderer = renderer;
			this.defaultCode = defaultCode;

			this.debounced = null;
			this.latestSeq = null;
			this.renderedSeq = null;
			this.canvasDirty = true;
			this.svgDirty = true;
			this.latestPNG = null;
			this.latestSVG = null;
			this.updatingPNG = null;

			this._downloadSVGClick = this._downloadSVGClick.bind(this);
			this._downloadPNGClick = this._downloadPNGClick.bind(this);
			this._downloadPNGFocus = this._downloadPNGFocus.bind(this);
		}

		build(container) {
			this.codePane = makeNode('div', {'class': 'pane-code'});
			this.viewPane = makeNode('div', {'class': 'pane-view'});

			this.downloadPNG = makeNode('a', {
				'href': '#',
				'download': 'SequenceDiagram.png',
			});
			this.downloadPNG.appendChild(makeText('Download PNG'));
			on(this.downloadPNG, [
				'focus',
				'mouseover',
				'mousedown',
			], this._downloadPNGFocus);
			on(this.downloadPNG, ['click'], this._downloadPNGClick);

			this.downloadSVG = makeNode('a', {
				'href': '#',
				'download': 'SequenceDiagram.svg',
			});
			this.downloadSVG.appendChild(makeText('SVG'));
			on(this.downloadSVG, ['click'], this._downloadSVGClick);

			this.options = makeNode('div', {'class': 'options'});
			this.options.appendChild(this.downloadPNG);
			this.options.appendChild(this.downloadSVG);
			this.viewPane.appendChild(this.options);

			container.appendChild(this.codePane);
			container.appendChild(this.viewPane);

			this.code = new CodeMirror(this.codePane, {
				value: this.defaultCode,
				mode: '',
			});
			this.viewPane.appendChild(this.renderer.svg());

			this.code.on('change', () => this.update(false));
			this.update();
		}

		redraw(sequence) {
			clearTimeout(this.debounced);
			this.debounced = null;
			this.canvasDirty = true;
			this.svgDirty = true;
			this.renderedSeq = sequence;
			this.renderer.render(sequence);
		}

		update(immediate = true) {
			const src = this.code.getDoc().getValue();
			let sequence = null;
			try {
				const parsed = this.parser.parse(src);
				sequence = this.generator.generate(parsed);
			} catch(e) {
				// TODO
				// console.log(e);
				return;
			}

			let delay = 0;
			if(!immediate && this.renderedSeq) {
				const old = this.renderedSeq;
				if(sequence.agents.length !== old.agents.length) {
					delay = DELAY_AGENTCHANGE;
				} else if(sequence.stages.length !== old.stages.length) {
					delay = DELAY_STAGECHANGE;
				}
			}

			if(delay <= 0) {
				this.redraw(sequence);
			} else {
				clearTimeout(this.debounced);
				this.latestSeq = sequence;
				this.debounced = setTimeout(() => this.redraw(sequence), delay);
			}
		}

		forceRender() {
			if(this.debounced) {
				clearTimeout(this.debounced);
				this.redraw(this.latestSeq);
			}
		}

		getSVGData() {
			this.forceRender();
			if(!this.svgDirty) {
				return this.latestSVG;
			}
			this.svgDirty = false;
			const src = this.renderer.svg().outerHTML;
			const blob = new Blob([src], {type: 'image/svg+xml'});
			if(this.latestSVG) {
				URL.revokeObjectURL(this.latestSVG);
			}
			this.latestSVG = URL.createObjectURL(blob);
			return this.latestSVG;
		}

		getPNGData(callback) {
			this.forceRender();
			if(!this.canvasDirty) {
				// TODO: this could cause issues if getPNGData is called
				// while another update is ongoing. Needs a more robust fix
				callback(this.latestPNG);
				return;
			}
			this.canvasDirty = false;
			const width = this.renderer.width * PNG_RESOLUTION;
			const height = this.renderer.height * PNG_RESOLUTION;
			this.canvas.width = width;
			this.canvas.height = height;
			const img = new Image(width, height);
			img.addEventListener('load', () => {
				this.context.drawImage(img, 0, 0);
				this.canvas.toBlob((blob) => {
					if(this.latestPNG) {
						URL.revokeObjectURL(this.latestPNG);
					}
					this.latestPNG = URL.createObjectURL(blob);
					callback(this.latestPNG);
				}, 'image/png');
			}, {once: true});
			img.src = this.getSVGData();
		}

		updatePNGLink() {
			const nonce = this.updatingPNG = {};
			this.getPNGData((data) => {
				if(this.updatingPNG === nonce) {
					this.downloadPNG.setAttribute('href', data);
					this.updatingPNG = null;
				}
			});
		}

		_downloadPNGFocus() {
			this.forceRender();
			if(this.canvasDirty) {
				this.updatePNGLink();
			}
		}

		_downloadPNGClick(e) {
			if(this.updatingPNG) {
				e.preventDefault();
			} else if(this.canvasDirty) {
				e.preventDefault();
				this.updatePNGLink();
			}
		}

		_downloadSVGClick() {
			this.downloadSVG.setAttribute('href', this.getSVGData());
		}
	};
});
