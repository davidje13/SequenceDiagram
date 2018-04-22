import SequenceDiagram from './SequenceDiagram.mjs';

describe('Browser-backed SequenceDiagram', () => {
	it('measures OS fonts correctly on the first render', (done) => {
		const code = 'title message';
		const sd = new SequenceDiagram(code);
		const widthImmediate = sd.getSize().width;

		expect(widthImmediate).toBeGreaterThan(40);

		sd.set(code);

		expect(sd.getSize().width).toEqual(widthImmediate);

		setTimeout(() => {
			sd.set(code);

			expect(sd.getSize().width).toEqual(widthImmediate);

			done();
		}, 500);
	});

	it('measures embedded fonts correctly on the first render', (done) => {
		const code = 'theme sketch\ntitle message';
		const sd = new SequenceDiagram(code);
		const widthImmediate = sd.getSize().width;

		expect(widthImmediate).toBeGreaterThan(40);

		sd.set(code);

		expect(sd.getSize().width).toEqual(widthImmediate);

		setTimeout(() => {
			sd.set(code);

			expect(sd.getSize().width).toEqual(widthImmediate);

			done();
		}, 500);
	});
});
