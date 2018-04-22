import {
	VirtualDocument,
	textSizerFactory,
} from '../../../spec/stubs/TestDOM.mjs';
import {Factory as BasicThemeFactory} from '../themes/Basic.mjs';
import Renderer from './Renderer.mjs';

describe('Sequence Renderer', () => {
	let renderer = null;

	beforeEach(() => {
		renderer = new Renderer({
			document: new VirtualDocument(),
			textSizerFactory,
			themes: [new BasicThemeFactory()],
		});
	});

	describe('.dom', () => {
		it('returns an SVG node containing the rendered diagram', () => {
			const svg = renderer.dom();

			expect(svg.tagName).toEqual('svg');
		});
	});

	const GENERATED = {
		connect: (agentIDs, label = []) => ({
			agentIDs,
			label,
			options: {
				left: 0,
				line: 'solid',
				right: 1,
			},
			type: 'connect',
		}),
	};

	function format(text) {
		if(!text) {
			return [];
		}
		return [[{text}]];
	}

	describe('.render', () => {
		it('populates the SVG with content', () => {
			renderer.render({
				agents: [
					{
						anchorRight: true,
						formattedLabel: null,
						id: '[',
						options: [],
					}, {
						anchorRight: false,
						formattedLabel: format('Col 1!'),
						id: 'Col 1',
						options: [],
					}, {
						anchorRight: false,
						formattedLabel: format('Col 2!'),
						id: 'Col 2',
						options: [],
					}, {
						anchorRight: false,
						formattedLabel: null,
						id: ']',
						options: [],
					},
				],
				meta: {title: format('Title')},
				stages: [],
			});
			const element = renderer.dom();
			const [title] = element.getElementsByClassName('title');

			expect(title.innerHTML).toEqual('Title');
		});

		it('adds the code as metadata', () => {
			renderer.render({
				agents: [
					{
						anchorRight: true,
						formattedLabel: null,
						id: '[',
						options: [],
					}, {
						anchorRight: false,
						formattedLabel: null,
						id: ']',
						options: [],
					},
				],
				meta: {code: 'hello', title: []},
				stages: [],
			});
			const element = renderer.dom();
			const [metadata] = element.getElementsByTagName('metadata');

			expect(metadata.innerHTML).toEqual('hello');
		});

		it('positions agent lines', () => {
			/*
				A -> B
			*/

			renderer.render({
				agents: [
					{
						anchorRight: true,
						formattedLabel: null,
						id: '[',
						options: [],
					}, {
						anchorRight: false,
						formattedLabel: format('A!'),
						id: 'A',
						options: [],
					}, {
						anchorRight: false,
						formattedLabel: format('B!'),
						id: 'B',
						options: [],
					}, {
						anchorRight: false,
						formattedLabel: null,
						id: ']',
						options: [],
					},
				],
				meta: {title: []},
				stages: [
					{agentIDs: ['A', 'B'], mode: 'box', type: 'agent begin'},
					GENERATED.connect(['A', 'B']),
					{agentIDs: ['A', 'B'], mode: 'none', type: 'agent end'},
				],
			});

			const element = renderer.dom();
			const [line] = element.getElementsByClassName('agent-1-line');
			const drawnX = Number(line.getAttribute('x1'));

			expect(drawnX).toEqual(renderer.getAgentX('A'));
		});

		it('arranges agents left-to-right', () => {
			/*
				[ -> A
				A -> B
				B -> C
				C -> ]
			*/

			renderer.render({
				agents: [
					{
						anchorRight: true,
						formattedLabel: null,
						id: '[',
						options: [],
					}, {
						anchorRight: false,
						formattedLabel: format('A!'),
						id: 'A',
						options: [],
					}, {
						anchorRight: false,
						formattedLabel: format('B!'),
						id: 'B',
						options: [],
					}, {
						anchorRight: false,
						formattedLabel: format('C!'),
						id: 'C',
						options: [],
					}, {
						anchorRight: false,
						formattedLabel: null,
						id: ']',
						options: [],
					},
				],
				meta: {title: []},
				stages: [
					{
						agentIDs: ['A', 'B', 'C'],
						mode: 'box',
						type: 'agent begin',
					},
					GENERATED.connect(['[', 'A']),
					GENERATED.connect(['A', 'B']),
					GENERATED.connect(['B', 'C']),
					GENERATED.connect(['C', ']']),
					{
						agentIDs: ['A', 'B', 'C'],
						mode: 'none',
						type: 'agent end',
					},
				],
			});

			const xL = renderer.getAgentX('[');
			const xA = renderer.getAgentX('A');
			const xB = renderer.getAgentX('B');
			const xC = renderer.getAgentX('C');
			const xR = renderer.getAgentX(']');

			expect(xA).toBeGreaterThan(xL);
			expect(xB).toBeGreaterThan(xA);
			expect(xC).toBeGreaterThan(xB);
			expect(xR).toBeGreaterThan(xC);
		});

		it('allows agent reordering for mutually-exclusive agents', () => {
			/*
				A -> B: short
				end B
				A -> C: long description here
				end C
				A -> D: short again
				end A, D
			*/

			renderer.render({
				agents: [
					{
						anchorRight: true,
						formattedLabel: null,
						id: '[',
						options: [],
					}, {
						anchorRight: false,
						formattedLabel: format('A!'),
						id: 'A',
						options: [],
					}, {
						anchorRight: false,
						formattedLabel: format('B!'),
						id: 'B',
						options: [],
					}, {
						anchorRight: false,
						formattedLabel: format('C!'),
						id: 'C',
						options: [],
					}, {
						anchorRight: false,
						formattedLabel: format('D!'),
						id: 'D',
						options: [],
					}, {
						anchorRight: false,
						formattedLabel: null,
						id: ']',
						options: [],
					},
				],
				meta: {title: []},
				stages: [
					{agentIDs: ['A', 'B'], mode: 'box', type: 'agent begin'},
					GENERATED.connect(['A', 'B'], format('short')),
					{agentIDs: ['B'], mode: 'cross', type: 'agent end'},
					{agentIDs: ['C'], mode: 'box', type: 'agent begin'},
					GENERATED.connect(['A', 'C'], format('long description')),
					{agentIDs: ['C'], mode: 'cross', type: 'agent end'},
					{agentIDs: ['D'], mode: 'box', type: 'agent begin'},
					GENERATED.connect(['A', 'D'], format('short again')),
					{agentIDs: ['A', 'D'], mode: 'cross', type: 'agent end'},
				],
			});

			const xA = renderer.getAgentX('A');
			const xB = renderer.getAgentX('B');
			const xC = renderer.getAgentX('C');
			const xD = renderer.getAgentX('D');

			expect(xB).toBeGreaterThan(xA);
			expect(xC).toBeGreaterThan(xA);
			expect(xD).toBeGreaterThan(xA);

			expect(xC).toBeGreaterThan(xB);
			expect(xD).toBeGreaterThan(xB);

			expect(xD).toBeLessThan(xC);
		});
	});
});
