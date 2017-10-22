defineDescribe('Sequence Renderer', ['./Renderer'], (Renderer) => {
	'use strict';

	let renderer = null;

	beforeEach(() => {
		renderer = new Renderer();
	});

	describe('.svg', () => {
		it('returns an SVG node containing the rendered diagram', () => {
			const svg = renderer.svg();
			expect(svg.tagName).toEqual('svg');
		});
	});

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
	});
});
