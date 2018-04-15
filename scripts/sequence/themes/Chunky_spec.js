defineDescribe('Chunky Theme', [
	'./Chunky',
	'svg/SVG',
	'stubs/TestDOM',
], (
	ChunkyTheme,
	SVG,
	TestDOM
) => {
	'use strict';

	const svg = new SVG(TestDOM.dom, TestDOM.textSizerFactory);

	const themeFactory = new ChunkyTheme.Factory();
	const theme = themeFactory.build(svg);

	it('has a name', () => {
		expect(themeFactory.name).toEqual('chunky');
	});

	it('contains settings for the theme', () => {
		expect(theme.outerMargin).toEqual(5);
	});
});
