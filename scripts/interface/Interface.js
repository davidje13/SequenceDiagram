define([
	'split',
	'cm/lib/codemirror',
	'cm/addon/hint/show-hint',
	'cm/addon/edit/trailingspace',
	'cm/addon/comment/comment',
], (Split, CodeMirror) => {
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

	function makeSplit(nodes, options) {
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
			gutterSize: 1,
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

			this.diagram.registerCodeMirrorMode(CodeMirror);

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
			const code = new CodeMirror(container, {
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
				this.diagram.setHighlight(Math.min(from, to));
			});

			this.diagram.addEventListener('mouseover', (element) => {
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
					this.diagram.clone({
						code: simplifyPreview(lib.preview || lib.code),
						container: holdInner,
					});
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
					minSize: [100, 0],
				});
			}

			return {codePane, libPane};
		}

		build(container) {
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

		update(immediate = true) {
			const src = this.code.getDoc().getValue();
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
	};
});
