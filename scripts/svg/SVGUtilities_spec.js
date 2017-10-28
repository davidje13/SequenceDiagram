defineDescribe('SVGUtilities', ['./SVGUtilities'], (svg) => {
	'use strict';

	const expectedNS = 'http://www.w3.org/2000/svg';

	describe('.makeText', () => {
		it('creates a text node with the given content', () => {
			const node = svg.makeText('foo');
			expect(node.nodeValue).toEqual('foo');
		});

		it('defaults to empty', () => {
			const node = svg.makeText();
			expect(node.nodeValue).toEqual('');
		});
	});

	describe('.make', () => {
		it('creates a node with the SVG namespace', () => {
			const node = svg.make('path');
			expect(node.namespaceURI).toEqual(expectedNS);
			expect(node.tagName).toEqual('path');
		});

		it('assigns the given attributes', () => {
			const node = svg.make('path', {'foo': 'bar'});
			expect(node.getAttribute('foo')).toEqual('bar');
		});
	});

	describe('.makeContainer', () => {
		it('creates an svg node with the SVG namespace', () => {
			const node = svg.makeContainer();
			expect(node.namespaceURI).toEqual(expectedNS);
			expect(node.getAttribute('xmlns')).toEqual(expectedNS);
			expect(node.getAttribute('version')).toEqual('1.1');
			expect(node.tagName).toEqual('svg');
		});

		it('assigns the given attributes', () => {
			const node = svg.makeContainer({'foo': 'bar'});
			expect(node.getAttribute('foo')).toEqual('bar');
		});
	});

	describe('.empty', () => {
		it('removes all child nodes from the given node', () => {
			const node = document.createElement('p');
			const a = document.createElement('p');
			const b = document.createElement('p');
			node.appendChild(a);
			node.appendChild(b);

			svg.empty(node);
			expect(node.children.length).toEqual(0);
		});
	});
});
