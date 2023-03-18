import Tokeniser from './Tokeniser.mjs';

describe('Sequence Tokeniser', () => {
	const tokeniser = new Tokeniser();

	describe('.tokenise', () => {
		function token({
			b = jasmine.anything(), // Begin position
			e = jasmine.anything(), // End position
			q = jasmine.anything(), // IsQuote?
			s = jasmine.anything(), // Spacing
			v = jasmine.anything(), // Value
		}) {
			return {b, e, q, s, v};
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
				token({b: {ch: 0, i: 0, ln: 0}, e: {ch: 3, i: 3, ln: 0}}),
				token({b: {ch: 4, i: 4, ln: 0}, e: {ch: 7, i: 7, ln: 0}}),
				token({b: {ch: 8, i: 8, ln: 0}, e: {ch: 10, i: 10, ln: 0}}),
				token({b: {ch: 11, i: 11, ln: 0}, e: {ch: 14, i: 14, ln: 0}}),
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

		it('parses windows-style newlines as tokens', () => {
			const input = 'foo bar\r\nbaz';
			const tokens = tokeniser.tokenise(input);

			expect(tokens).toEqual([
				token({s: '', v: 'foo'}),
				token({s: ' ', v: 'bar'}),
				token({s: '\r', v: '\n'}),
				token({s: '', v: 'baz'}),
			]);
		});

		it('parses special characters as tokens', () => {
			const input = ',:!+*...abc';
			const tokens = tokeniser.tokenise(input);

			expect(tokens).toEqual([
				token({s: '', v: ','}),
				token({s: '', v: ':'}),
				token({s: '', v: '!'}),
				token({s: '', v: '+'}),
				token({s: '', v: '*'}),
				token({s: '', v: '...'}),
				token({s: '', v: 'abc'}),
			]);
		});

		it('accepts XML tag-like syntax', () => {
			const input = 'abc <def> >> ghi <<';
			const tokens = tokeniser.tokenise(input);

			expect(tokens).toEqual([
				token({s: '', v: 'abc'}),
				token({s: ' ', v: '<'}),
				token({s: '', v: 'def>'}),
				token({s: ' ', v: '>>'}),
				token({s: ' ', v: 'ghi'}),
				token({s: ' ', v: '<<'}),
			]);
		});

		it('stores line numbers', () => {
			const input = 'foo bar\nbaz';
			const tokens = tokeniser.tokenise(input);

			expect(tokens).toEqual([
				token({b: {ch: 0, i: 0, ln: 0}, e: {ch: 3, i: 3, ln: 0}}),
				token({b: {ch: 4, i: 4, ln: 0}, e: {ch: 7, i: 7, ln: 0}}),
				token({b: {ch: 7, i: 7, ln: 0}, e: {ch: 0, i: 8, ln: 1}}),
				token({b: {ch: 0, i: 8, ln: 1}, e: {ch: 3, i: 11, ln: 1}}),
			]);
		});

		it('parses quoted newlines as quoted tokens', () => {
			const input = 'foo "\n" baz';
			const tokens = tokeniser.tokenise(input);

			expect(tokens).toEqual([
				token({q: false, s: '', v: 'foo'}),
				token({q: true, s: ' ', v: '\n'}),
				token({q: false, s: ' ', v: 'baz'}),
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
			const input = 'foo "zig zag" "abc def"';
			const tokens = tokeniser.tokenise(input);

			expect(tokens).toEqual([
				token({q: false, s: '', v: 'foo'}),
				token({q: true, s: ' ', v: 'zig zag'}),
				token({q: true, s: ' ', v: 'abc def'}),
			]);
		});

		it('does not consider single quotes as quotes', () => {
			const input = 'foo \'zig zag\'';
			const tokens = tokeniser.tokenise(input);

			expect(tokens).toEqual([
				token({q: false, s: '', v: 'foo'}),
				token({q: false, s: ' ', v: '\'zig'}),
				token({q: false, s: ' ', v: 'zag\''}),
			]);
		});

		it('stores character positions around quoted strings', () => {
			const input = '"foo bar"';
			const tokens = tokeniser.tokenise(input);

			expect(tokens).toEqual([
				token({b: {ch: 0, i: 0, ln: 0}, e: {ch: 9, i: 9, ln: 0}}),
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
			const input = 'foo # bar "baz\nzig';
			const tokens = tokeniser.tokenise(input);

			expect(tokens).toEqual([
				token({s: '', v: 'foo'}),
				token({s: '', v: '\n'}),
				token({s: '', v: 'zig'}),
			]);
		});

		it('interprets special characters within quoted strings', () => {
			const input = 'foo "zig\\" \\\\zag\\n"';
			const tokens = tokeniser.tokenise(input);

			expect(tokens).toEqual([
				token({q: false, s: '', v: 'foo'}),
				token({q: true, s: ' ', v: 'zig" \\zag\n'}),
			]);
		});

		it('propagates backslashes as escape characters', () => {
			const input = '"zig \\ zag"';
			const tokens = tokeniser.tokenise(input);

			expect(tokens).toEqual([
				token({q: true, s: '', v: 'zig \u001B zag'}),
			]);
		});

		it('removes control characters everywhere', () => {
			const input = 'a\u001Bb\u0001c "a\u001Bb\u0001c"';
			const tokens = tokeniser.tokenise(input);

			expect(tokens).toEqual([
				token({q: false, s: '', v: 'abc'}),
				token({q: true, s: ' ', v: 'abc'}),
			]);
		});

		it('maintains whitespace and newlines within quoted strings', () => {
			const input = 'foo " zig\n  zag  "';
			const tokens = tokeniser.tokenise(input);

			expect(tokens).toEqual([
				token({q: false, s: '', v: 'foo'}),
				token({q: true, s: ' ', v: ' zig\n  zag  '}),
			]);
		});

		it('calculates line numbers consistently within quotes', () => {
			const input = 'foo\nbar "zig\nzag\na" b';
			const tokens = tokeniser.tokenise(input);

			expect(tokens).toEqual([
				token({b: {ch: 0, i: 0, ln: 0}, e: {ch: 3, i: 3, ln: 0}}),
				token({b: {ch: 3, i: 3, ln: 0}, e: {ch: 0, i: 4, ln: 1}}),
				token({b: {ch: 0, i: 4, ln: 1}, e: {ch: 3, i: 7, ln: 1}}),
				token({b: {ch: 4, i: 8, ln: 1}, e: {ch: 2, i: 19, ln: 3}}),
				token({b: {ch: 3, i: 20, ln: 3}, e: {ch: 4, i: 21, ln: 3}}),
			]);
		});

		it('rejects unterminated quoted values', () => {
			expect(() => tokeniser.tokenise('"nope')).toThrow(new Error(
				'Unterminated literal (began at line 1, character 0)',
			));
		});

		it('stops tokenising arrows once they become invalid', () => {
			expect(tokeniser.tokenise('foo -> bar')).toEqual([
				token({s: '', v: 'foo'}),
				token({s: ' ', v: '->'}),
				token({s: ' ', v: 'bar'}),
			]);

			expect(tokeniser.tokenise('foo->bar')).toEqual([
				token({s: '', v: 'foo'}),
				token({s: '', v: '->'}),
				token({s: '', v: 'bar'}),
			]);

			expect(tokeniser.tokenise('foo-xbar')).toEqual([
				token({s: '', v: 'foo'}),
				token({s: '', v: '-x'}),
				token({s: '', v: 'bar'}),
			]);

			expect(tokeniser.tokenise('foo-xxyz')).toEqual([
				token({s: '', v: 'foo'}),
				token({s: '', v: '-x'}),
				token({s: '', v: 'xyz'}),
			]);

			expect(tokeniser.tokenise('foo->xyz')).toEqual([
				token({s: '', v: 'foo'}),
				token({s: '', v: '->'}),
				token({s: '', v: 'xyz'}),
			]);
		});
	});

	describe('.splitLines', () => {
		it('combines tokens', () => {
			const lines = tokeniser.splitLines([
				{q: false, s: '', v: 'abc'},
				{q: false, s: '', v: 'd'},
			]);

			expect(lines).toEqual([
				[{q: false, s: '', v: 'abc'}, {q: false, s: '', v: 'd'}],
			]);
		});

		it('splits at newlines', () => {
			const lines = tokeniser.splitLines([
				{q: false, s: '', v: 'abc'},
				{q: false, s: '', v: 'd'},
				{q: false, s: '', v: '\n'},
				{q: false, s: '', v: 'e'},
			]);

			expect(lines).toEqual([
				[{q: false, s: '', v: 'abc'}, {q: false, s: '', v: 'd'}],
				[{q: false, s: '', v: 'e'}],
			]);
		});

		it('splits at windows-style newlines', () => {
			const lines = tokeniser.splitLines([
				{q: false, s: '', v: 'abc'},
				{q: false, s: '', v: 'd'},
				{q: false, s: '\r', v: '\n'},
				{q: false, s: '', v: 'e'},
			]);

			expect(lines).toEqual([
				[{q: false, s: '', v: 'abc'}, {q: false, s: '', v: 'd'}],
				[{q: false, s: '', v: 'e'}],
			]);
		});

		it('ignores multiple newlines', () => {
			const lines = tokeniser.splitLines([
				{q: false, s: '', v: 'abc'},
				{q: false, s: '', v: 'd'},
				{q: false, s: '', v: '\n'},
				{q: false, s: '', v: '\n'},
				{q: false, s: '', v: 'e'},
			]);

			expect(lines).toEqual([
				[{q: false, s: '', v: 'abc'}, {q: false, s: '', v: 'd'}],
				[{q: false, s: '', v: 'e'}],
			]);
		});

		it('ignores trailing newlines', () => {
			const lines = tokeniser.splitLines([
				{q: false, s: '', v: 'abc'},
				{q: false, s: '', v: 'd'},
				{q: false, s: '', v: '\n'},
				{q: false, s: '', v: 'e'},
				{q: false, s: '', v: '\n'},
			]);

			expect(lines).toEqual([
				[{q: false, s: '', v: 'abc'}, {q: false, s: '', v: 'd'}],
				[{q: false, s: '', v: 'e'}],
			]);
		});

		it('handles quoted newlines as regular tokens', () => {
			const lines = tokeniser.splitLines([
				{q: false, s: '', v: 'abc'},
				{q: false, s: '', v: 'd'},
				{q: true, s: '', v: '\n'},
				{q: false, s: '', v: 'e'},
			]);

			expect(lines).toEqual([
				[
					{q: false, s: '', v: 'abc'},
					{q: false, s: '', v: 'd'},
					{q: true, s: '', v: '\n'},
					{q: false, s: '', v: 'e'},
				],
			]);
		});

		it('handles empty input', () => {
			const lines = tokeniser.splitLines([]);

			expect(lines).toEqual([]);
		});
	});
});
