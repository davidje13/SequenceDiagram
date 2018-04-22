import ImageRegion from './image/ImageRegion.mjs';
import SequenceDiagram from '../scripts/sequence/SequenceDiagram.mjs';
import TESTS from './images/list.mjs';

function readError(err) {
	if(typeof err === 'object' && err.message) {
		return err.message;
	} else {
		return err;
	}
}

describe('SequenceDiagram Visuals', () => {
	const RESOLUTION = 4;

	const IMAGE_BASE_PATH = 'spec/images/';

	const COLLAPSE_REGEX = new RegExp(/# collapse/g);

	function findCollapseLines(code) {
		const results = [];
		let p = 0;
		let ln = -1;
		for(;;) {
			const match = COLLAPSE_REGEX.exec(code);
			if(!match) {
				break;
			}
			while(p !== -1 && p <= match.index) {
				p = code.indexOf('\n', p) + 1;
				++ ln;
			}
			results.push(ln);
		}
		return results;
	}

	function loadAndRenderSVG(svg, size = {resolution: RESOLUTION}) {
		const code = SequenceDiagram.extractCodeFromSVG(svg);

		const diagram = new SequenceDiagram(code);
		diagram.collapse(findCollapseLines(code));

		return Promise.all([
			diagram.getCanvas(size).then(ImageRegion.fromCanvas),
			ImageRegion.loadSVG(svg, size),
		]).then(([actual, expected]) => ({actual, code, expected}));
	}

	function loadAndRenderURL(url, size) {
		return fetch(url)
			.then((response) => response.text())
			.then((svg) => loadAndRenderSVG(svg, size));
	}

	TESTS.forEach((image) => {
		it('renders ' + image + ' as expected', (done) => {
			loadAndRenderURL(IMAGE_BASE_PATH + image)
				.then(({actual, expected, code}) => {
					const widthSm = Math.min(Math.round(actual.width / 4), 150);
					const actualSm = actual.resize({width: widthSm});

					expect(actualSm).toLookLike(expected.resize(actualSm), {
						details: 'Code is:\n\n' + code,
					});
				})
				.catch((err) => fail(readError(err)))
				.then(done);
		});
	});
});
