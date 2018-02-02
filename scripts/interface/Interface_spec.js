defineDescribe('Interface', ['./Interface'], (Interface) => {
	'use strict';

	// Thanks, https://stackoverflow.com/a/23522755/1180785
	const safari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

	const defaultCode = 'my default code';
	let sequenceDiagram = null;
	let container = null;
	let ui = null;

	beforeEach(() => {
		sequenceDiagram = jasmine.createSpyObj('sequenceDiagram', [
			'dom',
			'render',
			'clone',
			'getSize',
			'process',
			'getThemeNames',
			'addEventListener',
			'registerCodeMirrorMode',
			'getSVGSynchronous',
		]);
		sequenceDiagram.process.and.returnValue({
			meta: {},
			agents: [],
			stages: [],
		});
		sequenceDiagram.getSize.and.returnValue({width: 10, height: 20});
		sequenceDiagram.dom.and.returnValue(document.createElement('svg'));
		container = jasmine.createSpyObj('container', [
			'appendChild',
			'addEventListener',
		]);

		ui = new Interface({
			sequenceDiagram,
			defaultCode,
		});
	});

	describe('build', () => {
		it('adds elements to the given container', () => {
			ui.build(container);
			expect(container.appendChild).toHaveBeenCalled();
		});

		it('creates a code mirror instance with the given code', (done) => {
			ui.build(container);
			const check = setInterval(() => {
				const constructorArgs = ui.code.constructor;
				if(!constructorArgs.options) {
					return;
				}
				clearInterval(check);
				expect(constructorArgs.options.value).toEqual(defaultCode);
				done();
			}, 50);
		});
	});

	describe('download SVG', () => {
		it('triggers a download of the current image in SVG format', () => {
			sequenceDiagram.getSVGSynchronous.and.returnValue('mySVGURL');
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
