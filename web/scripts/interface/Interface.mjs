/* eslint-disable max-lines */

import DOMWrapper from '../../../scripts/core/DOMWrapper.mjs';

const DELAY_AGENTCHANGE = 500;
const DELAY_STAGECHANGE = 250;
const PNG_RESOLUTION = 4;

const PARAM_PATTERN = /\{[^}]+\}/g;

function addNewline(value) {
	if(value.length > 0 && value.charAt(value.length - 1) !== '\n') {
		return value + '\n';
	}
	return value;
}

function findPos(content, index) {
	let p = 0;
	let line = 0;
	for(;;) {
		const nextLn = content.indexOf('\n', p) + 1;
		if(index < nextLn || nextLn === 0) {
			return {ch: index - p, line};
		}
		p = nextLn;
		++ line;
	}
}

function cmInRange(pos, {from, to}) {
	return !(
		pos.line < from.line || (pos.line === from.line && pos.ch < from.ch) ||
		pos.line > to.line || (pos.line === to.line && pos.ch > to.ch)
	);
}

function findNextToken(block, skip) {
	PARAM_PATTERN.lastIndex = 0;
	for(let m = null; (m = PARAM_PATTERN.exec(block));) {
		if(!skip.includes(m[0])) {
			return m[0];
		}
	}
	return null;
}

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

function toCappedFixed(v, cap) {
	const s = v.toString();
	const p = s.indexOf('.');
	if(p === -1 || s.length - p - 1 <= cap) {
		return s;
	}
	return v.toFixed(cap);
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

/* eslint-disable complexity */
function makeURL(code, {height, width, zoom}) {
	/* eslint-enable complexity */
	const uri = code
		.split('\n')
		.map(encodeURIComponent)
		.filter((ln) => ln !== '')
		.join('/');

	let opts = '';
	if(!Number.isNaN(width) || !Number.isNaN(height)) {
		if(!Number.isNaN(width)) {
			opts += 'w' + toCappedFixed(Math.max(width, 0), 4);
		}
		if(!Number.isNaN(height)) {
			opts += 'h' + toCappedFixed(Math.max(height, 0), 4);
		}
		opts += '/';
	} else if(!Number.isNaN(zoom) && zoom !== 1) {
		opts += 'z' + toCappedFixed(Math.max(zoom, 0), 4);
		opts += '/';
	}

	return opts + uri + '.svg';
}

function makeSplit(nodes, options) {
	const filteredNodes = [];
	const filteredOpts = {
		direction: options.direction,
		minSize: [],
		sizes: [],
		snapOffset: options.snapOffset,
	};

	let total = 0;
	for(let i = 0; i < nodes.length; ++ i) {
		if(nodes[i]) {
			filteredNodes.push(nodes[i]);
			filteredOpts.minSize.push(options.minSize[i]);
			filteredOpts.sizes.push(options.sizes[i]);
			total += options.sizes[i];
		}
	}
	for(let i = 0; i < filteredNodes.length; ++ i) {
		filteredOpts.minSize[i] *= 100 / total;
		filteredOpts.sizes[i] *= 100 / total;

		const percent = filteredOpts.sizes[i] + '%';
		if(filteredOpts.direction === 'vertical') {
			nodes[i].styles({
				boxSizing: 'border-box',
				height: percent,
				width: '100%',
			});
		} else {
			nodes[i].styles({
				boxSizing: 'border-box',
				display: 'inline-block',
				height: '100%',
				verticalAlign: 'top', // Safari fix
				width: percent,
			});
		}
	}

	if(filteredNodes.length < 2) {
		return;
	}

	// Load on demand for progressive enhancement
	// (failure to load external module will not block functionality)
	options.require(['split'], (Split) => {
		// Patches for:
		// https://github.com/nathancahill/Split.js/issues/97
		// https://github.com/nathancahill/Split.js/issues/111
		const parent = nodes[0].element.parentNode;
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
		const cursor = (filteredOpts.direction === 'vertical') ?
			'row-resize' : 'col-resize';

		return new Split(
			filteredNodes.map((node) => node.element),
			Object.assign({
				cursor,
				direction: 'vertical',
				gutterSize: 0,
				onDragEnd: () => {
					document.body.style.cursor = oldCursor;
					oldCursor = null;
				},
				onDragStart: () => {
					oldCursor = document.body.style.cursor;
					document.body.style.cursor = cursor;
				},
			}, filteredOpts)
		);
	});
}

DOMWrapper.WrappedElement.prototype.split = function(nodes, options) {
	this.add(nodes);
	makeSplit(nodes, options);
	return this;
};

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
	const [item] = items;
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

DOMWrapper.WrappedElement.prototype.fastClick = function() {
	const pt = {x: -1, y: 0};
	return this
		.on('touchstart', (e) => {
			const [touch] = e.touches;
			pt.x = touch.pageX;
			pt.y = touch.pageY;
		}, {passive: true})
		.on('touchend', (e) => {
			if(
				pt.x === -1 ||
				e.touches.length !== 0 ||
				e.changedTouches.length !== 1
			) {
				pt.x = -1;
				return;
			}
			const [touch] = e.changedTouches;
			if(
				Math.abs(pt.x - touch.pageX) < 10 &&
				Math.abs(pt.y - touch.pageY) < 10
			) {
				e.preventDefault();
				e.target.click();
			}
			pt.x = -1;
		});
};

export default class Interface {
	constructor({
		sequenceDiagram,
		defaultCode = '',
		localStorage = '',
		library = [],
		links = [],
		require = null,
		touchUI = false,
	}) {
		this.diagram = sequenceDiagram;
		this.defaultCode = defaultCode;
		this.localStorage = localStorage;
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
				this.pngDirty = true;
			})
			.on('mouseover', (element) => {
				if(this.marker) {
					this.marker.clear();
				}
				if(typeof element.ln !== 'undefined' && this.code.markText) {
					this.marker = this.code.markText(
						{ch: 0, line: element.ln},
						{ch: 0, line: element.ln + 1},
						{
							className: 'hover',
							clearOnEnter: true,
							inclusiveLeft: false,
							inclusiveRight: false,
						}
					);
				}
			})
			.on('mouseout', () => {
				if(this.marker) {
					this.marker.clear();
					this.marker = null;
				}
			})
			.on('click', (element) => {
				if(this.marker) {
					this.marker.clear();
					this.marker = null;
				}
				if(
					typeof element.ln !== 'undefined' &&
					this.code.setSelection
				) {
					this.code.setSelection(
						{ch: 0, line: element.ln},
						{ch: 0, line: element.ln + 1},
						{bias: -1, origin: '+focus'}
					);
					this.code.focus();
				}
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

		const urlOpts = this.dom.el('div').setClass('config').add(
			this.dom.el('label').add('width ', this.urlWidth),
			', ',
			this.dom.el('label').add('height ', this.urlHeight),
			this.dom.el('span').setClass('or').add('or'),
			this.dom.el('label').add('zoom ', this.urlZoom),
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

		this.renderService = '';
		const relativePath = 'render/';
		fetchResource(relativePath)
			.then((response) => response.text())
			.then((content) => {
				let path = content.trim();
				if(!path || path.startsWith('<svg')) {
					path = relativePath;
				}
				this.renderService = new URL(path, window.location.href).href;
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
		this.urlOutput.val(this.renderService + makeURL(this.value(), {
			height: Number.parseFloat(this.urlHeight.element.value),
			width: Number.parseFloat(this.urlWidth.element.value),
			zoom: Number.parseFloat(this.urlZoom.element.value || '1'),
		}));
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
				.on('click', this.addCodeBlock.bind(this, lib.code))
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
		this.code = this.dom.el('textarea')
			.setClass('editor-simple')
			.val(this.loadCode() || this.defaultCode)
			.on('input', () => this.update(false));

		return this.dom.el('div').setClass('pane-code')
			.add(this.code);
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

		const links = this.links.map((link) => this.dom.el('a')
			.attrs({'href': link.href, 'target': '_blank'})
			.text(this.touchUI ? link.touchLabel : link.label));

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

		this._enhanceEditor();
	}

	enterParams(start, end, block) {
		const doc = this.code.getDoc();
		const endBookmark = doc.setBookmark(end);
		const done = [];

		const keydown = (cm, event) => {
			switch(event.keyCode) {
			case 13:
			case 9:
				event.preventDefault();
				this.advanceParams();
				break;
			case 27:
				event.preventDefault();
				this.cancelParams();
				break;
			}
		};

		const move = () => {
			if(this.paramMarkers.length === 0) {
				return;
			}
			const m = this.paramMarkers[0].find();
			const [r] = doc.listSelections();
			if(!cmInRange(r.anchor, m) || !cmInRange(r.head, m)) {
				this.cancelParams();
				this.code.setSelection(r.anchor, r.head);
			}
		};

		this.paramMarkers = [];
		this.cancelParams = () => {
			this.code.off('keydown', keydown);
			this.code.off('cursorActivity', move);
			this.paramMarkers.forEach((m) => m.clear());
			this.paramMarkers = null;
			endBookmark.clear();
			this.code.setCursor(end);
			this.cancelParams = null;
			this.advanceParams = null;
		};
		this.advanceParams = () => {
			this.paramMarkers.forEach((m) => m.clear());
			this.paramMarkers.length = 0;
			this.nextParams(start, endBookmark, block, done);
		};

		this.code.on('keydown', keydown);
		this.code.on('cursorActivity', move);

		this.advanceParams();
	}

	nextParams(start, endBookmark, block, done) {
		const tok = findNextToken(block, done);
		if(!tok) {
			this.cancelParams();
			return;
		}
		done.push(tok);

		const doc = this.code.getDoc();
		const ranges = [];
		let {ch} = start;
		for(let ln = start.line; ln < endBookmark.find().line; ++ ln) {
			const line = doc.getLine(ln).slice(ch);
			for(let p = 0; (p = line.indexOf(tok, p)) !== -1; p += tok.length) {
				const anchor = {ch: p, line: ln};
				const head = {ch: p + tok.length, line: ln};
				ranges.push({anchor, head});
				this.paramMarkers.push(doc.markText(anchor, head, {
					className: 'param',
					clearWhenEmpty: false,
					inclusiveLeft: true,
					inclusiveRight: true,
				}));
			}
			ch = 0;
		}

		if(ranges.length > 0) {
			doc.setSelections(ranges, 0);
		} else {
			this.cancelParams();
		}
	}

	addCodeBlock(block) {
		const lines = block.split('\n').length;

		if(this.code.getCursor) {
			const cur = this.code.getCursor('head');
			const pos = {ch: 0, line: cur.line + ((cur.ch > 0) ? 1 : 0)};
			let replaced = addNewline(block);
			if(pos.line >= this.code.lineCount()) {
				replaced = '\n' + replaced;
			}
			this.code.replaceRange(replaced, pos, null, 'library');
			const end = {ch: 0, line: pos.line + lines};
			this.enterParams(pos, end, block);
		} else {
			const value = this.value();
			const cur = this.code.element.selectionStart;
			const pos = ('\n' + value + '\n').indexOf('\n', cur);
			const replaced = (
				addNewline(value.substr(0, pos)) +
				addNewline(block)
			);
			this.code
				.val(replaced + value.substr(pos))
				.select(replaced.length);
			this.update(false);
		}

		this.code.focus();
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

	saveCode(src) {
		if(!this.localStorage) {
			return;
		}
		try {
			window.localStorage.setItem(this.localStorage, src);
		} catch(ignore) {
			// Ignore
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
			this.errorMsg.text(error.message);
		} else {
			this.errorMsg.text(error);
		}
		this.errorMsg.addClass('error');
	}

	markOK() {
		this.errorMsg.text('').delClass('error');
	}

	value() {
		if(this.code.getDoc) {
			return this.code.getDoc().getValue();
		} else {
			return this.code.element.value;
		}
	}

	setValue(code) {
		if(this.code.getDoc) {
			const doc = this.code.getDoc();
			doc.setValue(code);
			doc.clearHistory();
		} else {
			this.code.val(code);
		}
		this.diagram.expandAll({render: false});
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
		this._hideURLBuilder();
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

	_enhanceEditor() {
		// Load on demand for progressive enhancement
		// (failure to load external module will not block functionality)
		this.require([
			'cm/lib/codemirror',
			'cm/addon/hint/show-hint',
			'cm/addon/edit/trailingspace',
			'cm/addon/comment/comment',
		], (CodeMirror) => {
			this.diagram.registerCodeMirrorMode(CodeMirror);

			const selBegin = this.code.element.selectionStart;
			const selEnd = this.code.element.selectionEnd;
			const val = this.code.element.value;
			const focussed = this.code.focussed();

			const code = new CodeMirror(this.code.element.parentNode, {
				extraKeys: {
					'Cmd-/': (cm) => cm.toggleComment({padding: ''}),
					'Cmd-Enter': 'autocomplete',
					'Ctrl-/': (cm) => cm.toggleComment({padding: ''}),
					'Ctrl-Enter': 'autocomplete',
					'Ctrl-Space': 'autocomplete',
					'Shift-Tab': (cm) => cm.execCommand('indentLess'),
					'Tab': (cm) => cm.execCommand('indentMore'),
				},
				globals: {
					themes: this.diagram.getThemeNames(),
				},
				lineNumbers: true,
				mode: 'sequence',
				showTrailingSpace: true,
				value: val,
			});
			this.code.detach();
			code.getDoc().setSelection(
				findPos(val, selBegin),
				findPos(val, selEnd)
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

			code.on('focus', () => this._hideURLBuilder());

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
}
