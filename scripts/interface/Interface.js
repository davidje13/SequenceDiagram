define([
	'cm/lib/codemirror',
	'cm/addon/hint/show-hint',
	'cm/addon/edit/trailingspace',
	'cm/addon/comment/comment',
], (CodeMirror) => {
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
			localStorage = '',
		}) {
			window.devicePixelRatio = 1;
			this.canvas = makeNode('canvas');
			this.context = this.canvas.getContext('2d');

			this.parser = parser;
			this.generator = generator;
			this.renderer = renderer;
			this.defaultCode = defaultCode;
			this.localStorage = localStorage;
			this.minScale = 1.5;

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

		buildOptions() {
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

			const options = makeNode('div', {'class': 'options'});
			options.appendChild(this.downloadPNG);
			options.appendChild(this.downloadSVG);
			return options;
		}

		buildEditor(container) {
			const value = this.loadCode() || this.defaultCode;
			CodeMirror.defineMode(
				'sequence',
				() => this.parser.getCodeMirrorMode()
			);
			CodeMirror.registerHelper(
				'hint',
				'sequence',
				this.parser.getCodeMirrorHints()
			);
			const code = new CodeMirror(container, {
				value,
				mode: 'sequence',
				lineNumbers: true,
				showTrailingSpace: true,
				extraKeys: {
					'Tab': (cm) => cm.execCommand('indentMore'),
					'Shift-Tab': (cm) => cm.execCommand('indentLess'),
					'Cmd-/': (cm) => cm.toggleComment({padding: ''}),
					'Ctrl-/': (cm) => cm.toggleComment({padding: ''}),
					'Ctrl-Space': 'autocomplete',
					'Ctrl-Enter': 'autocomplete',
					'Cmd-Enter': 'autocomplete',
				},
			});
			let lastKey = 0;
			code.on('keydown', (cm, event) => {
				lastKey = event.keyCode;
			});
			code.on('endCompletion', () => {
				lastKey = 0;
			});
			code.on('change', (cm) => {
				if(cm.state.completionActive) {
					return;
				}
				if(lastKey === 13 || lastKey === 8) {
					return;
				}
				lastKey = 0;
				CodeMirror.commands.autocomplete(cm, null, {
					completeSingle: false,
				});
			});

			return code;
		}

		build(container) {
			const codePane = makeNode('div', {'class': 'pane-code'});
			const viewPane = makeNode('div', {'class': 'pane-view'});
			this.errorPane = makeNode('div', {'class': 'pane-error'});
			this.errorText = makeText();
			this.errorPane.appendChild(this.errorText);
			this.viewPaneInner = makeNode('div', {'class': 'pane-view-inner'});

			const options = this.buildOptions();
			viewPane.appendChild(this.viewPaneInner);
			viewPane.appendChild(options);

			container.appendChild(codePane);
			container.appendChild(this.errorPane);
			container.appendChild(viewPane);

			this.code = this.buildEditor(codePane);
			this.viewPaneInner.appendChild(this.renderer.svg());

			this.code.on('change', () => this.update(false));
			this.update();
		}

		updateMinSize(width, height) {
			const style = this.viewPaneInner.style;
			style.minWidth = Math.ceil(width * this.minScale) + 'px';
			style.minHeight = Math.ceil(height * this.minScale) + 'px';
		}

		redraw(sequence) {
			clearTimeout(this.debounced);
			this.debounced = null;
			this.canvasDirty = true;
			this.svgDirty = true;
			this.renderedSeq = sequence;
			this.renderer.render(sequence);
			this.updateMinSize(this.renderer.width, this.renderer.height);
		}

		saveCode(src) {
			if(!this.localStorage) {
				return;
			}
			try {
				window.localStorage.setItem(this.localStorage, src);
			} catch(e) {
				// ignore
			}
		}

		loadCode() {
			if(!this.localStorage) {
				return '';
			}
			try {
				return window.localStorage.getItem(this.localStorage) || '';
			} catch(e) {
				return '';
			}
		}

		markError(error) {
			if(typeof error === 'object' && error.message) {
				this.errorText.nodeValue = error.message;
			} else {
				this.errorText.nodeValue = error;
			}
			this.errorPane.setAttribute('class', 'pane-error error');
		}

		markOK() {
			this.errorText.nodeValue = 'All OK';
			this.errorPane.setAttribute('class', 'pane-error ok');
		}

		update(immediate = true) {
			const src = this.code.getDoc().getValue();
			this.saveCode(src);
			let sequence = null;
			try {
				const parsed = this.parser.parse(src);
				sequence = this.generator.generate(parsed);
			} catch(e) {
				this.markError(e);
				return;
			}
			this.markOK();

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
