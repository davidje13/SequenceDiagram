define(['require'], (require) => {
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

	function addNewline(value) {
		if(value.length > 0 && value.charAt(value.length - 1) !== '\n') {
			return value + '\n';
		}
		return value;
	}

	function on(element, events, fn) {
		events.forEach((event) => element.addEventListener(event, fn));
	}

	function findPos(content, index) {
		let p = 0;
		let line = 0;
		while(true) {
			const nextLn = content.indexOf('\n', p) + 1;
			if(index < nextLn || nextLn === 0) {
				return {line, ch: index - p};
			}
			p = nextLn;
			++ line;
		}
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

	function makeSplit(nodes, options) {
		// Load on demand for progressive enhancement
		// (failure to load external module will not block functionality)
		require(['split'], (Split) => {
			// Patches for:
			// https://github.com/nathancahill/Split.js/issues/97
			// https://github.com/nathancahill/Split.js/issues/111
			const parent = nodes[0].parentNode;
			const oldAEL = parent.addEventListener;
			const oldREL = parent.removeEventListener;
			parent.addEventListener = (event, callback) => {
				if(event === 'mousemove' || event === 'touchmove') {
					window.addEventListener(event, callback, {passive: true});
				} else {
					oldAEL.call(parent, event, callback);
				}
			};
			parent.removeEventListener = (event, callback) => {
				if(event === 'mousemove' || event === 'touchmove') {
					window.removeEventListener(event, callback);
				} else {
					oldREL.call(parent, event, callback);
				}
			};

			let oldCursor = null;
			const resolvedOptions = Object.assign({
				direction: 'vertical',
				cursor: (options.direction === 'vertical') ?
					'row-resize' : 'col-resize',
				gutterSize: 0,
				onDragStart: () => {
					oldCursor = document.body.style.cursor;
					document.body.style.cursor = resolvedOptions.cursor;
				},
				onDragEnd: () => {
					document.body.style.cursor = oldCursor;
					oldCursor = null;
				},
			}, options);

			return new Split(nodes, resolvedOptions);
		});
	}

	function hasDroppedFile(event, mime) {
		if(!event.dataTransfer.items && event.dataTransfer.files.length === 0) {
			// Work around Safari not supporting dataTransfer.items
			return [...event.dataTransfer.types].includes('Files');
		}

		const items = (event.dataTransfer.items || event.dataTransfer.files);
		return (items.length === 1 && items[0].type === mime);
	}

	function getDroppedFile(event, mime) {
		const items = (event.dataTransfer.items || event.dataTransfer.files);
		if(items.length !== 1 || items[0].type !== mime) {
			return null;
		}
		const item = items[0];
		if(item.getAsFile) {
			return item.getAsFile();
		} else {
			return item;
		}
	}

	function getFileContent(file) {
		return new Promise((resolve) => {
			const reader = new FileReader();
			reader.addEventListener('loadend', () => {
				resolve(reader.result);
			}, {once: true});
			reader.readAsText(file);
		});
	}

	return class Interface {
		constructor({
			sequenceDiagram,
			defaultCode = '',
			localStorage = '',
			library = [],
			links = [],
		}) {
			this.diagram = sequenceDiagram;
			this.defaultCode = defaultCode;
			this.localStorage = localStorage;
			this.library = library;
			this.links = links;
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
			this._showDropStyle = this._showDropStyle.bind(this);
			this._hideDropStyle = this._hideDropStyle.bind(this);

			this._enhanceEditor();
		}

		buildOptionsLinks() {
			const options = makeNode('div', {'class': 'options links'});
			this.links.forEach((link) => {
				const linkNode = makeNode('a', {
					'href': link.href,
					'target': '_blank',
				});
				linkNode.appendChild(makeText(link.label));
				options.appendChild(linkNode);
			});
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
			const code = makeNode('textarea', {'class': 'editor-simple'});
			code.value = value;
			container.appendChild(code);

			return code;
		}

		registerListeners() {
			this.code.addEventListener('input', () => this.update(false));

			this.diagram.addEventListener('mouseover', (element) => {
				if(this.marker) {
					this.marker.clear();
				}
				if(element.ln !== undefined && this.code.markText) {
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

			this.diagram.addEventListener('mouseout', () => {
				if(this.marker) {
					this.marker.clear();
					this.marker = null;
				}
			});

			this.diagram.addEventListener('click', (element) => {
				if(this.marker) {
					this.marker.clear();
					this.marker = null;
				}
				if(element.ln !== undefined && this.code.setSelection) {
					this.code.setSelection(
						{line: element.ln, ch: 0},
						{line: element.ln + 1, ch: 0},
						{origin: '+focus', bias: -1}
					);
					this.code.focus();
				}
			});

			this.container.addEventListener('dragover', (event) => {
				event.preventDefault();
				if(hasDroppedFile(event, 'image/svg+xml')) {
					event.dataTransfer.dropEffect = 'copy';
					this._showDropStyle();
				} else {
					event.dataTransfer.dropEffect = 'none';
				}
			});

			this.container.addEventListener('dragleave', this._hideDropStyle);
			this.container.addEventListener('dragend', this._hideDropStyle);

			this.container.addEventListener('drop', (event) => {
				event.preventDefault();
				this._hideDropStyle();
				const file = getDroppedFile(event, 'image/svg+xml');
				if(file) {
					this.loadFile(file);
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
					this.diagram.clone({
						code: simplifyPreview(lib.preview || lib.code),
						container: holdInner,
					});
				} catch(e) {
					window.console.log('Failed to render preview', e);
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
			viewPane.appendChild(this.buildErrorReport());

			return viewPane;
		}

		buildLeftPanes(container) {
			const codePane = makeNode('div', {'class': 'pane-code'});
			container.appendChild(codePane);
			let libPane = null;

			if(this.library.length > 0) {
				libPane = makeNode('div', {'class': 'pane-library'});
				const libPaneScroller = makeNode('div', {
					'class': 'pane-library-scroller',
				});
				const libPaneInner = makeNode('div', {
					'class': 'pane-library-inner',
				});
				libPaneScroller.appendChild(libPaneInner);
				libPane.appendChild(libPaneScroller);
				container.appendChild(libPane);
				this.buildLibrary(libPaneInner);

				makeSplit([codePane, libPane], {
					direction: 'vertical',
					snapOffset: 5,
					sizes: [70, 30],
					minSize: [100, 5],
				});
			}

			return {codePane, libPane};
		}

		build(container) {
			this.container = container;
			const hold = makeNode('div', {'class': 'pane-hold'});
			const lPane = makeNode('div', {'class': 'pane-side'});
			hold.appendChild(lPane);
			container.appendChild(hold);
			const {codePane} = this.buildLeftPanes(lPane);

			const viewPane = this.buildViewPane();
			hold.appendChild(viewPane);

			hold.appendChild(this.buildOptionsLinks());
			hold.appendChild(this.buildOptionsDownloads());

			makeSplit([lPane, viewPane], {
				direction: 'horizontal',
				snapOffset: 70,
				sizes: [30, 70],
				minSize: [10, 10],
			});

			this.code = this.buildEditor(codePane);
			this.viewPaneInner.appendChild(this.diagram.dom());

			this.registerListeners();

			// Delay first update 1 frame to ensure render target is ready
			// (prevents initial incorrect font calculations for custom fonts)
			setTimeout(this.update.bind(this), 0);
		}

		addCodeBlock(block) {
			const lines = block.split('\n').length;

			if(this.code.getCursor) {
				const cur = this.code.getCursor('head');
				const pos = {line: cur.line + ((cur.ch > 0) ? 1 : 0), ch: 0};
				this.code.replaceRange(
					addNewline(block),
					pos,
					null,
					'library'
				);
				this.code.setCursor({line: pos.line + lines, ch: 0});
			} else {
				const value = this.value();
				const cur = this.code.selectionStart;
				const pos = ('\n' + value + '\n').indexOf('\n', cur);
				const replaced = (
					addNewline(value.substr(0, pos)) +
					addNewline(block)
				);
				this.code.value = replaced + value.substr(pos);
				this.code.selectionStart = replaced.length;
				this.code.selectionEnd = replaced.length;
				this.update(false);
			}

			this.code.focus();
		}

		updateMinSize({width, height}) {
			const style = this.viewPaneInner.style;
			style.minWidth = Math.ceil(width * this.minScale) + 'px';
			style.minHeight = Math.ceil(height * this.minScale) + 'px';
		}

		redraw(sequence) {
			clearTimeout(this.debounced);
			this.debounced = null;
			this.pngDirty = true;
			this.renderedSeq = sequence;
			this.diagram.render(sequence);
			this.updateMinSize(this.diagram.getSize());
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

		value() {
			if(this.code.getDoc) {
				return this.code.getDoc().getValue();
			} else {
				return this.code.value;
			}
		}

		setValue(code) {
			if(this.code.getDoc) {
				const doc = this.code.getDoc();
				doc.setValue(code);
				doc.clearHistory();
			} else {
				this.code.value = code;
			}
			this.update(true);
			this.diagram.setHighlight(null);
		}

		loadFile(file) {
			return getFileContent(file).then((svg) => {
				const code = this.diagram.extractCodeFromSVG(svg);
				if(code) {
					this.setValue(code);
				}
			});
		}

		update(immediate = true) {
			const src = this.value();
			this.saveCode(src);
			let sequence = null;
			try {
				sequence = this.diagram.process(src);
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
			this.diagram.getPNG({resolution: PNG_RESOLUTION})
				.then(({url, latest}) => {
					if(latest) {
						this.downloadPNG.setAttribute('href', url);
						this.updatingPNG = false;
					}
				});
			return true;
		}

		_showDropStyle() {
			this.container.setAttribute('class', 'drop-target');
		}

		_hideDropStyle() {
			this.container.setAttribute('class', '');
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
			const url = this.diagram.getSVGSynchronous();
			this.downloadSVG.setAttribute('href', url);
		}

		_enhanceEditor() {
			// Load on demand for progressive enhancement
			// (failure to load external module will not block functionality)
			require([
				'cm/lib/codemirror',
				'cm/addon/hint/show-hint',
				'cm/addon/edit/trailingspace',
				'cm/addon/comment/comment',
			], (CodeMirror) => {
				this.diagram.registerCodeMirrorMode(CodeMirror);

				const selBegin = this.code.selectionStart;
				const selEnd = this.code.selectionEnd;
				const value = this.code.value;
				const focussed = this.code === document.activeElement;

				const code = new CodeMirror(this.code.parentNode, {
					value,
					mode: 'sequence',
					globals: {
						themes: this.diagram.getThemeNames(),
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
				this.code.parentNode.removeChild(this.code);
				code.getDoc().setSelection(
					findPos(value, selBegin),
					findPos(value, selEnd)
				);

				let lastKey = 0;
				code.on('keydown', (cm, event) => {
					lastKey = event.keyCode;
				});

				code.on('change', (cm, change) => {
					this.update(false);

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

				code.on('cursorActivity', () => {
					const from = code.getCursor('from').line;
					const to = code.getCursor('to').line;
					this.diagram.setHighlight(Math.min(from, to));
				});

				if(focussed) {
					code.focus();
				}

				this.code = code;
			});
		}
	};
});
