defineDescribe('Sequence Renderer', [
	'./Renderer',
	'./themes/Basic',
], (
	Renderer,
	BasicTheme
) => {
	'use strict';

	let renderer = null;

	beforeEach(() => {
		renderer = new Renderer({themes: [new BasicTheme()]});
		document.body.appendChild(renderer.svg());
	});

	afterEach(() => {
		document.body.removeChild(renderer.svg());
	});

	describe('.svg', () => {
		it('returns an SVG node containing the rendered diagram', () => {
			const svg = renderer.svg();
			expect(svg.tagName).toEqual('svg');
		});
	});

	const GENERATED = {
		connect: (agentIDs, label = []) => {
			return {
				type: 'connect',
				agentIDs,
				label,
				options: {
					line: 'solid',
					left: 0,
					right: 1,
				},
			};
		},
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
				meta: {title: format('Title')},
				agents: [
					{
						id: '[',
						formattedLabel: null,
						anchorRight: true,
					}, {
						id: 'Col 1',
						formattedLabel: format('Col 1!'),
						anchorRight: false,
					}, {
						id: 'Col 2',
						formattedLabel: format('Col 2!'),
						anchorRight: false,
					}, {
						id: ']',
						formattedLabel: null,
						anchorRight: false,
					},
				],
				stages: [],
			});
			const element = renderer.svg();
			const title = element.getElementsByClassName('title')[0];
			expect(title.innerHTML).toEqual('Title');
		});

		it('adds the code as metadata', () => {
			renderer.render({
				meta: {title: [], code: 'hello'},
				agents: [
					{id: '[', formattedLabel: null, anchorRight: true},
					{id: ']', formattedLabel: null, anchorRight: false},
				],
				stages: [],
			});
			const element = renderer.svg();
			const metadata = element.getElementsByTagName('metadata')[0];
			expect(metadata.innerHTML).toEqual('hello');
		});

		it('positions agent lines', () => {
			/*
				A -> B
			*/

			renderer.render({
				meta: {title: []},
				agents: [
					{id: '[', formattedLabel: null, anchorRight: true},
					{id: 'A', formattedLabel: format('A!'), anchorRight: false},
					{id: 'B', formattedLabel: format('B!'), anchorRight: false},
					{id: ']', formattedLabel: null, anchorRight: false},
				],
				stages: [
					{type: 'agent begin', agentIDs: ['A', 'B'], mode: 'box'},
					GENERATED.connect(['A', 'B']),
					{type: 'agent end', agentIDs: ['A', 'B'], mode: 'none'},
				],
			});

			const element = renderer.svg();
			const line = element.getElementsByClassName('agent-1-line')[0];
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
				meta: {title: []},
				agents: [
					{id: '[', formattedLabel: null, anchorRight: true},
					{id: 'A', formattedLabel: format('A!'), anchorRight: false},
					{id: 'B', formattedLabel: format('B!'), anchorRight: false},
					{id: 'C', formattedLabel: format('C!'), anchorRight: false},
					{id: ']', formattedLabel: null, anchorRight: false},
				],
				stages: [
					{
						type: 'agent begin',
						agentIDs: ['A', 'B', 'C'],
						mode: 'box',
					},
					GENERATED.connect(['[', 'A']),
					GENERATED.connect(['A', 'B']),
					GENERATED.connect(['B', 'C']),
					GENERATED.connect(['C', ']']),
					{
						type: 'agent end',
						agentIDs: ['A', 'B', 'C'],
						mode: 'none',
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
				meta: {title: []},
				agents: [
					{id: '[', formattedLabel: null, anchorRight: true},
					{id: 'A', formattedLabel: format('A!'), anchorRight: false},
					{id: 'B', formattedLabel: format('B!'), anchorRight: false},
					{id: 'C', formattedLabel: format('C!'), anchorRight: false},
					{id: 'D', formattedLabel: format('D!'), anchorRight: false},
					{id: ']', formattedLabel: null, anchorRight: false},
				],
				stages: [
					{type: 'agent begin', agentIDs: ['A', 'B'], mode: 'box'},
					GENERATED.connect(['A', 'B'], format('short')),
					{type: 'agent end', agentIDs: ['B'], mode: 'cross'},
					{type: 'agent begin', agentIDs: ['C'], mode: 'box'},
					GENERATED.connect(['A', 'C'], format('long description')),
					{type: 'agent end', agentIDs: ['C'], mode: 'cross'},
					{type: 'agent begin', agentIDs: ['D'], mode: 'box'},
					GENERATED.connect(['A', 'D'], format('short again')),
					{type: 'agent end', agentIDs: ['A', 'D'], mode: 'cross'},
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
