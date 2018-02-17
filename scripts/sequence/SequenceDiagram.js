/* jshint -W072 */ // Allow several required modules
define([
	'core/EventObject',
	'./Parser',
	'./Generator',
	'./Renderer',
	'./Exporter',
	'./CodeMirrorHints',
	'./themes/BaseTheme',
	'./themes/Basic',
	'./themes/Monospace',
	'./themes/Chunky',
	'./themes/Sketch',
], (
	EventObject,
	Parser,
	Generator,
	Renderer,
	Exporter,
	CMHints,
	BaseTheme,
	BasicTheme,
	MonospaceTheme,
	ChunkyTheme,
	SketchTheme
) => {
	/* jshint +W072 */
	'use strict';

	const themes = [
		new BasicTheme(),
		new MonospaceTheme(),
		new ChunkyTheme(),
		new SketchTheme(SketchTheme.RIGHT),
		new SketchTheme(SketchTheme.LEFT),
	];

	const SharedParser = new Parser();
	const SharedGenerator = new Generator();
	const CMMode = SharedParser.getCodeMirrorMode();

	function registerCodeMirrorMode(CodeMirror, modeName = 'sequence') {
		if(!CodeMirror) {
			CodeMirror = window.CodeMirror;
		}
		CodeMirror.defineMode(modeName, () => CMMode);
		CodeMirror.registerHelper('hint', modeName, CMHints.getHints);
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

	class SequenceDiagram extends EventObject {
		constructor(code = null, options = {}) {
			super();

			if(code && typeof code === 'object') {
				options = code;
				code = options.code;
			}

			this.registerCodeMirrorMode = registerCodeMirrorMode;

			this.code = code;
			this.parser = SharedParser;
			this.generator = SharedGenerator;
			this.renderer = new Renderer(Object.assign({themes}, options));
			this.exporter = new Exporter();
			this.renderer.addEventForwarding(this);
			this.latestProcessed = null;
			this.isInteractive = false;
			if(options.container) {
				options.container.appendChild(this.dom());
			}
			if(options.interactive) {
				this.addInteractivity();
			}
			if(typeof this.code === 'string' && options.render !== false) {
				this.render();
			}
		}

		clone(options = {}) {
			return new SequenceDiagram(Object.assign({
				code: this.code,
				container: null,
				themes: this.renderer.getThemes(),
				namespace: null,
				components: this.renderer.components,
				interactive: this.isInteractive,
				SVGTextBlockClass: this.renderer.SVGTextBlockClass,
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

		getSVGSynchronous() {
			return this.exporter.getSVGURL(this.renderer);
		}

		getSVG() {
			return Promise.resolve({
				url: this.getSVGSynchronous(),
				latest: true,
			});
		}

		getCanvas({resolution = 1, size = null} = {}) {
			if(size) {
				this.renderer.width = size.width;
				this.renderer.height = size.height;
			}
			return new Promise((resolve) => {
				this.exporter.getCanvas(this.renderer, resolution, resolve);
			});
		}

		getPNG({resolution = 1, size = null} = {}) {
			if(size) {
				this.renderer.width = size.width;
				this.renderer.height = size.height;
			}
			return new Promise((resolve) => {
				this.exporter.getPNGURL(
					this.renderer,
					resolution,
					(url, latest) => {
						resolve({url, latest});
					}
				);
			});
		}

		getSize() {
			return {
				width: this.renderer.width,
				height: this.renderer.height,
			};
		}

		_revertParent(state) {
			const dom = this.renderer.svg();
			if(dom.parentNode !== state.originalParent) {
				document.body.removeChild(dom);
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
			const dom = this.renderer.svg();
			this.renderState = {
				originalParent: dom.parentNode,
				processed,
				error: false,
			};
			const state = this.renderState;

			if(!document.body.contains(dom)) {
				if(state.originalParent) {
					state.originalParent.removeChild(dom);
				}
				document.body.appendChild(dom);
			}

			try {
				if(!state.processed) {
					state.processed = this.process(this.code);
				}
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
			return this.renderer.svg();
		}
	}

	function datasetBoolean(value) {
		return value !== undefined && value !== 'false';
	}

	function parseTagOptions(element) {
		return {
			namespace: element.dataset.sdNamespace || null,
			interactive: datasetBoolean(element.dataset.sdInteractive),
		};
	}

	function convertOne(element, code = null, options = {}) {
		if(element.tagName === 'svg') {
			return null;
		}

		if(code === null) {
			code = element.textContent;
		}

		const tagOptions = parseTagOptions(element);

		const diagram = new SequenceDiagram(
			code,
			Object.assign(tagOptions, options)
		);
		const newElement = diagram.dom();
		element.parentNode.insertBefore(newElement, element);
		element.parentNode.removeChild(element);
		const attrs = element.attributes;
		for(let i = 0; i < attrs.length; ++ i) {
			newElement.setAttribute(
				attrs[i].nodeName,
				attrs[i].nodeValue
			);
		}
		return diagram;
	}

	function convert(elements, code = null, options = {}) {
		if(code && typeof code === 'object') {
			options = code;
			code = options.code;
		}

		if(Array.isArray(elements)) {
			const opts = Object.assign({}, options, {render: false});
			const diagrams = elements.map((el) => convertOne(el, code, opts));
			if(options.render !== false) {
				renderAll(diagrams);
			}
			return diagrams;
		} else {
			return convertOne(elements, code, options);
		}
	}

	function convertAll(root = null, className = 'sequence-diagram') {
		if(typeof root === 'string') {
			className = root;
			root = null;
		}
		let elements = null;
		if(root && root.length !== undefined) {
			elements = root;
		} else {
			elements = (root || document).getElementsByClassName(className);
		}

		// Convert from "live" collection to static to avoid infinite loops:
		const els = [];
		for(let i = 0; i < elements.length; ++ i) {
			els.push(elements[i]);
		}

		// Convert elements
		convert(els);
	}

	return Object.assign(SequenceDiagram, {
		Parser,
		Generator,
		Renderer,
		Exporter,
		BaseTheme,
		themes,
		addTheme,
		registerCodeMirrorMode,
		extractCodeFromSVG,
		renderAll,
		convert,
		convertAll,
	});
});
