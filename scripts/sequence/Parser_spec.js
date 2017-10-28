defineDescribe('Sequence Parser', ['./Parser'], (Parser) => {
	'use strict';

	const parser = new Parser();

	describe('.tokenise', () => {
		it('converts the source into atomic tokens', () => {
			const input = 'foo bar -> baz';
			const tokens = parser.tokenise(input);
			expect(tokens).toEqual(['foo', 'bar', '->', 'baz']);
		});

		it('splits tokens at flexible boundaries', () => {
			const input = 'foo bar->baz';
			const tokens = parser.tokenise(input);
			expect(tokens).toEqual(['foo', 'bar', '->', 'baz']);
		});

		it('parses newlines as tokens', () => {
			const input = 'foo bar\nbaz';
			const tokens = parser.tokenise(input);
			expect(tokens).toEqual(['foo', 'bar', '\n', 'baz']);
		});

		it('removes leading and trailing whitespace', () => {
			const input = '  foo \t bar\t\n baz';
			const tokens = parser.tokenise(input);
			expect(tokens).toEqual(['foo', 'bar', '\n', 'baz']);
		});

		it('parses quoted strings as single tokens', () => {
			const input = 'foo "zig zag" \'abc def\'';
			const tokens = parser.tokenise(input);
			expect(tokens).toEqual(['foo', 'zig zag', 'abc def']);
		});

		it('ignores comments', () => {
			const input = 'foo # bar baz\nzig';
			const tokens = parser.tokenise(input);
			expect(tokens).toEqual(['foo', '\n', 'zig']);
		});

		it('ignores quotes within comments', () => {
			const input = 'foo # bar "\'baz\nzig';
			const tokens = parser.tokenise(input);
			expect(tokens).toEqual(['foo', '\n', 'zig']);
		});

		it('interprets special characters within quoted strings', () => {
			const input = 'foo "zig\\" zag\\n"';
			const tokens = parser.tokenise(input);
			expect(tokens).toEqual(['foo', 'zig" zag\n']);
		});

		it('maintains whitespace and newlines within quoted strings', () => {
			const input = 'foo " zig\n  zag  "';
			const tokens = parser.tokenise(input);
			expect(tokens).toEqual(['foo', ' zig\n  zag  ']);
		});

		it('rejects unterminated quoted values', () => {
			expect(() => parser.tokenise('"nope')).toThrow();
		});
	});

	describe('.splitLines', () => {
		it('combines tokens', () => {
			const lines = parser.splitLines(['abc', 'd']);
			expect(lines).toEqual([
				['abc', 'd'],
			]);
		});

		it('splits at newlines', () => {
			const lines = parser.splitLines(['abc', 'd', '\n', 'e']);
			expect(lines).toEqual([
				['abc', 'd'],
				['e'],
			]);
		});

		it('ignores multiple newlines', () => {
			const lines = parser.splitLines(['abc', 'd', '\n', '\n', 'e']);
			expect(lines).toEqual([
				['abc', 'd'],
				['e'],
			]);
		});

		it('ignores trailing newlines', () => {
			const lines = parser.splitLines(['abc', 'd', '\n', 'e', '\n']);
			expect(lines).toEqual([
				['abc', 'd'],
				['e'],
			]);
		});

		it('handles empty input', () => {
			const lines = parser.splitLines([]);
			expect(lines).toEqual([]);
		});
	});

	function connectionStage(agents, label = '') {
		return {
			type: 'connection',
			line: 'solid',
			left: false,
			right: true,
			agents,
			label,
		};
	}

	describe('.parse', () => {
		it('returns an empty sequence for blank input', () => {
			const parsed = parser.parse('');
			expect(parsed).toEqual({
				meta: {
					title: '',
					terminators: 'none',
				},
				stages: [],
			});
		});

		it('reads title metadata', () => {
			const parsed = parser.parse('title foo');
			expect(parsed.meta.title).toEqual('foo');
		});

		it('reads terminators metadata', () => {
			const parsed = parser.parse('terminators bar');
			expect(parsed.meta.terminators).toEqual('bar');
		});

		it('reads multiple tokens as one when reading values', () => {
			const parsed = parser.parse('title foo bar');
			expect(parsed.meta.title).toEqual('foo bar');
		});

		it('converts entries into abstract form', () => {
			const parsed = parser.parse('A -> B');
			expect(parsed.stages).toEqual([
				connectionStage(['A', 'B']),
			]);
		});

		it('combines multiple tokens into single entries', () => {
			const parsed = parser.parse('A B -> C D');
			expect(parsed.stages).toEqual([
				connectionStage(['A B', 'C D']),
			]);
		});

		it('parses optional labels', () => {
			const parsed = parser.parse('A B -> C D: foo bar');
			expect(parsed.stages).toEqual([
				connectionStage(['A B', 'C D'], 'foo bar'),
			]);
		});

		it('converts multiple entries', () => {
			const parsed = parser.parse('A -> B\nB -> A');
			expect(parsed.stages).toEqual([
				connectionStage(['A', 'B']),
				connectionStage(['B', 'A']),
			]);
		});

		it('ignores blank lines', () => {
			const parsed = parser.parse('A -> B\n\nB -> A\n');
			expect(parsed.stages).toEqual([
				connectionStage(['A', 'B']),
				connectionStage(['B', 'A']),
			]);
		});

		it('recognises all types of connection', () => {
			const parsed = parser.parse(
				'A -> B\n' +
				'A <- B\n' +
				'A <-> B\n' +
				'A --> B\n' +
				'A <-- B\n' +
				'A <--> B\n'
			);
			expect(parsed.stages).toEqual([
				{
					type: 'connection',
					line: 'solid',
					left: false,
					right: true,
					agents: ['A', 'B'],
					label: '',
				},
				{
					type: 'connection',
					line: 'solid',
					left: true,
					right: false,
					agents: ['A', 'B'],
					label: '',
				},
				{
					type: 'connection',
					line: 'solid',
					left: true,
					right: true,
					agents: ['A', 'B'],
					label: '',
				},
				{
					type: 'connection',
					line: 'dash',
					left: false,
					right: true,
					agents: ['A', 'B'],
					label: '',
				},
				{
					type: 'connection',
					line: 'dash',
					left: true,
					right: false,
					agents: ['A', 'B'],
					label: '',
				},
				{
					type: 'connection',
					line: 'dash',
					left: true,
					right: true,
					agents: ['A', 'B'],
					label: '',
				},
			]);
		});

		it('ignores arrows within the label', () => {
			const parsed = parser.parse(
				'A <- B: B -> A\n' +
				'A -> B: B <- A\n'
			);
			expect(parsed.stages).toEqual([
				{
					type: 'connection',
					line: 'solid',
					left: true,
					right: false,
					agents: ['A', 'B'],
					label: 'B -> A',
				},
				{
					type: 'connection',
					line: 'solid',
					left: false,
					right: true,
					agents: ['A', 'B'],
					label: 'B <- A',
				},
			]);
		});

		it('converts notes', () => {
			const parsed = parser.parse('note over A: hello there');
			expect(parsed.stages).toEqual([{
				type: 'note over',
				agents: ['A'],
				mode: 'note',
				label: 'hello there',
			}]);
		});

		it('converts different note types', () => {
			const parsed = parser.parse(
				'note left A: hello there\n' +
				'note left of A: hello there\n' +
				'note right A: hello there\n' +
				'note right of A: hello there\n' +
				'note between A, B: hi\n'
			);
			expect(parsed.stages).toEqual([
				{
					type: 'note left',
					agents: ['A'],
					mode: 'note',
					label: 'hello there',
				},
				{
					type: 'note left',
					agents: ['A'],
					mode: 'note',
					label: 'hello there',
				},
				{
					type: 'note right',
					agents: ['A'],
					mode: 'note',
					label: 'hello there',
				},
				{
					type: 'note right',
					agents: ['A'],
					mode: 'note',
					label: 'hello there',
				},
				{
					type: 'note between',
					agents: ['A', 'B'],
					mode: 'note',
					label: 'hi',
				},
			]);
		});

		it('allows multiple agents for notes', () => {
			const parsed = parser.parse('note over A B, C D: hi');
			expect(parsed.stages).toEqual([{
				type: 'note over',
				agents: ['A B', 'C D'],
				mode: 'note',
				label: 'hi',
			}]);
		});

		it('rejects note between for a single agent', () => {
			expect(() => parser.parse('note between A: hi')).toThrow();
		});

		it('converts state', () => {
			const parsed = parser.parse('state over A: doing stuff');
			expect(parsed.stages).toEqual([{
				type: 'note over',
				agents: ['A'],
				mode: 'state',
				label: 'doing stuff',
			}]);
		});

		it('rejects multiple agents for state', () => {
			expect(() => parser.parse('state over A, B: hi')).toThrow();
		});

		it('converts text blocks', () => {
			const parsed = parser.parse('text right of A: doing stuff');
			expect(parsed.stages).toEqual([{
				type: 'note right',
				agents: ['A'],
				mode: 'text',
				label: 'doing stuff',
			}]);
		});

		it('converts agent commands', () => {
			const parsed = parser.parse(
				'define A, B\n' +
				'begin A, B\n' +
				'end A, B\n'
			);
			expect(parsed.stages).toEqual([
				{type: 'agent define', agents: ['A', 'B']},
				{type: 'agent begin', agents: ['A', 'B'], mode: 'box'},
				{type: 'agent end', agents: ['A', 'B'], mode: 'cross'},
			]);
		});

		it('converts markers', () => {
			const parsed = parser.parse('abc:');
			expect(parsed.stages).toEqual([{
				type: 'mark',
				name: 'abc',
			}]);
		});

		it('converts "simultaneously" flow commands', () => {
			const parsed = parser.parse('simultaneously:');
			expect(parsed.stages).toEqual([{
				type: 'async',
				target: '',
			}]);
		});

		it('converts named "simultaneously" flow commands', () => {
			const parsed = parser.parse('simultaneously with abc:');
			expect(parsed.stages).toEqual([{
				type: 'async',
				target: 'abc',
			}]);
		});

		it('converts conditional blocks', () => {
			const parsed = parser.parse(
				'if something happens\n' +
				'  A -> B\n' +
				'else if something else\n' +
				'  A -> C\n' +
				'  C -> B\n' +
				'else\n' +
				'  A -> D\n' +
				'end\n'
			);
			expect(parsed.stages).toEqual([
				{type: 'block begin', mode: 'if', label: 'something happens'},
				connectionStage(['A', 'B']),
				{type: 'block split', mode: 'else', label: 'something else'},
				connectionStage(['A', 'C']),
				connectionStage(['C', 'B']),
				{type: 'block split', mode: 'else', label: ''},
				connectionStage(['A', 'D']),
				{type: 'block end'},
			]);
		});

		it('converts loop blocks', () => {
			const parsed = parser.parse('repeat until something');
			expect(parsed.stages).toEqual([
				{type: 'block begin', mode: 'repeat', label: 'until something'},
			]);
		});

		it('rejects invalid inputs', () => {
			expect(() => parser.parse('huh')).toThrow();
		});

		it('rejects partial links', () => {
			expect(() => parser.parse('-> A')).toThrow();
			expect(() => parser.parse('A ->')).toThrow();
			expect(() => parser.parse('A -> : hello')).toThrow();
		});

		it('rejects invalid terminators', () => {
			expect(() => parser.parse('terminators foo')).toThrow();
		});

		it('rejects malformed notes', () => {
			expect(() => parser.parse('note over A hello')).toThrow();
		});

		it('rejects malformed block commands', () => {
			expect(() => parser.parse('else nope foo')).toThrow();
		});

		it('rejects invalid notes', () => {
			expect(() => parser.parse('note huh A: hello')).toThrow();
		});
	});
});
