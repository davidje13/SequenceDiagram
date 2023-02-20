/* eslint-disable max-lines */

import Parser from './Parser.mjs';

describe('Sequence Parser', () => {
	const parser = new Parser();

	function makeParsedAgents(source) {
		return source.map((item) => {
			const base = {alias: '', flags: [], name: ''};
			if(typeof item === 'object') {
				return Object.assign(base, item);
			} else {
				return Object.assign(base, {name: item});
			}
		});
	}

	const any = () => jasmine.anything();

	const PARSED = {
		agentActivation: (agents, {
			ln = any(),
			activated = any(),
			parallel = false,
		} = {}) => ({
			activated,
			agents: makeParsedAgents(agents),
			ln,
			parallel,
			type: 'agent activation',
		}),

		agentBegin: (agents, {
			ln = any(),
			mode = any(),
			parallel = false,
		} = {}) => ({
			agents: makeParsedAgents(agents),
			ln,
			mode,
			parallel,
			type: 'agent begin',
		}),

		agentDefine: (agents, {
			ln = any(),
			parallel = false,
		} = {}) => ({
			agents: makeParsedAgents(agents),
			ln,
			parallel,
			type: 'agent define',
		}),

		agentEnd: (agents, {
			ln = any(),
			mode = any(),
			parallel = false,
		} = {}) => ({
			agents: makeParsedAgents(agents),
			ln,
			mode,
			parallel,
			type: 'agent end',
		}),

		agentOptions: (agent, options, {
			ln = any(),
			parallel = false,
		} = {}) => ({
			agent: makeParsedAgents([agent])[0],
			ln,
			options,
			parallel,
			type: 'agent options',
		}),

		agentRelabel: (agents, {
			ln = any(),
			parallel = false,
		} = {}) => ({
			agents: makeParsedAgents(agents),
			ln,
			parallel,
			type: 'agent relabel',
		}),

		async: (target, {
			ln = any(),
			parallel = false,
		} = {}) => ({
			ln,
			parallel,
			target,
			type: 'async',
		}),

		blockBegin: (tag, label, {
			blockType = null,
			ln = any(),
			parallel = false,
		} = {}) => ({
			blockType: blockType || tag,
			label,
			ln,
			parallel,
			tag,
			type: 'block begin',
		}),

		blockEnd: ({
			ln = any(),
			parallel = false,
		} = {}) => ({
			ln,
			parallel,
			type: 'block end',
		}),

		blockSplit: (tag, label, {
			blockType = null,
			ln = any(),
			parallel = false,
		} = {}) => ({
			blockType: blockType || tag,
			label,
			ln,
			parallel,
			tag,
			type: 'block split',
		}),

		connect: (agents, {
			label = any(),
			left = any(),
			line = any(),
			ln = any(),
			parallel = false,
			right = any(),
		} = {}) => ({
			agents: makeParsedAgents(agents),
			label,
			ln,
			options: {left, line, right},
			parallel,
			type: 'connect',
		}),

		connectBegin: (agent, tag, {
			left = any(),
			line = any(),
			ln = any(),
			parallel = false,
			right = any(),
		} = {}) => ({
			agent: makeParsedAgents([agent])[0],
			ln,
			options: {left, line, right},
			parallel,
			tag,
			type: 'connect-delay-begin',
		}),

		connectEnd: (agent, tag, {
			label = any(),
			left = any(),
			line = any(),
			ln = any(),
			parallel = false,
			right = any(),
		} = {}) => ({
			agent: makeParsedAgents([agent])[0],
			label,
			ln,
			options: {left, line, right},
			parallel,
			tag,
			type: 'connect-delay-end',
		}),

		divider: ({
			height = any(),
			label = any(),
			ln = any(),
			mode = any(),
			parallel = false,
		} = {}) => ({
			height,
			label,
			ln,
			mode,
			parallel,
			type: 'divider',
		}),

		groupBegin: (agents, {
			alias = any(),
			blockType = any(),
			label = any(),
			ln = any(),
			parallel = false,
			tag = any(),
		} = {}) => ({
			agents: makeParsedAgents(agents),
			alias,
			blockType,
			label,
			ln,
			parallel,
			tag,
			type: 'group begin',
		}),

		labelPattern: (pattern, {
			ln = any(),
			parallel = false,
		} = {}) => ({
			ln,
			parallel,
			pattern,
			type: 'label pattern',
		}),

		mark: (name, {
			ln = any(),
			parallel = false,
		} = {}) => ({
			ln,
			name,
			parallel,
			type: 'mark',
		}),

		note: (position, agents, {
			label = any(),
			ln = any(),
			mode = 'note',
			parallel = false,
		} = {}) => ({
			agents: makeParsedAgents(agents),
			label,
			ln,
			mode,
			parallel,
			type: 'note ' + position,
		}),
	};

	describe('.parse', () => {
		it('returns an empty sequence for blank input', () => {
			const parsed = parser.parse('');

			expect(parsed).toEqual({
				meta: {
					code: '',
					headers: 'box',
					terminators: 'none',
					textFormatter: any(),
					theme: '',
					title: '',
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
			const parsed = parser.parse('define Foo Bar as A');

			expect(parsed.stages).toEqual([
				PARSED.agentDefine([
					{alias: 'A', name: 'Foo Bar'},
				]),
			]);
		});

		it('propagates long aliases', () => {
			const parsed = parser.parse('define Foo Bar as A B');

			expect(parsed.stages).toEqual([
				PARSED.agentDefine([
					{alias: 'A B', name: 'Foo Bar'},
				]),
			]);
		});

		it('ignores missing aliases', () => {
			const parsed = parser.parse('define Foo Bar as');

			expect(parsed.stages).toEqual([
				PARSED.agentDefine(['Foo Bar']),
			]);
		});

		it('propagates agent options', () => {
			const parsed = parser.parse('Foo bar is zig zag');

			expect(parsed.stages).toEqual([
				PARSED.agentOptions('Foo bar', ['zig', 'zag']),
			]);
		});

		it('ignores indefinite articles in agent options', () => {
			const parsed = parser.parse('Foo is a zig\nBar is an oom');

			expect(parsed.stages).toEqual([
				PARSED.agentOptions('Foo', ['zig']),
				PARSED.agentOptions('Bar', ['oom']),
			]);
		});

		it('rejects empty agent options', () => {
			expect(() => parser.parse('Foo is')).toThrow(new Error(
				'Empty agent options at line 1, character 6'
			));

			expect(() => parser.parse('Foo is a')).toThrow(new Error(
				'Empty agent options at line 1, character 8'
			));
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
				PARSED.connect([
					{flags: ['start'], name: 'A'},
					{flags: ['stop', 'begin', 'end'], name: 'B'},
				]),
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

		it('rejects missing agent names with aliases', () => {
			expect(() => parser.parse('define as A')).toThrow(new Error(
				'Missing agent name at line 1, character 7'
			));
		});

		it('parses source agents', () => {
			const parsed = parser.parse('A -> *');

			expect(parsed.stages).toEqual([
				PARSED.connect(['A', {flags: ['source'], name: ''}]),
			]);
		});

		it('parses source agents with labels', () => {
			const parsed = parser.parse('A -> *: foo');

			expect(parsed.stages).toEqual([
				PARSED.connect(['A', {flags: ['source'], name: ''}], {
					label: 'foo',
				}),
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
				'A-~B\n' +
				'A-xB\n' +
				'A<-B\n' +
				'A<->B\n' +
				'A<->>B\n' +
				'A<-~B\n' +
				'A<-xB\n' +
				'A<<-B\n' +
				'A<<->B\n' +
				'A<<->>B\n' +
				'A<<-~B\n' +
				'A<<-xB\n' +
				'A~-B\n' +
				'A~->B\n' +
				'A~->>B\n' +
				'A~-~B\n' +
				'A~-xB\n' +

				'A-->B\n' +
				'A-->>B\n' +
				'A--~B\n' +
				'A--xB\n' +
				'A<--B\n' +
				'A<-->B\n' +
				'A<-->>B\n' +
				'A<--~B\n' +
				'A<--xB\n' +
				'A<<--B\n' +
				'A<<-->B\n' +
				'A<<-->>B\n' +
				'A<<--~B\n' +
				'A<<--xB\n' +
				'A~--B\n' +
				'A~-->B\n' +
				'A~-->>B\n' +
				'A~--~B\n' +
				'A~--xB\n' +

				'A~>B\n' +
				'A~>>B\n' +
				'A~~B\n' +
				'A~xB\n' +
				'A<~B\n' +
				'A<~>B\n' +
				'A<~>>B\n' +
				'A<~~B\n' +
				'A<~xB\n' +
				'A<<~B\n' +
				'A<<~>B\n' +
				'A<<~>>B\n' +
				'A<<~~B\n' +
				'A<<~xB\n' +
				'A~~>B\n' +
				'A~~>>B\n' +
				'A~~~B\n' +
				'A~~xB\n'
			);

			expect(parsed.stages).toEqual([
				PARSED.connect(['A', 'B'], {
					label: '',
					left: 0,
					line: 'solid',
					right: 1,
				}),
				PARSED.connect(['A', 'B'], {left: 0, line: 'solid', right: 2}),
				PARSED.connect(['A', 'B'], {left: 0, line: 'solid', right: 3}),
				PARSED.connect(['A', 'B'], {left: 0, line: 'solid', right: 4}),
				PARSED.connect(['A', 'B'], {left: 1, line: 'solid', right: 0}),
				PARSED.connect(['A', 'B'], {left: 1, line: 'solid', right: 1}),
				PARSED.connect(['A', 'B'], {left: 1, line: 'solid', right: 2}),
				PARSED.connect(['A', 'B'], {left: 1, line: 'solid', right: 3}),
				PARSED.connect(['A', 'B'], {left: 1, line: 'solid', right: 4}),
				PARSED.connect(['A', 'B'], {left: 2, line: 'solid', right: 0}),
				PARSED.connect(['A', 'B'], {left: 2, line: 'solid', right: 1}),
				PARSED.connect(['A', 'B'], {left: 2, line: 'solid', right: 2}),
				PARSED.connect(['A', 'B'], {left: 2, line: 'solid', right: 3}),
				PARSED.connect(['A', 'B'], {left: 2, line: 'solid', right: 4}),
				PARSED.connect(['A', 'B'], {left: 3, line: 'solid', right: 0}),
				PARSED.connect(['A', 'B'], {left: 3, line: 'solid', right: 1}),
				PARSED.connect(['A', 'B'], {left: 3, line: 'solid', right: 2}),
				PARSED.connect(['A', 'B'], {left: 3, line: 'solid', right: 3}),
				PARSED.connect(['A', 'B'], {left: 3, line: 'solid', right: 4}),

				PARSED.connect(['A', 'B'], {left: 0, line: 'dash', right: 1}),
				PARSED.connect(['A', 'B'], {left: 0, line: 'dash', right: 2}),
				PARSED.connect(['A', 'B'], {left: 0, line: 'dash', right: 3}),
				PARSED.connect(['A', 'B'], {left: 0, line: 'dash', right: 4}),
				PARSED.connect(['A', 'B'], {left: 1, line: 'dash', right: 0}),
				PARSED.connect(['A', 'B'], {left: 1, line: 'dash', right: 1}),
				PARSED.connect(['A', 'B'], {left: 1, line: 'dash', right: 2}),
				PARSED.connect(['A', 'B'], {left: 1, line: 'dash', right: 3}),
				PARSED.connect(['A', 'B'], {left: 1, line: 'dash', right: 4}),
				PARSED.connect(['A', 'B'], {left: 2, line: 'dash', right: 0}),
				PARSED.connect(['A', 'B'], {left: 2, line: 'dash', right: 1}),
				PARSED.connect(['A', 'B'], {left: 2, line: 'dash', right: 2}),
				PARSED.connect(['A', 'B'], {left: 2, line: 'dash', right: 3}),
				PARSED.connect(['A', 'B'], {left: 2, line: 'dash', right: 4}),
				PARSED.connect(['A', 'B'], {left: 3, line: 'dash', right: 0}),
				PARSED.connect(['A', 'B'], {left: 3, line: 'dash', right: 1}),
				PARSED.connect(['A', 'B'], {left: 3, line: 'dash', right: 2}),
				PARSED.connect(['A', 'B'], {left: 3, line: 'dash', right: 3}),
				PARSED.connect(['A', 'B'], {left: 3, line: 'dash', right: 4}),

				PARSED.connect(['A', 'B'], {left: 0, line: 'wave', right: 1}),
				PARSED.connect(['A', 'B'], {left: 0, line: 'wave', right: 2}),
				PARSED.connect(['A', 'B'], {left: 0, line: 'wave', right: 3}),
				PARSED.connect(['A', 'B'], {left: 0, line: 'wave', right: 4}),
				PARSED.connect(['A', 'B'], {left: 1, line: 'wave', right: 0}),
				PARSED.connect(['A', 'B'], {left: 1, line: 'wave', right: 1}),
				PARSED.connect(['A', 'B'], {left: 1, line: 'wave', right: 2}),
				PARSED.connect(['A', 'B'], {left: 1, line: 'wave', right: 3}),
				PARSED.connect(['A', 'B'], {left: 1, line: 'wave', right: 4}),
				PARSED.connect(['A', 'B'], {left: 2, line: 'wave', right: 0}),
				PARSED.connect(['A', 'B'], {left: 2, line: 'wave', right: 1}),
				PARSED.connect(['A', 'B'], {left: 2, line: 'wave', right: 2}),
				PARSED.connect(['A', 'B'], {left: 2, line: 'wave', right: 3}),
				PARSED.connect(['A', 'B'], {left: 2, line: 'wave', right: 4}),
				PARSED.connect(['A', 'B'], {left: 3, line: 'wave', right: 1}),
				PARSED.connect(['A', 'B'], {left: 3, line: 'wave', right: 2}),
				PARSED.connect(['A', 'B'], {left: 3, line: 'wave', right: 3}),
				PARSED.connect(['A', 'B'], {left: 3, line: 'wave', right: 4}),
			]);
		});

		it('ignores arrows within the label', () => {
			const parsed = parser.parse(
				'A <- B: B -> A\n' +
				'A -> B: B <- A\n'
			);

			expect(parsed.stages).toEqual([
				PARSED.connect(['A', 'B'], {
					label: 'B -> A',
					left: 1,
					line: 'solid',
					right: 0,
				}),
				PARSED.connect(['A', 'B'], {
					label: 'B <- A',
					left: 0,
					line: 'solid',
					right: 1,
				}),
			]);
		});

		it('converts delayed connections', () => {
			const parsed = parser.parse('+A <- ...foo\n...foo -> -B: woo');

			expect(parsed.stages).toEqual([
				PARSED.connectBegin(
					{flags: ['start'], name: 'A'},
					'foo',
					{left: 1, line: 'solid', right: 0}
				),
				PARSED.connectEnd(
					{flags: ['stop'], name: 'B'},
					'foo',
					{label: 'woo', left: 0, line: 'solid', right: 1}
				),
			]);
		});

		it('converts notes', () => {
			const parsed = parser.parse('note over A: hello there');

			expect(parsed.stages).toEqual([
				PARSED.note('over', ['A'], {label: 'hello there'}),
			]);
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
				PARSED.note('left', ['A'], {label: 'hello there'}),
				PARSED.note('left', ['A'], {label: 'hello there'}),
				PARSED.note('right', ['A'], {label: 'hello there'}),
				PARSED.note('right', ['A'], {label: 'hello there'}),
				PARSED.note('between', ['A', 'B'], {label: 'hi'}),
			]);
		});

		it('allows multiple agents for notes', () => {
			const parsed = parser.parse('note over A B, C D: hi');

			expect(parsed.stages).toEqual([
				PARSED.note('over', ['A B', 'C D'], {label: 'hi'}),
			]);
		});

		it('rejects note between for a single agent', () => {
			expect(() => parser.parse('note between A: hi')).toThrow(new Error(
				'Too few agents for note at line 1, character 0'
			));
		});

		it('converts state', () => {
			const parsed = parser.parse('state over A: doing stuff');

			expect(parsed.stages).toEqual([
				PARSED.note('over', ['A'], {
					label: 'doing stuff',
					mode: 'state',
				}),
			]);
		});

		it('rejects multiple agents for state', () => {
			expect(() => parser.parse('state over A, B: hi')).toThrow(new Error(
				'Too many agents for state at line 1, character 0'
			));
		});

		it('converts text blocks', () => {
			const parsed = parser.parse('text right of A: doing stuff');

			expect(parsed.stages).toEqual([
				PARSED.note('right', ['A'], {
					label: 'doing stuff',
					mode: 'text',
				}),
			]);
		});

		it('converts agent commands', () => {
			const parsed = parser.parse(
				'define A, B\n' +
				'begin A, B\n' +
				'relabel\n' +
				'relabel A, B\n' +
				'activate A, B\n' +
				'deactivate A, B\n' +
				'end A, B\n'
			);

			expect(parsed.stages).toEqual([
				PARSED.agentDefine(['A', 'B']),
				PARSED.agentBegin(['A', 'B'], {mode: 'box'}),
				PARSED.agentRelabel([]),
				PARSED.agentRelabel(['A', 'B']),
				PARSED.agentActivation(['A', 'B'], {activated: true}),
				PARSED.agentActivation(['A', 'B'], {activated: false}),
				PARSED.agentEnd(['A', 'B'], {mode: 'cross'}),
			]);
		});

		it('converts dividers', () => {
			const parsed = parser.parse('divider');

			expect(parsed.stages).toEqual([
				PARSED.divider({height: 6, label: '', mode: 'line'}),
			]);
		});

		it('converts different divider types', () => {
			const parsed = parser.parse(
				'divider line\n' +
				'divider space\n' +
				'divider delay\n' +
				'divider tear\n'
			);

			expect(parsed.stages).toEqual([
				PARSED.divider({height: 6, mode: 'line'}),
				PARSED.divider({height: 6, mode: 'space'}),
				PARSED.divider({height: 30, mode: 'delay'}),
				PARSED.divider({height: 6, mode: 'tear'}),
			]);
		});

		it('converts explicit divider heights', () => {
			const parsed = parser.parse(
				'divider with height 40\n' +
				'divider delay with height 0\n'
			);

			expect(parsed.stages).toEqual([
				PARSED.divider({height: 40, label: '', mode: 'line'}),
				PARSED.divider({height: 0, label: '', mode: 'delay'}),
			]);
		});

		it('converts divider labels', () => {
			const parsed = parser.parse(
				'divider: message 1\n' +
				'divider tear: message 2\n' +
				'divider delay with height 40: message 3\n'
			);

			expect(parsed.stages).toEqual([
				PARSED.divider({label: 'message 1'}),
				PARSED.divider({label: 'message 2'}),
				PARSED.divider({label: 'message 3'}),
			]);
		});

		it('converts reference commands', () => {
			const parsed = parser.parse(
				'begin reference: Foo bar as baz\n' +
				'begin reference over A, B: Foo bar as baz\n'
			);

			expect(parsed.stages).toEqual([
				PARSED.groupBegin([], {
					alias: 'baz',
					blockType: 'ref',
					label: 'Foo bar',
					tag: 'ref',
				}),
				PARSED.groupBegin(['A', 'B'], {
					alias: 'baz',
					blockType: 'ref',
					label: 'Foo bar',
					tag: 'ref',
				}),
			]);
		});

		it('converts markers', () => {
			const parsed = parser.parse('abc:');

			expect(parsed.stages).toEqual([
				PARSED.mark('abc'),
			]);
		});

		it('converts autolabel commands', () => {
			const parsed = parser.parse('autolabel "foo <label> bar"');

			expect(parsed.stages).toEqual([
				PARSED.labelPattern(['foo ', {token: 'label'}, ' bar']),
			]);
		});

		it('converts autolabel off commands', () => {
			const parsed = parser.parse('autolabel off');

			expect(parsed.stages).toEqual([
				PARSED.labelPattern([{token: 'label'}]),
			]);
		});

		it('converts "simultaneously" flow commands', () => {
			const parsed = parser.parse('simultaneously:');

			expect(parsed.stages).toEqual([
				PARSED.async(''),
			]);
		});

		it('converts named "simultaneously" flow commands', () => {
			const parsed = parser.parse('simultaneously with abc:');

			expect(parsed.stages).toEqual([
				PARSED.async('abc'),
			]);
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
				PARSED.blockBegin('if', 'something happens'),
				PARSED.connect(['A', 'B']),
				PARSED.blockSplit('else', 'something else'),
				PARSED.connect(['A', 'C']),
				PARSED.connect(['C', 'B']),
				PARSED.blockSplit('else', ''),
				PARSED.connect(['A', 'D']),
				PARSED.blockEnd(),
			]);
		});

		it('converts loop blocks', () => {
			const parsed = parser.parse('repeat until something');

			expect(parsed.stages).toEqual([
				PARSED.blockBegin('repeat', 'until something'),
			]);
		});

		it('converts group blocks', () => {
			const parsed = parser.parse('group something');

			expect(parsed.stages).toEqual([
				PARSED.blockBegin('', 'something', {blockType: 'group'}),
			]);
		});

		it('propagates parallel markers', () => {
			const parsed = parser.parse('& A -> B');

			expect(parsed.stages).toEqual([
				PARSED.connect(['A', 'B'], {parallel: true}),
			]);
		});

		it('rejects parallel markers on metadata', () => {
			expect(() => parser.parse('& title foo')).toThrow(new Error(
				'Metadata cannot be parallel at line 1, character 0'
			));
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
