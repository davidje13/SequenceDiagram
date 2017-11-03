defineDescribe('Sequence Generator', ['./Generator'], (Generator) => {
	'use strict';

	const generator = new Generator();

	const PARSED = {
		blockBegin: (mode, label) => {
			return {type: 'block begin', mode, label};
		},

		blockSplit: (mode, label) => {
			return {type: 'block split', mode, label};
		},

		blockEnd: () => {
			return {type: 'block end'};
		},

		defineAgents: (agentNames) => {
			return {
				type: 'agent define',
				agents: agentNames.map((name) => ({name, flags: []})),
			};
		},

		beginAgents: (agentNames, {mode = 'box'} = {}) => {
			return {
				type: 'agent begin',
				agents: agentNames.map((name) => ({name, flags: []})),
				mode,
			};
		},

		endAgents: (agentNames, {mode = 'cross'} = {}) => {
			return {
				type: 'agent end',
				agents: agentNames.map((name) => ({name, flags: []})),
				mode,
			};
		},

		connect: (agentNames, {
			label = '',
			line = '',
			left = false,
			right = false,
		} = {}) => {
			return {
				type: 'connect',
				agents: agentNames.map((name) => ({name, flags: []})),
				label,
				options: {
					line,
					left,
					right,
				},
			};
		},

		note: (agentNames, {
			type = 'note over',
			mode = '',
			label = '',
		} = {}) => {
			return {
				type,
				agents: agentNames.map((name) => ({name, flags: []})),
				mode,
				label,
			};
		},
	};

	const GENERATED = {
		beginAgents: (agentNames, {
			mode = jasmine.anything(),
		} = {}) => {
			return {
				type: 'agent begin',
				agentNames,
				mode,
			};
		},

		endAgents: (agentNames, {
			mode = jasmine.anything(),
		} = {}) => {
			return {
				type: 'agent end',
				agentNames,
				mode,
			};
		},

		connect: (agentNames, {
			label = jasmine.anything(),
			line = jasmine.anything(),
			left = jasmine.anything(),
			right = jasmine.anything(),
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
			};
		},

		note: (agentNames, {
			type = jasmine.anything(),
			mode = jasmine.anything(),
			label = jasmine.anything(),
		} = {}) => {
			return {
				type,
				agentNames,
				mode,
				label,
			};
		},
	};

	describe('.generate', () => {
		it('propagates title metadata', () => {
			const input = {
				meta: {title: 'bar'},
				stages: [],
			};
			const sequence = generator.generate(input);
			expect(sequence.meta).toEqual({title: 'bar'});
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
				{type: 'mark', name: 'foo'},
				{type: 'async', target: 'foo'},
				{type: 'async', target: ''},
			]});
			expect(sequence.stages).toEqual([
				{type: 'mark', name: 'foo'},
				{type: 'async', target: 'foo'},
				{type: 'async', target: ''},
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
					left: true,
					right: false,
				}),
			]});
			expect(sequence.stages).toEqual([
				jasmine.anything(),
				GENERATED.connect(['A', 'B'], {
					label: 'foo',
					line: 'bar',
					left: true,
					right: false,
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
				PARSED.beginAgents(['C', 'D']),
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
				PARSED.blockBegin('if', 'abc'),
				PARSED.connect(['A', 'B']),
				PARSED.blockSplit('else', 'xyz'),
				PARSED.connect(['A', 'C']),
				PARSED.blockEnd(),
			]});

			const block0 = sequence.stages[0];
			expect(block0.sections).toEqual([
				{mode: 'if', label: 'abc', stages: [
					GENERATED.beginAgents(['A', 'B']),
					GENERATED.connect(['A', 'B']),
				]},
				{mode: 'else', label: 'xyz', stages: [
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
				{mode: 'if', label: 'abc', stages: [
					jasmine.anything(),
					jasmine.anything(),
				]},
				{mode: 'else', label: 'xyz', stages: []},
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
				{mode: 'if', label: 'abc', stages: []},
				{mode: 'else', label: 'xyz', stages: [
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
				{mode: 'if', label: 'abc', stages: [
					jasmine.anything(),
					jasmine.anything(),
				]},
				{mode: 'else', label: 'xyz', stages: []},
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
				PARSED.note(['A', 'B'], {
					type: 'note right',
					mode: 'foo',
					label: 'bar',
				}),
			]});
			expect(sequence.stages).toEqual([
				jasmine.anything(),
				GENERATED.note(['A', 'B'], {
					type: 'note right',
					mode: 'foo',
					label: 'bar',
				}),
				jasmine.anything(),
			]);
		});

		it('defaults to showing notes around the entire diagram', () => {
			const sequence = generator.generate({stages: [
				PARSED.note([], {type: 'note right'}),
				PARSED.note([], {type: 'note left'}),
				PARSED.note([], {type: 'note over'}),
			]});
			expect(sequence.stages).toEqual([
				GENERATED.note([']'], {type: 'note right'}),
				GENERATED.note(['['], {type: 'note left'}),
				GENERATED.note(['[', ']'], {type: 'note over'}),
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
