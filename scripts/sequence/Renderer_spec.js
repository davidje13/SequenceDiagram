defineDescribe('Sequence Renderer', ['./Renderer'], (Renderer) => {
	'use strict';

	let renderer = null;

	beforeEach(() => {
		renderer = new Renderer();
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

	function connectionStage(agents, label = '') {
		return {
			type: 'connection',
			line: 'solid',
			left: false,
			right: true,
			agents,
			label,
		};
	}

	describe('.render', () => {
		it('populates the SVG with content', () => {
			renderer.render({
				meta: {title: 'Title'},
				agents: ['[', 'Col 1', 'Col 2', ']'],
				stages: [],
			});
			const element = renderer.svg();
			const title = element.getElementsByClassName('title')[0];
			expect(title.innerHTML).toEqual('Title');
		});

		it('positions agent lines', () => {
			/*
				A -> B
			*/

			renderer.render({
				meta: {title: ''},
				agents: ['[', 'A', 'B', ']'],
				stages: [
					{type: 'agent begin', agents: ['A', 'B'], mode: 'box'},
					connectionStage(['A', 'B']),
					{type: 'agent end', agents: ['A', 'B'], mode: 'none'},
				],
			});

			const element = renderer.svg();
			const line = element.getElementsByClassName('agent-1-line')[0];
			const drawnX = Number(line.getAttribute('d').split(' ')[1]);

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
				meta: {title: ''},
				agents: ['[', 'A', 'B', 'C', ']'],
				stages: [
					{type: 'agent begin', agents: ['A', 'B', 'C'], mode: 'box'},
					connectionStage(['[', 'A']),
					connectionStage(['A', 'B']),
					connectionStage(['B', 'C']),
					connectionStage(['C', ']']),
					{type: 'agent end', agents: ['A', 'B', 'C'], mode: 'none'},
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
				meta: {title: ''},
				agents: ['[', 'A', 'B', 'C', 'D', ']'],
				stages: [
					{type: 'agent begin', agents: ['A', 'B'], mode: 'box'},
					connectionStage(['A', 'B'], 'short'),
					{type: 'agent end', agents: ['B'], mode: 'cross'},
					{type: 'agent begin', agents: ['C'], mode: 'box'},
					connectionStage(['A', 'C'], 'long description here'),
					{type: 'agent end', agents: ['C'], mode: 'cross'},
					{type: 'agent begin', agents: ['D'], mode: 'box'},
					connectionStage(['A', 'D'], 'short again'),
					{type: 'agent end', agents: ['A', 'D'], mode: 'cross'},
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
