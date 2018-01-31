defineDescribe('Sequence Parser', ['./Parser'], (Parser) => {
	'use strict';

	const parser = new Parser();

	const PARSED = {
		blockBegin: ({
			ln = jasmine.anything(),
			blockType = jasmine.anything(),
			tag = jasmine.anything(),
			label = jasmine.anything(),
		} = {}) => {
			return {
				type: 'block begin',
				ln,
				blockType,
				tag,
				label,
			};
		},

		blockSplit: ({
			ln = jasmine.anything(),
			blockType = jasmine.anything(),
			tag = jasmine.anything(),
			label = jasmine.anything(),
		} = {}) => {
			return {
				type: 'block split',
				ln,
				blockType,
				tag,
				label,
			};
		},

		blockEnd: ({
			ln = jasmine.anything(),
		} = {}) => {
			return {
				type: 'block end',
				ln,
			};
		},

		connect: (agentNames, {
			ln = jasmine.anything(),
			line = jasmine.anything(),
			left = jasmine.anything(),
			right = jasmine.anything(),
			label = jasmine.anything(),
		} = {}) => {
			return {
				type: 'connect',
				ln,
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
					code: '',
					terminators: 'none',
					headers: 'box',
					textFormatter: jasmine.anything(),
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

		it('propagates original source as metadata', () => {
			const parsed = parser.parse('theme foo');
			expect(parsed.meta.code).toEqual('theme foo');
		});

		it('reads terminators metadata', () => {
			const parsed = parser.parse('terminators bar');
			expect(parsed.meta.terminators).toEqual('bar');
		});

		it('reads headers metadata', () => {
			const parsed = parser.parse('headers bar');
			expect(parsed.meta.headers).toEqual('bar');
		});

		it('propagates a function which can be used to format text', () => {
			const parsed = parser.parse('title foo');
			expect(parsed.meta.textFormatter).toEqual(jasmine.any(Function));
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
				{type: 'agent define', ln: jasmine.anything(), agents: [
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
					ln: jasmine.anything(),
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
			expect(() => parser.parse('A -> +*+B')).toThrow(new Error(
				'Duplicate agent flag: + at line 1, character 7'
			));
			expect(() => parser.parse('A -> **B')).toThrow(new Error(
				'Duplicate agent flag: * at line 1, character 6'
			));
		});

		it('rejects missing agent names', () => {
			expect(() => parser.parse('A -> +')).toThrow(new Error(
				'Missing agent name at line 1, character 6'
			));
		});

		it('parses source agents', () => {
			const parsed = parser.parse('A -> *');
			expect(parsed.stages).toEqual([
				{
					type: 'connect',
					ln: jasmine.anything(),
					agents: [
						{name: 'A', alias: '', flags: []},
						{name: '', alias: '', flags: ['source']},
					],
					label: jasmine.anything(),
					options: jasmine.anything(),
				},
			]);
		});

		it('parses source agents with labels', () => {
			const parsed = parser.parse('A -> *: foo');
			expect(parsed.stages).toEqual([
				{
					type: 'connect',
					ln: jasmine.anything(),
					agents: [
						{name: 'A', alias: '', flags: []},
						{name: '', alias: '', flags: ['source']},
					],
					label: 'foo',
					options: jasmine.anything(),
				},
			]);
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

		it('stores line numbers', () => {
			const parsed = parser.parse('A -> B\nB -> A');
			expect(parsed.stages).toEqual([
				PARSED.connect(['A', 'B'], {ln: 0}),
				PARSED.connect(['B', 'A'], {ln: 1}),
			]);
		});

		it('recognises all types of connection', () => {
			const parsed = parser.parse(
				'A->B\n' +
				'A->>B\n' +
				'A<-B\n' +
				'A<->B\n' +
				'A<->>B\n' +
				'A<<-B\n' +
				'A<<->B\n' +
				'A<<->>B\n' +
				'A-xB\n' +
				'A-->B\n' +
				'A-->>B\n' +
				'A<--B\n' +
				'A<-->B\n' +
				'A<-->>B\n' +
				'A<<--B\n' +
				'A<<-->B\n' +
				'A<<-->>B\n' +
				'A--xB\n' +
				'A~>B\n' +
				'A~>>B\n' +
				'A<~B\n' +
				'A<~>B\n' +
				'A<~>>B\n' +
				'A<<~B\n' +
				'A<<~>B\n' +
				'A<<~>>B\n' +
				'A~xB\n'
			);
			expect(parsed.stages).toEqual([
				PARSED.connect(['A', 'B'], {
					line: 'solid',
					left: 0,
					right: 1,
					label: '',
				}),
				PARSED.connect(['A', 'B'], {line: 'solid', left: 0, right: 2}),
				PARSED.connect(['A', 'B'], {line: 'solid', left: 1, right: 0}),
				PARSED.connect(['A', 'B'], {line: 'solid', left: 1, right: 1}),
				PARSED.connect(['A', 'B'], {line: 'solid', left: 1, right: 2}),
				PARSED.connect(['A', 'B'], {line: 'solid', left: 2, right: 0}),
				PARSED.connect(['A', 'B'], {line: 'solid', left: 2, right: 1}),
				PARSED.connect(['A', 'B'], {line: 'solid', left: 2, right: 2}),
				PARSED.connect(['A', 'B'], {line: 'solid', left: 0, right: 3}),
				PARSED.connect(['A', 'B'], {line: 'dash', left: 0, right: 1}),
				PARSED.connect(['A', 'B'], {line: 'dash', left: 0, right: 2}),
				PARSED.connect(['A', 'B'], {line: 'dash', left: 1, right: 0}),
				PARSED.connect(['A', 'B'], {line: 'dash', left: 1, right: 1}),
				PARSED.connect(['A', 'B'], {line: 'dash', left: 1, right: 2}),
				PARSED.connect(['A', 'B'], {line: 'dash', left: 2, right: 0}),
				PARSED.connect(['A', 'B'], {line: 'dash', left: 2, right: 1}),
				PARSED.connect(['A', 'B'], {line: 'dash', left: 2, right: 2}),
				PARSED.connect(['A', 'B'], {line: 'dash', left: 0, right: 3}),
				PARSED.connect(['A', 'B'], {line: 'wave', left: 0, right: 1}),
				PARSED.connect(['A', 'B'], {line: 'wave', left: 0, right: 2}),
				PARSED.connect(['A', 'B'], {line: 'wave', left: 1, right: 0}),
				PARSED.connect(['A', 'B'], {line: 'wave', left: 1, right: 1}),
				PARSED.connect(['A', 'B'], {line: 'wave', left: 1, right: 2}),
				PARSED.connect(['A', 'B'], {line: 'wave', left: 2, right: 0}),
				PARSED.connect(['A', 'B'], {line: 'wave', left: 2, right: 1}),
				PARSED.connect(['A', 'B'], {line: 'wave', left: 2, right: 2}),
				PARSED.connect(['A', 'B'], {line: 'wave', left: 0, right: 3}),
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
					left: 1,
					right: 0,
					label: 'B -> A',
				}),
				PARSED.connect(['A', 'B'], {
					line: 'solid',
					left: 0,
					right: 1,
					label: 'B <- A',
				}),
			]);
		});

		it('converts delayed connections', () => {
			const parsed = parser.parse('+A <- ...foo\n...foo -> -B: woo');
			expect(parsed.stages).toEqual([
				{
					type: 'connect-delay-begin',
					ln: jasmine.anything(),
					tag: 'foo',
					agent: {
						name: 'A',
						alias: '',
						flags: ['start'],
					},
					options: {
						line: 'solid',
						left: 1,
						right: 0,
					},
				},
				{
					type: 'connect-delay-end',
					ln: jasmine.anything(),
					tag: 'foo',
					agent: {
						name: 'B',
						alias: '',
						flags: ['stop'],
					},
					label: 'woo',
					options: {
						line: 'solid',
						left: 0,
						right: 1,
					},
				},
			]);
		});

		it('converts notes', () => {
			const parsed = parser.parse('note over A: hello there');
			expect(parsed.stages).toEqual([{
				type: 'note over',
				ln: jasmine.anything(),
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
					ln: jasmine.anything(),
					agents: [{name: 'A', alias: '', flags: []}],
					mode: 'note',
					label: 'hello there',
				},
				{
					type: 'note left',
					ln: jasmine.anything(),
					agents: [{name: 'A', alias: '', flags: []}],
					mode: 'note',
					label: 'hello there',
				},
				{
					type: 'note right',
					ln: jasmine.anything(),
					agents: [{name: 'A', alias: '', flags: []}],
					mode: 'note',
					label: 'hello there',
				},
				{
					type: 'note right',
					ln: jasmine.anything(),
					agents: [{name: 'A', alias: '', flags: []}],
					mode: 'note',
					label: 'hello there',
				},
				{
					type: 'note between',
					ln: jasmine.anything(),
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
				ln: jasmine.anything(),
				agents: [
					{name: 'A B', alias: '', flags: []},
					{name: 'C D', alias: '', flags: []},
				],
				mode: 'note',
				label: 'hi',
			}]);
		});

		it('rejects note between for a single agent', () => {
			expect(() => parser.parse('note between A: hi')).toThrow(new Error(
				'Too few agents for note at line 1, character 0'
			));
		});

		it('converts state', () => {
			const parsed = parser.parse('state over A: doing stuff');
			expect(parsed.stages).toEqual([{
				type: 'note over',
				ln: jasmine.anything(),
				agents: [{name: 'A', alias: '', flags: []}],
				mode: 'state',
				label: 'doing stuff',
			}]);
		});

		it('rejects multiple agents for state', () => {
			expect(() => parser.parse('state over A, B: hi')).toThrow(new Error(
				'Too many agents for state at line 1, character 0'
			));
		});

		it('converts text blocks', () => {
			const parsed = parser.parse('text right of A: doing stuff');
			expect(parsed.stages).toEqual([{
				type: 'note right',
				ln: jasmine.anything(),
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
					ln: jasmine.anything(),
					agents: [
						{name: 'A', alias: '', flags: []},
						{name: 'B', alias: '', flags: []},
					],
				},
				{
					type: 'agent begin',
					ln: jasmine.anything(),
					agents: [
						{name: 'A', alias: '', flags: []},
						{name: 'B', alias: '', flags: []},
					],
					mode: 'box',
				},
				{
					type: 'agent end',
					ln: jasmine.anything(),
					agents: [
						{name: 'A', alias: '', flags: []},
						{name: 'B', alias: '', flags: []},
					],
					mode: 'cross',
				},
			]);
		});

		it('converts dividers', () => {
			const parsed = parser.parse('divider');
			expect(parsed.stages).toEqual([{
				type: 'divider',
				ln: jasmine.anything(),
				mode: 'line',
				height: 6,
				label: '',
			}]);
		});

		it('converts different divider types', () => {
			const parsed = parser.parse(
				'divider line\n' +
				'divider space\n' +
				'divider delay\n' +
				'divider tear\n'
			);
			expect(parsed.stages).toEqual([
				{
					type: 'divider',
					ln: jasmine.anything(),
					mode: 'line',
					height: 6,
					label: jasmine.anything(),
				},
				{
					type: 'divider',
					ln: jasmine.anything(),
					mode: 'space',
					height: 6,
					label: jasmine.anything(),
				},
				{
					type: 'divider',
					ln: jasmine.anything(),
					mode: 'delay',
					height: 30,
					label: jasmine.anything(),
				},
				{
					type: 'divider',
					ln: jasmine.anything(),
					mode: 'tear',
					height: 6,
					label: jasmine.anything(),
				},
			]);
		});

		it('converts explicit divider heights', () => {
			const parsed = parser.parse(
				'divider with height 40\n' +
				'divider delay with height 0\n'
			);
			expect(parsed.stages).toEqual([
				{
					type: 'divider',
					ln: jasmine.anything(),
					mode: 'line',
					height: 40,
					label: '',
				},
				{
					type: 'divider',
					ln: jasmine.anything(),
					mode: 'delay',
					height: 0,
					label: '',
				},
			]);
		});

		it('converts divider labels', () => {
			const parsed = parser.parse(
				'divider: message 1\n' +
				'divider tear: message 2\n' +
				'divider delay with height 40: message 3\n'
			);
			expect(parsed.stages).toEqual([
				{
					type: 'divider',
					ln: jasmine.anything(),
					mode: jasmine.anything(),
					height: jasmine.anything(),
					label: 'message 1',
				},
				{
					type: 'divider',
					ln: jasmine.anything(),
					mode: jasmine.anything(),
					height: jasmine.anything(),
					label: 'message 2',
				},
				{
					type: 'divider',
					ln: jasmine.anything(),
					mode: jasmine.anything(),
					height: jasmine.anything(),
					label: 'message 3',
				},
			]);
		});

		it('converts reference commands', () => {
			const parsed = parser.parse(
				'begin reference: Foo bar as baz\n' +
				'begin reference over A, B: Foo bar as baz\n'
			);
			expect(parsed.stages).toEqual([
				{
					type: 'group begin',
					ln: jasmine.anything(),
					agents: [],
					blockType: 'ref',
					tag: 'ref',
					label: 'Foo bar',
					alias: 'baz',
				},
				{
					type: 'group begin',
					ln: jasmine.anything(),
					agents: [
						{name: 'A', alias: '', flags: []},
						{name: 'B', alias: '', flags: []},
					],
					blockType: 'ref',
					tag: 'ref',
					label: 'Foo bar',
					alias: 'baz',
				},
			]);
		});

		it('converts markers', () => {
			const parsed = parser.parse('abc:');
			expect(parsed.stages).toEqual([{
				type: 'mark',
				ln: jasmine.anything(),
				name: 'abc',
			}]);
		});

		it('converts autolabel commands', () => {
			const parsed = parser.parse('autolabel "foo <label> bar"');
			expect(parsed.stages).toEqual([
				{
					type: 'label pattern',
					ln: jasmine.anything(),
					pattern: [
						'foo ',
						{token: 'label'},
						' bar',
					],
				},
			]);
		});

		it('converts autolabel off commands', () => {
			const parsed = parser.parse('autolabel off');
			expect(parsed.stages).toEqual([
				{
					type: 'label pattern',
					ln: jasmine.anything(),
					pattern: [{token: 'label'}],
				},
			]);
		});

		it('converts "simultaneously" flow commands', () => {
			const parsed = parser.parse('simultaneously:');
			expect(parsed.stages).toEqual([{
				type: 'async',
				ln: jasmine.anything(),
				target: '',
			}]);
		});

		it('converts named "simultaneously" flow commands', () => {
			const parsed = parser.parse('simultaneously with abc:');
			expect(parsed.stages).toEqual([{
				type: 'async',
				ln: jasmine.anything(),
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
				PARSED.blockBegin({
					blockType: 'if',
					tag: 'if',
					label: 'something happens',
				}),
				PARSED.connect(['A', 'B']),
				PARSED.blockSplit({
					blockType: 'else',
					tag: 'else',
					label: 'something else',
				}),
				PARSED.connect(['A', 'C']),
				PARSED.connect(['C', 'B']),
				PARSED.blockSplit({
					blockType: 'else',
					tag: 'else',
					label: '',
				}),
				PARSED.connect(['A', 'D']),
				PARSED.blockEnd(),
			]);
		});

		it('converts loop blocks', () => {
			const parsed = parser.parse('repeat until something');
			expect(parsed.stages).toEqual([
				PARSED.blockBegin({
					blockType: 'repeat',
					tag: 'repeat',
					label: 'until something',
				}),
			]);
		});

		it('rejects quoted keywords', () => {
			expect(() => parser.parse('"repeat" until something')).toThrow();
		});

		it('rejects invalid inputs', () => {
			expect(() => parser.parse('huh')).toThrow(new Error(
				'Unrecognised command: huh at line 1, character 0'
			));
		});

		it('rejects partial links', () => {
			expect(() => parser.parse('-> A')).toThrow();
			expect(() => parser.parse('A ->')).toThrow();
			expect(() => parser.parse('A -> : hello')).toThrow();
		});

		it('rejects messages on delayed connections', () => {
			expect(() => parser.parse('A -> ...a: nope')).toThrow(new Error(
				'Cannot label beginning of delayed connection' +
				' at line 1, character 9'
			));
		});

		it('rejects invalid terminators', () => {
			expect(() => parser.parse('terminators foo')).toThrow(new Error(
				'Unknown termination "foo" at line 1, character 12'
			));
		});

		it('rejects missing terminators', () => {
			expect(() => parser.parse('terminators')).toThrow(new Error(
				'Unspecified termination at line 1, character 0'
			));
		});

		it('rejects invalid headers', () => {
			expect(() => parser.parse('headers foo')).toThrow(new Error(
				'Unknown header "foo" at line 1, character 8'
			));
		});

		it('rejects missing headers', () => {
			expect(() => parser.parse('headers')).toThrow(new Error(
				'Unspecified header at line 1, character 0'
			));
		});

		it('rejects malformed notes', () => {
			expect(() => parser.parse('note over A hello')).toThrow();
		});

		it('rejects malformed block commands', () => {
			expect(() => parser.parse('else nope foo')).toThrow(new Error(
				'Invalid block command; expected "if" at line 1, character 5'
			));
		});

		it('rejects invalid notes', () => {
			expect(() => parser.parse('note huh A: hello')).toThrow();
		});

		it('rejects unknown divider types', () => {
			expect(() => parser.parse('divider foo')).toThrow(new Error(
				'Unknown divider type at line 1, character 8'
			));
		});

		it('rejects negative divider heights', () => {
			expect(() => parser.parse(
				'divider with height -5'
			)).toThrow(new Error(
				'Invalid divider height at line 1, character 20'
			));
		});

		it('rejects invalid divider heights', () => {
			expect(() => parser.parse(
				'divider with height a'
			)).toThrow(new Error(
				'Invalid divider height at line 1, character 20'
			));
		});
	});
});
