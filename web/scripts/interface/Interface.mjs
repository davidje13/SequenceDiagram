import './fastClick.mjs';
import './split.mjs';
import {
	getDroppedFile,
	getFileContent,
	hasDroppedFile,
} from './fileHelpers.mjs';
import CodeEditor from './CodeEditor.mjs';
import DOMWrapper from '../../../scripts/core/DOMWrapper.mjs';
import URLExporter from './URLExporter.mjs';
import VoidStorage from '../storage/VoidStorage.mjs';

const DELAY_AGENTCHANGE = 500;
const DELAY_STAGECHANGE = 250;
const PNG_RESOLUTION = 4;

function simplifyPreview(code) {
	return 'headers fade\nterminators fade\n' + code
		.replace(/\{Agent([0-9]*)\}/g, (match, num) => {
			if(typeof num === 'undefined') {
				return 'A';
			} else {
				return String.fromCharCode('A'.charCodeAt(0) + Number(num) - 1);
			}
		})
		.replace(/[{}]/g, '');
}

function fetchResource(path) {
	if(typeof fetch === 'undefined') {
		return Promise.reject(new Error());
	}
	return fetch(path)
		.then((response) => {
			if(!response.ok) {
				throw new Error(response.statusText);
			}
			return response;
		});
}

function setDocumentTitle(diagramTitle) {
	let title = diagramTitle.trim();
	if(title.length > 20) {
		title = title.substr(0, 18).trim() + '\u2026';
	}
	document.title = (title ? `${title} \u2014 ` : '') + 'Sequence Diagram';
}

export default class Interface {
	constructor({
		sequenceDiagram,
		defaultCode = '',
		library = [],
		links = [],
		require = null,
		storage = new VoidStorage(),
		touchUI = false,
	}) {
		this.diagram = sequenceDiagram;
		this.defaultCode = defaultCode;
		this.storage = storage;
		this.library = library;
		this.links = links;
		this.minScale = 1.5;
		this.require = require || (() => null);
		this.touchUI = touchUI;

		this.debounced = null;
		this.latestSeq = null;
		this.renderedSeq = null;
		this.pngDirty = true;
		this.updatingPNG = false;

		this.marker = null;

		this._downloadSVGClick = this._downloadSVGClick.bind(this);
		this._downloadPNGClick = this._downloadPNGClick.bind(this);
		this._downloadPNGFocus = this._downloadPNGFocus.bind(this);
		this._downloadURLClick = this._downloadURLClick.bind(this);
		this._hideDropStyle = this._hideDropStyle.bind(this);

		this.diagram
			.on('render', () => {
				this.updateMinSize(this.diagram.getSize());
				setDocumentTitle(this.diagram.getTitle());
				this.pngDirty = true;
			})
			.on('mouseover', (element) => this.code.markLineHover(element.ln))
			.on('mouseout', () => this.code.unmarkLineHover())
			.on('click', (element) => {
				this.code.unmarkLineHover();
				this.code.selectLine(element.ln);
				this._hideURLBuilder();
			})
			.on('dblclick', (element) => {
				this.diagram.toggleCollapsed(element.ln);
				this._hideURLBuilder();
			});
	}

	buildURLBuilder() {
		const copied = this.dom.el('div').setClass('copied')
			.add('Copied to Clipboard');
		this.urlOutput = this.dom.el('input').setClass('output')
			.attr('readonly', 'readonly')
			.on('focus', () => {
				this.urlOutput.select(0, this.urlOutput.element.value.length);
			});

		const copy = this.dom.el('button').setClass('copy')
			.attr('title', 'Copy to clipboard')
			.fastClick()
			.on('click', () => {
				if(this.touchUI) {
					this.urlOutput.styles({display: 'block'});
				}
				this.urlOutput
					.focus()
					.select(0, this.urlOutput.element.value.length)
					.element.ownerDocument.execCommand('copy');
				copy.focus();
				this.container.delClass('keyinput');
				if(this.touchUI) {
					this.urlOutput.styles({display: 'none'});
				}
				copied.styles({
					'display': 'block',
					'opacity': 1,
					'transition': 'none',
				});
				setTimeout(() => copied.styles({
					'opacity': 0,
					'transition': 'opacity 0.5s linear',
				}), 1000);
				setTimeout(() => copied.styles({'display': 'none'}), 1500);
			});

		const updateMode = () => {
			this.renderOpts.styles({
				'display': this.modeEdit.element.checked ? 'none' : 'block',
			});
			this._refreshURL();
		};

		this.modeRender = this.dom.el('input').attrs({
			'checked': 'checked',
			'name': 'export-mode',
			'type': 'radio',
			'value': 'render',
		}).on('change', updateMode);

		this.modeEdit = this.dom.el('input').attrs({
			'name': 'export-mode',
			'type': 'radio',
			'value': 'edit',
		}).on('change', updateMode);

		this.modeMarkdown = this.dom.el('input').attrs({
			'name': 'export-mode',
			'type': 'radio',
			'value': 'markdown',
		}).on('change', updateMode);

		this.urlWidth = this.dom.el('input').attrs({
			'min': 0,
			'placeholder': 'auto',
			'step': 'any',
			'type': 'number',
		}).on('input', () => {
			this.urlZoom.val('1');
			this._refreshURL();
		});

		this.urlHeight = this.dom.el('input').attrs({
			'min': 0,
			'placeholder': 'auto',
			'step': 'any',
			'type': 'number',
		}).on('input', () => {
			this.urlZoom.val('1');
			this._refreshURL();
		});

		this.urlZoom = this.dom.el('input').attrs({
			'min': 0,
			'step': 'any',
			'type': 'number',
			'value': 1,
		}).on('input', () => {
			this.urlWidth.val('');
			this.urlHeight.val('');
			this._refreshURL();
		});

		this.renderOpts = this.dom.el('div').add(
			this.dom.el('label').add('width ', this.urlWidth),
			', ',
			this.dom.el('label').add('height ', this.urlHeight),
			this.dom.el('span').setClass('or').add('or'),
			this.dom.el('label').add('zoom ', this.urlZoom)
		);

		const urlOpts = this.dom.el('div').setClass('config').add(
			this.dom.el('div').setClass('export-mode').add(
				this.dom.el('label').add(this.modeRender, 'View'),
				this.dom.el('label').add(this.modeEdit, 'Edit'),
				this.dom.el('label').add(this.modeMarkdown, 'Markdown')
			),
			this.renderOpts,
			this.urlOutput,
			copy,
			copied
		);

		const urlBuilder = this.dom.el('div').setClass('urlbuilder')
			.styles({'display': 'none'})
			.add(
				this.dom.el('div').setClass('message')
					.add('Loading\u2026')
			);

		const ownURL = (typeof window === 'undefined') ? 'http://localhost' : window.location.href;
		this.renderService = new URLExporter();
		this.renderService.setEditBase(new URL('.', ownURL).href);

		const relativePath = 'render/';
		fetchResource(relativePath)
			.then((response) => response.text())
			.then((content) => {
				let path = content.trim();
				if(!path || path.startsWith('<')) {
					path = relativePath;
				}
				this.renderService.setRenderBase(new URL(path, ownURL).href);
				urlBuilder.empty().add(urlOpts);
				this._refreshURL();
			})
			.catch(() => {
				urlBuilder.empty().add(
					this.dom.el('div').setClass('message')
						.add('No online rendering service available.')
				);
			});

		return urlBuilder;
	}

	_refreshURL() {
		const code = this.code.value();
		const viewOpts = {
			height: Number.parseFloat(this.urlHeight.element.value),
			width: Number.parseFloat(this.urlWidth.element.value),
			zoom: Number.parseFloat(this.urlZoom.element.value || '1'),
		};

		let url = '';
		if(this.modeMarkdown.element.checked) {
			const edit = this.renderService.getEditURL(code);
			const view = this.renderService.getRenderURL(code, viewOpts);
			const title = this.diagram.getTitle()
				.replace(/[^a-zA-Z0-9 \-_'"]/g, '')
				.trim();
			url = `[![${title}](${view})](${edit})`;
		} else if(this.modeEdit.element.checked) {
			url = this.renderService.getEditURL(code);
		} else {
			url = this.renderService.getRenderURL(code, viewOpts);
		}
		this.urlOutput.val(url);
	}

	_showURLBuilder() {
		if(this.builderVisible) {
			return;
		}
		this.builderVisible = true;
		if(this.touchUI) {
			this.urlBuilder.styles({
				'bottom': '-210px',
				'display': 'block',
			});
		} else {
			this.urlBuilder.styles({
				'display': 'block',
				'height': '0px',
				'padding': '0px',
				'width': this.optsHold.element.clientWidth + 'px',
			});
		}
		clearTimeout(this.builderTm);
		this.builderTm = setTimeout(() => {
			if(this.touchUI) {
				this.urlBuilder.styles({'bottom': 0});
			} else {
				this.urlBuilder.styles({
					'height': '150px',
					'padding': '10px',
					'width': '400px',
				});
				this.optsHold.styles({
					'box-shadow': '10px 10px 25px 12px rgba(0,0,0,0.3)',
				});
			}
		}, 0);

		this._refreshURL();
	}

	_hideURLBuilder() {
		if(!this.builderVisible) {
			return;
		}
		this.builderVisible = false;
		if(this.touchUI) {
			this.urlBuilder.styles({
				'bottom': (-this.urlBuilder.element.clientHeight - 60) + 'px',
			});
		} else {
			this.urlBuilder.styles({
				'height': '0px',
				'padding': '0px',
				'width': '0px',
			});
			this.optsHold.styles({
				'box-shadow': 'none',
			});
		}
		this.container.delClass('keyinput');
		clearTimeout(this.builderTm);
		this.builderTm = setTimeout(() => {
			this.urlBuilder.styles({'display': 'none'});
		}, 200);
	}

	buildOptionsDownloads() {
		this.downloadPNG = this.dom.el('a')
			.text('Export PNG')
			.attrs({
				'download': 'SequenceDiagram.png',
				'href': '#',
			})
			.on(['focus', 'mouseover', 'mousedown'], this._downloadPNGFocus)
			// Exploit delay between touchend and click on mobile
			.on('touchend', this._downloadPNGFocus)
			.on('click', this._downloadPNGClick);

		this.downloadSVG = this.dom.el('a')
			.text('SVG')
			.attrs({
				'download': 'SequenceDiagram.svg',
				'href': '#',
			})
			.fastClick()
			.on('click', this._downloadSVGClick);

		this.downloadURL = this.dom.el('a')
			.text('URL')
			.attrs({'href': '#'})
			.fastClick()
			.on('click', this._downloadURLClick);

		this.urlBuilder = this.buildURLBuilder();

		this.optsHold = this.dom.el('div').setClass('options downloads').add(
			this.downloadPNG,
			this.downloadSVG,
			this.downloadURL,
			this.urlBuilder
		);

		return this.optsHold;
	}

	buildLibrary(container) {
		const diagrams = this.library.map((lib) => {
			const holdInner = this.dom.el('div')
				.attr('title', lib.title || lib.code);

			const hold = this.dom.el('div')
				.setClass('library-item')
				.add(holdInner)
				.fastClick()
				.on('click', () => this.code.addCodeBlock(
					lib.code,
					lib.surround
				))
				.attach(container);

			return this.diagram.clone({
				code: simplifyPreview(lib.preview || lib.code),
				container: holdInner.element,
				render: false,
			}).on('error', (sd, e) => {
				window.console.warn('Failed to render preview', e);
				hold.attr('class', 'library-item broken');
				holdInner.text(lib.code);
			});
		});

		try {
			this.diagram.renderAll(diagrams);
		} catch(ignore) {
			// Ignore
		}

		return container;
	}

	buildCodePane() {
		const container = this.dom.el('div').setClass('pane-code');

		this.code = new CodeEditor(this.dom, container, {
			mode: 'sequence',
			require: this.require,
			value: this.storage.get() || this.defaultCode,
		});

		this.code
			.on('enhance', (CM, globals) => {
				this.diagram.registerCodeMirrorMode(CM);
				globals.themes = this.diagram.getThemeNames();
			})
			.on('change', () => this.update(false))
			.on('cursorActivity', (from, to) => {
				this.diagram.setHighlight(Math.min(from.line, to.line));
			})
			.on('focus', () => this._hideURLBuilder());

		return container;
	}

	buildLibPane() {
		if(this.library.length === 0) {
			return null;
		}

		return this.dom.el('div').setClass('pane-library')
			.add(this.dom.el('div').setClass('pane-library-scroller')
				.add(this.buildLibrary(
					this.dom.el('div').setClass('pane-library-inner')
				)));
	}

	buildViewPane() {
		this.viewPaneInner = this.dom.el('div').setClass('pane-view-inner')
			.add(this.diagram.dom())
			.on('touchstart', () => this._hideURLBuilder(), {passive: true})
			.on('mousedown', () => this._hideURLBuilder());

		this.errorMsg = this.dom.el('div').setClass('msg-error');

		return this.dom.el('div').setClass('pane-view')
			.add(
				this.dom.el('div').setClass('pane-view-scroller')
					.add(this.viewPaneInner),
				this.errorMsg
			);
	}

	build(container) {
		this.dom = new DOMWrapper(container.ownerDocument);

		this.container = this.dom.wrap(container)
			.on('dragover', (event) => {
				event.preventDefault();
				if(hasDroppedFile(event, 'image/svg+xml')) {
					event.dataTransfer.dropEffect = 'copy';
					this._showDropStyle();
				} else {
					event.dataTransfer.dropEffect = 'none';
				}
			})
			.on('dragleave', this._hideDropStyle)
			.on('dragend', this._hideDropStyle)
			.on('drop', (event) => {
				event.preventDefault();
				this._hideDropStyle();
				const file = getDroppedFile(event, 'image/svg+xml');
				if(file) {
					this.loadFile(file);
				}
			})
			.on('focusin', () => this.container.addClass('keyinput'))
			.on('focusout', () => this.container.delClass('keyinput'));

		const codePane = this.buildCodePane();
		const libPane = this.buildLibPane();
		const viewPane = this.buildViewPane();

		const links = this.links.map((link) => {
			const label = this.touchUI ? link.touchLabel : link.label;
			return label && this.dom.el('a')
				.attrs({'href': link.href, 'target': link.target || ''})
				.text(label);
		}).filter((x) => x);

		if(this.touchUI) {
			this.buildOptionsDownloads();
			this.container
				.addClass('touch')
				.add(
					this.dom.el('div').setClass('pane-hold')
						.split([viewPane, codePane], {
							direction: 'vertical',
							minSize: [10, 10],
							require: this.require,
							sizes: [80, 20],
							snapOffset: 20,
						}),
					libPane.styles({'display': 'none', 'top': '100%'}),
					this.urlBuilder,
					this.dom.el('div').setClass('optbar')
						.add(
							...links,
							this.downloadPNG.text('PNG'),
							this.downloadSVG.text('SVG'),
							this.downloadURL.text('URL')
						)
				);
		} else {
			this.container
				.add(
					this.dom.el('div').setClass('pane-hold')
						.split([
							this.dom.el('div').setClass('pane-side')
								.split([codePane, libPane], {
									direction: 'vertical',
									minSize: [100, 5],
									require: this.require,
									sizes: [70, 30],
									snapOffset: 5,
								}),
							viewPane,
						], {
							direction: 'horizontal',
							minSize: [10, 10],
							require: this.require,
							sizes: [30, 70],
							snapOffset: 70,
						}),
					this.dom.el('div').setClass('options links').add(links),
					this.buildOptionsDownloads()
				);
		}

		if(typeof window !== 'undefined') {
			window.addEventListener('keydown', (e) => {
				if(e.keyCode === 27) {
					this._hideURLBuilder();
				}
			});
		}

		// Delay first update 1 frame to ensure render target is ready
		// (prevents initial incorrect font calculations for custom fonts)
		setTimeout(this.update.bind(this), 0);
	}

	updateMinSize({width, height}) {
		this.viewPaneInner.styles({
			'minHeight': Math.ceil(height * this.minScale) + 'px',
			'minWidth': Math.ceil(width * this.minScale) + 'px',
		});
	}

	redrawDebounced(sequence, delay) {
		if(delay <= 0) {
			this.redraw(sequence);
		} else {
			clearTimeout(this.debounced);
			this.latestSeq = sequence;
			this.debounced = setTimeout(() => this.redraw(sequence), delay);
		}
	}

	redraw(sequence) {
		clearTimeout(this.debounced);
		this.debounced = null;
		this.renderedSeq = sequence;
		this.diagram.render(sequence);
	}

	markError(error) {
		if(typeof error === 'object' && error.message) {
			this.errorMsg.text(error.message);
		} else {
			this.errorMsg.text(error);
		}
		this.errorMsg.addClass('error');
	}

	markOK() {
		this.errorMsg.text('').delClass('error');
	}

	loadFile(file) {
		return getFileContent(file).then((svg) => {
			const code = this.diagram.extractCodeFromSVG(svg);
			if(code) {
				this.code.setValue(code);
				this.diagram.expandAll({render: false});
				this.update(true);
				this.diagram.setHighlight(null);
			}
		});
	}

	update(immediate = true) {
		this._hideURLBuilder();
		const src = this.code.value();
		this.storage.set(src);
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

		this.redrawDebounced(sequence, delay);
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
					this.downloadPNG.attr('href', url);
					this.updatingPNG = false;
				}
			});
		return true;
	}

	_showDropStyle() {
		this.container.addClass('drop-target');
	}

	_hideDropStyle() {
		this.container.delClass('drop-target');
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
		this._hideURLBuilder();
	}

	_downloadSVGClick() {
		this.forceRender();
		const url = this.diagram.getSVGSynchronous();
		this.downloadSVG.attr('href', url);
		this._hideURLBuilder();
	}

	_downloadURLClick(e) {
		e.preventDefault();

		if(this.builderVisible) {
			this._hideURLBuilder();
		} else {
			this._showURLBuilder();
		}
	}
}
