defineDescribe('SequenceDiagram Visuals', [
	'./SequenceDiagram',
	'./test-images/list',
	'image/ImageRegion',
	'image/ImageSimilarity',
], (
	SequenceDiagram,
	TESTS,
	ImageRegion,
	ImageSimilarity
) => {
	'use strict';

	const RESOLUTION = 4;

	const IMAGE_BASE_PATH = 'scripts/sequence/test-images/';

	function loadAndRenderSVG(svg, size = {resolution: RESOLUTION}) {
		const code = SequenceDiagram.extractCodeFromSVG(svg);

		const diagram = new SequenceDiagram(code);

		return Promise.all([
			diagram.getCanvas(size).then(ImageRegion.fromCanvas),
			ImageRegion.loadSVG(svg, size),
		]).then(([actual, expected]) => {
			return {actual, expected, code};
		});
	}

	function loadAndRenderURL(url, size) {
		return fetch(url)
			.then((response) => response.text())
			.then((svg) => loadAndRenderSVG(svg, size));
	}

	function testImageMatches({actual, expected, code}) {
		const widthSm = Math.min(Math.round(actual.width / 4), 150);
		const actualSm = actual.resize({width: widthSm});
		expect(actualSm).toLookLike(expected.resize(actualSm), {
			details: 'Code is:\n\n' + code,
		});
	}

	TESTS.forEach((image) => {
		it('renders ' + image + ' as expected', (done) => {
			jasmine.addMatchers(ImageSimilarity.matchers);

			loadAndRenderURL(IMAGE_BASE_PATH + image)
				.then(testImageMatches)
				.catch(fail)
				.then(done);
		});
	});
});
