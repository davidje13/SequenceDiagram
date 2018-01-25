defineDescribe('PatternedLine', ['./PatternedLine'], (PatternedLine) => {
	'use strict';

	function simplify(path, dp) {
		return path.replace(/[0-9.]+/g, (v) => Number(v).toFixed(dp));
	}

	describe('unpatterned', () => {
		it('connects points with simple lines', () => {
			const ln = new PatternedLine()
				.move(10, 20)
				.line(30, 50)
				.line(1, 2);

			expect(ln.asPath()).toEqual(
				'M10 20' +
				'L30 50' +
				'L1 2'
			);
		});

		it('supports simple (circular) arcs', () => {
			const ln = new PatternedLine()
				.move(10, 20)
				.arc(10, 30, Math.PI);

			expect(simplify(ln.asPath(), 0)).toEqual(
				'M10 20' +
				'A10 10 0 1 1 10 40'
			);
		});

		it('supports quarter arcs', () => {
			const ln = new PatternedLine()
				.move(10, 20)
				.arc(10, 30, Math.PI / 2)
				.arc(10, 30, Math.PI / 2)
				.arc(10, 30, Math.PI / 2)
				.arc(10, 30, Math.PI / 2);

			expect(simplify(ln.asPath(), 0)).toEqual(
				'M10 20' +
				'A10 10 0 0 1 20 30' +
				'L20 30' +
				'A10 10 0 0 1 10 40' +
				'L10 40' +
				'A10 10 0 0 1 0 30' +
				'L0 30' +
				'A10 10 0 0 1 10 20'
			);
		});

		it('can combine lines and arcs', () => {
			const ln = new PatternedLine()
				.move(10, 20)
				.line(20, 20)
				.arc(20, 30, Math.PI)
				.line(10, 40);

			expect(simplify(ln.asPath(), 0)).toEqual(
				'M10 20' +
				'L20 20' +
				'A10 10 0 1 1 20 40' +
				'L10 40'
			);
		});

		it('ignores cap()', () => {
			const ln1 = new PatternedLine()
				.move(10, 20)
				.line(10, 40)
				.cap();

			expect(ln1.asPath()).toEqual(
				'M10 20' +
				'L10 40'
			);

			const ln2 = new PatternedLine()
				.move(10, 20)
				.arc(10, 30, Math.PI)
				.cap();

			expect(simplify(ln2.asPath(), 0)).toEqual(
				'M10 20' +
				'A10 10 0 1 1 10 40'
			);
		});
	});

	describe('patterned', () => {
		const patternDeltas = [-1, 1, -2];
		const pattern = {
			partWidth: 5,
			getDelta: (p) => {
				return patternDeltas[p % 3];
			},
		};

		it('draws lines using the given pattern', () => {
			const ln = new PatternedLine(pattern)
				.move(10, 20)
				.line(30, 20);

			// last segment of line is not rendered to avoid high frequencies
			// near line segment joins
			expect(ln.asPath()).toEqual(
				'M10 19' +
				'L15 21' +
				'L20 18' +
				'L25 19'
			);
		});

		it('maintains phase between line segments', () => {
			const ln = new PatternedLine(pattern)
				.move(10, 20)
				.line(30, 20)
				.line(30, 33);

			expect(ln.asPath()).toEqual(
				'M10 19' +
				'L15 21' +
				'L20 18' +
				'L25 19' +

				'L29 20' +
				'L32 25'
			);
		});

		it('completes the line beyond the pattern with cap()', () => {
			const ln = new PatternedLine(pattern)
				.move(10, 20)
				.line(30, 20)
				.line(30, 33)
				.cap();

			expect(ln.asPath()).toEqual(
				'M10 19' +
				'L15 21' +
				'L20 18' +
				'L25 19' +

				'L29 20' +
				'L32 25' +
				'L30 33'
			);
		});

		it('supports simple (circular) arcs using straight segments', () => {
			const ln = new PatternedLine(pattern)
				.move(10, 20)
				.arc(10, 30, Math.PI)
				.line(0, 40);

			expect(simplify(ln.asPath(), 1)).toEqual(
				'M10.0 19.0' +
				'L14.3 22.1' +
				'L20.1 23.5' +
				'L21.0 29.2' +
				'L18.2 33.7' +
				'L17.2 39.6' +
				'L10.0 41.0' +
				'L5.0 39.0'
			);
		});

	});
});
