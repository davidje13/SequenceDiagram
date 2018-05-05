/* eslint-disable max-lines */

import Generator from './Generator.mjs';

describe('Sequence Generator', () => {
	const generator = new Generator();

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

	function textFormatter(text) {
		return text + '!';
	}

	const any = () => jasmine.anything();

	const [PARSED_SOURCE] = makeParsedAgents([{flags: ['source']}]);

	const PARSED = {
		agentBegin: (agents, {
			ln = 0,
			mode = 'box',
			parallel = false,
		} = {}) => ({
			agents: makeParsedAgents(agents),
			ln,
			mode,
			parallel,
			type: 'agent begin',
		}),

		agentDefine: (agents, {
			ln = 0,
			parallel = false,
		} = {}) => ({
			agents: makeParsedAgents(agents),
			ln,
			parallel,
			type: 'agent define',
		}),

		agentEnd: (agents, {
			ln = 0,
			mode = 'cross',
			parallel = false,
		} = {}) => ({
			agents: makeParsedAgents(agents),
			ln,
			mode,
			parallel,
			type: 'agent end',
		}),

		agentOptions: (agent, options, {
			ln = 0,
			parallel = false,
		} = {}) => ({
			agent: makeParsedAgents([agent])[0],
			ln,
			options,
			parallel,
			type: 'agent options',
		}),

		async: (target, {
			ln = 0,
			parallel = false,
		} = {}) => ({
			ln,
			parallel,
			target,
			type: 'async',
		}),

		blockBegin: (tag, label, {
			ln = 0,
			parallel = false,
		} = {}) => ({
			blockType: tag,
			label,
			ln,
			parallel,
			tag,
			type: 'block begin',
		}),

		blockEnd: ({
			ln = 0,
			parallel = false,
		} = {}) => ({
			ln,
			parallel,
			type: 'block end',
		}),

		blockSplit: (tag, label, {
			ln = 0,
			parallel = false,
		} = {}) => ({
			blockType: tag,
			label,
			ln,
			parallel,
			tag,
			type: 'block split',
		}),

		connect: (agents, {
			label = '',
			left = 0,
			line = '',
			ln = 0,
			parallel = false,
			right = 0,
		} = {}) => ({
			agents: makeParsedAgents(agents),
			label,
			ln,
			options: {left, line, right},
			parallel,
			type: 'connect',
		}),

		connectBegin: (agent, tag, {
			left = 0,
			line = '',
			ln = 0,
			parallel = false,
			right = 0,
		} = {}) => ({
			agent: makeParsedAgents([agent])[0],
			ln,
			options: {left, line, right},
			parallel,
			tag,
			type: 'connect-delay-begin',
		}),

		connectEnd: (agent, tag, {
			label = '',
			left = 0,
			line = '',
			ln = 0,
			parallel = false,
			right = 0,
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
			height = 0,
			label = '',
			ln = 0,
			mode = '',
			parallel = false,
		} = {}) => ({
			height,
			label,
			ln,
			mode,
			parallel,
			type: 'divider',
		}),

		groupBegin: (alias, agents, {
			label = '',
			ln = 0,
			parallel = false,
		} = {}) => ({
			agents: makeParsedAgents(agents),
			alias,
			blockType: 'ref',
			label,
			ln,
			parallel,
			tag: 'ref',
			type: 'group begin',
		}),

		labelPattern: (pattern, {
			ln = 0,
			parallel = false,
		} = {}) => ({
			ln,
			parallel,
			pattern,
			type: 'label pattern',
		}),

		mark: (name, {
			ln = 0,
			parallel = false,
		} = {}) => ({
			ln,
			name,
			parallel,
			type: 'mark',
		}),

		note: (position, agents, {
			label = '',
			ln = 0,
			mode = '',
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

	const GENERATED = {
		agent: (id, {
			anchorRight = any(),
			formattedLabel = any(),
			isVirtualSource = any(),
			options = any(),
		} = {}) => ({
			anchorRight,
			formattedLabel,
			id,
			isVirtualSource,
			options,
		}),

		agentBegin: (agentIDs, {
			mode = any(),
			ln = any(),
		} = {}) => ({
			agentIDs,
			ln,
			mode,
			type: 'agent begin',
		}),

		agentEnd: (agentIDs, {
			ln = any(),
			mode = any(),
		} = {}) => ({
			agentIDs,
			ln,
			mode,
			type: 'agent end',
		}),

		async: (target, {
			ln = any(),
		} = {}) => ({
			ln,
			target,
			type: 'async',
		}),

		blockBegin: (blockType, {
			canHide = any(),
			tag = any(),
			label = any(),
			left = any(),
			ln = any(),
			right = any(),
		} = {}) => ({
			blockType,
			canHide,
			label,
			left,
			ln,
			right,
			tag,
			type: 'block begin',
		}),

		blockEnd: ({
			left = any(),
			ln = any(),
			right = any(),
		} = {}) => ({
			left,
			ln,
			right,
			type: 'block end',
		}),

		blockSplit: (blockType, {
			label = any(),
			left = any(),
			ln = any(),
			right = any(),
			tag = any(),
		} = {}) => ({
			blockType,
			label,
			left,
			ln,
			right,
			tag,
			type: 'block split',
		}),

		connect: (agentIDs, {
			label = any(),
			left = any(),
			line = any(),
			ln = any(),
			right = any(),
		} = {}) => ({
			agentIDs,
			label,
			ln,
			options: {
				left,
				line,
				right,
			},
			type: 'connect',
		}),

		connectBegin: (agentIDs, {
			label = any(),
			left = any(),
			line = any(),
			ln = any(),
			right = any(),
			tag = any(),
		} = {}) => ({
			agentIDs,
			label,
			ln,
			options: {
				left,
				line,
				right,
			},
			tag,
			type: 'connect-delay-begin',
		}),

		connectEnd: ({
			ln = any(),
			tag = any(),
		} = {}) => ({
			ln,
			tag,
			type: 'connect-delay-end',
		}),

		divider: ({
			formattedLabel = any(),
			height = any(),
			ln = any(),
			mode = any(),
		} = {}) => ({
			formattedLabel,
			height,
			ln,
			mode,
			type: 'divider',
		}),

		highlight: (agentIDs, highlighted, {
			ln = any(),
		} = {}) => ({
			agentIDs,
			highlighted,
			ln,
			type: 'agent highlight',
		}),

		mark: (name, {
			ln = any(),
		} = {}) => ({
			ln,
			name,
			type: 'mark',
		}),

		note: (position, agentIDs, {
			label = any(),
			ln = any(),
			mode = any(),
		} = {}) => ({
			agentIDs,
			label,
			ln,
			mode,
			type: 'note ' + position,
		}),

		parallel: (stages, {
			ln = any(),
		} = {}) => ({
			ln,
			stages,
			type: 'parallel',
		}),
	};

	function invoke(stages, meta = {}) {
		return generator.generate({
			meta: Object.assign({textFormatter}, meta),
			stages,
		});
	}

	describe('.generate', () => {
		it('propagates title, theme and code metadata', () => {
			const sequence = invoke([], {
				code: 'zoom',
				nope: 'skip',
				theme: 'zig',
				title: 'bar',
			});

			expect(sequence.meta).toEqual({
				code: 'zoom',
				theme: 'zig',
				title: 'bar!',
			});
		});

		it('returns an empty sequence for blank input', () => {
			const sequence = invoke([]);

			expect(sequence.stages).toEqual([]);
		});

		it('includes implicit hidden left/right agents', () => {
			const sequence = invoke([]);

			expect(sequence.agents).toEqual([
				GENERATED.agent('[', {anchorRight: true}),
				GENERATED.agent(']', {anchorRight: false}),
			]);
		});

		it('passes marks and async through', () => {
			const sequence = invoke([
				PARSED.mark('foo', {ln: 0}),
				PARSED.async('foo', {ln: 1}),
				PARSED.async('', {ln: 2}),
			]);

			expect(sequence.stages).toEqual([
				GENERATED.mark('foo', {ln: 0}),
				GENERATED.async('foo', {ln: 1}),
				GENERATED.async('', {ln: 2}),
			]);
		});

		it('passes dividers through', () => {
			const sequence = invoke([
				PARSED.divider({height: 7, label: 'woo', ln: 0, mode: 'foo'}),
			]);

			expect(sequence.stages).toEqual([
				GENERATED.divider({
					formattedLabel: 'woo!',
					height: 7,
					ln: 0,
					mode: 'foo',
				}),
			]);
		});

		it('rejects attempts to jump to markers not yet defined', () => {
			expect(() => invoke([
				PARSED.async('foo', {ln: 10}),
				PARSED.mark('foo'),
			])).toThrow(new Error('Unknown marker: foo at line 11'));
		});

		it('returns aggregated agents', () => {
			const sequence = invoke([
				PARSED.connect(['A', 'B']),
				PARSED.connect(['C', 'D']),
				PARSED.agentBegin(['E']),
			]);

			expect(sequence.agents).toEqual([
				GENERATED.agent('['),
				GENERATED.agent('A'),
				GENERATED.agent('B'),
				GENERATED.agent('C'),
				GENERATED.agent('D'),
				GENERATED.agent('E'),
				GENERATED.agent(']'),
			]);
		});

		it('uses the textFormatter on agent labels', () => {
			const sequence = invoke([
				PARSED.connect(['A', 'B']),
			]);

			expect(sequence.agents).toEqual([
				GENERATED.agent('['),
				GENERATED.agent('A', {formattedLabel: 'A!'}),
				GENERATED.agent('B', {formattedLabel: 'B!'}),
				GENERATED.agent(']'),
			]);
		});

		it('always puts the implicit right agent on the right', () => {
			const sequence = invoke([
				PARSED.connect([']', 'B']),
			]);

			expect(sequence.agents).toEqual([
				GENERATED.agent('['),
				GENERATED.agent('B'),
				GENERATED.agent(']'),
			]);
		});

		it('accounts for define calls when ordering agents', () => {
			const sequence = invoke([
				PARSED.agentDefine(['B']),
				PARSED.connect(['A', 'B']),
			]);

			expect(sequence.agents).toEqual([
				GENERATED.agent('['),
				GENERATED.agent('B'),
				GENERATED.agent('A'),
				GENERATED.agent(']'),
			]);
		});

		it('applies options to agents', () => {
			const sequence = invoke([
				PARSED.agentOptions('A', ['foo']),
			]);

			expect(sequence.agents).toEqual([
				any(),
				GENERATED.agent('A', {options: ['foo']}),
				any(),
			]);
		});

		it('combines agent options', () => {
			const sequence = invoke([
				PARSED.agentOptions('A', ['foo', 'bar']),
				PARSED.agentOptions('B', ['zig']),
				PARSED.agentOptions('A', ['zag', 'bar']),
			]);

			expect(sequence.agents).toEqual([
				any(),
				GENERATED.agent('A', {options: ['foo', 'bar', 'zag']}),
				GENERATED.agent('B', {options: ['zig']}),
				any(),
			]);
		});

		it('converts aliases', () => {
			const sequence = invoke([
				PARSED.agentDefine([{alias: 'B', name: 'Baz'}]),
				PARSED.connect(['A', 'B']),
			]);

			expect(sequence.agents).toEqual([
				GENERATED.agent('['),
				GENERATED.agent('Baz'),
				GENERATED.agent('A'),
				GENERATED.agent(']'),
			]);
		});

		it('rejects duplicate aliases', () => {
			expect(() => invoke([
				PARSED.agentDefine([{alias: 'B', name: 'Foo'}]),
				PARSED.agentDefine([{alias: 'B', name: 'Bar'}]),
			])).toThrow(new Error(
				'Cannot use B as an alias; it is already in use at line 1'
			));
		});

		it('rejects using agent names as aliases', () => {
			expect(() => invoke([
				PARSED.agentDefine([{alias: 'B', name: 'Foo'}]),
				PARSED.agentDefine([{alias: 'Foo', name: 'Bar'}]),
			])).toThrow(new Error(
				'Cannot use Foo as an alias; it is already in use at line 1'
			));
		});

		it('creates implicit begin stages for agents when used', () => {
			const sequence = invoke([
				PARSED.connect(['A', 'B']),
				PARSED.connect(['B', 'C']),
			]);

			expect(sequence.stages).toEqual([
				GENERATED.agentBegin(['A', 'B']),
				any(),
				GENERATED.agentBegin(['C']),
				any(),
				any(),
			]);
		});

		it('passes connects through', () => {
			const sequence = invoke([
				PARSED.connect(['A', 'B']),
			]);

			expect(sequence.stages).toEqual([
				any(),
				GENERATED.connect(['A', 'B']),
				any(),
			]);
		});

		it('propagates connect information', () => {
			const sequence = invoke([
				PARSED.connect(['A', 'B'], {
					label: 'foo',
					left: 1,
					line: 'bar',
					right: 0,
				}),
			]);

			expect(sequence.stages).toEqual([
				any(),
				GENERATED.connect(['A', 'B'], {
					label: 'foo!',
					left: 1,
					line: 'bar',
					right: 0,
				}),
				any(),
			]);
		});

		it('converts source agents into virtual agents', () => {
			const sequence = invoke([
				PARSED.connect(['A', PARSED_SOURCE]),
			]);

			expect(sequence.agents).toEqual([
				GENERATED.agent('['),
				GENERATED.agent('A'),
				GENERATED.agent('__0', {
					anchorRight: false,
					isVirtualSource: true,
				}),
				GENERATED.agent(']'),
			]);

			expect(sequence.stages).toEqual([
				GENERATED.agentBegin(['A']),
				GENERATED.connect(['A', '__0']),
				GENERATED.agentEnd(['A']),
			]);
		});

		it('converts sources into distinct virtual agents', () => {
			const sequence = invoke([
				PARSED.connect(['A', PARSED_SOURCE]),
				PARSED.connect(['A', PARSED_SOURCE]),
			]);

			expect(sequence.agents).toEqual([
				GENERATED.agent('['),
				GENERATED.agent('A'),
				GENERATED.agent('__1'),
				GENERATED.agent('__0'),
				GENERATED.agent(']'),
			]);

			expect(sequence.stages).toEqual([
				GENERATED.agentBegin(['A']),
				GENERATED.connect(['A', '__0']),
				GENERATED.connect(['A', '__1']),
				GENERATED.agentEnd(['A']),
			]);
		});

		it('places source agents near the connected agent', () => {
			const sequence = invoke([
				PARSED.agentBegin(['A', 'B', 'C']),
				PARSED.connect(['B', PARSED_SOURCE]),
			]);

			expect(sequence.agents).toEqual([
				GENERATED.agent('['),
				GENERATED.agent('A'),
				GENERATED.agent('B'),
				GENERATED.agent('__0', {
					anchorRight: false,
					isVirtualSource: true,
				}),
				GENERATED.agent('C'),
				GENERATED.agent(']'),
			]);
		});

		it('places source agents left when connections are reversed', () => {
			const sequence = invoke([
				PARSED.agentBegin(['A', 'B', 'C']),
				PARSED.connect([PARSED_SOURCE, 'B']),
			]);

			expect(sequence.agents).toEqual([
				GENERATED.agent('['),
				GENERATED.agent('A'),
				GENERATED.agent('__0', {
					anchorRight: true,
					isVirtualSource: true,
				}),
				GENERATED.agent('B'),
				GENERATED.agent('C'),
				GENERATED.agent(']'),
			]);
		});

		it('rejects connections between virtual agents', () => {
			expect(() => invoke([
				PARSED.connect([PARSED_SOURCE, PARSED_SOURCE]),
			])).toThrow(new Error(
				'Cannot connect found messages at line 1'
			));
		});

		it('rejects connections between virtual agents and sides', () => {
			expect(() => invoke([
				PARSED.connect([PARSED_SOURCE, ']']),
			])).toThrow(new Error(
				'Cannot connect found messages to special agents at line 1'
			));
		});

		it('uses label patterns for connections', () => {
			const sequence = invoke([
				PARSED.labelPattern(['foo ', {token: 'label'}, ' bar']),
				PARSED.connect(['A', 'B'], {label: 'myLabel'}),
			]);

			expect(sequence.stages).toEqual([
				any(),
				GENERATED.connect(['A', 'B'], {
					label: 'foo myLabel bar!',
				}),
				any(),
			]);
		});

		it('applies counters in label patterns', () => {
			const sequence = invoke([
				PARSED.labelPattern([{dp: 0, inc: 2, start: 3}, ' suffix']),
				PARSED.connect(['A', 'B'], {label: 'foo'}),
				PARSED.connect(['A', 'B'], {label: 'bar'}),
			]);

			expect(sequence.stages).toEqual([
				any(),
				GENERATED.connect(['A', 'B'], {
					label: '3 suffix!',
				}),
				GENERATED.connect(['A', 'B'], {
					label: '5 suffix!',
				}),
				any(),
			]);
		});

		it('applies counter rounding in label patterns', () => {
			const sequence = invoke([
				PARSED.labelPattern([{dp: 1, inc: 1, start: 0.52}, ' suffix']),
				PARSED.connect(['A', 'B'], {label: 'foo'}),
				PARSED.connect(['A', 'B'], {label: 'bar'}),
			]);

			expect(sequence.stages).toEqual([
				any(),
				GENERATED.connect(['A', 'B'], {
					label: '0.5 suffix!',
				}),
				GENERATED.connect(['A', 'B'], {
					label: '1.5 suffix!',
				}),
				any(),
			]);
		});

		it('aggregates delayed connect information in the first entry', () => {
			const sequence = invoke([
				PARSED.agentBegin(['A', 'B']),
				PARSED.connectBegin('A', 'foo', {
					left: 0,
					line: 'solid',
					ln: 0,
					right: 1,
				}),
				PARSED.connectEnd('B', 'foo', {
					label: 'woo',
					left: 0,
					line: 'solid',
					ln: 1,
					right: 1,
				}),
			]);

			expect(sequence.stages).toEqual([
				any(),
				GENERATED.connectBegin(['A', 'B'], {
					label: 'woo!',
					left: 0,
					line: 'solid',
					ln: 0,
					right: 1,
					tag: '__0',
				}),
				GENERATED.connectEnd({ln: 1, tag: '__0'}),
				any(),
			]);
		});

		it('converts self connections into delayed connections', () => {
			const sequence = invoke([
				PARSED.connect(['A', 'A'], {
					label: 'woo',
					left: 0,
					line: 'solid',
					ln: 0,
					right: 1,
				}),
			]);

			expect(sequence.stages).toEqual([
				any(),
				GENERATED.connectBegin(['A', 'A'], {
					label: 'woo!',
					left: 0,
					line: 'solid',
					ln: 0,
					right: 1,
					tag: '__0',
				}),
				GENERATED.connectEnd({ln: 0, tag: '__0'}),
				any(),
			]);
		});

		it('adds parallel highlighting stages to self connections', () => {
			const sequence = invoke([
				PARSED.connect([
					{flags: ['start'], name: 'A'},
					{flags: ['stop'], name: 'A'},
				], {label: 'woo'}),
			]);

			expect(sequence.stages).toEqual([
				any(),
				GENERATED.parallel([
					GENERATED.highlight(['A'], true),
					GENERATED.connectBegin(['A', 'A'], {label: 'woo!'}),
				]),
				GENERATED.parallel([
					GENERATED.connectEnd(),
					GENERATED.highlight(['A'], false),
				]),
				any(),
			]);
		});

		it('merges delayed connect arrows', () => {
			const sequence = invoke([
				PARSED.agentBegin(['A', 'B']),
				PARSED.connectBegin('A', 'foo', {
					left: 1,
					line: 'solid',
					right: 0,
				}),
				PARSED.connectEnd('B', 'foo', {
					left: 0,
					line: 'solid',
					right: 1,
				}),
			]);

			expect(sequence.stages).toEqual([
				any(),
				GENERATED.connectBegin(['A', 'B'], {
					left: 1,
					line: 'solid',
					right: 1,
				}),
				any(),
				any(),
			]);
		});

		it('rejects conflicting delayed message arrows', () => {
			expect(() => invoke([
				PARSED.agentBegin(['A', 'B']),
				PARSED.connectBegin('A', 'foo', {line: 'abc'}),
				PARSED.connectEnd('B', 'foo', {line: 'def', ln: 1}),
			])).toThrow(new Error(
				'Mismatched delayed connection arrows at line 2'
			));
		});

		it('implicitly begins agents in delayed connections', () => {
			const sequence = invoke([
				PARSED.connectBegin('A', 'foo'),
				PARSED.connectEnd('B', 'foo'),
			]);

			expect(sequence.stages).toEqual([
				GENERATED.agentBegin(['A']),
				GENERATED.connectBegin(['A', 'B']),
				GENERATED.agentBegin(['B']),
				GENERATED.connectEnd(),
				GENERATED.agentEnd(['A', 'B']),
			]);
		});

		it('rejects unknown delayed connections', () => {
			expect(() => invoke([
				PARSED.connectBegin('A', 'foo', {ln: 0}),
				PARSED.connectEnd('B', 'foo', {ln: 1}),
				PARSED.connectEnd('B', 'bar', {ln: 2}),
			])).toThrow(new Error(
				'Unknown delayed connection "bar" at line 3'
			));
		});

		it('rejects overused delayed connections', () => {
			expect(() => invoke([
				PARSED.connectBegin('A', 'foo', {ln: 0}),
				PARSED.connectEnd('B', 'foo', {ln: 1}),
				PARSED.connectEnd('B', 'foo', {ln: 2}),
			])).toThrow(new Error(
				'Unknown delayed connection "foo" at line 3'
			));
		});

		it('rejects unused delayed connections', () => {
			expect(() => invoke([
				PARSED.connectBegin('A', 'foo', {ln: 0}),
			])).toThrow(new Error(
				'Unused delayed connection "foo" at line 1'
			));
		});

		it('rejects duplicate delayed connection names', () => {
			expect(() => invoke([
				PARSED.connectBegin('A', 'foo', {ln: 0}),
				PARSED.connectBegin('B', 'foo', {ln: 1}),
			])).toThrow(new Error(
				'Duplicate delayed connection "foo" at line 2'
			));
		});

		it('rejects delayed connections passing block boundaries', () => {
			expect(() => invoke([
				PARSED.connectBegin('A', 'foo', {ln: 0}),
				PARSED.blockBegin('if', ''),
				PARSED.connectEnd('B', 'foo', {ln: 1}),
				PARSED.blockEnd(),
			])).toThrow(new Error(
				'Unknown delayed connection "foo" at line 2'
			));
		});

		it('creates implicit end stages for all remaining agents', () => {
			const sequence = invoke([
				PARSED.connect(['A', 'B']),
			], {
				terminators: 'foo',
			});

			expect(sequence.stages).toEqual([
				any(),
				any(),
				GENERATED.agentEnd(['A', 'B'], {mode: 'foo'}),
			]);
		});

		it('defaults to mode "none" for implicit end stages', () => {
			const sequence = invoke([
				PARSED.connect(['A', 'B']),
			]);

			expect(sequence.stages).toEqual([
				any(),
				any(),
				GENERATED.agentEnd(['A', 'B'], {mode: 'none'}),
			]);
		});

		it('defaults to mode "cross" for explicit end stages', () => {
			const sequence = invoke([
				PARSED.connect(['A', 'B']),
				PARSED.agentEnd(['A', 'B']),
			]);

			expect(sequence.stages).toEqual([
				any(),
				any(),
				GENERATED.agentEnd(['A', 'B'], {mode: 'cross'}),
			]);
		});

		it('does not create duplicate begin stages', () => {
			const sequence = invoke([
				PARSED.agentBegin(['A', 'B', 'C']),
				PARSED.connect(['A', 'B']),
				PARSED.connect(['B', 'C']),
			]);

			expect(sequence.stages).toEqual([
				GENERATED.agentBegin(['A', 'B', 'C']),
				GENERATED.connect(any()),
				GENERATED.connect(any()),
				GENERATED.agentEnd(['A', 'B', 'C']),
			]);
		});

		it('redisplays agents if they have been hidden', () => {
			const sequence = invoke([
				PARSED.agentBegin(['A', 'B']),
				PARSED.connect(['A', 'B']),
				PARSED.agentEnd(['B']),
				PARSED.connect(['A', 'B']),
			]);

			expect(sequence.stages).toEqual([
				any(),
				any(),
				GENERATED.agentEnd(['B']),
				GENERATED.agentBegin(['B']),
				any(),
				any(),
			]);
		});

		it('removes duplicate begin agents', () => {
			const sequence = invoke([
				PARSED.agentBegin(['A', 'A']),
			]);

			expect(sequence.stages).toEqual([
				GENERATED.agentBegin(['A']),
				any(),
			]);
		});

		it('collapses adjacent begin statements', () => {
			const sequence = invoke([
				PARSED.connect(['A', 'B']),
				PARSED.agentBegin(['D']),
				PARSED.connect(['B', 'C']),
				PARSED.connect(['C', 'D']),
			]);

			expect(sequence.stages).toEqual([
				GENERATED.agentBegin(['A', 'B']),
				GENERATED.connect(any()),
				GENERATED.agentBegin(['D', 'C']),
				GENERATED.connect(any()),
				GENERATED.connect(any()),
				any(),
			]);
		});

		it('collapses chains of adjacent begin statements', () => {
			const sequence = invoke([
				PARSED.agentBegin(['A']),
				PARSED.agentBegin(['B']),
				PARSED.agentBegin(['C']),
			]);

			expect(sequence.stages).toEqual([
				GENERATED.agentBegin(['A', 'B', 'C']),
				any(),
			]);
		});

		it('collapses chains of adjacent end statements', () => {
			const sequence = invoke([
				PARSED.agentBegin(['A', 'B', 'C']),
				PARSED.agentEnd(['A']),
				PARSED.agentEnd(['B']),
				PARSED.agentEnd(['C']),
			]);

			expect(sequence.stages).toEqual([
				any(),
				GENERATED.agentEnd(['A', 'B', 'C']),
			]);
		});

		it('removes superfluous begin statements', () => {
			const sequence = invoke([
				PARSED.connect(['A', 'B']),
				PARSED.agentBegin(['A', 'C', 'D']),
				PARSED.agentBegin(['C', 'E']),
			]);

			expect(sequence.stages).toEqual([
				GENERATED.agentBegin(['A', 'B']),
				GENERATED.connect(any()),
				GENERATED.agentBegin(['C', 'D', 'E']),
				any(),
			]);
		});

		it('uses the header theme for the topmost begin statement', () => {
			const sequence = invoke([
				PARSED.connect(['A', 'B']),
				PARSED.connect(['B', 'C']),
			], {
				headers: 'foo',
			});

			expect(sequence.stages).toEqual([
				GENERATED.agentBegin(['A', 'B'], {mode: 'foo'}),
				any(),
				GENERATED.agentBegin(['C'], {mode: 'box'}),
				any(),
				any(),
			]);
		});

		it('removes duplicate end agents', () => {
			const sequence = invoke([
				PARSED.agentBegin(['A']),
				PARSED.agentEnd(['A', 'A']),
			]);

			expect(sequence.stages).toEqual([
				any(),
				GENERATED.agentEnd(['A']),
			]);
		});

		it('removes superfluous end statements', () => {
			const sequence = invoke([
				PARSED.agentDefine(['E']),
				PARSED.agentBegin(['C', 'D']),
				PARSED.connect(['A', 'B']),
				PARSED.agentEnd(['A', 'B', 'C']),
				PARSED.agentEnd(['A', 'D', 'E']),
			]);

			expect(sequence.stages).toEqual([
				any(),
				GENERATED.connect(any()),
				GENERATED.agentEnd(['A', 'B', 'C', 'D']),
			]);
		});

		it('does not merge different modes of end', () => {
			const sequence = invoke([
				PARSED.agentBegin(['A', 'B', 'C', 'D']),
				PARSED.connect(['A', 'B']),
				PARSED.agentEnd(['A', 'B', 'C']),
			]);

			expect(sequence.stages).toEqual([
				any(),
				GENERATED.connect(any()),
				GENERATED.agentEnd(['A', 'B', 'C'], {mode: 'cross'}),
				GENERATED.agentEnd(['D'], {mode: 'none'}),
			]);
		});

		it('adds parallel highlighting stages', () => {
			const sequence = invoke([
				PARSED.connect(['A', {flags: ['start'], name: 'B'}]),
				PARSED.connect(['A', {flags: ['stop'], name: 'B'}]),
			]);

			expect(sequence.stages).toEqual([
				any(),
				GENERATED.parallel([
					GENERATED.highlight(['B'], true),
					GENERATED.connect(['A', 'B']),
				]),
				GENERATED.parallel([
					GENERATED.connect(['A', 'B']),
					GENERATED.highlight(['B'], false),
				]),
				any(),
			]);
		});

		it('adds parallel begin stages', () => {
			const sequence = invoke([
				PARSED.connect(['A', {flags: ['begin'], name: 'B'}]),
			]);

			expect(sequence.stages).toEqual([
				GENERATED.agentBegin(['A']),
				GENERATED.parallel([
					GENERATED.agentBegin(['B']),
					GENERATED.connect(['A', 'B']),
				]),
				GENERATED.agentEnd(['A', 'B']),
			]);
		});

		it('adds parallel end stages', () => {
			const sequence = invoke([
				PARSED.connect(['A', {flags: ['end'], name: 'B'}]),
			]);

			expect(sequence.stages).toEqual([
				GENERATED.agentBegin(['A', 'B']),
				GENERATED.parallel([
					GENERATED.connect(['A', 'B']),
					GENERATED.agentEnd(['B']),
				]),
				GENERATED.agentEnd(['A']),
			]);
		});

		it('implicitly ends highlighting when ending a stage', () => {
			const sequence = invoke([
				PARSED.connect(['A', {flags: ['start'], name: 'B'}]),
				PARSED.connect(['A', {flags: ['end'], name: 'B'}]),
			]);

			expect(sequence.stages).toEqual([
				any(),
				any(),
				GENERATED.parallel([
					GENERATED.connect(['A', 'B']),
					GENERATED.highlight(['B'], false),
					GENERATED.agentEnd(['B']),
				]),
				GENERATED.agentEnd(['A']),
			]);
		});

		it('rejects conflicting flags', () => {
			expect(() => invoke([
				PARSED.connect([
					'A',
					{flags: ['start', 'stop'], name: 'B'},
				]),
			])).toThrow(new Error(
				'Cannot set agent highlighting multiple times at line 1'
			));

			expect(() => invoke([
				PARSED.connect([
					'A',
					{flags: ['begin', 'end'], name: 'B'},
				]),
			])).toThrow(new Error(
				'Cannot set agent visibility multiple times at line 1'
			));
		});

		it('adds implicit highlight end with implicit terminator', () => {
			const sequence = invoke([
				PARSED.connect([
					'A',
					{flags: ['start'], name: 'B'},
				]),
			]);

			expect(sequence.stages).toEqual([
				any(),
				any(),
				GENERATED.parallel([
					GENERATED.highlight(['B'], false),
					GENERATED.agentEnd(['A', 'B']),
				]),
			]);
		});

		it('adds implicit highlight end with explicit terminator', () => {
			const sequence = invoke([
				PARSED.connect(['A', {flags: ['start'], name: 'B'}]),
				PARSED.agentEnd(['A', 'B']),
			]);

			expect(sequence.stages).toEqual([
				any(),
				any(),
				GENERATED.parallel([
					GENERATED.highlight(['B'], false),
					GENERATED.agentEnd(['A', 'B']),
				]),
			]);
		});

		it('collapses adjacent end statements containing highlighting', () => {
			const sequence = invoke([
				PARSED.connect([
					{flags: ['start'], name: 'A'},
					{flags: ['start'], name: 'B'},
				]),
				PARSED.agentEnd(['A']),
				PARSED.agentEnd(['B']),
			]);

			expect(sequence.stages).toEqual([
				any(),
				any(),
				GENERATED.parallel([
					GENERATED.highlight(['A', 'B'], false),
					GENERATED.agentEnd(['A', 'B']),
				]),
			]);
		});

		it('creates virtual agents for block statements', () => {
			const sequence = invoke([
				PARSED.blockBegin('if', 'abc'),
				PARSED.connect(['A', 'B']),
				PARSED.blockEnd(),
			]);

			expect(sequence.agents).toEqual([
				GENERATED.agent('['),
				GENERATED.agent('__BLOCK0[', {anchorRight: true}),
				GENERATED.agent('A'),
				GENERATED.agent('B'),
				GENERATED.agent('__BLOCK0]', {anchorRight: false}),
				GENERATED.agent(']'),
			]);
		});

		it('positions virtual block agents near involved agents', () => {
			const sequence = invoke([
				PARSED.connect(['A', 'B']),
				PARSED.blockBegin('if', 'abc'),
				PARSED.connect(['C', 'D']),
				PARSED.blockBegin('if', 'abc'),
				PARSED.connect(['E', 'F']),
				PARSED.blockEnd(),
				PARSED.blockEnd(),
				PARSED.connect(['G', 'H']),
			]);

			expect(sequence.agents).toEqual([
				GENERATED.agent('['),
				GENERATED.agent('A'),
				GENERATED.agent('B'),
				GENERATED.agent('__BLOCK0['),
				GENERATED.agent('C'),
				GENERATED.agent('D'),
				GENERATED.agent('__BLOCK1['),
				GENERATED.agent('E'),
				GENERATED.agent('F'),
				GENERATED.agent('__BLOCK1]'),
				GENERATED.agent('__BLOCK0]'),
				GENERATED.agent('G'),
				GENERATED.agent('H'),
				GENERATED.agent(']'),
			]);
		});

		it('ignores defines when setting block bounds', () => {
			const sequence = invoke([
				PARSED.blockBegin('if', 'abc'),
				PARSED.connect(['A', 'B']),
				PARSED.agentDefine(['C']),
				PARSED.blockEnd(),
			]);

			expect(sequence.agents).toEqual([
				GENERATED.agent('['),
				GENERATED.agent('__BLOCK0['),
				GENERATED.agent('A'),
				GENERATED.agent('B'),
				GENERATED.agent('__BLOCK0]'),
				GENERATED.agent('C'),
				GENERATED.agent(']'),
			]);
		});

		it('ignores side agents when calculating block bounds', () => {
			const sequence = invoke([
				PARSED.agentBegin(['A', 'B', 'C']),
				PARSED.blockBegin('if', 'abc'),
				PARSED.connect(['[', 'B']),
				PARSED.connect(['B', ']']),
				PARSED.blockEnd(),
			]);

			expect(sequence.agents).toEqual([
				GENERATED.agent('['),
				GENERATED.agent('A'),
				GENERATED.agent('__BLOCK0['),
				GENERATED.agent('B'),
				GENERATED.agent('__BLOCK0]'),
				GENERATED.agent('C'),
				GENERATED.agent(']'),
			]);
		});

		it('propagates block statements', () => {
			const sequence = invoke([
				PARSED.blockBegin('if', 'abc', {ln: 10}),
				PARSED.connect(['A', 'B']),
				PARSED.blockSplit('else', 'xyz', {ln: 20}),
				PARSED.connect(['A', 'B']),
				PARSED.blockEnd({ln: 30}),
			]);

			expect(sequence.stages).toEqual([
				GENERATED.blockBegin('if', {
					canHide: true,
					label: 'abc!',
					ln: 10,
					tag: 'if!',
				}),
				any(),
				any(),
				GENERATED.blockSplit('else', {
					label: 'xyz!',
					ln: 20,
					tag: 'else!',
				}),
				any(),
				GENERATED.blockEnd({ln: 30}),
				any(),
			]);
		});

		it('records virtual block agent names in block commands', () => {
			const sequence = invoke([
				PARSED.blockBegin('if', 'abc'),
				PARSED.connect(['A', 'B']),
				PARSED.blockSplit('else', 'xyz'),
				PARSED.connect(['A', 'B']),
				PARSED.blockEnd(),
			]);

			const bounds = {
				left: '__BLOCK0[',
				right: '__BLOCK0]',
			};

			const {stages} = sequence;

			expect(stages[0]).toEqual(GENERATED.blockBegin('if', bounds));
			expect(stages[3]).toEqual(GENERATED.blockSplit('else', bounds));
			expect(stages[5]).toEqual(GENERATED.blockEnd(bounds));
		});

		it('records virtual block agents in nested blocks', () => {
			const sequence = invoke([
				PARSED.blockBegin('if', 'abc'),
				PARSED.connect(['A', 'B']),
				PARSED.blockSplit('else', 'xyz'),
				PARSED.blockBegin('if', 'def'),
				PARSED.connect(['A', 'C']),
				PARSED.blockEnd(),
				PARSED.blockEnd(),
			]);

			expect(sequence.agents).toEqual([
				GENERATED.agent('['),
				GENERATED.agent('__BLOCK0['),
				GENERATED.agent('__BLOCK1['),
				GENERATED.agent('A'),
				GENERATED.agent('B'),
				GENERATED.agent('C'),
				GENERATED.agent('__BLOCK1]'),
				GENERATED.agent('__BLOCK0]'),
				GENERATED.agent(']'),
			]);

			const bounds0 = {
				left: '__BLOCK0[',
				right: '__BLOCK0]',
			};

			const bounds1 = {
				left: '__BLOCK1[',
				right: '__BLOCK1]',
			};

			const {stages} = sequence;

			expect(stages[0]).toEqual(GENERATED.blockBegin('if', bounds0));
			expect(stages[4]).toEqual(GENERATED.blockBegin('if', bounds1));
			expect(stages[7]).toEqual(GENERATED.blockEnd(bounds1));
			expect(stages[8]).toEqual(GENERATED.blockEnd(bounds0));
		});

		it('preserves block boundaries when agents exist outside', () => {
			const sequence = invoke([
				PARSED.connect(['A', 'B']),
				PARSED.blockBegin('if', 'abc'),
				PARSED.blockBegin('if', 'def'),
				PARSED.connect(['A', 'B']),
				PARSED.blockEnd(),
				PARSED.blockEnd(),
			]);

			expect(sequence.agents).toEqual([
				GENERATED.agent('['),
				GENERATED.agent('__BLOCK0['),
				GENERATED.agent('__BLOCK1['),
				GENERATED.agent('A'),
				GENERATED.agent('B'),
				GENERATED.agent('__BLOCK1]'),
				GENERATED.agent('__BLOCK0]'),
				GENERATED.agent(']'),
			]);

			const bounds0 = {
				left: '__BLOCK0[',
				right: '__BLOCK0]',
			};

			const bounds1 = {
				left: '__BLOCK1[',
				right: '__BLOCK1]',
			};

			const {stages} = sequence;

			expect(stages[2]).toEqual(GENERATED.blockBegin('if', bounds0));
			expect(stages[3]).toEqual(GENERATED.blockBegin('if', bounds1));
			expect(stages[5]).toEqual(GENERATED.blockEnd(bounds1));
			expect(stages[6]).toEqual(GENERATED.blockEnd(bounds0));
		});

		it('allows empty block parts after split', () => {
			expect(() => invoke([
				PARSED.blockBegin('if', 'abc'),
				PARSED.connect(['A', 'B']),
				PARSED.blockSplit('else', 'xyz'),
				PARSED.blockEnd(),
			])).not.toThrow();
		});

		it('allows empty block parts before split', () => {
			expect(() => invoke([
				PARSED.blockBegin('if', 'abc'),
				PARSED.blockSplit('else', 'xyz'),
				PARSED.connect(['A', 'B']),
				PARSED.blockEnd(),
			])).not.toThrow();
		});

		it('allows deeply nested blocks', () => {
			expect(() => invoke([
				PARSED.blockBegin('if', 'abc'),
				PARSED.blockBegin('if', 'def'),
				PARSED.connect(['A', 'B']),
				PARSED.blockEnd(),
				PARSED.blockEnd(),
			])).not.toThrow();
		});

		it('rejects entirely empty blocks', () => {
			expect(() => invoke([
				PARSED.blockBegin('if', 'abc'),
				PARSED.blockSplit('else', 'xyz'),
				PARSED.blockEnd(),
			])).toThrow(new Error('Empty block at line 1'));
		});

		it('rejects blocks containing only define statements / markers', () => {
			expect(() => invoke([
				PARSED.blockBegin('if', 'abc'),
				PARSED.agentDefine(['A']),
				PARSED.mark('foo'),
				PARSED.blockEnd(),
			])).toThrow(new Error('Empty block at line 1'));
		});

		it('rejects entirely empty nested blocks', () => {
			expect(() => invoke([
				PARSED.blockBegin('if', 'abc', {ln: 10}),
				PARSED.connect(['A', 'B']),
				PARSED.blockSplit('else', 'xyz', {ln: 20}),
				PARSED.blockBegin('if', 'abc', {ln: 30}),
				PARSED.blockEnd({ln: 40}),
				PARSED.blockEnd({ln: 50}),
			])).toThrow(new Error('Empty block at line 41'));
		});

		it('converts groups into block commands', () => {
			const sequence = invoke([
				PARSED.agentBegin(['A', 'B']),
				PARSED.groupBegin('Bar', ['A', 'B'], {label: 'Foo'}),
				PARSED.agentEnd(['Bar']),
			]);

			const bounds = {
				left: '__BLOCK0[',
				right: '__BLOCK0]',
			};

			expect(sequence.agents).toEqual([
				GENERATED.agent('['),
				GENERATED.agent('__BLOCK0['),
				GENERATED.agent('A'),
				GENERATED.agent('B'),
				GENERATED.agent('__BLOCK0]'),
				GENERATED.agent(']'),
			]);

			expect(sequence.stages).toEqual([
				any(),
				GENERATED.blockBegin('ref', {
					canHide: false,
					label: 'Foo!',
					left: bounds.left,
					right: bounds.right,
					tag: 'ref!',
				}),
				GENERATED.blockEnd(bounds),
				GENERATED.agentEnd(['A', 'B']),
			]);
		});

		it('adds implicit begin statements when creating groups', () => {
			const sequence = invoke([
				PARSED.groupBegin('Bar', ['A', 'B'], {label: 'Foo'}),
				PARSED.agentEnd(['Bar']),
			]);

			expect(sequence.stages).toEqual([
				GENERATED.agentBegin(['A', 'B'], {mode: 'box'}),
				any(),
				any(),
				any(),
			]);
		});

		it('augments explicit begin statements when creating groups', () => {
			const sequence = invoke([
				PARSED.agentBegin(['A']),
				PARSED.groupBegin('Bar', ['A', 'B'], {label: 'Foo'}),
				PARSED.agentEnd(['Bar']),
			]);

			expect(sequence.stages).toEqual([
				GENERATED.agentBegin(['A', 'B'], {mode: 'box'}),
				any(),
				any(),
				any(),
			]);
		});

		it('rejects unterminated groups', () => {
			expect(() => invoke([
				PARSED.agentBegin(['A', 'B']),
				PARSED.groupBegin('Bar', ['A', 'B'], {label: 'Foo'}),
			])).toThrow(new Error('Unterminated group'));
		});

		it('uses group agent list when positioning bounds', () => {
			const sequence = invoke([
				PARSED.agentBegin(['A', 'B', 'C', 'D']),
				PARSED.groupBegin('Bar', ['B', 'C'], {label: 'Foo'}),
				PARSED.agentEnd(['Bar']),
			]);

			expect(sequence.agents).toEqual([
				GENERATED.agent('['),
				GENERATED.agent('A'),
				GENERATED.agent('__BLOCK0['),
				GENERATED.agent('B'),
				GENERATED.agent('C'),
				GENERATED.agent('__BLOCK0]'),
				GENERATED.agent('D'),
				GENERATED.agent(']'),
			]);
		});

		it('surrounds references with block bounds', () => {
			const sequence = invoke([
				PARSED.agentBegin(['A', 'B', 'C', 'D']),
				PARSED.blockBegin('if', ''),
				PARSED.groupBegin('Bar', ['B', 'C']),
				PARSED.agentEnd(['Bar']),
				PARSED.blockEnd(),
			]);

			expect(sequence.agents).toEqual([
				GENERATED.agent('['),
				GENERATED.agent('A'),
				GENERATED.agent('__BLOCK0['),
				GENERATED.agent('__BLOCK1['),
				GENERATED.agent('B'),
				GENERATED.agent('C'),
				GENERATED.agent('__BLOCK1]'),
				GENERATED.agent('__BLOCK0]'),
				GENERATED.agent('D'),
				GENERATED.agent(']'),
			]);
		});

		it('implicitly adds contained agents to groups', () => {
			const sequence = invoke([
				PARSED.agentBegin(['A', 'B', 'C', 'D', 'E']),
				PARSED.groupBegin('Bar', ['B', 'D'], {label: 'Foo'}),
				PARSED.agentEnd(['Bar']),
			]);

			expect(sequence.agents).toEqual([
				GENERATED.agent('['),
				GENERATED.agent('A'),
				GENERATED.agent('__BLOCK0['),
				GENERATED.agent('B'),
				GENERATED.agent('C'),
				GENERATED.agent('D'),
				GENERATED.agent('__BLOCK0]'),
				GENERATED.agent('E'),
				GENERATED.agent(']'),
			]);
		});

		it('repoints explicit group connectors at bounds', () => {
			const sequence = invoke([
				PARSED.agentBegin(['A', 'B', 'C', 'D']),
				PARSED.groupBegin('Bar', ['B', 'C'], {label: 'Foo'}),
				PARSED.connect(['A', 'Bar']),
				PARSED.connect(['D', 'Bar']),
				PARSED.agentEnd(['Bar']),
			]);

			expect(sequence.stages).toEqual([
				any(),
				any(),
				GENERATED.connect(['A', '__BLOCK0[']),
				GENERATED.connect(['D', '__BLOCK0]']),
				any(),
				any(),
			]);
		});

		it('correctly positions new agents when repointing at bounds', () => {
			const sequence1 = invoke([
				PARSED.agentBegin(['B', 'C']),
				PARSED.groupBegin('Bar', ['B', 'C'], {label: 'Foo'}),
				PARSED.connect(['D', 'Bar']),
				PARSED.agentEnd(['Bar']),
			]);

			expect(sequence1.stages).toEqual([
				any(),
				any(),
				any(),
				GENERATED.connect(['D', '__BLOCK0]']),
				any(),
				any(),
			]);

			const sequence2 = invoke([
				PARSED.agentBegin(['B', 'C']),
				PARSED.groupBegin('Bar', ['B', 'C'], {label: 'Foo'}),
				PARSED.connect(['Bar', 'D']),
				PARSED.agentEnd(['Bar']),
			]);

			expect(sequence2.stages).toEqual([
				any(),
				any(),
				any(),
				GENERATED.connect(['__BLOCK0]', 'D']),
				any(),
				any(),
			]);
		});

		it('repoints explicit group notes at bounds', () => {
			const sequence = invoke([
				PARSED.agentBegin(['A', 'B', 'C', 'D']),
				PARSED.groupBegin('Bar', ['B', 'C'], {label: 'Foo'}),
				PARSED.note('over', ['Bar']),
				PARSED.agentEnd(['Bar']),
			]);

			expect(sequence.stages).toEqual([
				any(),
				any(),
				GENERATED.note('over', ['__BLOCK0[', '__BLOCK0]']),
				any(),
				any(),
			]);
		});

		it('repoints group self-connections to right bound', () => {
			const sequence = invoke([
				PARSED.agentBegin(['A', 'B', 'C', 'D']),
				PARSED.groupBegin('Bar', ['B', 'C'], {label: 'Foo'}),
				PARSED.connect(['B', 'B']),
				PARSED.connect(['Bar', 'Bar']),
				PARSED.agentEnd(['Bar']),
			]);

			expect(sequence.stages).toEqual([
				any(),
				any(),
				GENERATED.connectBegin(['__BLOCK0]', '__BLOCK0]']),
				GENERATED.connectEnd(),
				GENERATED.connectBegin(['__BLOCK0]', '__BLOCK0]']),
				GENERATED.connectEnd(),
				any(),
				any(),
			]);
		});

		it('rejects using an agent in multiple groups simultaneously', () => {
			expect(() => invoke([
				PARSED.groupBegin('Bar', ['A', 'B'], {label: 'Foo'}),
				PARSED.groupBegin('Baz', ['B', 'C'], {label: 'Foob'}),
				PARSED.agentEnd(['Bar']),
				PARSED.agentEnd(['Baz']),
			])).toThrow(new Error('Agent B is in a group at line 1'));
		});

		it('rejects explicit group connectors after ending', () => {
			expect(() => invoke([
				PARSED.groupBegin('Bar', ['A'], {label: 'Foo'}),
				PARSED.agentEnd(['Bar']),
				PARSED.connect(['B', 'Bar']),
			])).toThrow(new Error('Duplicate agent name: Bar at line 1'));
		});

		it('rejects notes over groups after ending', () => {
			expect(() => invoke([
				PARSED.groupBegin('Bar', ['A'], {label: 'Foo'}),
				PARSED.agentEnd(['Bar']),
				PARSED.note('over', ['Bar']),
			])).toThrow(new Error('Duplicate agent name: Bar at line 1'));
		});

		it('repoints implicit group connectors at bounds', () => {
			const sequence = invoke([
				PARSED.agentBegin(['A', 'B', 'C', 'D']),
				PARSED.groupBegin('Bar', ['B', 'C'], {label: 'Foo'}),
				PARSED.connect(['A', 'C']),
				PARSED.connect(['D', 'C']),
				PARSED.agentEnd(['Bar']),
			]);

			expect(sequence.stages).toEqual([
				any(),
				any(),
				GENERATED.connect(['A', '__BLOCK0[']),
				GENERATED.connect(['D', '__BLOCK0]']),
				any(),
				any(),
			]);
		});

		it('does not repoint implicit group connectors after ending', () => {
			const sequence = invoke([
				PARSED.agentBegin(['A', 'B', 'C', 'D']),
				PARSED.groupBegin('Bar', ['B', 'C'], {label: 'Foo'}),
				PARSED.agentEnd(['Bar']),
				PARSED.connect(['A', 'C']),
				PARSED.connect(['D', 'C']),
			]);

			expect(sequence.stages).toEqual([
				any(),
				any(),
				any(),
				GENERATED.connect(['A', 'C']),
				GENERATED.connect(['D', 'C']),
				any(),
			]);
		});

		it('can connect multiple reference blocks', () => {
			const sequence = invoke([
				PARSED.agentBegin(['A', 'B', 'C', 'D']),
				PARSED.groupBegin('AB', ['A', 'B'], {label: 'Foo'}),
				PARSED.groupBegin('CD', ['C', 'D'], {label: 'Foo'}),
				PARSED.connect(['AB', 'CD']),
				PARSED.connect(['CD', 'AB']),
				PARSED.agentEnd(['AB']),
				PARSED.agentEnd(['CD']),
			]);

			expect(sequence.stages).toEqual([
				any(),
				any(),
				any(),
				GENERATED.connect(['__BLOCK0]', '__BLOCK1[']),
				GENERATED.connect(['__BLOCK1[', '__BLOCK0]']),
				any(),
				any(),
				any(),
			]);
		});

		it('rejects interactions with agents involved in references', () => {
			expect(() => invoke([
				PARSED.agentBegin(['A', 'B', 'C']),
				PARSED.groupBegin('Bar', ['A', 'C']),
				PARSED.agentEnd(['A']),
				PARSED.agentEnd(['Bar']),
			])).toThrow(new Error('Agent A is in a group at line 1'));
		});

		it('rejects flags on agents involved in references', () => {
			expect(() => invoke([
				PARSED.agentBegin(['A', 'B', 'C', 'D']),
				PARSED.groupBegin('Bar', ['A', 'C']),
				PARSED.connect([{flags: ['start'], name: 'A'}, 'D']),
				PARSED.agentEnd(['Bar']),
			])).toThrow(new Error('Agent A is in a group at line 1'));
		});

		it('rejects interactions with agents hidden beneath references', () => {
			expect(() => invoke([
				PARSED.agentBegin(['A', 'B', 'C', 'D']),
				PARSED.groupBegin('AC', ['A', 'C'], {label: 'Foo'}),
				PARSED.connect(['B', 'D']),
				PARSED.agentEnd(['AC']),
			])).toThrow(new Error('Agent B is hidden behind group at line 1'));

			expect(() => invoke([
				PARSED.agentBegin(['A', 'B', 'C']),
				PARSED.groupBegin('Bar', ['A', 'C']),
				PARSED.agentEnd(['B']),
				PARSED.agentEnd(['Bar']),
			])).toThrow(new Error('Agent B is hidden behind group at line 1'));

			expect(() => invoke([
				PARSED.agentBegin(['A', 'B', 'C']),
				PARSED.groupBegin('Bar', ['A', 'C']),
				PARSED.note('over', ['B']),
				PARSED.agentEnd(['Bar']),
			])).toThrow(new Error('Agent B is hidden behind group at line 1'));
		});

		it('encompasses entire reference boxes in block statements', () => {
			const sequenceR = invoke([
				PARSED.agentBegin(['A', 'B', 'C', 'D']),
				PARSED.groupBegin('BC', ['B', 'C'], {label: 'Foo'}),
				PARSED.blockBegin('if', 'abc'),
				PARSED.connect(['BC', 'D']),
				PARSED.blockEnd(),
				PARSED.agentEnd(['BC']),
			]);

			expect(sequenceR.agents).toEqual([
				GENERATED.agent('['),
				GENERATED.agent('A'),
				GENERATED.agent('__BLOCK1['),
				GENERATED.agent('__BLOCK0[', {anchorRight: true}),
				GENERATED.agent('B'),
				GENERATED.agent('C'),
				GENERATED.agent('__BLOCK0]', {anchorRight: false}),
				GENERATED.agent('D'),
				GENERATED.agent('__BLOCK1]'),
				GENERATED.agent(']'),
			]);

			const sequenceL = invoke([
				PARSED.agentBegin(['A', 'B', 'C', 'D']),
				PARSED.groupBegin('BC', ['B', 'C'], {label: 'Foo'}),
				PARSED.blockBegin('if', 'abc'),
				PARSED.connect(['BC', 'A']),
				PARSED.blockEnd(),
				PARSED.agentEnd(['BC']),
			]);

			expect(sequenceL.agents).toEqual([
				GENERATED.agent('['),
				GENERATED.agent('__BLOCK1['),
				GENERATED.agent('A'),
				GENERATED.agent('__BLOCK0['),
				GENERATED.agent('B'),
				GENERATED.agent('C'),
				GENERATED.agent('__BLOCK0]'),
				GENERATED.agent('__BLOCK1]'),
				GENERATED.agent('D'),
				GENERATED.agent(']'),
			]);
		});

		it('allows connections between sources and references', () => {
			const sequence = invoke([
				PARSED.agentBegin(['A', 'B', 'C', 'D']),
				PARSED.groupBegin('Bar', ['B', 'C'], {label: 'Foo'}),
				PARSED.connect([PARSED_SOURCE, 'Bar']),
				PARSED.connect(['Bar', PARSED_SOURCE]),
				PARSED.agentEnd(['Bar']),
			]);

			expect(sequence.agents).toEqual([
				GENERATED.agent('['),
				GENERATED.agent('A'),
				GENERATED.agent('__1', {
					anchorRight: true,
					isVirtualSource: true,
				}),
				GENERATED.agent('__BLOCK0['),
				GENERATED.agent('B'),
				GENERATED.agent('C'),
				GENERATED.agent('__BLOCK0]'),
				GENERATED.agent('__2', {
					anchorRight: false,
					isVirtualSource: true,
				}),
				GENERATED.agent('D'),
				GENERATED.agent(']'),
			]);
		});

		it('rejects unterminated blocks', () => {
			expect(() => invoke([
				PARSED.blockBegin('if', 'abc'),
				PARSED.connect(['A', 'B']),
			])).toThrow(new Error('Unterminated section at line 1'));

			expect(() => invoke([
				PARSED.blockBegin('if', 'abc'),
				PARSED.blockBegin('if', 'def'),
				PARSED.connect(['A', 'B']),
				PARSED.blockEnd(),
			])).toThrow(new Error('Unterminated section at line 1'));
		});

		it('rejects extra block terminations', () => {
			expect(() => invoke([
				PARSED.blockEnd(),
			])).toThrow(new Error(
				'Invalid block nesting (too many "end"s) at line 1'
			));

			expect(() => invoke([
				PARSED.blockBegin('if', 'abc'),
				PARSED.connect(['A', 'B']),
				PARSED.blockEnd({ln: 10}),
				PARSED.blockEnd({ln: 20}),
			])).toThrow(new Error(
				'Invalid block nesting (too many "end"s) at line 21'
			));
		});

		it('rejects block splitting without a block', () => {
			expect(() => invoke([
				PARSED.blockSplit('else', 'xyz'),
			])).toThrow(new Error(
				'Invalid block nesting ("else" inside global) at line 1'
			));

			expect(() => invoke([
				PARSED.blockBegin('if', 'abc'),
				PARSED.connect(['A', 'B']),
				PARSED.blockEnd(),
				PARSED.blockSplit('else', 'xyz'),
			])).toThrow(new Error(
				'Invalid block nesting ("else" inside global) at line 1'
			));
		});

		it('rejects block splitting in non-splittable blocks', () => {
			expect(() => invoke([
				PARSED.blockBegin('repeat', 'abc'),
				PARSED.blockSplit('else', 'xyz'),
				PARSED.connect(['A', 'B']),
				PARSED.blockEnd(),
			])).toThrow(new Error(
				'Invalid block nesting ("else" inside repeat) at line 1'
			));
		});

		it('passes notes through', () => {
			const sequence = invoke([
				PARSED.note('right', ['A', 'B'], {label: 'bar', mode: 'foo'}),
			]);

			expect(sequence.stages).toEqual([
				any(),
				GENERATED.note('right', ['A', 'B'], {
					label: 'bar!',
					mode: 'foo',
				}),
				any(),
			]);
		});

		it('combines parallel statements', () => {
			const sequence = invoke([
				PARSED.connect(['A', 'B']),
				PARSED.note('right', ['B'], {parallel: true}),
			]);

			expect(sequence.stages).toEqual([
				any(),
				GENERATED.parallel([
					GENERATED.connect(['A', 'B']),
					GENERATED.note('right', ['B']),
				]),
				any(),
			]);
		});

		it('combines parallel creation and destruction', () => {
			const sequence = invoke([
				PARSED.agentBegin(['A']),
				PARSED.agentBegin(['B']),
				PARSED.agentEnd(['A'], {parallel: true}),
				PARSED.agentEnd(['B']),
				PARSED.agentBegin(['A'], {parallel: true}),
			]);

			expect(sequence.stages).toEqual([
				GENERATED.agentBegin(['A']),
				GENERATED.parallel([
					GENERATED.agentBegin(['B']),
					GENERATED.agentEnd(['A']),
				]),
				GENERATED.parallel([
					GENERATED.agentEnd(['B']),
					GENERATED.agentBegin(['A']),
				]),
				GENERATED.agentEnd(['A']),
			]);
		});

		it('adds implicit stages for parallel actions', () => {
			const sequence = invoke([
				PARSED.agentBegin(['A']),
				PARSED.blockBegin('tag', ''),
				PARSED.note('over', ['A']),
				PARSED.connect(['A', 'B'], {parallel: true}),
				PARSED.blockEnd(),
			]);

			expect(sequence.stages).toEqual([
				any(),
				any(),
				GENERATED.agentBegin(['B']),
				GENERATED.parallel([
					GENERATED.note('over', ['A']),
					GENERATED.connect(['A', 'B']),
				]),
				any(),
				any(),
			]);
		});

		it('combines parallel connects and implicit begins', () => {
			const sequence = invoke([
				PARSED.connect(['A', 'B']),
				PARSED.connect(['B', 'C'], {parallel: true}),
			]);

			expect(sequence.stages).toEqual([
				GENERATED.agentBegin(['A', 'B', 'C']),
				GENERATED.parallel([
					GENERATED.connect(['A', 'B']),
					GENERATED.connect(['B', 'C']),
				]),
				any(),
			]);
		});

		it('combines parallel delayed connections', () => {
			const sequence = invoke([
				PARSED.agentBegin(['A', 'B', 'C']),
				PARSED.connectBegin('B', 'foo'),
				PARSED.connectBegin('B', 'bar', {parallel: true}),
				PARSED.connectEnd('A', 'foo'),
				PARSED.connectEnd('C', 'bar', {parallel: true}),
			]);

			expect(sequence.stages).toEqual([
				any(),
				GENERATED.parallel([
					GENERATED.connectBegin(['B', 'A'], {tag: '__0'}),
					GENERATED.connectBegin(['B', 'C'], {tag: '__1'}),
				]),
				GENERATED.parallel([
					GENERATED.connectEnd({tag: '__0'}),
					GENERATED.connectEnd({tag: '__1'}),
				]),
				any(),
			]);
		});

		it('combines parallel references', () => {
			const sequence = invoke([
				PARSED.agentBegin(['A', 'B', 'C', 'D']),
				PARSED.groupBegin('AB', ['A', 'B']),
				PARSED.groupBegin('CD', ['C', 'D'], {parallel: true}),
				PARSED.agentEnd(['AB']),
				PARSED.agentEnd(['CD'], {parallel: true}),
			]);

			expect(sequence.stages).toEqual([
				any(),
				GENERATED.parallel([
					GENERATED.blockBegin('ref'),
					GENERATED.blockBegin('ref'),
				]),
				GENERATED.parallel([
					GENERATED.blockEnd(),
					GENERATED.blockEnd(),
				]),
				any(),
			]);
		});

		it('rejects parallel marks on initial statements', () => {
			expect(() => invoke([
				PARSED.connect(['A', 'B'], {parallel: true}),
			])).toThrow(new Error(
				'Nothing to run statement in parallel with at line 1'
			));

			expect(() => invoke([
				PARSED.note('over', ['A'], {parallel: true}),
			])).toThrow(new Error(
				'Nothing to run statement in parallel with at line 1'
			));
		});

		it('rejects parallel creation and destruction of an agent', () => {
			expect(() => invoke([
				PARSED.agentBegin(['A']),
				PARSED.agentEnd(['A'], {parallel: true}),
			])).toThrow(new Error(
				'Cannot create and destroy A simultaneously at line 1'
			));
		});

		it('rejects parallel begin and end of a delayed communication', () => {
			expect(() => invoke([
				PARSED.agentBegin(['A', 'B']),
				PARSED.connectBegin('A', 'foo'),
				PARSED.connectEnd('B', 'foo', {parallel: true}),
			])).toThrow(new Error(
				'Cannot start and finish delayed connection simultaneously' +
				' at line 1'
			));
		});

		it('rejects parallel creation and destruction of a reference', () => {
			expect(() => invoke([
				PARSED.agentBegin(['A', 'B', 'C', 'D']),
				PARSED.groupBegin('AB', ['A', 'B'], {label: 'Foo'}),
				PARSED.agentEnd(['AB'], {parallel: true}),
			])).toThrow(new Error(
				'Cannot create and destroy reference simultaneously at line 1'
			));
		});

		it('rejects using parallel with mixed actions', () => {
			expect(() => invoke([
				PARSED.connect(['A', 'B']),
				PARSED.mark('foo', {ln: 0, parallel: true}),
			])).toThrow(new Error(
				'Cannot use parallel here at line 1'
			));

			expect(() => invoke([
				PARSED.mark('foo', {ln: 0}),
				PARSED.connect(['A', 'B'], {parallel: true}),
			])).toThrow(new Error(
				'Cannot use parallel here at line 1'
			));
		});

		it('rejects using parallel with restricted actions', () => {
			expect(() => invoke([
				PARSED.connect(['A', 'B']),
				PARSED.blockBegin('tag', '', {parallel: true}),
				PARSED.connect(['A', 'B']),
				PARSED.blockEnd(),
			])).toThrow(new Error(
				'Cannot use parallel here at line 1'
			));

			expect(() => invoke([
				PARSED.blockBegin('tag', ''),
				PARSED.connect(['A', 'B']),
				PARSED.blockEnd(),
				PARSED.connect(['A', 'B'], {parallel: true}),
			])).toThrow(new Error(
				'Cannot use parallel here at line 1'
			));
		});

		it('rejects note between with a repeated agent', () => {
			expect(() => invoke([
				PARSED.note('between', ['A', 'A'], {
					label: 'bar!',
					mode: 'foo',
				}),
			])).toThrow(new Error(
				'note between requires at least 2 agents at line 1'
			));
		});

		it('defaults to showing notes around the entire diagram', () => {
			const sequence = invoke([
				PARSED.note('right', []),
				PARSED.note('left', []),
				PARSED.note('over', []),
			]);

			expect(sequence.stages).toEqual([
				GENERATED.note('right', [']']),
				GENERATED.note('left', ['[']),
				GENERATED.note('over', ['[', ']']),
			]);
		});

		it('rejects creating agents with the same name as a group', () => {
			expect(() => invoke([
				PARSED.groupBegin('Bar', ['A', 'B'], {label: 'Foo'}),
				PARSED.agentEnd(['Bar']),
				PARSED.agentBegin(['Bar']),
				PARSED.agentEnd(['Bar']),
			])).toThrow(new Error('Duplicate agent name: Bar at line 1'));

			expect(() => invoke([
				PARSED.agentBegin(['Bar']),
				PARSED.agentEnd(['Bar']),
				PARSED.groupBegin('Bar', ['A', 'B'], {label: 'Foo'}),
				PARSED.agentEnd(['Bar']),
			])).toThrow(new Error('Duplicate agent name: Bar at line 1'));
		});

		it('rejects explicit interactions with virtual group agents', () => {
			expect(() => invoke([
				PARSED.groupBegin('Bar', ['A', 'B'], {label: 'Foo'}),
				PARSED.connect(['C', '__BLOCK0[']),
				PARSED.agentEnd(['Bar']),
			])).toThrow(new Error('__BLOCK0[ is a reserved name at line 1'));

			expect(() => invoke([
				PARSED.groupBegin('Bar', ['A', 'B'], {label: 'Foo'}),
				PARSED.agentEnd(['Bar']),
				PARSED.connect(['C', '__BLOCK0[']),
			])).toThrow(new Error('__BLOCK0[ is a reserved name at line 1'));

			expect(() => invoke([
				PARSED.connect(['C', '__BLOCK0[']),
				PARSED.groupBegin('Bar', ['A', 'B'], {label: 'Foo'}),
				PARSED.agentEnd(['Bar']),
			])).toThrow(new Error('__BLOCK0[ is a reserved name at line 1'));
		});

		it('rejects explicit interactions with virtual block agents', () => {
			expect(() => invoke([
				PARSED.blockBegin('if', 'abc'),
				PARSED.connect(['C', '__BLOCK0[']),
				PARSED.blockEnd(),
			])).toThrow(new Error('__BLOCK0[ is a reserved name at line 1'));

			expect(() => invoke([
				PARSED.blockBegin('if', 'abc'),
				PARSED.connect(['A', 'B']),
				PARSED.blockEnd(),
				PARSED.connect(['C', '__BLOCK0[']),
			])).toThrow(new Error('__BLOCK0[ is a reserved name at line 1'));

			expect(() => invoke([
				PARSED.connect(['C', '__BLOCK0[']),
				PARSED.blockBegin('if', 'abc'),
				PARSED.connect(['A', 'B']),
				PARSED.blockEnd(),
			])).toThrow(new Error('__BLOCK0[ is a reserved name at line 1'));
		});

		it('rejects attempts to change virtual agents', () => {
			expect(() => invoke([
				PARSED.agentBegin(['[']),
			])).toThrow(new Error('Cannot begin/end agent: [ at line 1'));

			expect(() => invoke([
				PARSED.agentBegin([']']),
			])).toThrow(new Error('Cannot begin/end agent: ] at line 1'));

			expect(() => invoke([
				PARSED.agentEnd(['[']),
			])).toThrow(new Error('Cannot begin/end agent: [ at line 1'));

			expect(() => invoke([
				PARSED.agentEnd([']']),
			])).toThrow(new Error('Cannot begin/end agent: ] at line 1'));
		});
	});
});
