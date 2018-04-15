defineDescribe('Sketch Theme', [
	'./Sketch',
	'svg/SVG',
	'stubs/TestDOM',
], (
	SketchTheme,
	SVG,
	TestDOM
) => {
	'use strict';

	const svg = new SVG(TestDOM.dom, TestDOM.textSizerFactory);

	const themeFactory = new SketchTheme.Factory(SketchTheme.RIGHT);
	const themeFactoryL = new SketchTheme.Factory(SketchTheme.LEFT);
	const theme = themeFactory.build(svg);
	const themeL = themeFactory.build(svg);

	it('has a name', () => {
		expect(themeFactory.name).toEqual('sketch');
	});

	it('has a left-handed variant', () => {
		expect(themeFactoryL.name).toEqual('sketch left handed');
	});

	it('contains settings for the theme', () => {
		expect(theme.outerMargin).toEqual(5);
		expect(themeL.outerMargin).toEqual(5);
	});
});
