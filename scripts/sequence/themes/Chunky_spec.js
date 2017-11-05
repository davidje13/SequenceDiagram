defineDescribe('Chunky Theme', ['./Chunky'], (ChunkyTheme) => {
	'use strict';

	const theme = new ChunkyTheme();

	it('has a name', () => {
		expect(theme.name).toEqual('chunky');
	});

	it('contains settings for the theme', () => {
		expect(theme.outerMargin).toEqual(5);
	});
});
