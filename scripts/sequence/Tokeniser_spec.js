defineDescribe('Sequence Tokeniser', ['./Tokeniser'], (Tokeniser) => {
	'use strict';

	const tokeniser = new Tokeniser();

	describe('.tokenise', () => {
		it('converts the source into atomic tokens', () => {
			const input = 'foo bar -> baz';
			const tokens = tokeniser.tokenise(input);
			expect(tokens).toEqual([
				{s: '', v: 'foo', q: false},
				{s: ' ', v: 'bar', q: false},
				{s: ' ', v: '->', q: false},
				{s: ' ', v: 'baz', q: false},
			]);
		});

		it('splits tokens at flexible boundaries', () => {
			const input = 'foo bar->baz';
			const tokens = tokeniser.tokenise(input);
			expect(tokens).toEqual([
				{s: '', v: 'foo', q: false},
				{s: ' ', v: 'bar', q: false},
				{s: '', v: '->', q: false},
				{s: '', v: 'baz', q: false},
			]);
		});

		it('parses newlines as tokens', () => {
			const input = 'foo bar\nbaz';
			const tokens = tokeniser.tokenise(input);
			expect(tokens).toEqual([
				{s: '', v: 'foo', q: false},
				{s: ' ', v: 'bar', q: false},
				{s: '', v: '\n', q: false},
				{s: '', v: 'baz', q: false},
			]);
		});

		it('parses quoted newlines as quoted tokens', () => {
			const input = 'foo "\n" baz';
			const tokens = tokeniser.tokenise(input);
			expect(tokens).toEqual([
				{s: '', v: 'foo', q: false},
				{s: ' ', v: '\n', q: true},
				{s: ' ', v: 'baz', q: false},
			]);
		});

		it('removes leading and trailing whitespace', () => {
			const input = '  foo \t bar\t\n baz';
			const tokens = tokeniser.tokenise(input);
			expect(tokens).toEqual([
				{s: '  ', v: 'foo', q: false},
				{s: ' \t ', v: 'bar', q: false},
				{s: '\t', v: '\n', q: false},
				{s: ' ', v: 'baz', q: false},
			]);
		});

		it('parses quoted strings as single tokens', () => {
			const input = 'foo "zig zag" \'abc def\'';
			const tokens = tokeniser.tokenise(input);
			expect(tokens).toEqual([
				{s: '', v: 'foo', q: false},
				{s: ' ', v: 'zig zag', q: true},
				{s: ' ', v: 'abc def', q: true},
			]);
		});

		it('ignores comments', () => {
			const input = 'foo # bar baz\nzig';
			const tokens = tokeniser.tokenise(input);
			expect(tokens).toEqual([
				{s: '', v: 'foo', q: false},
				{s: '', v: '\n', q: false},
				{s: '', v: 'zig', q: false},
			]);
		});

		it('ignores quotes within comments', () => {
			const input = 'foo # bar "\'baz\nzig';
			const tokens = tokeniser.tokenise(input);
			expect(tokens).toEqual([
				{s: '', v: 'foo', q: false},
				{s: '', v: '\n', q: false},
				{s: '', v: 'zig', q: false},
			]);
		});

		it('interprets special characters within quoted strings', () => {
			const input = 'foo "zig\\" zag\\n"';
			const tokens = tokeniser.tokenise(input);
			expect(tokens).toEqual([
				{s: '', v: 'foo', q: false},
				{s: ' ', v: 'zig" zag\n', q: true},
			]);
		});

		it('maintains whitespace and newlines within quoted strings', () => {
			const input = 'foo " zig\n  zag  "';
			const tokens = tokeniser.tokenise(input);
			expect(tokens).toEqual([
				{s: '', v: 'foo', q: false},
				{s: ' ', v: ' zig\n  zag  ', q: true},
			]);
		});

		it('rejects unterminated quoted values', () => {
			expect(() => tokeniser.tokenise('"nope')).toThrow();
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
