defineDescribe('Sketch Theme', ['./Sketch'], (SketchTheme) => {
	'use strict';

	const theme = new SketchTheme(SketchTheme.RIGHT);
	const themeL = new SketchTheme(SketchTheme.LEFT);

	it('has a name', () => {
		expect(theme.name).toEqual('sketch');
	});

	it('has a left-handed variant', () => {
		expect(themeL.name).toEqual('sketch left handed');
	});

	it('contains settings for the theme', () => {
		expect(theme.outerMargin).toEqual(5);
	});
});
