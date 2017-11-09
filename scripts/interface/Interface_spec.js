defineDescribe('Interface', ['./Interface'], (Interface) => {
	'use strict';

	// Thanks, https://stackoverflow.com/a/23522755/1180785
	const safari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

	let parser = null;
	let generator = null;
	let renderer = null;
	let exporter = null;
	let container = null;
	let ui = null;

	beforeEach(() => {
		parser = jasmine.createSpyObj('parser', [
			'parse',
			'getCodeMirrorMode',
			'getCodeMirrorHints',
		]);
		parser.parse.and.returnValue({
			meta: {},
			stages: [],
		});
		generator = jasmine.createSpyObj('generator', ['generate']);
		generator.generate.and.returnValue({
			meta: {},
			agents: [],
			stages: [],
		});
		renderer = jasmine.createSpyObj('renderer', [
			'render',
			'svg',
			'getThemeNames',
		]);
		renderer.svg.and.returnValue(document.createElement('svg'));
		container = jasmine.createSpyObj('container', ['appendChild']);
		exporter = jasmine.createSpyObj('exporter', ['getSVGURL']);

		ui = new Interface({
			parser,
			generator,
			renderer,
			exporter,
			defaultCode: 'my default code',
		});
	});

	describe('build', () => {
		it('adds elements to the given container', () => {
			ui.build(container);
			expect(container.appendChild).toHaveBeenCalled();
		});

		it('creates a code mirror instance with the given code', () => {
			ui.build(container);
			const constructorArgs = ui.code.constructor;
			expect(constructorArgs.options.value).toEqual('my default code');
		});
	});

	describe('download SVG', () => {
		it('triggers a download of the current image in SVG format', () => {
			exporter.getSVGURL.and.returnValue('mySVGURL');
			ui.build(container);

			expect(ui.downloadSVG.getAttribute('href')).toEqual('#');
			if(safari) {
				// Safari actually starts a download if we do this, which
				// doesn't seem to fit its usual security vibe
				return;
			}
			ui.downloadSVG.dispatchEvent(new Event('click'));
			expect(ui.downloadSVG.getAttribute('href')).toEqual('mySVGURL');
		});
	});
});
