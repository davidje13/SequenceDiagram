import {Event, VirtualDocument} from '../../../spec/stubs/TestDOM.mjs';
import Interface from './Interface.mjs';
import stubRequire from '../../../spec/stubs/require.mjs';

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
			require: stubRequire,
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
