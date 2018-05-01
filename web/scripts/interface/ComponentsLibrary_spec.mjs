import {
	VirtualDocument,
	textSizerFactory,
} from '../../../spec/stubs/TestDOM.mjs';
import ComponentsLibrary from './ComponentsLibrary.mjs';
import SequenceDiagram from '../../../scripts/sequence/SequenceDiagram.mjs';
import {nodejs} from '../../../scripts/core/browser.mjs';

const themes = SequenceDiagram.getDefaultThemeNames().slice(1);

const opts = nodejs ? {
	document: new VirtualDocument(),
	textSizerFactory,
} : {};

function checkSample(src) {
	it('renders without error', () => {
		expect(() => new SequenceDiagram(src, opts)).not.toThrow();
	});

	themes.forEach((themeName) => {
		it('renders without error in ' + themeName + ' theme', () => {
			expect(() => new SequenceDiagram(
				'theme ' + themeName + '\n' + src,
				opts
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
