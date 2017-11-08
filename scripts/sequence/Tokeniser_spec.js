defineDescribe('Sequence Tokeniser', ['./Tokeniser'], (Tokeniser) => {
	'use strict';

	const tokeniser = new Tokeniser();

	describe('.tokenise', () => {
		function token({
			s = jasmine.anything(), // spacing
			v = jasmine.anything(), // value
			q = jasmine.anything(), // isQuote?
			b = jasmine.anything(), // begin position
			e = jasmine.anything(), // end position
		}) {
			return {s, v, q, b, e};
		}

		it('converts the source into atomic tokens', () => {
			const input = 'foo bar -> baz';
			const tokens = tokeniser.tokenise(input);
			expect(tokens).toEqual([
				token({s: '', v: 'foo'}),
				token({s: ' ', v: 'bar'}),
				token({s: ' ', v: '->'}),
				token({s: ' ', v: 'baz'}),
			]);
		});

		it('splits tokens at flexible boundaries', () => {
			const input = 'foo bar->baz';
			const tokens = tokeniser.tokenise(input);
			expect(tokens).toEqual([
				token({s: '', v: 'foo'}),
				token({s: ' ', v: 'bar'}),
				token({s: '', v: '->'}),
				token({s: '', v: 'baz'}),
			]);
		});

		it('stores character numbers', () => {
			const input = 'foo bar -> baz';
			const tokens = tokeniser.tokenise(input);
			expect(tokens).toEqual([
				token({b: {i: 0, ln: 0, ch: 0}, e: {i: 3, ln: 0, ch: 3}}),
				token({b: {i: 4, ln: 0, ch: 4}, e: {i: 7, ln: 0, ch: 7}}),
				token({b: {i: 8, ln: 0, ch: 8}, e: {i: 10, ln: 0, ch: 10}}),
				token({b: {i: 11, ln: 0, ch: 11}, e: {i: 14, ln: 0, ch: 14}}),
			]);
		});

		it('parses newlines as tokens', () => {
			const input = 'foo bar\nbaz';
			const tokens = tokeniser.tokenise(input);
			expect(tokens).toEqual([
				token({s: '', v: 'foo'}),
				token({s: ' ', v: 'bar'}),
				token({s: '', v: '\n'}),
				token({s: '', v: 'baz'}),
			]);
		});

		it('stores line numbers', () => {
			const input = 'foo bar\nbaz';
			const tokens = tokeniser.tokenise(input);
			expect(tokens).toEqual([
				token({b: {i: 0, ln: 0, ch: 0}, e: {i: 3, ln: 0, ch: 3}}),
				token({b: {i: 4, ln: 0, ch: 4}, e: {i: 7, ln: 0, ch: 7}}),
				token({b: {i: 7, ln: 0, ch: 7}, e: {i: 8, ln: 1, ch: 0}}),
				token({b: {i: 8, ln: 1, ch: 0}, e: {i: 11, ln: 1, ch: 3}}),
			]);
		});

		it('parses quoted newlines as quoted tokens', () => {
			const input = 'foo "\n" baz';
			const tokens = tokeniser.tokenise(input);
			expect(tokens).toEqual([
				token({s: '', v: 'foo', q: false}),
				token({s: ' ', v: '\n', q: true}),
				token({s: ' ', v: 'baz', q: false}),
			]);
		});

		it('removes leading and trailing whitespace', () => {
			const input = '  foo \t bar\t\n baz';
			const tokens = tokeniser.tokenise(input);
			expect(tokens).toEqual([
				token({s: '  ', v: 'foo'}),
				token({s: ' \t ', v: 'bar'}),
				token({s: '\t', v: '\n'}),
				token({s: ' ', v: 'baz'}),
			]);
		});

		it('parses quoted strings as single tokens', () => {
			const input = 'foo "zig zag" \'abc def\'';
			const tokens = tokeniser.tokenise(input);
			expect(tokens).toEqual([
				token({s: '', v: 'foo', q: false}),
				token({s: ' ', v: 'zig zag', q: true}),
				token({s: ' ', v: 'abc def', q: true}),
			]);
		});

		it('stores character positions around quoted strings', () => {
			const input = '"foo bar"';
			const tokens = tokeniser.tokenise(input);
			expect(tokens).toEqual([
				token({b: {i: 0, ln: 0, ch: 0}, e: {i: 9, ln: 0, ch: 9}}),
			]);
		});

		it('ignores comments', () => {
			const input = 'foo # bar baz\nzig';
			const tokens = tokeniser.tokenise(input);
			expect(tokens).toEqual([
				token({s: '', v: 'foo'}),
				token({s: '', v: '\n'}),
				token({s: '', v: 'zig'}),
			]);
		});

		it('ignores quotes within comments', () => {
			const input = 'foo # bar "\'baz\nzig';
			const tokens = tokeniser.tokenise(input);
			expect(tokens).toEqual([
				token({s: '', v: 'foo'}),
				token({s: '', v: '\n'}),
				token({s: '', v: 'zig'}),
			]);
		});

		it('interprets special characters within quoted strings', () => {
			const input = 'foo "zig\\" zag\\n"';
			const tokens = tokeniser.tokenise(input);
			expect(tokens).toEqual([
				token({s: '', v: 'foo', q: false}),
				token({s: ' ', v: 'zig" zag\n', q: true}),
			]);
		});

		it('maintains whitespace and newlines within quoted strings', () => {
			const input = 'foo " zig\n  zag  "';
			const tokens = tokeniser.tokenise(input);
			expect(tokens).toEqual([
				token({s: '', v: 'foo', q: false}),
				token({s: ' ', v: ' zig\n  zag  ', q: true}),
			]);
		});

		it('calculates line numbers consistently within quotes', () => {
			const input = 'foo\nbar "zig\nzag\na" b';
			const tokens = tokeniser.tokenise(input);
			expect(tokens).toEqual([
				token({b: {i: 0, ln: 0, ch: 0}, e: {i: 3, ln: 0, ch: 3}}),
				token({b: {i: 3, ln: 0, ch: 3}, e: {i: 4, ln: 1, ch: 0}}),
				token({b: {i: 4, ln: 1, ch: 0}, e: {i: 7, ln: 1, ch: 3}}),
				token({b: {i: 8, ln: 1, ch: 4}, e: {i: 19, ln: 3, ch: 2}}),
				token({b: {i: 20, ln: 3, ch: 3}, e: {i: 21, ln: 3, ch: 4}}),
			]);
		});

		it('rejects unterminated quoted values', () => {
			expect(() => tokeniser.tokenise('"nope')).toThrow(new Error(
				'Unterminated literal (began at line 1, character 0)'
			));
		});
	});

	describe('.splitLines', () => {
		it('combines tokens', () => {
			const lines = tokeniser.splitLines([
				{s: '', v: 'abc', q: false},
				{s: '', v: 'd', q: false},
			]);
			expect(lines).toEqual([
				[{s: '', v: 'abc', q: false}, {s: '', v: 'd', q: false}],
			]);
		});

		it('splits at newlines', () => {
			const lines = tokeniser.splitLines([
				{s: '', v: 'abc', q: false},
				{s: '', v: 'd', q: false},
				{s: '', v: '\n', q: false},
				{s: '', v: 'e', q: false},
			]);
			expect(lines).toEqual([
				[{s: '', v: 'abc', q: false}, {s: '', v: 'd', q: false}],
				[{s: '', v: 'e', q: false}],
			]);
		});

		it('ignores multiple newlines', () => {
			const lines = tokeniser.splitLines([
				{s: '', v: 'abc', q: false},
				{s: '', v: 'd', q: false},
				{s: '', v: '\n', q: false},
				{s: '', v: '\n', q: false},
				{s: '', v: 'e', q: false},
			]);
			expect(lines).toEqual([
				[{s: '', v: 'abc', q: false}, {s: '', v: 'd', q: false}],
				[{s: '', v: 'e', q: false}],
			]);
		});

		it('ignores trailing newlines', () => {
			const lines = tokeniser.splitLines([
				{s: '', v: 'abc', q: false},
				{s: '', v: 'd', q: false},
				{s: '', v: '\n', q: false},
				{s: '', v: 'e', q: false},
				{s: '', v: '\n', q: false},
			]);
			expect(lines).toEqual([
				[{s: '', v: 'abc', q: false}, {s: '', v: 'd', q: false}],
				[{s: '', v: 'e', q: false}],
			]);
		});

		it('handles quoted newlines as regular tokens', () => {
			const lines = tokeniser.splitLines([
				{s: '', v: 'abc', q: false},
				{s: '', v: 'd', q: false},
				{s: '', v: '\n', q: true},
				{s: '', v: 'e', q: false},
			]);
			expect(lines).toEqual([
				[
					{s: '', v: 'abc', q: false},
					{s: '', v: 'd', q: false},
					{s: '', v: '\n', q: true},
					{s: '', v: 'e', q: false},
				],
			]);
		});

		it('handles empty input', () => {
			const lines = tokeniser.splitLines([]);
			expect(lines).toEqual([]);
		});
	});
});
