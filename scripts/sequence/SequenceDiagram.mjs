import {Factory as BasicThemeFactory} from './themes/Basic.mjs';
import {Factory as ChunkyThemeFactory} from './themes/Chunky.mjs';
import EventObject from '../core/EventObject.mjs';
import Exporter from './exporter/Exporter.mjs';
import Generator from './generator/Generator.mjs';
import {Factory as MonospaceThemeFactory} from './themes/Monospace.mjs';
import Parser from './parser/Parser.mjs';
import Renderer from './renderer/Renderer.mjs';
import {Factory as SketchThemeFactory} from './themes/Sketch.mjs';
import {getHints} from './codemirror/hints.mjs';

const themes = [
	new BasicThemeFactory(),
	new MonospaceThemeFactory(),
	new ChunkyThemeFactory(),
	new SketchThemeFactory(SketchThemeFactory.RIGHT),
	new SketchThemeFactory(SketchThemeFactory.LEFT),
];

const SharedParser = new Parser();
const SharedGenerator = new Generator();
const CMMode = SharedParser.getCodeMirrorMode();

function registerCodeMirrorMode(CodeMirror, modeName = 'sequence') {
	const cm = CodeMirror || globalThis.CodeMirror;
	cm.defineMode(modeName, () => CMMode);
	cm.registerHelper('hint', modeName, getHints);
}

function addTheme(theme) {
	themes.push(theme);
}

function extractCodeFromSVG(svg) {
	const dom = new DOMParser().parseFromString(svg, 'image/svg+xml');
	const meta = dom.querySelector('metadata');
	if(!meta) {
		return '';
	}
	return meta.textContent;
}

function renderAll(diagrams) {
	const errors = [];
	function storeError(sd, e) {
		errors.push(e);
	}

	diagrams.forEach((diagram) => {
		diagram.addEventListener('error', storeError);
		diagram.optimisedRenderPreReflow();
	});
	diagrams.forEach((diagram) => {
		diagram.optimisedRenderReflow();
	});
	diagrams.forEach((diagram) => {
		diagram.optimisedRenderPostReflow();
		diagram.removeEventListener('error', storeError);
	});

	if(errors.length > 0) {
		throw errors;
	}
}

function pickDocument(container) {
	if(container) {
		return container.ownerDocument || null;
	} else if(typeof window === 'undefined') {
		return null;
	} else {
		return window.document;
	}
}

export default class SequenceDiagram extends EventObject {
	/* eslint-disable-next-line complexity */ // Just some defaults
	constructor(code = null, options = {}) {
		super();

		let opts = null;
		if(code && typeof code === 'object') {
			opts = code;
			this.code = opts.code;
		} else {
			opts = options;
			this.code = code;
		}

		Object.assign(this, {
			exporter: new Exporter(),
			generator: SharedGenerator,
			isInteractive: false,
			latestProcessed: null,
			latestTitle: '',
			parser: SharedParser,
			registerCodeMirrorMode,
			renderer: new Renderer(Object.assign({
				document: pickDocument(opts.container),
				themes,
			}, opts)),
			textSizerFactory: opts.textSizerFactory || null,
		});

		this.renderer.addEventForwarding(this);

		if(opts.container) {
			opts.container.appendChild(this.dom());
		}
		if(opts.interactive) {
			this.addInteractivity();
		}
		if(typeof this.code === 'string' && opts.render !== false) {
			this.render();
		}
	}

	clone(options = {}) {
		const reference = (options.container || this.renderer.dom());

		return new SequenceDiagram(Object.assign({
			code: this.code,
			components: this.renderer.components,
			container: null,
			document: reference.ownerDocument,
			interactive: this.isInteractive,
			namespace: null,
			textSizerFactory: this.textSizerFactory,
			themes: this.renderer.getThemes(),
		}, options));
	}

	set(code = '', {render = true} = {}) {
		if(this.code === code) {
			return;
		}

		this.code = code;
		if(render) {
			this.render();
		}
	}

	process(code) {
		const parsed = this.parser.parse(code);
		return this.generator.generate(parsed);
	}

	addTheme(theme) {
		this.renderer.addTheme(theme);
	}

	setHighlight(line) {
		this.renderer.setHighlight(line);
	}

	isCollapsed(line) {
		return this.renderer.isCollapsed(line);
	}

	setCollapsed(line, collapsed = true, {render = true} = {}) {
		if(!this.renderer.setCollapsed(line, collapsed)) {
			return false;
		}
		if(render && this.latestProcessed) {
			this.render(this.latestProcessed);
		}
		return true;
	}

	collapse(line, options) {
		return this.setCollapsed(line, true, options);
	}

	expand(line, options) {
		return this.setCollapsed(line, false, options);
	}

	toggleCollapsed(line, options) {
		return this.setCollapsed(line, !this.isCollapsed(line), options);
	}

	expandAll(options) {
		return this.setCollapsed(null, false, options);
	}

	getThemeNames() {
		return this.renderer.getThemeNames();
	}

	getThemes() {
		return this.renderer.getThemes();
	}

	_updateSize({width = null, height = null, zoom = null}) {
		if(width !== null) {
			if(height === null) {
				this.renderer.height *= width / this.renderer.width;
			} else {
				this.renderer.height = height;
			}
			this.renderer.width = width;
		} else if(height !== null) {
			this.renderer.width *= height / this.renderer.height;
			this.renderer.height = height;
		} else if(zoom !== null) {
			this.renderer.width *= zoom;
			this.renderer.height *= zoom;
		}
	}

	getSVGCodeSynchronous({size = {}} = {}) {
		this._updateSize(size);
		return this.exporter.getSVGContent(this.renderer);
	}

	getSVGCode(options) {
		return Promise.resolve(this.getSVGCodeSynchronous(options));
	}

	getSVGSynchronous({size = {}} = {}) {
		this._updateSize(size);
		return this.exporter.getSVGURL(this.renderer);
	}

	getSVG({size = {}} = {}) {
		this._updateSize(size);
		return Promise.resolve({
			latest: true,
			url: this.getSVGSynchronous(),
		});
	}

	getCanvas({resolution = 1, size = {}} = {}) {
		this._updateSize(size);
		return new Promise((resolve) => {
			this.exporter.getCanvas(this.renderer, resolution, resolve);
		});
	}

	getPNG({resolution = 1, size = {}} = {}) {
		this._updateSize(size);
		return new Promise((resolve) => {
			this.exporter.getPNGURL(
				this.renderer,
				resolution,
				(url, latest) => {
					resolve({latest, url});
				},
			);
		});
	}

	getSize() {
		return {
			height: this.renderer.height,
			width: this.renderer.width,
		};
	}

	getTitle() {
		return this.latestTitle;
	}

	_revertParent(state) {
		const dom = this.renderer.dom();
		if(dom.parentNode !== state.originalParent) {
			dom.parentNode.removeChild(dom);
			if(state.originalParent) {
				state.originalParent.appendChild(dom);
			}
		}
	}

	_sendRenderError(e) {
		this._revertParent(this.renderState);
		this.renderState.error = true;
		this.trigger('error', [this, e]);
	}

	optimisedRenderPreReflow(processed = null) {
		const dom = this.renderer.dom();
		this.renderState = {
			error: false,
			originalParent: dom.parentNode,
			processed,
		};
		const state = this.renderState;

		if(!dom.isConnected) {
			if(state.originalParent) {
				state.originalParent.removeChild(dom);
			}
			dom.ownerDocument.body.appendChild(dom);
		}

		try {
			if(!state.processed) {
				state.processed = this.process(this.code);
			}
			const titleParts = state.processed.meta.title || [];
			this.latestTitle = titleParts
				.map((ln) => ln.map((p) => p.text).join(''))
				.join(' ');
			this.renderer.optimisedRenderPreReflow(state.processed);
		} catch(e) {
			this._sendRenderError(e);
		}
	}

	optimisedRenderReflow() {
		try {
			if(!this.renderState.error) {
				this.renderer.optimisedRenderReflow();
			}
		} catch(e) {
			this._sendRenderError(e);
		}
	}

	optimisedRenderPostReflow() {
		const state = this.renderState;

		try {
			if(!state.error) {
				this.renderer.optimisedRenderPostReflow(state.processed);
			}
		} catch(e) {
			this._sendRenderError(e);
		}

		this.renderState = null;

		if(!state.error) {
			this._revertParent(state);
			this.latestProcessed = state.processed;
			this.trigger('render', [this]);
		}
	}

	render(processed = null) {
		let latestError = null;
		function storeError(sd, e) {
			latestError = e;
		}
		this.addEventListener('error', storeError);

		this.optimisedRenderPreReflow(processed);
		this.optimisedRenderReflow();
		this.optimisedRenderPostReflow();

		this.removeEventListener('error', storeError);
		if(latestError) {
			throw latestError;
		}
	}

	setContainer(node = null) {
		const dom = this.dom();
		if(dom.parentNode) {
			dom.parentNode.removeChild(dom);
		}
		if(node) {
			node.appendChild(dom);
		}
	}

	addInteractivity() {
		if(this.isInteractive) {
			return;
		}
		this.isInteractive = true;

		this.addEventListener('click', (element) => {
			this.toggleCollapsed(element.ln);
		});
	}

	extractCodeFromSVG(svg) {
		return extractCodeFromSVG(svg);
	}

	renderAll(diagrams) {
		return renderAll(diagrams);
	}

	dom() {
		return this.renderer.dom();
	}
}

function datasetBoolean(value) {
	return typeof value !== 'undefined' && value !== 'false';
}

function parseTagOptions(element) {
	return {
		interactive: datasetBoolean(element.dataset.sdInteractive),
		namespace: element.dataset.sdNamespace || null,
	};
}

function convertOne(element, code = null, options = {}) {
	if(element.tagName === 'svg') {
		return null;
	}

	const tagOptions = parseTagOptions(element);

	const diagram = new SequenceDiagram(
		(code === null) ? element.textContent : code,
		Object.assign(tagOptions, options),
	);
	const newElement = diagram.dom();
	const attrs = element.attributes;
	for(let i = 0; i < attrs.length; ++ i) {
		newElement.setAttribute(
			attrs[i].nodeName,
			attrs[i].nodeValue,
		);
	}
	element.parentNode.replaceChild(newElement, element);
	return diagram;
}

function convert(elements, code = null, options = {}) {
	let c = null;
	let opts = null;
	if(code && typeof code === 'object') {
		opts = code;
		c = opts.code;
	} else {
		opts = options;
		c = code;
	}

	if(Array.isArray(elements)) {
		const nodrawOpts = Object.assign({}, opts, {render: false});
		const diagrams = elements
			.map((el) => convertOne(el, c, nodrawOpts))
			.filter((diagram) => (diagram !== null));
		if(opts.render !== false) {
			renderAll(diagrams);
		}
		return diagrams;
	} else {
		return convertOne(elements, c, opts);
	}
}

function convertAll(root = null, className = 'sequence-diagram') {
	let r = null;
	let cls = null;
	if(typeof root === 'string') {
		r = null;
		cls = root;
	} else {
		r = root;
		cls = className;
	}

	let elements = null;
	if(r && typeof r.length !== 'undefined') {
		elements = r;
	} else {
		elements = (r || window.document).getElementsByClassName(cls);
	}

	// Convert from "live" collection to static to avoid infinite loops:
	const els = [];
	for(let i = 0; i < elements.length; ++ i) {
		els.push(elements[i]);
	}

	// Convert elements
	convert(els);
}

function getDefaultThemeNames() {
	return themes.map((theme) => theme.name);
}

Object.assign(SequenceDiagram, {
	Exporter,
	Generator,
	Parser,
	Renderer,
	addTheme,
	convert,
	convertAll,
	extractCodeFromSVG,
	getDefaultThemeNames,
	registerCodeMirrorMode,
	renderAll,
	themes,
});
