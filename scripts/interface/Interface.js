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

	function simplifyPreview(code) {
		code = code.replace(/\{Agent([0-9]*)\}/g, (match, num) => {
			if(num === undefined) {
				return 'A';
			} else {
				return String.fromCharCode('A'.charCodeAt(0) + Number(num) - 1);
			}
		});
		code = code.replace(/[{}]/g, '');
		code = 'headers fade\nterminators fade\n' + code;
		return code;
	}

	return class Interface {
		constructor({
			parser,
			generator,
			renderer,
			exporter,
			defaultCode = '',
			localStorage = '',
			library = null,
		}) {
			this.parser = parser;
			this.generator = generator;
			this.renderer = renderer;
			this.exporter = exporter;
			this.defaultCode = defaultCode;
			this.localStorage = localStorage;
			this.library = library;
			this.minScale = 1.5;

			this.debounced = null;
			this.latestSeq = null;
			this.renderedSeq = null;
			this.pngDirty = true;
			this.updatingPNG = false;

			this.marker = null;

			this._downloadSVGClick = this._downloadSVGClick.bind(this);
			this._downloadPNGClick = this._downloadPNGClick.bind(this);
			this._downloadPNGFocus = this._downloadPNGFocus.bind(this);
		}

		buildOptionsLinks() {
			const githubLink = makeNode('a', {
				'class': 'github',
				'href': 'https://github.com/davidje13/SequenceDiagram',
				'target': '_blank',
			});
			githubLink.appendChild(makeText('GitHub'));

			const options = makeNode('div', {'class': 'options links'});
			options.appendChild(githubLink);
			return options;
		}

		buildOptionsDownloads() {
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

			const options = makeNode('div', {'class': 'options downloads'});
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
				globals: {
					themes: this.renderer.getThemeNames(),
				},
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
			code.on('change', (cm, change) => {
				if(change.origin === '+input') {
					if(lastKey === 13) {
						lastKey = 0;
						return;
					}
				} else if(change.origin !== 'complete') {
					return;
				}
				CodeMirror.commands.autocomplete(cm, null, {
					completeSingle: false,
				});
			});

			return code;
		}

		registerListeners() {
			this.code.on('change', () => this.update(false));
			this.code.on('cursorActivity', () => {
				const from = this.code.getCursor('from').line;
				const to = this.code.getCursor('to').line;
				this.renderer.setHighlight(Math.min(from, to));
			});

			this.renderer.addEventListener('mouseover', (element) => {
				if(this.marker) {
					this.marker.clear();
				}
				if(element.ln !== undefined) {
					this.marker = this.code.markText(
						{line: element.ln, ch: 0},
						{line: element.ln + 1, ch: 0},
						{
							className: 'hover',
							inclusiveLeft: false,
							inclusiveRight: false,
							clearOnEnter: true,
						}
					);
				}
			});

			this.renderer.addEventListener('mouseout', () => {
				if(this.marker) {
					this.marker.clear();
					this.marker = null;
				}
			});

			this.renderer.addEventListener('click', (element) => {
				if(this.marker) {
					this.marker.clear();
					this.marker = null;
				}
				if(element.ln !== undefined) {
					this.code.setSelection(
						{line: element.ln, ch: 0},
						{line: element.ln + 1, ch: 0},
						{origin: '+focus', bias: -1}
					);
					this.code.focus();
				}
			});
		}

		buildLibrary(container) {
			this.library.forEach((lib) => {
				const hold = makeNode('div', {
					'class': 'library-item',
				});
				const holdInner = makeNode('div', {
					'title': lib.title || lib.code,
				});
				hold.appendChild(holdInner);
				hold.addEventListener(
					'click',
					this.addCodeBlock.bind(this, lib.code)
				);
				container.appendChild(hold);
				try {
					const preview = simplifyPreview(lib.preview || lib.code);
					const parsed = this.parser.parse(preview);
					const generated = this.generator.generate(parsed);
					const rendering = this.renderer.clone();
					holdInner.appendChild(rendering.svg());
					rendering.render(generated);
				} catch(e) {
					hold.setAttribute('class', 'library-item broken');
					holdInner.appendChild(makeText(lib.code));
				}
			});
		}

		buildErrorReport() {
			this.errorMsg = makeNode('div', {'class': 'msg-error'});
			this.errorText = makeText();
			this.errorMsg.appendChild(this.errorText);
			return this.errorMsg;
		}

		buildViewPane() {
			const viewPane = makeNode('div', {'class': 'pane-view'});
			const viewPaneScroller = makeNode('div', {
				'class': 'pane-view-scroller',
			});
			this.viewPaneInner = makeNode('div', {
				'class': 'pane-view-inner',
			});

			viewPane.appendChild(viewPaneScroller);
			viewPaneScroller.appendChild(this.viewPaneInner);
			viewPane.appendChild(this.buildOptionsLinks());
			viewPane.appendChild(this.buildOptionsDownloads());
			viewPane.appendChild(this.buildErrorReport());

			return viewPane;
		}

		build(container) {
			const codePane = makeNode('div', {'class': 'pane-code'});
			container.appendChild(codePane);

			if(this.library !== null) {
				const libPane = makeNode('div', {'class': 'pane-library'});
				const libPaneScroller = makeNode('div', {
					'class': 'pane-library-scroller',
				});
				const libPaneInner = makeNode('div', {
					'class': 'pane-library-inner',
				});
				libPaneScroller.appendChild(libPaneInner);
				libPane.appendChild(libPaneScroller);
				container.appendChild(libPane);
				codePane.setAttribute('class', 'pane-code reduced');
				this.buildLibrary(libPaneInner);
			}

			container.appendChild(this.buildViewPane());

			this.code = this.buildEditor(codePane);
			this.viewPaneInner.appendChild(this.renderer.svg());

			this.registerListeners();
			this.update();
		}

		addCodeBlock(block) {
			const cur = this.code.getCursor('head');
			const pos = {line: cur.line + ((cur.ch > 0) ? 1 : 0), ch: 0};
			const lines = block.split('\n').length;
			this.code.replaceRange(
				block + '\n',
				pos,
				null,
				'library'
			);
			this.code.setCursor({line: pos.line + lines, ch: 0});
			this.code.focus();
		}

		updateMinSize(width, height) {
			const style = this.viewPaneInner.style;
			style.minWidth = Math.ceil(width * this.minScale) + 'px';
			style.minHeight = Math.ceil(height * this.minScale) + 'px';
		}

		redraw(sequence) {
			clearTimeout(this.debounced);
			this.debounced = null;
			this.pngDirty = true;
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
			this.errorMsg.setAttribute('class', 'msg-error error');
		}

		markOK() {
			this.errorText.nodeValue = '';
			this.errorMsg.setAttribute('class', 'msg-error');
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

		updatePNGLink() {
			this.forceRender();
			if(this.updatingPNG || !this.pngDirty) {
				return false;
			}
			this.pngDirty = false;
			this.updatingPNG = true;
			this.exporter.getPNGURL(
				this.renderer,
				PNG_RESOLUTION,
				(url, latest) => {
					if(latest) {
						this.downloadPNG.setAttribute('href', url);
						this.updatingPNG = false;
					}
				}
			);
			return true;
		}

		_downloadPNGFocus() {
			this.updatePNGLink();
		}

		_downloadPNGClick(e) {
			if(this.updatingPNG) {
				e.preventDefault();
			} else if(this.updatePNGLink()) {
				e.preventDefault();
			}
		}

		_downloadSVGClick() {
			this.forceRender();
			const url = this.exporter.getSVGURL(this.renderer);
			this.downloadSVG.setAttribute('href', url);
		}
	};
});
