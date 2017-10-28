defineDescribe('Basic Theme', ['./Basic'], (Theme) => {
	'use strict';

	it('contains settings for the theme', () => {
		const theme = new Theme();
		expect(theme.outerMargin).toEqual(5);
	});
});
