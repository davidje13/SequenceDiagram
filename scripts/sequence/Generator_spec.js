defineDescribe('Sequence Generator', ['./Generator'], (Generator) => {
	'use strict';

	const generator = new Generator();

	function makeParsedAgents(source) {
		return source.map((item) => {
			if(typeof item === 'object') {
				return item;
			} else {
				return {name: item, alias: '', flags: []};
			}
		});
	}

	const PARSED = {
		blockBegin: (mode, label, {ln = 0} = {}) => {
			return {type: 'block begin', mode, label, ln};
		},

		blockSplit: (mode, label, {ln = 0} = {}) => {
			return {type: 'block split', mode, label, ln};
		},

		blockEnd: () => {
			return {type: 'block end'};
		},

		defineAgents: (agentNames, {ln = 0} = {}) => {
			return {
				type: 'agent define',
				agents: makeParsedAgents(agentNames),
				ln,
			};
		},

		beginAgents: (agentNames, {mode = 'box', ln = 0} = {}) => {
			return {
				type: 'agent begin',
				agents: makeParsedAgents(agentNames),
				mode,
				ln,
			};
		},

		endAgents: (agentNames, {mode = 'cross', ln = 0} = {}) => {
			return {
				type: 'agent end',
				agents: makeParsedAgents(agentNames),
				mode,
				ln,
			};
		},

		connect: (agentNames, {
			label = '',
			line = '',
			left = 0,
			right = 0,
			ln = 0,
		} = {}) => {
			return {
				type: 'connect',
				agents: makeParsedAgents(agentNames),
				label,
				options: {
					line,
					left,
					right,
				},
				ln,
			};
		},

		note: (type, agentNames, {
			mode = '',
			label = '',
			ln = 0,
		} = {}) => {
			return {
				type,
				agents: makeParsedAgents(agentNames),
				mode,
				label,
				ln,
			};
		},
	};

	const GENERATED = {
		beginAgents: (agentNames, {
			mode = jasmine.anything(),
			ln = jasmine.anything(),
		} = {}) => {
			return {
				type: 'agent begin',
				agentNames,
				mode,
				ln,
			};
		},

		endAgents: (agentNames, {
			mode = jasmine.anything(),
			ln = jasmine.anything(),
		} = {}) => {
			return {
				type: 'agent end',
				agentNames,
				mode,
				ln,
			};
		},

		connect: (agentNames, {
			label = jasmine.anything(),
			line = jasmine.anything(),
			left = jasmine.anything(),
			right = jasmine.anything(),
			ln = jasmine.anything(),
		} = {}) => {
			return {
				type: 'connect',
				agentNames,
				label,
				options: {
					line,
					left,
					right,
				},
				ln,
			};
		},

		highlight: (agentNames, highlighted, {
			ln = jasmine.anything(),
		} = {}) => {
			return {
				type: 'agent highlight',
				agentNames,
				highlighted,
				ln,
			};
		},

		note: (type, agentNames, {
			mode = jasmine.anything(),
			label = jasmine.anything(),
			ln = jasmine.anything(),
		} = {}) => {
			return {
				type,
				agentNames,
				mode,
				label,
				ln,
			};
		},

		parallel: (stages, {
			ln = jasmine.anything(),
		} = {}) => {
			return {
				type: 'parallel',
				stages,
				ln,
			};
		},
	};

	describe('.generate', () => {
		it('propagates title and theme metadata', () => {
			const input = {
				meta: {title: 'bar', theme: 'zig', nope: 'skip'},
				stages: [],
			};
			const sequence = generator.generate(input);
			expect(sequence.meta).toEqual({title: 'bar', theme: 'zig'});
		});

		it('returns an empty sequence for blank input', () => {
			const sequence = generator.generate({stages: []});
			expect(sequence.stages).toEqual([]);
		});

		it('includes implicit hidden left/right agents', () => {
			const sequence = generator.generate({stages: []});
			expect(sequence.agents).toEqual([
				{name: '[', anchorRight: true},
				{name: ']', anchorRight: false},
			]);
		});

		it('passes marks and async through', () => {
			const sequence = generator.generate({stages: [
				{type: 'mark', name: 'foo', ln: 0},
				{type: 'async', target: 'foo', ln: 1},
				{type: 'async', target: '', ln: 2},
			]});
			expect(sequence.stages).toEqual([
				{type: 'mark', name: 'foo', ln: 0},
				{type: 'async', target: 'foo', ln: 1},
				{type: 'async', target: '', ln: 2},
			]);
		});

		it('rejects attempts to jump to markers not yet defined', () => {
			expect(() => generator.generate({stages: [
				{type: 'async', target: 'foo'},
				{type: 'mark', name: 'foo'},
			]})).toThrow();
		});

		it('returns aggregated agents', () => {
			const sequence = generator.generate({stages: [
				PARSED.connect(['A', 'B']),
				PARSED.connect(['C', 'D']),
				PARSED.beginAgents(['E']),
			]});
			expect(sequence.agents).toEqual([
				{name: '[', anchorRight: true},
				{name: 'A', anchorRight: false},
				{name: 'B', anchorRight: false},
				{name: 'C', anchorRight: false},
				{name: 'D', anchorRight: false},
				{name: 'E', anchorRight: false},
				{name: ']', anchorRight: false},
			]);
		});

		it('always puts the implicit right agent on the right', () => {
			const sequence = generator.generate({stages: [
				PARSED.connect([']', 'B']),
			]});
			expect(sequence.agents).toEqual([
				{name: '[', anchorRight: true},
				{name: 'B', anchorRight: false},
				{name: ']', anchorRight: false},
			]);
		});

		it('accounts for define calls when ordering agents', () => {
			const sequence = generator.generate({stages: [
				PARSED.defineAgents(['B']),
				PARSED.connect(['A', 'B']),
			]});
			expect(sequence.agents).toEqual([
				{name: '[', anchorRight: true},
				{name: 'B', anchorRight: false},
				{name: 'A', anchorRight: false},
				{name: ']', anchorRight: false},
			]);
		});

		it('converts aliases', () => {
			const sequence = generator.generate({stages: [
				PARSED.defineAgents([{name: 'Baz', alias: 'B', flags: []}]),
				PARSED.connect(['A', 'B']),
			]});
			expect(sequence.agents).toEqual([
				{name: '[', anchorRight: true},
				{name: 'Baz', anchorRight: false},
				{name: 'A', anchorRight: false},
				{name: ']', anchorRight: false},
			]);
		});

		it('rejects duplicate aliases', () => {
			expect(() => generator.generate({stages: [
				PARSED.defineAgents([{name: 'Foo', alias: 'B', flags: []}]),
				PARSED.defineAgents([{name: 'Bar', alias: 'B', flags: []}]),
			]})).toThrow();
		});

		it('rejects using agent names as aliases', () => {
			expect(() => generator.generate({stages: [
				PARSED.defineAgents([{name: 'Foo', alias: 'B', flags: []}]),
				PARSED.defineAgents([{name: 'Bar', alias: 'Foo', flags: []}]),
			]})).toThrow();
		});

		it('creates implicit begin stages for agents when used', () => {
			const sequence = generator.generate({stages: [
				PARSED.connect(['A', 'B']),
				PARSED.connect(['B', 'C']),
			]});
			expect(sequence.stages).toEqual([
				GENERATED.beginAgents(['A', 'B']),
				jasmine.anything(),
				GENERATED.beginAgents(['C']),
				jasmine.anything(),
				jasmine.anything(),
			]);
		});

		it('passes connects through', () => {
			const sequence = generator.generate({stages: [
				PARSED.connect(['A', 'B']),
			]});
			expect(sequence.stages).toEqual([
				jasmine.anything(),
				GENERATED.connect(['A', 'B']),
				jasmine.anything(),
			]);
		});

		it('propagates connect information', () => {
			const sequence = generator.generate({stages: [
				PARSED.connect(['A', 'B'], {
					label: 'foo',
					line: 'bar',
					left: 1,
					right: 0,
				}),
			]});
			expect(sequence.stages).toEqual([
				jasmine.anything(),
				GENERATED.connect(['A', 'B'], {
					label: 'foo',
					line: 'bar',
					left: 1,
					right: 0,
				}),
				jasmine.anything(),
			]);
		});

		it('creates implicit end stages for all remaining agents', () => {
			const sequence = generator.generate({
				meta: {
					terminators: 'foo',
				},
				stages: [
					PARSED.connect(['A', 'B']),
				],
			});
			expect(sequence.stages).toEqual([
				jasmine.anything(),
				jasmine.anything(),
				GENERATED.endAgents(['A', 'B'], {mode: 'foo'}),
			]);
		});

		it('defaults to mode "none" for implicit end stages', () => {
			const sequence = generator.generate({stages: [
				PARSED.connect(['A', 'B']),
			]});
			expect(sequence.stages).toEqual([
				jasmine.anything(),
				jasmine.anything(),
				GENERATED.endAgents(['A', 'B'], {mode: 'none'}),
			]);
		});

		it('defaults to mode "cross" for explicit end stages', () => {
			const sequence = generator.generate({stages: [
				PARSED.connect(['A', 'B']),
				PARSED.endAgents(['A', 'B']),
			]});
			expect(sequence.stages).toEqual([
				jasmine.anything(),
				jasmine.anything(),
				GENERATED.endAgents(['A', 'B'], {mode: 'cross'}),
			]);
		});

		it('does not create duplicate begin stages', () => {
			const sequence = generator.generate({stages: [
				PARSED.beginAgents(['A', 'B', 'C']),
				PARSED.connect(['A', 'B']),
				PARSED.connect(['B', 'C']),
			]});
			expect(sequence.stages).toEqual([
				GENERATED.beginAgents(['A', 'B', 'C']),
				GENERATED.connect(jasmine.anything()),
				GENERATED.connect(jasmine.anything()),
				GENERATED.endAgents(['A', 'B', 'C']),
			]);
		});

		it('redisplays agents if they have been hidden', () => {
			const sequence = generator.generate({stages: [
				PARSED.beginAgents(['A', 'B']),
				PARSED.connect(['A', 'B']),
				PARSED.endAgents(['B']),
				PARSED.connect(['A', 'B']),
			]});
			expect(sequence.stages).toEqual([
				jasmine.anything(),
				jasmine.anything(),
				GENERATED.endAgents(['B']),
				GENERATED.beginAgents(['B']),
				jasmine.anything(),
				jasmine.anything(),
			]);
		});

		it('removes duplicate begin agents', () => {
			const sequence = generator.generate({stages: [
				PARSED.beginAgents(['A', 'A']),
			]});
			expect(sequence.stages).toEqual([
				GENERATED.beginAgents(['A']),
				jasmine.anything(),
			]);
		});

		it('collapses adjacent begin statements', () => {
			const sequence = generator.generate({stages: [
				PARSED.connect(['A', 'B']),
				PARSED.beginAgents(['D']),
				PARSED.connect(['B', 'C']),
				PARSED.connect(['C', 'D']),
			]});
			expect(sequence.stages).toEqual([
				GENERATED.beginAgents(['A', 'B']),
				GENERATED.connect(jasmine.anything()),
				GENERATED.beginAgents(['D', 'C']),
				GENERATED.connect(jasmine.anything()),
				GENERATED.connect(jasmine.anything()),
				jasmine.anything(),
			]);
		});

		it('removes superfluous begin statements', () => {
			const sequence = generator.generate({stages: [
				PARSED.connect(['A', 'B']),
				PARSED.beginAgents(['A', 'C', 'D']),
				PARSED.beginAgents(['C', 'E']),
			]});
			expect(sequence.stages).toEqual([
				GENERATED.beginAgents(['A', 'B']),
				GENERATED.connect(jasmine.anything()),
				GENERATED.beginAgents(['C', 'D', 'E']),
				jasmine.anything(),
			]);
		});

		it('removes duplicate end agents', () => {
			const sequence = generator.generate({stages: [
				PARSED.beginAgents(['A']),
				PARSED.endAgents(['A', 'A']),
			]});
			expect(sequence.stages).toEqual([
				jasmine.anything(),
				GENERATED.endAgents(['A']),
			]);
		});

		it('removes superfluous end statements', () => {
			const sequence = generator.generate({stages: [
				PARSED.defineAgents(['E']),
				PARSED.beginAgents(['C', 'D']),
				PARSED.connect(['A', 'B']),
				PARSED.endAgents(['A', 'B', 'C']),
				PARSED.endAgents(['A', 'D', 'E']),
			]});
			expect(sequence.stages).toEqual([
				jasmine.anything(),
				GENERATED.connect(jasmine.anything()),
				GENERATED.endAgents(['A', 'B', 'C', 'D']),
			]);
		});

		it('does not merge different modes of end', () => {
			const sequence = generator.generate({stages: [
				PARSED.beginAgents(['A', 'B', 'C', 'D']),
				PARSED.connect(['A', 'B']),
				PARSED.endAgents(['A', 'B', 'C']),
			]});
			expect(sequence.stages).toEqual([
				jasmine.anything(),
				GENERATED.connect(jasmine.anything()),
				GENERATED.endAgents(['A', 'B', 'C'], {mode: 'cross'}),
				GENERATED.endAgents(['D'], {mode: 'none'}),
			]);
		});

		it('adds parallel highlighting stages', () => {
			const sequence = generator.generate({stages: [
				PARSED.connect(['A', {name: 'B', alias: '', flags: ['start']}]),
				PARSED.connect(['A', {name: 'B', alias: '', flags: ['stop']}]),
			]});
			expect(sequence.stages).toEqual([
				jasmine.anything(),
				GENERATED.parallel([
					GENERATED.highlight(['B'], true),
					GENERATED.connect(['A', 'B']),
				]),
				GENERATED.parallel([
					GENERATED.connect(['A', 'B']),
					GENERATED.highlight(['B'], false),
				]),
				jasmine.anything(),
			]);
		});

		it('adds parallel begin stages', () => {
			const sequence = generator.generate({stages: [
				PARSED.connect(['A', {name: 'B', alias: '', flags: ['begin']}]),
			]});
			expect(sequence.stages).toEqual([
				GENERATED.beginAgents(['A']),
				GENERATED.parallel([
					GENERATED.beginAgents(['B']),
					GENERATED.connect(['A', 'B']),
				]),
				GENERATED.endAgents(['A', 'B']),
			]);
		});

		it('adds parallel end stages', () => {
			const sequence = generator.generate({stages: [
				PARSED.connect(['A', {name: 'B', alias: '', flags: ['end']}]),
			]});
			expect(sequence.stages).toEqual([
				GENERATED.beginAgents(['A', 'B']),
				GENERATED.parallel([
					GENERATED.connect(['A', 'B']),
					GENERATED.endAgents(['B']),
				]),
				GENERATED.endAgents(['A']),
			]);
		});

		it('implicitly ends highlighting when ending a stage', () => {
			const sequence = generator.generate({stages: [
				PARSED.connect(['A', {name: 'B', alias: '', flags: ['start']}]),
				PARSED.connect(['A', {name: 'B', alias: '', flags: ['end']}]),
			]});
			expect(sequence.stages).toEqual([
				jasmine.anything(),
				jasmine.anything(),
				GENERATED.parallel([
					GENERATED.connect(['A', 'B']),
					GENERATED.highlight(['B'], false),
					GENERATED.endAgents(['B']),
				]),
				GENERATED.endAgents(['A']),
			]);
		});

		it('rejects conflicting flags', () => {
			expect(() => generator.generate({stages: [
				PARSED.connect([
					'A',
					{name: 'B', alias: '', flags: ['start', 'stop']},
				]),
			]})).toThrow();

			expect(() => generator.generate({stages: [
				PARSED.connect([
					{name: 'A', alias: '', flags: ['start']},
					{name: 'A', alias: '', flags: ['stop']},
				]),
			]})).toThrow();

			expect(() => generator.generate({stages: [
				PARSED.connect([
					'A',
					{name: 'B', alias: '', flags: ['begin', 'end']},
				]),
			]})).toThrow();

			expect(() => generator.generate({stages: [
				PARSED.connect([
					{name: 'A', alias: '', flags: ['begin']},
					{name: 'A', alias: '', flags: ['end']},
				]),
			]})).toThrow();
		});

		it('adds implicit highlight end with implicit terminator', () => {
			const sequence = generator.generate({stages: [
				PARSED.connect([
					'A',
					{name: 'B', alias: '', flags: ['start']},
				]),
			]});
			expect(sequence.stages).toEqual([
				jasmine.anything(),
				jasmine.anything(),
				GENERATED.parallel([
					GENERATED.highlight(['B'], false),
					GENERATED.endAgents(['A', 'B']),
				]),
			]);
		});

		it('adds implicit highlight end with explicit terminator', () => {
			const sequence = generator.generate({stages: [
				PARSED.connect(['A', {name: 'B', alias: '', flags: ['start']}]),
				PARSED.endAgents(['A', 'B']),
			]});
			expect(sequence.stages).toEqual([
				jasmine.anything(),
				jasmine.anything(),
				GENERATED.parallel([
					GENERATED.highlight(['B'], false),
					GENERATED.endAgents(['A', 'B']),
				]),
			]);
		});

		it('collapses adjacent end statements containing highlighting', () => {
			const sequence = generator.generate({stages: [
				PARSED.connect([
					{name: 'A', alias: '', flags: ['start']},
					{name: 'B', alias: '', flags: ['start']},
				]),
				PARSED.endAgents(['A']),
				PARSED.endAgents(['B']),
			]});
			expect(sequence.stages).toEqual([
				jasmine.anything(),
				jasmine.anything(),
				GENERATED.parallel([
					GENERATED.highlight(['A', 'B'], false),
					GENERATED.endAgents(['A', 'B']),
				]),
			]);
		});

		it('creates virtual agents for block statements', () => {
			const sequence = generator.generate({stages: [
				PARSED.blockBegin('if', 'abc'),
				PARSED.connect(['A', 'B']),
				PARSED.blockEnd(),
			]});

			expect(sequence.agents).toEqual([
				{name: '[', anchorRight: true},
				{name: '__BLOCK0[', anchorRight: true},
				{name: 'A', anchorRight: false},
				{name: 'B', anchorRight: false},
				{name: '__BLOCK0]', anchorRight: false},
				{name: ']', anchorRight: false},
			]);
		});

		it('positions virtual block agents near involved agents', () => {
			const sequence = generator.generate({stages: [
				PARSED.connect(['A', 'B']),
				PARSED.blockBegin('if', 'abc'),
				PARSED.connect(['C', 'D']),
				PARSED.blockBegin('if', 'abc'),
				PARSED.connect(['E', 'F']),
				PARSED.blockEnd(),
				PARSED.blockEnd(),
				PARSED.connect(['G', 'H']),
			]});

			expect(sequence.agents).toEqual([
				{name: '[', anchorRight: true},
				{name: 'A', anchorRight: false},
				{name: 'B', anchorRight: false},
				{name: '__BLOCK0[', anchorRight: true},
				{name: 'C', anchorRight: false},
				{name: 'D', anchorRight: false},
				{name: '__BLOCK1[', anchorRight: true},
				{name: 'E', anchorRight: false},
				{name: 'F', anchorRight: false},
				{name: '__BLOCK1]', anchorRight: false},
				{name: '__BLOCK0]', anchorRight: false},
				{name: 'G', anchorRight: false},
				{name: 'H', anchorRight: false},
				{name: ']', anchorRight: false},
			]);
		});

		it('records virtual block agent names in blocks', () => {
			const sequence = generator.generate({stages: [
				PARSED.blockBegin('if', 'abc'),
				PARSED.connect(['A', 'B']),
				PARSED.blockEnd(),
			]});

			const block0 = sequence.stages[0];
			expect(block0.type).toEqual('block');
			expect(block0.left).toEqual('__BLOCK0[');
			expect(block0.right).toEqual('__BLOCK0]');
		});

		it('records all sections within blocks', () => {
			const sequence = generator.generate({stages: [
				PARSED.blockBegin('if', 'abc', {ln: 10}),
				PARSED.connect(['A', 'B']),
				PARSED.blockSplit('else', 'xyz', {ln: 20}),
				PARSED.connect(['A', 'C']),
				PARSED.blockEnd(),
			]});

			const block0 = sequence.stages[0];
			expect(block0.sections).toEqual([
				{mode: 'if', label: 'abc', ln: 10, stages: [
					GENERATED.beginAgents(['A', 'B']),
					GENERATED.connect(['A', 'B']),
				]},
				{mode: 'else', label: 'xyz', ln: 20, stages: [
					GENERATED.beginAgents(['C']),
					GENERATED.connect(['A', 'C']),
				]},
			]);
		});

		it('records virtual block agents in nested blocks', () => {
			const sequence = generator.generate({stages: [
				PARSED.blockBegin('if', 'abc'),
				PARSED.connect(['A', 'B']),
				PARSED.blockSplit('else', 'xyz'),
				PARSED.blockBegin('if', 'def'),
				PARSED.connect(['A', 'C']),
				PARSED.blockEnd(),
				PARSED.blockEnd(),
			]});

			expect(sequence.agents).toEqual([
				{name: '[', anchorRight: true},
				{name: '__BLOCK0[', anchorRight: true},
				{name: '__BLOCK1[', anchorRight: true},
				{name: 'A', anchorRight: false},
				{name: 'B', anchorRight: false},
				{name: 'C', anchorRight: false},
				{name: '__BLOCK1]', anchorRight: false},
				{name: '__BLOCK0]', anchorRight: false},
				{name: ']', anchorRight: false},
			]);
			const block0 = sequence.stages[0];
			expect(block0.type).toEqual('block');
			expect(block0.left).toEqual('__BLOCK0[');
			expect(block0.right).toEqual('__BLOCK0]');

			const block1 = block0.sections[1].stages[0];
			expect(block1.type).toEqual('block');
			expect(block1.left).toEqual('__BLOCK1[');
			expect(block1.right).toEqual('__BLOCK1]');
		});

		it('preserves block boundaries when agents exist outside', () => {
			const sequence = generator.generate({stages: [
				PARSED.connect(['A', 'B']),
				PARSED.blockBegin('if', 'abc'),
				PARSED.blockBegin('if', 'def'),
				PARSED.connect(['A', 'B']),
				PARSED.blockEnd(),
				PARSED.blockEnd(),
			]});

			expect(sequence.agents).toEqual([
				{name: '[', anchorRight: true},
				{name: '__BLOCK0[', anchorRight: true},
				{name: '__BLOCK1[', anchorRight: true},
				{name: 'A', anchorRight: false},
				{name: 'B', anchorRight: false},
				{name: '__BLOCK1]', anchorRight: false},
				{name: '__BLOCK0]', anchorRight: false},
				{name: ']', anchorRight: false},
			]);
			const block0 = sequence.stages[2];
			expect(block0.type).toEqual('block');
			expect(block0.left).toEqual('__BLOCK0[');
			expect(block0.right).toEqual('__BLOCK0]');

			const block1 = block0.sections[0].stages[0];
			expect(block1.type).toEqual('block');
			expect(block1.left).toEqual('__BLOCK1[');
			expect(block1.right).toEqual('__BLOCK1]');
		});

		it('allows empty block parts after split', () => {
			const sequence = generator.generate({stages: [
				PARSED.blockBegin('if', 'abc'),
				PARSED.connect(['A', 'B']),
				PARSED.blockSplit('else', 'xyz'),
				PARSED.blockEnd(),
			]});

			const block0 = sequence.stages[0];
			expect(block0.sections).toEqual([
				{mode: 'if', label: 'abc', ln: 0, stages: [
					jasmine.anything(),
					jasmine.anything(),
				]},
				{mode: 'else', label: 'xyz', ln: 0, stages: []},
			]);
		});

		it('allows empty block parts before split', () => {
			const sequence = generator.generate({stages: [
				PARSED.blockBegin('if', 'abc'),
				PARSED.blockSplit('else', 'xyz'),
				PARSED.connect(['A', 'B']),
				PARSED.blockEnd(),
			]});

			const block0 = sequence.stages[0];
			expect(block0.sections).toEqual([
				{mode: 'if', label: 'abc', ln: 0, stages: []},
				{mode: 'else', label: 'xyz', ln: 0, stages: [
					jasmine.anything(),
					jasmine.anything(),
				]},
			]);
		});

		it('removes entirely empty blocks', () => {
			const sequence = generator.generate({stages: [
				PARSED.blockBegin('if', 'abc'),
				PARSED.blockSplit('else', 'xyz'),
				PARSED.blockBegin('if', 'abc'),
				PARSED.blockEnd(),
				PARSED.blockEnd(),
			]});

			expect(sequence.stages).toEqual([]);
		});

		it('removes blocks containing only define statements / markers', () => {
			const sequence = generator.generate({stages: [
				PARSED.blockBegin('if', 'abc'),
				PARSED.defineAgents(['A']),
				{type: 'mark', name: 'foo'},
				PARSED.blockEnd(),
			]});

			expect(sequence.stages).toEqual([]);
		});

		it('does not create virtual agents for empty blocks', () => {
			const sequence = generator.generate({stages: [
				PARSED.blockBegin('if', 'abc'),
				PARSED.blockSplit('else', 'xyz'),
				PARSED.blockBegin('if', 'abc'),
				PARSED.blockEnd(),
				PARSED.blockEnd(),
			]});

			expect(sequence.agents).toEqual([
				{name: '[', anchorRight: true},
				{name: ']', anchorRight: false},
			]);
		});

		it('removes entirely empty nested blocks', () => {
			const sequence = generator.generate({stages: [
				PARSED.blockBegin('if', 'abc'),
				PARSED.connect(['A', 'B']),
				PARSED.blockSplit('else', 'xyz'),
				PARSED.blockBegin('if', 'abc'),
				PARSED.blockEnd(),
				PARSED.blockEnd(),
			]});

			const block0 = sequence.stages[0];
			expect(block0.sections).toEqual([
				{mode: 'if', label: 'abc', ln: 0, stages: [
					jasmine.anything(),
					jasmine.anything(),
				]},
				{mode: 'else', label: 'xyz', ln: 0, stages: []},
			]);
		});

		it('rejects unterminated blocks', () => {
			expect(() => generator.generate({stages: [
				PARSED.blockBegin('if', 'abc'),
				PARSED.connect(['A', 'B']),
			]})).toThrow();

			expect(() => generator.generate({stages: [
				PARSED.blockBegin('if', 'abc'),
				PARSED.blockBegin('if', 'def'),
				PARSED.connect(['A', 'B']),
				PARSED.blockEnd(),
			]})).toThrow();
		});

		it('rejects extra block terminations', () => {
			expect(() => generator.generate({stages: [
				PARSED.blockEnd(),
			]})).toThrow();

			expect(() => generator.generate({stages: [
				PARSED.blockBegin('if', 'abc'),
				PARSED.connect(['A', 'B']),
				PARSED.blockEnd(),
				PARSED.blockEnd(),
			]})).toThrow();
		});

		it('rejects block splitting without a block', () => {
			expect(() => generator.generate({stages: [
				PARSED.blockSplit('else', 'xyz'),
			]})).toThrow();

			expect(() => generator.generate({stages: [
				PARSED.blockBegin('if', 'abc'),
				PARSED.connect(['A', 'B']),
				PARSED.blockEnd(),
				PARSED.blockSplit('else', 'xyz'),
			]})).toThrow();
		});

		it('rejects block splitting in non-splittable blocks', () => {
			expect(() => generator.generate({stages: [
				PARSED.blockBegin('repeat', 'abc'),
				PARSED.blockSplit('else', 'xyz'),
				PARSED.connect(['A', 'B']),
				PARSED.blockEnd(),
			]})).toThrow();
		});

		it('passes notes through', () => {
			const sequence = generator.generate({stages: [
				PARSED.note('note right', ['A', 'B'], {
					mode: 'foo',
					label: 'bar',
				}),
			]});
			expect(sequence.stages).toEqual([
				jasmine.anything(),
				GENERATED.note('note right', ['A', 'B'], {
					mode: 'foo',
					label: 'bar',
				}),
				jasmine.anything(),
			]);
		});

		it('rejects note between with a repeated agent', () => {
			expect(() => generator.generate({stages: [
				PARSED.note('note between', ['A', 'A'], {
					mode: 'foo',
					label: 'bar',
				}),
			]})).toThrow();
		});

		it('defaults to showing notes around the entire diagram', () => {
			const sequence = generator.generate({stages: [
				PARSED.note('note right', []),
				PARSED.note('note left', []),
				PARSED.note('note over', []),
			]});
			expect(sequence.stages).toEqual([
				GENERATED.note('note right', [']']),
				GENERATED.note('note left', ['[']),
				GENERATED.note('note over', ['[', ']']),
			]);
		});

		it('rejects attempts to change implicit agents', () => {
			expect(() => generator.generate({stages: [
				PARSED.beginAgents(['[']),
			]})).toThrow();

			expect(() => generator.generate({stages: [
				PARSED.beginAgents([']']),
			]})).toThrow();

			expect(() => generator.generate({stages: [
				PARSED.endAgents(['[']),
			]})).toThrow();

			expect(() => generator.generate({stages: [
				PARSED.endAgents([']']),
			]})).toThrow();
		});
	});
});
