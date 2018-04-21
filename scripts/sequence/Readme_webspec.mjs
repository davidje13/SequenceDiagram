import ImageRegion from '../image/ImageRegion.mjs';
import SequenceDiagram from './SequenceDiagram.mjs';
import {matchers} from '../image/ImageSimilarity.mjs';

const RESOLUTION = 4;

const SAMPLE_REGEX = new RegExp(
	/(?:<img src="([^"]*)"[^>]*>[\s]*)?```(?!shell).*\n([^]+?)```/g
);

const SCREENSHOT_BLACKLIST = [
	// Renders differently but correctly in different browsers
	'screenshots/Themes.png',
];

function findSamples(content) {
	SAMPLE_REGEX.lastIndex = 0;
	const results = [];
	for(;;) {
		const match = SAMPLE_REGEX.exec(content);
		if(!match) {
			break;
		}
		results.push({
			code: match[2],
			file: match[1],
		});
	}
	return results;
}

function makeSampleTests({file, code}, index) {
	describe('example #' + (index + 1), () => {
		if(file && !SCREENSHOT_BLACKLIST.includes(file)) {
			it('looks like ' + file + ' when rendered', (done) => {
				jasmine.addMatchers(matchers);
				let actual = null;
				new SequenceDiagram(code)
					.getCanvas({resolution: RESOLUTION})
					.then((c) => {
						actual = ImageRegion
							.fromCanvas(c)
							.resize({width: 150});
					})
					.then(() => ImageRegion.loadURL(
						file,
						{height: actual.height, width: actual.width}
					))
					.then((expected) => {
						expect(actual).toLookLike(expected);
					})
					.catch(fail)
					.then(done);
			});
		} else {
			it('renders without error', () => {
				expect(() => new SequenceDiagram(code)).not.toThrow();
			});
		}
	});
}

fetch('README.md')
	.then((response) => response.text())
	.then(findSamples)
	.then((samples) => describe('Readme', () => {
		samples.forEach(makeSampleTests);
	}));
