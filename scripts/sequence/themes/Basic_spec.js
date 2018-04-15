defineDescribe('Basic Theme', [
	'./Basic',
	'svg/SVG',
	'stubs/TestDOM',
], (
	BasicTheme,
	SVG,
	TestDOM
) => {
	'use strict';

	const svg = new SVG(TestDOM.dom, TestDOM.textSizerFactory);

	const themeFactory = new BasicTheme.Factory();
	const theme = themeFactory.build(svg);

	it('has a name', () => {
		expect(themeFactory.name).toEqual('basic');
	});

	it('contains settings for the theme', () => {
		expect(theme.outerMargin).toEqual(5);
	});
});
