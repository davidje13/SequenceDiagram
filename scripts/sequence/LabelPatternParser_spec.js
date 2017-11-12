defineDescribe('Label Pattern Parser', ['./LabelPatternParser'], (parser) => {
	'use strict';

	it('converts simple text', () => {
		const parsed = parser('hello everybody');
		expect(parsed).toEqual([
			'hello everybody',
		]);
	});

	it('handles the empty case', () => {
		const parsed = parser('');
		expect(parsed).toEqual([]);
	});

	it('converts tokens', () => {
		const parsed = parser('foo <label> bar');
		expect(parsed).toEqual([
			'foo ',
			{token: 'label'},
			' bar',
		]);
	});

	it('converts multiple tokens', () => {
		const parsed = parser('foo <label> bar <label> baz');
		expect(parsed).toEqual([
			'foo ',
			{token: 'label'},
			' bar ',
			{token: 'label'},
			' baz',
		]);
	});

	it('ignores empty sequences', () => {
		const parsed = parser('<label><label>');
		expect(parsed).toEqual([
			{token: 'label'},
			{token: 'label'},
		]);
	});

	it('passes unrecognised tokens through unchanged', () => {
		const parsed = parser('foo <nope>');
		expect(parsed).toEqual([
			'foo ',
			'<nope>',
		]);
	});

	it('converts counters', () => {
		const parsed = parser('<inc 5, 2>a<inc 2, 1>b');
		expect(parsed).toEqual([
			{start: 5, inc: 2, dp: 0},
			'a',
			{start: 2, inc: 1, dp: 0},
			'b',
		]);
	});

	it('defaults counters to increment = 1', () => {
		const parsed = parser('<inc 5>');
		expect(parsed).toEqual([
			{start: 5, inc: 1, dp: 0},
		]);
	});

	it('defaults counters to start = 1', () => {
		const parsed = parser('<inc>');
		expect(parsed).toEqual([
			{start: 1, inc: 1, dp: 0},
		]);
	});

	it('assigns decimal places to counters by their written precision', () => {
		const parsed = parser('<inc 5.0, 2.00><inc 2.00, 1.0>');
		expect(parsed).toEqual([
			{start: jasmine.anything(), inc: jasmine.anything(), dp: 2},
			{start: jasmine.anything(), inc: jasmine.anything(), dp: 2},
		]);
	});
});
