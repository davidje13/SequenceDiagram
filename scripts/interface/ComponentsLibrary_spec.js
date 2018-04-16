import ComponentsLibrary from './ComponentsLibrary.js';
import SequenceDiagram from '../sequence/SequenceDiagram.js';

const themes = new SequenceDiagram().getThemeNames().slice(1);

function checkSample(src) {
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
}

describe('Components Library', () => {
	ComponentsLibrary.forEach(({title, code, preview}) => {
		describe(title, () => {
			checkSample(preview || code);
		});
	});
});
