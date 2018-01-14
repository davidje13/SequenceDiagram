defineDescribe('Monospace Theme', ['./Monospace'], (MonospaceTheme) => {
	'use strict';

	const theme = new MonospaceTheme();

	it('has a name', () => {
		expect(theme.name).toEqual('monospace');
	});

	it('contains settings for the theme', () => {
		expect(theme.outerMargin).toEqual(4);
	});
});
