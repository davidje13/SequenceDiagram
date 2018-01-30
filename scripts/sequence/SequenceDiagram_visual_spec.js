defineDescribe('SequenceDiagram Visuals', [
	'./SequenceDiagram',
	'image/ImageRegion',
	'image/ImageSimilarity',
], (
	SequenceDiagram,
	ImageRegion,
	ImageSimilarity
) => {
	'use strict';

	const RESOLUTION = 4;

	const IMAGE_BASE_PATH = 'scripts/sequence/test-images/';

	const TESTS = {
		'Connect.svg': 'A -> B',
		'Reference.svg': (
			'begin A, B, C, D\n' +
			'begin reference over B, C: My ref as E\n' +
			'* -> A\n' +
			'A -> E\n' +
			'E -> +D\n' +
			'-D -> E\n' +
			'E -> A\n' +
			'end E\n'
		),
	};

	Object.entries(TESTS).forEach(([image, code]) => {
		it('renders ' + image + ' as expected', (done) => {
			jasmine.addMatchers(ImageSimilarity.matchers);
			let actual = null;
			new SequenceDiagram(code)
				.getCanvas({resolution: RESOLUTION})
				.then((c) => {
					actual = ImageRegion.fromCanvas(c).resize({width: 150});
				})
				.then(() => ImageRegion.loadURL(IMAGE_BASE_PATH + image, {
					width: actual.width,
					height: actual.height,
					resolution: RESOLUTION,
				}))
				.then((expected) => {
					expect(actual).toLookLike(expected, {
						details: 'Code is: \n' + code,
					});
				})
				.catch(fail)
				.then(done);
		});
	});
});
