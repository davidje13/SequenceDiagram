defineDescribe('Monospace Theme', [
	'./Monospace',
	'svg/SVG',
	'stubs/TestDOM',
], (
	MonospaceTheme,
	SVG,
	TestDOM
) => {
	'use strict';

	const svg = new SVG(TestDOM.dom, TestDOM.textSizerFactory);

	const themeFactory = new MonospaceTheme.Factory();
	const theme = themeFactory.build(svg);

	it('has a name', () => {
		expect(themeFactory.name).toEqual('monospace');
	});

	it('contains settings for the theme', () => {
		expect(theme.outerMargin).toEqual(4);
	});
});
