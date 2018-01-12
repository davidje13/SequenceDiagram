defineDescribe('PatternedLine', ['./PatternedLine'], (PatternedLine) => {
	'use strict';

	describe('unpatterned', () => {
		describe('line', () => {
			it('connects points with lines', () => {
				const ln = new PatternedLine()
					.move(10, 20)
					.line(30, 50)
					.line(1, 2)
					.cap();

				expect(ln.asPath()).toEqual(
					'M10 20' +
					'L30 50' +
					'L1 2'
				);
			});
		});
	});
});
