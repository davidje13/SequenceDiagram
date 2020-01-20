import URLExporter from './URLExporter.mjs';

describe('URLExporter', () => {
	it('converts code into a URL-safe format', () => {
		const exporter = new URLExporter();
		const url = exporter.getRenderURL('A\nB');

		expect(url).toEqual('A/B.svg');
	});

	it('escapes special characters', () => {
		const exporter = new URLExporter();
		const url = exporter.getRenderURL('a/b%c"d');

		expect(url).toEqual('a%2Fb%25c%22d.svg');
	});

	it('adds a base url if specified', () => {
		const exporter = new URLExporter('abc/');
		const url = exporter.getRenderURL('d');

		expect(url).toEqual('abc/d.svg');
	});

	it('adds width/height information if specified', () => {
		const exporter = new URLExporter();
		const url = exporter.getRenderURL('a', {height: 20, width: 10});

		expect(url).toEqual('w10h20/a.svg');
	});

	it('adds zoom information if specified', () => {
		const exporter = new URLExporter();
		const url = exporter.getRenderURL('a', {zoom: 2});

		expect(url).toEqual('z2/a.svg');
	});

	it('ignores zoom of 1', () => {
		const exporter = new URLExporter();
		const url = exporter.getRenderURL('a', {zoom: 1});

		expect(url).toEqual('a.svg');
	});

	it('ignores values of not-a-number', () => {
		const exporter = new URLExporter();
		const url = exporter.getRenderURL('a', {zoom: Number.NaN});

		expect(url).toEqual('a.svg');
	});

	it('adds just width if specified', () => {
		const exporter = new URLExporter();
		const url = exporter.getRenderURL('a', {width: 10});

		expect(url).toEqual('w10/a.svg');
	});

	it('adds just height if specified', () => {
		const exporter = new URLExporter();
		const url = exporter.getRenderURL('a', {height: 10});

		expect(url).toEqual('h10/a.svg');
	});

	it('prefers width/height over zoom', () => {
		const exporter = new URLExporter();
		const url = exporter.getRenderURL('a', {
			height: 20,
			width: 10,
			zoom: 2,
		});

		expect(url).toEqual('w10h20/a.svg');
	});
});
