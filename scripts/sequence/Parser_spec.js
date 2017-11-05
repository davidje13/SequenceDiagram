defineDescribe('Sequence Parser', ['./Parser'], (Parser) => {
	'use strict';

	const parser = new Parser();

	const PARSED = {
		connect: (agentNames, {
			line = jasmine.anything(),
			left = jasmine.anything(),
			right = jasmine.anything(),
			label = jasmine.anything(),
		} = {}) => {
			return {
				type: 'connect',
				agents: agentNames.map((name) => ({
					name,
					alias: '',
					flags: [],
				})),
				label,
				options: {
					line,
					left,
					right,
				},
			};
		},
	};

	describe('.parse', () => {
		it('returns an empty sequence for blank input', () => {
			const parsed = parser.parse('');
			expect(parsed).toEqual({
				meta: {
					title: '',
					theme: '',
					terminators: 'none',
				},
				stages: [],
			});
		});

		it('reads title metadata', () => {
			const parsed = parser.parse('title foo');
			expect(parsed.meta.title).toEqual('foo');
		});

		it('reads theme metadata', () => {
			const parsed = parser.parse('theme foo');
			expect(parsed.meta.theme).toEqual('foo');
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
				PARSED.connect(['A', 'B']),
			]);
		});

		it('combines multiple tokens into single entries', () => {
			const parsed = parser.parse('A B -> C D');
			expect(parsed.stages).toEqual([
				PARSED.connect(['A B', 'C D']),
			]);
		});

		it('propagates aliases', () => {
			const parsed = parser.parse('define Foo Bar as A B');
			expect(parsed.stages).toEqual([
				{type: 'agent define', agents: [
					{name: 'Foo Bar', alias: 'A B', flags: []},
				]},
			]);
		});

		it('respects spacing within agent names', () => {
			const parsed = parser.parse('A+B -> C  D');
			expect(parsed.stages).toEqual([
				PARSED.connect(['A+B', 'C  D']),
			]);
		});

		it('parses optional labels', () => {
			const parsed = parser.parse('A B -> C D: foo bar');
			expect(parsed.stages).toEqual([
				PARSED.connect(['A B', 'C D'], {label: 'foo bar'}),
			]);
		});

		it('parses optional flags', () => {
			const parsed = parser.parse('+A -> -*!B');
			expect(parsed.stages).toEqual([
				{
					type: 'connect',
					agents: [
						{name: 'A', alias: '', flags: ['start']},
						{name: 'B', alias: '', flags: [
							'stop',
							'begin',
							'end',
						]},
					],
					label: jasmine.anything(),
					options: jasmine.anything(),
				},
			]);
		});

		it('rejects duplicate flags', () => {
			expect(() => parser.parse('A -> +*+B')).toThrow();
			expect(() => parser.parse('A -> **B')).toThrow();
		});

		it('rejects missing agent names', () => {
			expect(() => parser.parse('A -> +')).toThrow();
		});

		it('converts multiple entries', () => {
			const parsed = parser.parse('A -> B\nB -> A');
			expect(parsed.stages).toEqual([
				PARSED.connect(['A', 'B']),
				PARSED.connect(['B', 'A']),
			]);
		});

		it('ignores blank lines', () => {
			const parsed = parser.parse('A -> B\n\nB -> A\n');
			expect(parsed.stages).toEqual([
				PARSED.connect(['A', 'B']),
				PARSED.connect(['B', 'A']),
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
				PARSED.connect(['A', 'B'], {
					line: 'solid',
					left: false,
					right: true,
					label: '',
				}),
				PARSED.connect(['A', 'B'], {
					line: 'solid',
					left: true,
					right: false,
					label: '',
				}),
				PARSED.connect(['A', 'B'], {
					line: 'solid',
					left: true,
					right: true,
					label: '',
				}),
				PARSED.connect(['A', 'B'], {
					line: 'dash',
					left: false,
					right: true,
					label: '',
				}),
				PARSED.connect(['A', 'B'], {
					line: 'dash',
					left: true,
					right: false,
					label: '',
				}),
				PARSED.connect(['A', 'B'], {
					line: 'dash',
					left: true,
					right: true,
					label: '',
				}),
			]);
		});

		it('ignores arrows within the label', () => {
			const parsed = parser.parse(
				'A <- B: B -> A\n' +
				'A -> B: B <- A\n'
			);
			expect(parsed.stages).toEqual([
				PARSED.connect(['A', 'B'], {
					line: 'solid',
					left: true,
					right: false,
					label: 'B -> A',
				}),
				PARSED.connect(['A', 'B'], {
					line: 'solid',
					left: false,
					right: true,
					label: 'B <- A',
				}),
			]);
		});

		it('converts notes', () => {
			const parsed = parser.parse('note over A: hello there');
			expect(parsed.stages).toEqual([{
				type: 'note over',
				agents: [{name: 'A', alias: '', flags: []}],
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
					agents: [{name: 'A', alias: '', flags: []}],
					mode: 'note',
					label: 'hello there',
				},
				{
					type: 'note left',
					agents: [{name: 'A', alias: '', flags: []}],
					mode: 'note',
					label: 'hello there',
				},
				{
					type: 'note right',
					agents: [{name: 'A', alias: '', flags: []}],
					mode: 'note',
					label: 'hello there',
				},
				{
					type: 'note right',
					agents: [{name: 'A', alias: '', flags: []}],
					mode: 'note',
					label: 'hello there',
				},
				{
					type: 'note between',
					agents: [
						{name: 'A', alias: '', flags: []},
						{name: 'B', alias: '', flags: []},
					],
					mode: 'note',
					label: 'hi',
				},
			]);
		});

		it('allows multiple agents for notes', () => {
			const parsed = parser.parse('note over A B, C D: hi');
			expect(parsed.stages).toEqual([{
				type: 'note over',
				agents: [
					{name: 'A B', alias: '', flags: []},
					{name: 'C D', alias: '', flags: []},
				],
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
				agents: [{name: 'A', alias: '', flags: []}],
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
				agents: [{name: 'A', alias: '', flags: []}],
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
				{
					type: 'agent define',
					agents: [
						{name: 'A', alias: '', flags: []},
						{name: 'B', alias: '', flags: []},
					],
				},
				{
					type: 'agent begin',
					agents: [
						{name: 'A', alias: '', flags: []},
						{name: 'B', alias: '', flags: []},
					],
					mode: 'box',
				},
				{
					type: 'agent end',
					agents: [
						{name: 'A', alias: '', flags: []},
						{name: 'B', alias: '', flags: []},
					],
					mode: 'cross',
				},
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
				PARSED.connect(['A', 'B']),
				{type: 'block split', mode: 'else', label: 'something else'},
				PARSED.connect(['A', 'C']),
				PARSED.connect(['C', 'B']),
				{type: 'block split', mode: 'else', label: ''},
				PARSED.connect(['A', 'D']),
				{type: 'block end'},
			]);
		});

		it('converts loop blocks', () => {
			const parsed = parser.parse('repeat until something');
			expect(parsed.stages).toEqual([
				{type: 'block begin', mode: 'repeat', label: 'until something'},
			]);
		});

		it('rejects quoted keywords', () => {
			expect(() => parser.parse('"repeat" until something')).toThrow();
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
