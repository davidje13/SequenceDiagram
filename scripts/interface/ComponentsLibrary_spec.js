defineDescribe('Components Library', [
	'./ComponentsLibrary',
	'sequence/SequenceDiagram',
], (
	ComponentsLibrary,
	SequenceDiagram
) => {
	'use strict';

	const themes = new SequenceDiagram().getThemeNames().slice(1);

	ComponentsLibrary.forEach(({title, code, preview}) => {
		describe(title, () => {
			const src = preview || code;

			it('renders without error', () => {
				expect(() => new SequenceDiagram(src)).not.toThrow();
			});

			themes.forEach((themeName) => {
				it('renders without error in ' + themeName + ' theme', () => {
					expect(() => new SequenceDiagram(
						'theme ' + themeName + '\n' + src
					)).not.toThrow();
				});
			});
		});
	});
});
