(function () {
	'use strict';

	var ComponentsLibrary = [
		{
			code: '{Agent1} -> {Agent2}: {Message}',
			title: 'Simple arrow (synchronous)',
		},
		{
			code: '{Agent1} --> {Agent2}: {Message}',
			title: 'Arrow with dotted line (response)',
		},
		{
			code: '{Agent1} ->> {Agent2}: {Message}',
			title: 'Open arrow (asynchronous)',
		},
		{
			code: '{Agent1} -x {Agent2}: {Message}',
			title: 'Lost message',
		},
		{
			code: '{Agent1} ~> {Agent2}: {Message}',
			title: 'Wavy line',
		},
		{
			code: '{Agent1} -> {Agent1}: {Message}',
			title: 'Self-connection',
		},
		{
			code: '{Agent1} -> ...{id}\n...{id} -> {Agent2}: {Message}',
			preview: (
				'begin A, B\n' +
				'A -> ...x\n' +
				'...x -> B: Message'
			),
			title: 'Asynchronous message',
		},
		{
			code: '* -> {Agent1}: {Message}',
			title: 'Found message',
		},
		{
			code: (
				'{Agent1} -> +{Agent2}: {Request}\n' +
				'{Agent1} <-- -{Agent2}: {Response}'
			),
			title: 'Request/response pair',
		},
		{
			code: (
				'{Agent1} -> *{Agent2}: {Request}\n' +
				'{Agent1} <-- !{Agent2}: {Response}'
			),
			title: 'Inline agent creation / destruction',
		},
		{
			code: (
				'{Agent1} -> {Agent2}: {Request}\n' +
				'{Agent1} <-- {Agent2}: {Response}\n' +
				'end {Agent2}'
			),
			preview: (
				'begin A\n' +
				'::\n' +
				'A -> B: Request\n' +
				'A <-- B: Response\n' +
				'end B'
			),
			title: 'Agent creation / destruction',
		},
		{
			code: 'autolabel "[<inc>] <label>"',
			preview: (
				'autolabel "[<inc>] <label>"\n' +
				'A -> B: Foo\n' +
				'A <- B: Bar\n' +
				'A -> B: Baz'
			),
			title: 'Numbered labels',
		},
		{
			code: (
				'if {Condition1}\n' +
				'  {Agent1} -> {Agent2}\n' +
				'else if {Condition2}\n' +
				'  {Agent1} -> {Agent2}\n' +
				'else\n' +
				'  {Agent1} -> {Agent2}\n' +
				'end'
			),
			preview: (
				'begin A, B\n' +
				'if Condition1\n' +
				'  A -> B\n' +
				'else if Condition2\n' +
				'  A -> B\n' +
				'else\n' +
				'  A -> B\n' +
				'end'
			),
			title: 'Conditional blocks',
		},
		{
			code: (
				'repeat {Condition}\n' +
				'  {Agent1} -> {Agent2}\n' +
				'end'
			),
			preview: (
				'begin A, B\n' +
				'repeat Condition\n' +
				'  A -> B\n' +
				'end'
			),
			title: 'Repeated block',
		},
		{
			code: (
				'begin reference: {Label} as {Name}\n' +
				'{Agent1} -> {Name}\n' +
				'end {Name}'
			),
			preview: (
				'begin A\n' +
				'begin reference: "See 1.3" as myRef\n' +
				'A -> myRef\n' +
				'myRef -> A\n' +
				'end myRef'
			),
			title: 'Reference',
		},
		{
			code: (
				'begin reference over {Covered}: {Label} as {Name}\n' +
				'{Agent1} -> {Name}\n' +
				'end {Name}'
			),
			preview: (
				'begin A, B, C\n' +
				'begin reference over B, C: "See 1.3" as myRef\n' +
				'A -> myRef\n' +
				'myRef -> A\n' +
				'end myRef'
			),
			title: 'Reference over agents',
		},
		{
			code: (
				'group {Label}\n' +
				'  {Agent1} -> {Agent2}\n' +
				'end'
			),
			preview: (
				'begin A, B\n' +
				'group Label\n' +
				'  A -> B\n' +
				'end'
			),
			title: 'Group',
		},
		{
			code: 'note over {Agent1}: {Message}',
			title: 'Note over agent',
		},
		{
			code: 'note over {Agent1}, {Agent2}: {Message}',
			title: 'Note over multiple agents',
		},
		{
			code: 'note left of {Agent1}: {Message}',
			title: 'Note left of agent',
		},
		{
			code: 'note right of {Agent1}: {Message}',
			title: 'Note right of agent',
		},
		{
			code: 'note between {Agent1}, {Agent2}: {Message}',
			title: 'Note between agents',
		},
		{
			code: 'state over {Agent1}: {State}',
			title: 'State over agent',
		},
		{
			code: '[ -> {Agent1}: {Message1}\n{Agent1} -> ]: {Message2}',
			title: 'Arrows to/from the sides',
		},
		{
			code: 'text right: {Message}',
			preview: (
				'A -> B\n' +
				'simultaneously:\n' +
				'text right: "Message\\non the\\nside"'
			),
			title: 'Text beside the diagram',
		},
		{
			code: 'divider space with height 10: {message}',
			preview: (
				'begin A, B, C, D, E, F\n' +
				'divider space with height 30: message'
			),
			title: 'Vertical space divider',
		},
		{
			code: 'divider line with height 10: {message}',
			preview: (
				'begin A, B, C, D, E, F\n' +
				'divider line with height 30: message'
			),
			title: 'Line divider',
		},
		{
			code: 'divider delay with height 10: {message}',
			preview: (
				'begin A, B, C, D, E, F\n' +
				'divider delay with height 30: message'
			),
			title: 'Delay divider',
		},
		{
			code: 'divider tear with height 10: {message}',
			preview: (
				'begin A, B, C, D, E, F\n' +
				'divider tear with height 30: message'
			),
			title: 'Tear divider',
		},
		{
			code: 'title {Title}',
			preview: 'headers box\ntitle Title\nA -> B',
			title: 'Title',
		},
		{
			code: '**{text}**',
			preview: 'A -> B: **bold**',
			title: 'Bold markdown',
		},
		{
			code: '_{text}_',
			preview: 'A -> B: _italic_',
			title: 'Italic markdown',
		},
		{
			code: '~{text}~',
			preview: 'A -> B: ~strikeout~',
			title: 'Strikeout markdown',
		},
		{
			code: '`{text}`',
			preview: 'A -> B: `mono`',
			title: 'Monospace markdown',
		},
		{
			code: '{Agent} is red',
			preview: 'headers box\nA is red\nbegin A',
			title: 'Red agent line',
		},
		{
			code: '{Agent} is a database',
			preview: 'headers box\nA is a database\nbegin A',
			title: 'Database indicator',
		},
		{
			code: 'theme monospace',
			preview: 'headers box\ntitle mono\ntheme monospace\nA -> B',
			title: 'Monospace theme',
		},
		{
			code: 'theme chunky',
			preview: 'headers box\ntitle chunky\ntheme chunky\nA -> B',
			title: 'Chunky theme',
		},
		{
			code: 'theme sketch',
			preview: 'headers box\ntitle sketch\ntheme sketch\nA -> B',
			title: 'Sketch theme',
		},
		{
			code: 'terminators cross',
			preview: 'begin A\nterminators cross',
			title: 'Cross terminators',
		},
		{
			code: 'terminators fade',
			preview: 'begin A\nterminators fade',
			title: 'Fade terminators',
		},
		{
			code: 'terminators bar',
			preview: 'begin A\nterminators bar',
			title: 'Bar terminators',
		},
		{
			code: 'terminators box',
			preview: 'begin A\nterminators box',
			title: 'Box terminators',
		},
	];

	function make(value, document) {
		if(typeof value === 'string') {
			return document.createTextNode(value);
		} else if(typeof value === 'number') {
			return document.createTextNode(value.toString(10));
		} else if(typeof value === 'object' && value.element) {
			return value.element;
		} else {
			return value;
		}
	}

	function unwrap(node) {
		if(node === null) {
			return null;
		} else if(node.element) {
			return node.element;
		} else {
			return node;
		}
	}

	class WrappedElement {
		constructor(element) {
			this.element = element;
		}

		addBefore(child = null, before = null) {
			if(child === null) {
				return this;
			} else if(Array.isArray(child)) {
				for(const c of child) {
					this.addBefore(c, before);
				}
			} else {
				const childElement = make(child, this.element.ownerDocument);
				this.element.insertBefore(childElement, unwrap(before));
			}
			return this;
		}

		add(...child) {
			return this.addBefore(child, null);
		}

		del(child = null) {
			if(child !== null) {
				this.element.removeChild(unwrap(child));
			}
			return this;
		}

		attr(key, value) {
			this.element.setAttribute(key, value);
			return this;
		}

		attrs(attrs) {
			for(const k in attrs) {
				if(Object.prototype.hasOwnProperty.call(attrs, k)) {
					this.element.setAttribute(k, attrs[k]);
				}
			}
			return this;
		}

		styles(styles) {
			for(const k in styles) {
				if(Object.prototype.hasOwnProperty.call(styles, k)) {
					this.element.style[k] = styles[k];
				}
			}
			return this;
		}

		setClass(cls) {
			return this.attr('class', cls);
		}

		addClass(cls) {
			const classes = this.element.getAttribute('class');
			if(!classes) {
				return this.setClass(cls);
			}
			const list = classes.split(' ');
			if(list.includes(cls)) {
				return this;
			}
			list.push(cls);
			return this.attr('class', list.join(' '));
		}

		delClass(cls) {
			const classes = this.element.getAttribute('class');
			if(!classes) {
				return this;
			}
			const list = classes.split(' ');
			const p = list.indexOf(cls);
			if(p !== -1) {
				list.splice(p, 1);
				this.attr('class', list.join(' '));
			}
			return this;
		}

		text(text) {
			this.element.textContent = text;
			return this;
		}

		on(event, callback, options = {}) {
			if(Array.isArray(event)) {
				for(const e of event) {
					this.on(e, callback, options);
				}
			} else {
				this.element.addEventListener(event, callback, options);
			}
			return this;
		}

		off(event, callback, options = {}) {
			if(Array.isArray(event)) {
				for(const e of event) {
					this.off(e, callback, options);
				}
			} else {
				this.element.removeEventListener(event, callback, options);
			}
			return this;
		}

		val(value) {
			this.element.value = value;
			return this;
		}

		select(start, end = null) {
			this.element.selectionStart = start;
			this.element.selectionEnd = (end === null) ? start : end;
			return this;
		}

		focus() {
			this.element.focus();
			return this;
		}

		focussed() {
			return this.element === this.element.ownerDocument.activeElement;
		}

		empty() {
			while(this.element.childNodes.length > 0) {
				this.element.removeChild(this.element.lastChild);
			}
			return this;
		}

		attach(parent) {
			unwrap(parent).appendChild(this.element);
			return this;
		}

		detach() {
			this.element.parentNode.removeChild(this.element);
			return this;
		}
	}

	class DOMWrapper {
		constructor(document) {
			if(!document) {
				throw new Error('Missing document!');
			}
			this.document = document;
			this.wrap = this.wrap.bind(this);
			this.el = this.el.bind(this);
			this.txt = this.txt.bind(this);
		}

		wrap(element) {
			if(element.element) {
				return element;
			} else {
				return new WrappedElement(element);
			}
		}

		el(tag, namespace = null) {
			let element = null;
			if(namespace === null) {
				element = this.document.createElement(tag);
			} else {
				element = this.document.createElementNS(namespace, tag);
			}
			return new WrappedElement(element);
		}

		txt(content = '') {
			return this.document.createTextNode(content);
		}
	}

	/* eslint-disable max-lines */

	const DELAY_AGENTCHANGE = 500;
	const DELAY_STAGECHANGE = 250;
	const PNG_RESOLUTION = 4;

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

	function makeSplit(require, nodes, options) {
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
				cursor: (options.direction === 'vertical') ?
					'row-resize' : 'col-resize',
				direction: 'vertical',
				gutterSize: 0,
				onDragEnd: () => {
					document.body.style.cursor = oldCursor;
					oldCursor = null;
				},
				onDragStart: () => {
					oldCursor = document.body.style.cursor;
					document.body.style.cursor = resolvedOptions.cursor;
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

	class Interface {
		constructor({
			sequenceDiagram,
			defaultCode = '',
			localStorage = '',
			library = [],
			links = [],
			require = null,
		}) {
			this.diagram = sequenceDiagram;
			this.defaultCode = defaultCode;
			this.localStorage = localStorage;
			this.library = library;
			this.links = links;
			this.minScale = 1.5;
			this.require = require || (() => null);

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
			this._showDropStyle = this._showDropStyle.bind(this);
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
				.add('\uD83D\uDCCB')
				.attr('title', 'Copy to clipboard')
				.on('click', () => {
					this.urlOutput
						.focus()
						.select(0, this.urlOutput.element.value.length)
						.element.ownerDocument.execCommand('copy');
					copy.focus();
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

			this.urlBuilder = this.dom.el('div').setClass('urlbuilder')
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
					this.urlBuilder.empty().add(urlOpts);
					this._refreshURL();
				})
				.catch(() => {
					this.urlBuilder.empty().add(
						this.dom.el('div').setClass('message')
							.add('No online rendering service available.')
					);
				});

			return this.urlBuilder;
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
			this.urlBuilder.styles({
				'display': 'block',
				'height': '0px',
				'padding': '0px',
				'width': this.optsHold.element.clientWidth + 'px',
			});
			clearTimeout(this.builderTm);
			this.builderTm = setTimeout(() => {
				this.urlBuilder.styles({
					'height': '150px',
					'padding': '10px',
					'width': '400px',
				});
				this.optsHold.styles({
					'box-shadow': '10px 10px 25px 12px rgba(0,0,0,0.3)',
				});
			}, 0);

			this._refreshURL();
		}

		_hideURLBuilder() {
			if(!this.builderVisible) {
				return;
			}
			this.builderVisible = false;
			this.urlBuilder.styles({
				'height': '0px',
				'padding': '0px',
				'width': '0px',
			});
			this.optsHold.styles({
				'box-shadow': 'none',
			});
			clearTimeout(this.builderTm);
			this.builderTm = setTimeout(() => {
				this.urlBuilder.styles({'display': 'none'});
			}, 200);
		}

		buildOptionsDownloads() {
			this.downloadPNG = this.dom.el('a')
				.text('Download PNG')
				.attrs({
					'download': 'SequenceDiagram.png',
					'href': '#',
				})
				.on(['focus', 'mouseover', 'mousedown'], this._downloadPNGFocus)
				.on('click', this._downloadPNGClick);

			this.downloadSVG = this.dom.el('a')
				.text('SVG')
				.attrs({
					'download': 'SequenceDiagram.svg',
					'href': '#',
				})
				.on('click', this._downloadSVGClick);

			this.downloadURL = this.dom.el('a')
				.text('URL')
				.attrs({'href': '#'})
				.on('click', this._downloadURLClick);

			this.optsHold = this.dom.el('div').setClass('options downloads').add(
				this.downloadPNG,
				this.downloadSVG,
				this.downloadURL,
				this.buildURLBuilder()
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

		buildViewPane() {
			this.viewPaneInner = this.dom.el('div').setClass('pane-view-inner')
				.add(this.diagram.dom())
				.on('click', () => this._hideURLBuilder());

			this.errorMsg = this.dom.el('div').setClass('msg-error');

			return this.dom.el('div').setClass('pane-view')
				.add(
					this.dom.el('div').setClass('pane-view-scroller')
						.add(this.viewPaneInner),
					this.errorMsg
				);
		}

		buildLeftPanes() {
			const container = this.dom.el('div').setClass('pane-side');

			this.code = this.dom.el('textarea')
				.setClass('editor-simple')
				.val(this.loadCode() || this.defaultCode)
				.on('input', () => this.update(false));

			const codePane = this.dom.el('div').setClass('pane-code')
				.add(this.code)
				.attach(container);

			if(this.library.length > 0) {
				const libPane = this.dom.el('div').setClass('pane-library')
					.add(this.dom.el('div').setClass('pane-library-scroller')
						.add(this.buildLibrary(
							this.dom.el('div').setClass('pane-library-inner')
						)))
					.attach(container);

				makeSplit(this.require, [codePane.element, libPane.element], {
					direction: 'vertical',
					minSize: [100, 5],
					sizes: [70, 30],
					snapOffset: 5,
				});
			}

			return container;
		}

		build(container) {
			this.dom = new DOMWrapper(container.ownerDocument);
			const lPane = this.buildLeftPanes();
			const viewPane = this.buildViewPane();

			this.container = this.dom.wrap(container)
				.add(this.dom.el('div').setClass('pane-hold')
					.add(
						lPane,
						viewPane,
						this.dom.el('div').setClass('options links')
							.add(this.links.map((link) => this.dom.el('a')
								.attrs({'href': link.href, 'target': '_blank'})
								.text(link.label))),
						this.buildOptionsDownloads()
					))
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
				});

			makeSplit(this.require, [lPane.element, viewPane.element], {
				direction: 'horizontal',
				minSize: [10, 10],
				sizes: [30, 70],
				snapOffset: 70,
			});

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

		addCodeBlock(block) {
			const lines = block.split('\n').length;

			if(this.code.getCursor) {
				const cur = this.code.getCursor('head');
				const pos = {ch: 0, line: cur.line + ((cur.ch > 0) ? 1 : 0)};
				this.code.replaceRange(
					addNewline(block),
					pos,
					null,
					'library'
				);
				this.code.setCursor({ch: 0, line: pos.line + lines});
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

	var SequenceDiagram = window.SequenceDiagram;

	const require = window.requirejs;

	const paths = {};
	const hashes = {};
	const metaTags = window.document.getElementsByTagName('meta');

	for(let i = 0; i < metaTags.length; ++ i) {
		const metaTag = metaTags[i];
		const name = metaTag.getAttribute('name');
		if(name && name.startsWith('cdn-')) {
			const module = name.substr('cdn-'.length);
			let src = metaTag.getAttribute('content');
			if(src.endsWith('.mjs')) {
				src = src.substr(0, src.length - '.mjs'.length);
			} else if(src.endsWith('.js')) {
				src = src.substr(0, src.length - '.js'.length);
			}
			paths[module] = src;
			const integrity = metaTag.getAttribute('data-integrity');
			if(integrity) {
				hashes[module] = integrity;
			}
		}
	}

	require.config({
		hashes,
		onNodeCreated: (node, config, module) => {
			if(config.hashes[module]) {
				// Thanks, https://stackoverflow.com/a/37065379/1180785
				node.setAttribute('integrity', config.hashes[module]);
				node.setAttribute('crossorigin', 'anonymous');
			}
		},
		paths,
	});

	const defaultCode = (
		'title Labyrinth\n' +
		'\n' +
		'Bowie -> Goblin: You remind me of the babe\n' +
		'Goblin -> Bowie: What babe?\n' +
		'Bowie -> Goblin: The babe with the power\n' +
		'Goblin -> Bowie: What power?\n' +
		'note right of Bowie, Goblin: Most people get muddled here!\n' +
		'Bowie -> Goblin: "The power of voodoo"\n' +
		'Goblin -> Bowie: "Who-do?"\n' +
		'Bowie -> Goblin: You do!\n' +
		'Goblin -> Bowie: Do what?\n' +
		'Bowie -> Goblin: Remind me of the babe!\n' +
		'\n' +
		'Bowie -> Audience: Sings\n' +
		'\n' +
		'terminators box\n'
	);

	window.addEventListener('load', () => {
		const loader = window.document.getElementById('loader');
		const [nav] = loader.getElementsByTagName('nav');
		const linkElements = nav.getElementsByTagName('a');
		const links = [];
		for(let i = 0; i < linkElements.length; ++ i) {
			links.push({
				href: linkElements[i].getAttribute('href'),
				label: linkElements[i].textContent,
			});
		}

		const ui = new Interface({
			defaultCode,
			library: ComponentsLibrary,
			links,
			localStorage: 'src',
			require,
			sequenceDiagram: new SequenceDiagram(),
		});
		loader.parentNode.removeChild(loader);
		ui.build(window.document.body);
	});

}());
