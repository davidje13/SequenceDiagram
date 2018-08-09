import ImageRegion from './image/ImageRegion.mjs';
import SequenceDiagram from '../scripts/sequence/SequenceDiagram.mjs';

const RESOLUTION = 4;

const SAMPLE_REGEX = new RegExp(
	/(?:<img src="([^"]*)"[^>]*>[\s]*)?```(?!shell).*\n([^]+?)```/g
);

const SCREENSHOT_BLACKLIST = [
	// Renders differently but correctly in different browsers
	'screenshots/Themes.png',
];

function readError(err) {
	if(typeof err === 'object' && err.message) {
		return err.message;
	} else {
		return err;
	}
}

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

function performSampleTests({file, code}, index) {
	if(file && !SCREENSHOT_BLACKLIST.includes(file)) {
		let actual = null;
		return new SequenceDiagram(code)
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
				expect(actual).toLookLike(expected, {
					details: '#' + (index + 1) + ' compared to ' + file,
				});
			});
	} else {
		expect(() => new SequenceDiagram(code)).not.toThrow();
		return Promise.resolve();
	}
}

describe('Readme', () => {
	/* eslint-disable jasmine/missing-expect */ // See performSampleTests
	it('renders all samples correctly', (done) => {
		/* eslint-enable jasmine/missing-expect */
		fetch('README.md')
			.then((response) => response.text())
			.then(findSamples)
			.then((samples) => Promise.all(samples.map(performSampleTests)))
			.catch((err) => Promise.reject(readError(err)))
			.then(done, done.fail);
	});
});
