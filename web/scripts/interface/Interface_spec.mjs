import {Event, VirtualDocument} from '../../../spec/stubs/TestDOM.mjs';
import Interface from './Interface.mjs';

function makeFakeCodeMirror() {
	function CodeMirror(container, options) {
		/* eslint-disable jasmine/no-unsafe-spy */ // Whole object is a spy
		const spy = jasmine.createSpyObj('CodeMirror', ['on']);
		spy.constructor = {
			container,
			options,
		};
		spy.doc = jasmine.createSpyObj('CodeMirror document', [
			'getValue',
			'setSelection',
		]);
		/* eslint-enable jasmine/no-unsafe-spy */
		spy.getDoc = () => spy.doc;
		return spy;
	}

	CodeMirror.defineMode = () => null;
	CodeMirror.registerHelper = () => null;

	return CodeMirror;
}

globalThis.overrideCodeMirror = makeFakeCodeMirror();

describe('Interface', () => {
	const defaultCode = 'my default code';
	let sequenceDiagram = null;
	let container = null;
	let ui = null;

	beforeEach(() => {
		const dom = new VirtualDocument();
		sequenceDiagram = jasmine.createSpyObj('sequenceDiagram', [
			'dom',
			'render',
			'clone',
			'getSize',
			'getTitle',
			'process',
			'getThemeNames',
			'on',
			'registerCodeMirrorMode',
			'getSVGSynchronous',
		]);
		sequenceDiagram.process.and.returnValue({
			agents: [],
			meta: {},
			stages: [],
		});
		sequenceDiagram.on.and.returnValue(sequenceDiagram);
		sequenceDiagram.getSize.and.returnValue({height: 20, width: 10});
		sequenceDiagram.getTitle.and.returnValue('');
		sequenceDiagram.dom.and.returnValue(dom.createElement('svg'));
		container = dom.createElement('div');

		ui = new Interface({
			defaultCode,
			sequenceDiagram,
		});
	});

	describe('build', () => {
		it('adds elements to the given container', () => {
			ui.build(container);

			expect(container.childNodes.length).toBeGreaterThan(0);
		});

		it('creates a code mirror instance with the given code', (done) => {
			ui.build(container);
			const check = setInterval(() => {
				const constructorArgs = ui.code.code.constructor;
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

			const el = ui.downloadSVG.element;

			expect(el.getAttribute('href')).toEqual('#');

			el.dispatchEvent(new Event('click'));

			expect(el.getAttribute('href')).toEqual('mySVGURL');
		});
	});
});
