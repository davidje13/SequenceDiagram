defineDescribe('Sequence Generator', ['./Generator'], (Generator) => {
	'use strict';

	const generator = new Generator();

	const parsed = {
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
				agents: agentNames.map((name) => ({name})),
			};
		},

		beginAgents: (agentNames, {mode = 'box'} = {}) => {
			return {
				type: 'agent begin',
				agents: agentNames.map((name) => ({name})),
				mode,
			};
		},

		endAgents: (agentNames, {mode = 'cross'} = {}) => {
			return {
				type: 'agent end',
				agents: agentNames.map((name) => ({name})),
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
				type: 'connection',
				agents: agentNames.map((name) => ({name})),
				label,
				line,
				left,
				right,
			};
		},

		note: (agentNames, {
			type = 'note over',
			mode = '',
			label = '',
		} = {}) => {
			return {
				type,
				agents: agentNames.map((name) => ({name})),
				mode,
				label,
			};
		},
	};

	const generated = {
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
				type: 'connection',
				agentNames,
				label,
				line,
				left,
				right,
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
				parsed.connect(['A', 'B']),
				parsed.connect(['C', 'D']),
				parsed.beginAgents(['E']),
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
				parsed.connect([']', 'B']),
			]});
			expect(sequence.agents).toEqual([
				{name: '[', anchorRight: true},
				{name: 'B', anchorRight: false},
				{name: ']', anchorRight: false},
			]);
		});

		it('accounts for define calls when ordering agents', () => {
			const sequence = generator.generate({stages: [
				parsed.defineAgents(['B']),
				parsed.connect(['A', 'B']),
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
				parsed.connect(['A', 'B']),
				parsed.connect(['B', 'C']),
			]});
			expect(sequence.stages).toEqual([
				generated.beginAgents(['A', 'B']),
				jasmine.anything(),
				generated.beginAgents(['C']),
				jasmine.anything(),
				jasmine.anything(),
			]);
		});

		it('passes connections through', () => {
			const sequence = generator.generate({stages: [
				parsed.connect(['A', 'B']),
			]});
			expect(sequence.stages).toEqual([
				jasmine.anything(),
				generated.connect(['A', 'B']),
				jasmine.anything(),
			]);
		});

		it('propagates connection information', () => {
			const sequence = generator.generate({stages: [
				parsed.connect(['A', 'B'], {
					label: 'foo',
					line: 'bar',
					left: true,
					right: false,
				}),
			]});
			expect(sequence.stages).toEqual([
				jasmine.anything(),
				generated.connect(['A', 'B'], {
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
					parsed.connect(['A', 'B']),
				],
			});
			expect(sequence.stages).toEqual([
				jasmine.anything(),
				jasmine.anything(),
				generated.endAgents(['A', 'B'], {mode: 'foo'}),
			]);
		});

		it('defaults to mode "none" for implicit end stages', () => {
			const sequence = generator.generate({stages: [
				parsed.connect(['A', 'B']),
			]});
			expect(sequence.stages).toEqual([
				jasmine.anything(),
				jasmine.anything(),
				generated.endAgents(['A', 'B'], {mode: 'none'}),
			]);
		});

		it('defaults to mode "cross" for explicit end stages', () => {
			const sequence = generator.generate({stages: [
				parsed.connect(['A', 'B']),
				parsed.endAgents(['A', 'B']),
			]});
			expect(sequence.stages).toEqual([
				jasmine.anything(),
				jasmine.anything(),
				generated.endAgents(['A', 'B'], {mode: 'cross'}),
			]);
		});

		it('does not create duplicate begin stages', () => {
			const sequence = generator.generate({stages: [
				parsed.beginAgents(['A', 'B', 'C']),
				parsed.connect(['A', 'B']),
				parsed.connect(['B', 'C']),
			]});
			expect(sequence.stages).toEqual([
				generated.beginAgents(['A', 'B', 'C']),
				generated.connect(jasmine.anything()),
				generated.connect(jasmine.anything()),
				generated.endAgents(['A', 'B', 'C']),
			]);
		});

		it('redisplays agents if they have been hidden', () => {
			const sequence = generator.generate({stages: [
				parsed.beginAgents(['A', 'B']),
				parsed.connect(['A', 'B']),
				parsed.endAgents(['B']),
				parsed.connect(['A', 'B']),
			]});
			expect(sequence.stages).toEqual([
				jasmine.anything(),
				jasmine.anything(),
				generated.endAgents(['B']),
				generated.beginAgents(['B']),
				jasmine.anything(),
				jasmine.anything(),
			]);
		});

		it('collapses adjacent begin statements', () => {
			const sequence = generator.generate({stages: [
				parsed.connect(['A', 'B']),
				parsed.beginAgents(['D']),
				parsed.connect(['B', 'C']),
				parsed.connect(['C', 'D']),
			]});
			expect(sequence.stages).toEqual([
				generated.beginAgents(['A', 'B']),
				generated.connect(jasmine.anything()),
				generated.beginAgents(['D', 'C']),
				generated.connect(jasmine.anything()),
				generated.connect(jasmine.anything()),
				jasmine.anything(),
			]);
		});

		it('removes superfluous begin statements', () => {
			const sequence = generator.generate({stages: [
				parsed.connect(['A', 'B']),
				parsed.beginAgents(['A', 'C', 'D']),
				parsed.beginAgents(['C', 'E']),
			]});
			expect(sequence.stages).toEqual([
				generated.beginAgents(['A', 'B']),
				generated.connect(jasmine.anything()),
				generated.beginAgents(['C', 'D', 'E']),
				jasmine.anything(),
			]);
		});

		it('removes superfluous end statements', () => {
			const sequence = generator.generate({stages: [
				parsed.defineAgents(['E']),
				parsed.beginAgents(['C', 'D']),
				parsed.connect(['A', 'B']),
				parsed.endAgents(['A', 'B', 'C']),
				parsed.endAgents(['A', 'D', 'E']),
			]});
			expect(sequence.stages).toEqual([
				jasmine.anything(),
				generated.connect(jasmine.anything()),
				generated.endAgents(['A', 'B', 'C', 'D']),
			]);
		});

		it('does not merge different modes of end', () => {
			const sequence = generator.generate({stages: [
				parsed.beginAgents(['C', 'D']),
				parsed.connect(['A', 'B']),
				parsed.endAgents(['A', 'B', 'C']),
			]});
			expect(sequence.stages).toEqual([
				jasmine.anything(),
				generated.connect(jasmine.anything()),
				generated.endAgents(['A', 'B', 'C'], {mode: 'cross'}),
				generated.endAgents(['D'], {mode: 'none'}),
			]);
		});

		it('creates virtual agents for block statements', () => {
			const sequence = generator.generate({stages: [
				parsed.blockBegin('if', 'abc'),
				parsed.connect(['A', 'B']),
				parsed.blockEnd(),
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
				parsed.connect(['A', 'B']),
				parsed.blockBegin('if', 'abc'),
				parsed.connect(['C', 'D']),
				parsed.blockBegin('if', 'abc'),
				parsed.connect(['E', 'F']),
				parsed.blockEnd(),
				parsed.blockEnd(),
				parsed.connect(['G', 'H']),
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
				parsed.blockBegin('if', 'abc'),
				parsed.connect(['A', 'B']),
				parsed.blockEnd(),
			]});

			const block0 = sequence.stages[0];
			expect(block0.type).toEqual('block');
			expect(block0.left).toEqual('__BLOCK0[');
			expect(block0.right).toEqual('__BLOCK0]');
		});

		it('records all sections within blocks', () => {
			const sequence = generator.generate({stages: [
				parsed.blockBegin('if', 'abc'),
				parsed.connect(['A', 'B']),
				parsed.blockSplit('else', 'xyz'),
				parsed.connect(['A', 'C']),
				parsed.blockEnd(),
			]});

			const block0 = sequence.stages[0];
			expect(block0.sections).toEqual([
				{mode: 'if', label: 'abc', stages: [
					generated.beginAgents(['A', 'B']),
					generated.connect(['A', 'B']),
				]},
				{mode: 'else', label: 'xyz', stages: [
					generated.beginAgents(['C']),
					generated.connect(['A', 'C']),
				]},
			]);
		});

		it('records virtual block agents in nested blocks', () => {
			const sequence = generator.generate({stages: [
				parsed.blockBegin('if', 'abc'),
				parsed.connect(['A', 'B']),
				parsed.blockSplit('else', 'xyz'),
				parsed.blockBegin('if', 'def'),
				parsed.connect(['A', 'C']),
				parsed.blockEnd(),
				parsed.blockEnd(),
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
				parsed.connect(['A', 'B']),
				parsed.blockBegin('if', 'abc'),
				parsed.blockBegin('if', 'def'),
				parsed.connect(['A', 'B']),
				parsed.blockEnd(),
				parsed.blockEnd(),
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
				parsed.blockBegin('if', 'abc'),
				parsed.connect(['A', 'B']),
				parsed.blockSplit('else', 'xyz'),
				parsed.blockEnd(),
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
				parsed.blockBegin('if', 'abc'),
				parsed.blockSplit('else', 'xyz'),
				parsed.connect(['A', 'B']),
				parsed.blockEnd(),
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
				parsed.blockBegin('if', 'abc'),
				parsed.blockSplit('else', 'xyz'),
				parsed.blockBegin('if', 'abc'),
				parsed.blockEnd(),
				parsed.blockEnd(),
			]});

			expect(sequence.stages).toEqual([]);
		});

		it('removes blocks containing only define statements / markers', () => {
			const sequence = generator.generate({stages: [
				parsed.blockBegin('if', 'abc'),
				parsed.defineAgents(['A']),
				{type: 'mark', name: 'foo'},
				parsed.blockEnd(),
			]});

			expect(sequence.stages).toEqual([]);
		});

		it('does not create virtual agents for empty blocks', () => {
			const sequence = generator.generate({stages: [
				parsed.blockBegin('if', 'abc'),
				parsed.blockSplit('else', 'xyz'),
				parsed.blockBegin('if', 'abc'),
				parsed.blockEnd(),
				parsed.blockEnd(),
			]});

			expect(sequence.agents).toEqual([
				{name: '[', anchorRight: true},
				{name: ']', anchorRight: false},
			]);
		});

		it('removes entirely empty nested blocks', () => {
			const sequence = generator.generate({stages: [
				parsed.blockBegin('if', 'abc'),
				parsed.connect(['A', 'B']),
				parsed.blockSplit('else', 'xyz'),
				parsed.blockBegin('if', 'abc'),
				parsed.blockEnd(),
				parsed.blockEnd(),
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
				parsed.blockBegin('if', 'abc'),
				parsed.connect(['A', 'B']),
			]})).toThrow();

			expect(() => generator.generate({stages: [
				parsed.blockBegin('if', 'abc'),
				parsed.blockBegin('if', 'def'),
				parsed.connect(['A', 'B']),
				parsed.blockEnd(),
			]})).toThrow();
		});

		it('rejects extra block terminations', () => {
			expect(() => generator.generate({stages: [
				parsed.blockEnd(),
			]})).toThrow();

			expect(() => generator.generate({stages: [
				parsed.blockBegin('if', 'abc'),
				parsed.connect(['A', 'B']),
				parsed.blockEnd(),
				parsed.blockEnd(),
			]})).toThrow();
		});

		it('rejects block splitting without a block', () => {
			expect(() => generator.generate({stages: [
				parsed.blockSplit('else', 'xyz'),
			]})).toThrow();

			expect(() => generator.generate({stages: [
				parsed.blockBegin('if', 'abc'),
				parsed.connect(['A', 'B']),
				parsed.blockEnd(),
				parsed.blockSplit('else', 'xyz'),
			]})).toThrow();
		});

		it('rejects block splitting in non-splittable blocks', () => {
			expect(() => generator.generate({stages: [
				parsed.blockBegin('repeat', 'abc'),
				parsed.blockSplit('else', 'xyz'),
				parsed.connect(['A', 'B']),
				parsed.blockEnd(),
			]})).toThrow();
		});

		it('passes notes through', () => {
			const sequence = generator.generate({stages: [
				parsed.note(['A', 'B'], {
					type: 'note right',
					mode: 'foo',
					label: 'bar',
				}),
			]});
			expect(sequence.stages).toEqual([
				jasmine.anything(),
				generated.note(['A', 'B'], {
					type: 'note right',
					mode: 'foo',
					label: 'bar',
				}),
				jasmine.anything(),
			]);
		});

		it('defaults to showing notes around the entire diagram', () => {
			const sequence = generator.generate({stages: [
				parsed.note([], {type: 'note right'}),
				parsed.note([], {type: 'note left'}),
				parsed.note([], {type: 'note over'}),
			]});
			expect(sequence.stages).toEqual([
				generated.note([']'], {type: 'note right'}),
				generated.note(['['], {type: 'note left'}),
				generated.note(['[', ']'], {type: 'note over'}),
			]);
		});

		it('rejects attempts to change implicit agents', () => {
			expect(() => generator.generate({stages: [
				parsed.beginAgents(['[']),
			]})).toThrow();

			expect(() => generator.generate({stages: [
				parsed.beginAgents([']']),
			]})).toThrow();

			expect(() => generator.generate({stages: [
				parsed.endAgents(['[']),
			]})).toThrow();

			expect(() => generator.generate({stages: [
				parsed.endAgents([']']),
			]})).toThrow();
		});
	});
});
