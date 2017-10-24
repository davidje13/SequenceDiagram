defineDescribe('Sequence Generator', ['./Generator'], (Generator) => {
	'use strict';

	/* jshint -W071 */ // Allow lots of tests

	const generator = new Generator();

	const AGENT_DEFINE = 'agent define';
	const AGENT_BEGIN = 'agent begin';
	const AGENT_END = 'agent end';

	const BLOCK_BEGIN = 'block begin';
	const BLOCK_SPLIT = 'block split';
	const BLOCK_END = 'block end';

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
			expect(sequence.agents).toEqual(['[', ']']);
		});

		it('returns aggregated agents', () => {
			const sequence = generator.generate({stages: [
				{type: '->', agents: ['A', 'B']},
				{type: '<-', agents: ['C', 'D']},
				{type: AGENT_BEGIN, agents: ['E'], mode: 'box'},
			]});
			expect(sequence.agents).toEqual(
				['[', 'A', 'B', 'C', 'D', 'E', ']']
			);
		});

		it('always puts the implicit right agent on the right', () => {
			const sequence = generator.generate({stages: [
				{type: '->', agents: [']', 'B']},
			]});
			expect(sequence.agents).toEqual(['[', 'B', ']']);
		});

		it('creates implicit begin stages for agents when used', () => {
			const sequence = generator.generate({stages: [
				{type: '->', agents: ['A', 'B']},
				{type: '->', agents: ['B', 'C']},
			]});
			expect(sequence.stages).toEqual([
				{type: AGENT_BEGIN, agents: ['A', 'B'], mode: 'box'},
				{type: '->', agents: ['A', 'B']},
				{type: AGENT_BEGIN, agents: ['C'], mode: 'box'},
				{type: '->', agents: ['B', 'C']},
				{type: AGENT_END, agents: ['A', 'B', 'C'], mode: 'none'},
			]);
		});

		it('creates implicit end stages for all remaining agents', () => {
			const sequence = generator.generate({
				meta: {
					terminators: 'foo',
				},
				stages: [
					{type: '->', agents: ['A', 'B']},
				],
			});
			expect(sequence.stages).toEqual([
				{type: AGENT_BEGIN, agents: ['A', 'B'], mode: 'box'},
				{type: '->', agents: ['A', 'B']},
				{type: AGENT_END, agents: ['A', 'B'], mode: 'foo'},
			]);
		});

		it('does not create duplicate begin stages', () => {
			const sequence = generator.generate({stages: [
				{type: AGENT_BEGIN, agents: ['A', 'B', 'C'], mode: 'box'},
				{type: '->', agents: ['A', 'B']},
				{type: '->', agents: ['B', 'C']},
			]});
			expect(sequence.stages).toEqual([
				{type: AGENT_BEGIN, agents: ['A', 'B', 'C'], mode: 'box'},
				{type: '->', agents: ['A', 'B']},
				{type: '->', agents: ['B', 'C']},
				{type: AGENT_END, agents: ['A', 'B', 'C'], mode: 'none'},
			]);
		});

		it('redisplays agents if they have been hidden', () => {
			const sequence = generator.generate({stages: [
				{type: AGENT_BEGIN, agents: ['A', 'B'], mode: 'box'},
				{type: '->', agents: ['A', 'B']},
				{type: AGENT_END, agents: ['B'], mode: 'cross'},
				{type: '->', agents: ['A', 'B']},
			]});
			expect(sequence.stages).toEqual([
				{type: AGENT_BEGIN, agents: ['A', 'B'], mode: 'box'},
				{type: '->', agents: ['A', 'B']},
				{type: AGENT_END, agents: ['B'], mode: 'cross'},
				{type: AGENT_BEGIN, agents: ['B'], mode: 'box'},
				{type: '->', agents: ['A', 'B']},
				{type: AGENT_END, agents: ['A', 'B'], mode: 'none'},
			]);
		});

		it('collapses adjacent begin statements', () => {
			const sequence = generator.generate({stages: [
				{type: '->', agents: ['A', 'B']},
				{type: AGENT_BEGIN, agents: ['D'], mode: 'box'},
				{type: '->', agents: ['B', 'C']},
				{type: '->', agents: ['C', 'D']},
			]});
			expect(sequence.stages).toEqual([
				{type: AGENT_BEGIN, agents: ['A', 'B'], mode: 'box'},
				{type: '->', agents: ['A', 'B']},
				{type: AGENT_BEGIN, agents: ['D', 'C'], mode: 'box'},
				{type: '->', agents: ['B', 'C']},
				{type: '->', agents: ['C', 'D']},
				{type: AGENT_END, agents: ['A', 'B', 'D', 'C'], mode: 'none'},
			]);
		});

		it('removes superfluous begin statements', () => {
			const sequence = generator.generate({stages: [
				{type: '->', agents: ['A', 'B']},
				{type: AGENT_BEGIN, agents: ['A', 'C', 'D'], mode: 'box'},
				{type: AGENT_BEGIN, agents: ['C', 'E'], mode: 'box'},
			]});
			expect(sequence.stages).toEqual([
				{type: AGENT_BEGIN, agents: ['A', 'B'], mode: 'box'},
				{type: '->', agents: ['A', 'B']},
				{type: AGENT_BEGIN, agents: ['C', 'D', 'E'], mode: 'box'},
				{type: AGENT_END, agents: [
					'A', 'B', 'C', 'D', 'E',
				], mode: 'none'},
			]);
		});

		it('removes superfluous end statements', () => {
			const sequence = generator.generate({stages: [
				{type: AGENT_DEFINE, agents: ['E']},
				{type: AGENT_BEGIN, agents: ['C', 'D'], mode: 'box'},
				{type: '->', agents: ['A', 'B']},
				{type: AGENT_END, agents: ['A', 'B', 'C'], mode: 'cross'},
				{type: AGENT_END, agents: ['A', 'D', 'E'], mode: 'cross'},
			]});
			expect(sequence.stages).toEqual([
				{type: AGENT_BEGIN, agents: ['C', 'D', 'A', 'B'], mode: 'box'},
				{type: '->', agents: ['A', 'B']},
				{type: AGENT_END, agents: ['A', 'B', 'C', 'D'], mode: 'cross'},
			]);
		});

		it('does not merge different modes of end', () => {
			const sequence = generator.generate({stages: [
				{type: AGENT_BEGIN, agents: ['C', 'D'], mode: 'box'},
				{type: '->', agents: ['A', 'B']},
				{type: AGENT_END, agents: ['A', 'B', 'C'], mode: 'cross'},
			]});
			expect(sequence.stages).toEqual([
				{type: AGENT_BEGIN, agents: ['C', 'D', 'A', 'B'], mode: 'box'},
				{type: '->', agents: ['A', 'B']},
				{type: AGENT_END, agents: ['A', 'B', 'C'], mode: 'cross'},
				{type: AGENT_END, agents: ['D'], mode: 'none'},
			]);
		});

		it('creates virtual agents for block statements', () => {
			const sequence = generator.generate({stages: [
				{type: BLOCK_BEGIN, mode: 'if', label: 'abc'},
				{type: '->', agents: ['A', 'B']},
				{type: BLOCK_END},
			]});

			expect(sequence.agents).toEqual(
				['[', '__BLOCK0[', 'A', 'B', '__BLOCK0]', ']']
			);
		});

		it('positions virtual block agents near involved agents', () => {
			const sequence = generator.generate({stages: [
				{type: '->', agents: ['A', 'B']},
				{type: BLOCK_BEGIN, mode: 'if', label: 'abc'},
				{type: '->', agents: ['C', 'D']},
				{type: BLOCK_BEGIN, mode: 'if', label: 'abc'},
				{type: '->', agents: ['E', 'F']},
				{type: BLOCK_END},
				{type: BLOCK_END},
				{type: '->', agents: ['G', 'H']},
			]});

			expect(sequence.agents).toEqual([
				'[',
				'A',
				'B',
				'__BLOCK0[',
				'C',
				'D',
				'__BLOCK1[',
				'E',
				'F',
				'__BLOCK1]',
				'__BLOCK0]',
				'G',
				'H',
				']',
			]);
		});

		it('records virtual block column names in blocks', () => {
			const sequence = generator.generate({stages: [
				{type: BLOCK_BEGIN, mode: 'if', label: 'abc'},
				{type: '->', agents: ['A', 'B']},
				{type: BLOCK_END},
			]});

			const block0 = sequence.stages[0];
			expect(block0.type).toEqual('block');
			expect(block0.leftColumn).toEqual('__BLOCK0[');
			expect(block0.rightColumn).toEqual('__BLOCK0]');
		});

		it('records all involved agents in blocks', () => {
			const sequence = generator.generate({stages: [
				{type: BLOCK_BEGIN, mode: 'if', label: 'abc'},
				{type: '->', agents: ['A', 'B']},
				{type: BLOCK_SPLIT, mode: 'else', label: 'xyz'},
				{type: '->', agents: ['A', 'C']},
				{type: BLOCK_END},
			]});

			const block0 = sequence.stages[0];
			expect(block0.agents).toEqual(
				['__BLOCK0[', 'A', 'B', 'C', '__BLOCK0]']
			);
		});

		it('records all sections within blocks', () => {
			const sequence = generator.generate({stages: [
				{type: BLOCK_BEGIN, mode: 'if', label: 'abc'},
				{type: '->', agents: ['A', 'B']},
				{type: BLOCK_SPLIT, mode: 'else', label: 'xyz'},
				{type: '->', agents: ['A', 'C']},
				{type: BLOCK_END},
			]});

			const block0 = sequence.stages[0];
			expect(block0.sections).toEqual([
				{mode: 'if', label: 'abc', stages: [
					{type: AGENT_BEGIN, agents: ['A', 'B'], mode: 'box'},
					{type: '->', agents: ['A', 'B']},
				]},
				{mode: 'else', label: 'xyz', stages: [
					{type: AGENT_BEGIN, agents: ['C'], mode: 'box'},
					{type: '->', agents: ['A', 'C']},
				]},
			]);
		});

		it('records all involved agents in nested blocks', () => {
			const sequence = generator.generate({stages: [
				{type: BLOCK_BEGIN, mode: 'if', label: 'abc'},
				{type: '->', agents: ['A', 'B']},
				{type: BLOCK_SPLIT, mode: 'else', label: 'xyz'},
				{type: BLOCK_BEGIN, mode: 'if', label: 'def'},
				{type: '->', agents: ['A', 'C']},
				{type: BLOCK_END},
				{type: BLOCK_END},
			]});

			const block0 = sequence.stages[0];
			expect(block0.type).toEqual('block');
			expect(block0.agents).toEqual([
				'__BLOCK0[',
				'__BLOCK1[',
				'A',
				'B',
				'C',
				'__BLOCK1]',
				'__BLOCK0]',
			]);
			expect(block0.leftColumn).toEqual('__BLOCK0[');
			expect(block0.rightColumn).toEqual('__BLOCK0]');

			const block1 = block0.sections[1].stages[0];
			expect(block1.type).toEqual('block');
			expect(block1.agents).toEqual([
				'__BLOCK1[',
				'C',
				'A',
				'__BLOCK1]',
			]);
			expect(block1.leftColumn).toEqual('__BLOCK1[');
			expect(block1.rightColumn).toEqual('__BLOCK1]');
		});

		it('allows empty block parts after split', () => {
			const sequence = generator.generate({stages: [
				{type: BLOCK_BEGIN, mode: 'if', label: 'abc'},
				{type: '->', agents: ['A', 'B']},
				{type: BLOCK_SPLIT, mode: 'else', label: 'xyz'},
				{type: BLOCK_END},
			]});

			const block0 = sequence.stages[0];
			expect(block0.sections).toEqual([
				{mode: 'if', label: 'abc', stages: [
					{type: AGENT_BEGIN, agents: ['A', 'B'], mode: 'box'},
					{type: '->', agents: ['A', 'B']},
				]},
				{mode: 'else', label: 'xyz', stages: []},
			]);
		});

		it('allows empty block parts before split', () => {
			const sequence = generator.generate({stages: [
				{type: BLOCK_BEGIN, mode: 'if', label: 'abc'},
				{type: BLOCK_SPLIT, mode: 'else', label: 'xyz'},
				{type: '->', agents: ['A', 'B']},
				{type: BLOCK_END},
			]});

			const block0 = sequence.stages[0];
			expect(block0.sections).toEqual([
				{mode: 'if', label: 'abc', stages: []},
				{mode: 'else', label: 'xyz', stages: [
					{type: AGENT_BEGIN, agents: ['A', 'B'], mode: 'box'},
					{type: '->', agents: ['A', 'B']},
				]},
			]);
		});

		it('removes entirely empty blocks', () => {
			const sequence = generator.generate({stages: [
				{type: BLOCK_BEGIN, mode: 'if', label: 'abc'},
				{type: BLOCK_SPLIT, mode: 'else', label: 'xyz'},
				{type: BLOCK_BEGIN, mode: 'if', label: 'abc'},
				{type: BLOCK_END},
				{type: BLOCK_END},
			]});

			expect(sequence.stages).toEqual([]);
		});

		it('does not create virtual agents for empty blocks', () => {
			const sequence = generator.generate({stages: [
				{type: BLOCK_BEGIN, mode: 'if', label: 'abc'},
				{type: BLOCK_SPLIT, mode: 'else', label: 'xyz'},
				{type: BLOCK_BEGIN, mode: 'if', label: 'abc'},
				{type: BLOCK_END},
				{type: BLOCK_END},
			]});

			expect(sequence.agents).toEqual(['[', ']']);
		});

		it('removes entirely empty nested blocks', () => {
			const sequence = generator.generate({stages: [
				{type: BLOCK_BEGIN, mode: 'if', label: 'abc'},
				{type: '->', agents: ['A', 'B']},
				{type: BLOCK_SPLIT, mode: 'else', label: 'xyz'},
				{type: BLOCK_BEGIN, mode: 'if', label: 'abc'},
				{type: BLOCK_END},
				{type: BLOCK_END},
			]});

			const block0 = sequence.stages[0];
			expect(block0.sections).toEqual([
				{mode: 'if', label: 'abc', stages: [
					{type: AGENT_BEGIN, agents: ['A', 'B'], mode: 'box'},
					{type: '->', agents: ['A', 'B']},
				]},
				{mode: 'else', label: 'xyz', stages: []},
			]);
		});

		it('rejects unterminated blocks', () => {
			expect(() => generator.generate({stages: [
				{type: BLOCK_BEGIN, mode: 'if', label: 'abc'},
				{type: '->', agents: ['A', 'B']},
			]})).toThrow();

			expect(() => generator.generate({stages: [
				{type: BLOCK_BEGIN, mode: 'if', label: 'abc'},
				{type: BLOCK_BEGIN, mode: 'if', label: 'def'},
				{type: '->', agents: ['A', 'B']},
				{type: BLOCK_END},
			]})).toThrow();
		});

		it('rejects extra block terminations', () => {
			expect(() => generator.generate({stages: [
				{type: BLOCK_END},
			]})).toThrow();

			expect(() => generator.generate({stages: [
				{type: BLOCK_BEGIN, mode: 'if', label: 'abc'},
				{type: '->', agents: ['A', 'B']},
				{type: BLOCK_END},
				{type: BLOCK_END},
			]})).toThrow();
		});

		it('rejects block splitting without a block', () => {
			expect(() => generator.generate({stages: [
				{type: BLOCK_SPLIT, mode: 'else', label: 'xyz'},
			]})).toThrow();

			expect(() => generator.generate({stages: [
				{type: BLOCK_BEGIN, mode: 'if', label: 'abc'},
				{type: '->', agents: ['A', 'B']},
				{type: BLOCK_END},
				{type: BLOCK_SPLIT, mode: 'else', label: 'xyz'},
			]})).toThrow();
		});

		it('rejects block splitting in non-splittable blocks', () => {
			expect(() => generator.generate({stages: [
				{type: BLOCK_BEGIN, mode: 'repeat', label: 'abc'},
				{type: BLOCK_SPLIT, mode: 'else', label: 'xyz'},
				{type: '->', agents: ['A', 'B']},
				{type: BLOCK_END},
			]})).toThrow();
		});

		it('rejects attempts to change implicit agents', () => {
			expect(() => generator.generate({stages: [
				{type: AGENT_BEGIN, agents: ['['], mode: 'box'},
			]})).toThrow();

			expect(() => generator.generate({stages: [
				{type: AGENT_BEGIN, agents: [']'], mode: 'box'},
			]})).toThrow();

			expect(() => generator.generate({stages: [
				{type: AGENT_END, agents: ['['], mode: 'cross'},
			]})).toThrow();

			expect(() => generator.generate({stages: [
				{type: AGENT_END, agents: [']'], mode: 'cross'},
			]})).toThrow();
		});
	});
});
