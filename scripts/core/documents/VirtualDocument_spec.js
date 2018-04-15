defineDescribe('VirtualDocument', ['./VirtualDocument'], (VirtualDocument) => {
	'use strict';

	const doc = new VirtualDocument();

	describe('createElement', () => {
		it('creates elements which conform to the DOM API', () => {
			const o = doc.createElement('div');
			expect(o.ownerDocument).toEqual(doc);
			expect(o.tagName).toEqual('div');
			expect(o.namespaceURI).toEqual('');
			expect(o.parentNode).toEqual(null);
			expect(o.childNodes.length).toEqual(0);
		});

		it('claims all elements are always connected', () => {
			const o = doc.createElement('div');
			expect(o.isConnected).toEqual(true);
		});
	});

	describe('appendChild', () => {
		it('adds a child to the element', () => {
			const o = doc.createElement('div');
			o.appendChild(doc.createElement('span'));

			expect(o.childNodes.length).toEqual(1);
			expect(o.childNodes[0].tagName).toEqual('span');
		});

		it('removes the child from its old parent', () => {
			const o = doc.createElement('div');
			const oldParent = doc.createElement('div');
			const child = doc.createElement('span');
			oldParent.appendChild(child);
			o.appendChild(child);

			expect(oldParent.childNodes.length).toEqual(0);
		});

		it('rejects loops', () => {
			const o1 = doc.createElement('div');
			const o2 = doc.createElement('div');
			const o3 = doc.createElement('div');
			o1.appendChild(o2);
			o2.appendChild(o3);

			expect(() => o3.appendChild(o1)).toThrow();
		});
	});

	describe('removeChild', () => {
		it('removes a child from the element', () => {
			const o = doc.createElement('div');
			const child = doc.createElement('span');
			o.appendChild(child);
			o.removeChild(child);

			expect(o.childNodes.length).toEqual(0);
		});

		it('rejects nodes which are not children', () => {
			const o = doc.createElement('div');
			const child = doc.createElement('span');

			expect(() => o.removeChild(child)).toThrow();
		});
	});

	describe('firstChild', () => {
		it('returns the first child of the node', () => {
			const o = doc.createElement('div');
			o.appendChild(doc.createElement('a'));
			o.appendChild(doc.createElement('b'));

			expect(o.firstChild.tagName).toEqual('a');
		});

		it('returns null if there are no children', () => {
			const o = doc.createElement('div');

			expect(o.firstChild).toEqual(null);
		});
	});

	describe('lastChild', () => {
		it('returns the last child of the node', () => {
			const o = doc.createElement('div');
			o.appendChild(doc.createElement('a'));
			o.appendChild(doc.createElement('b'));

			expect(o.lastChild.tagName).toEqual('b');
		});

		it('returns null if there are no children', () => {
			const o = doc.createElement('div');

			expect(o.lastChild).toEqual(null);
		});
	});

	describe('contains', () => {
		it('returns true if the given node is within the current node', () => {
			const o = doc.createElement('div');
			const child = doc.createElement('div');
			o.appendChild(child);

			expect(o.contains(child)).toEqual(true);
		});

		it('performs a deep check', () => {
			const o = doc.createElement('div');
			const middle = doc.createElement('div');
			const child = doc.createElement('div');
			o.appendChild(middle);
			middle.appendChild(child);

			expect(o.contains(child)).toEqual(true);
		});

		it('returns true if the nodes are the same', () => {
			const o = doc.createElement('div');

			expect(o.contains(o)).toEqual(true);
		});

		it('returns false if the node is not within the current node', () => {
			const o = doc.createElement('div');
			const o2 = doc.createElement('div');

			expect(o.contains(o2)).toEqual(false);
		});
	});

	describe('textContent', () => {
		it('replaces the content of the element', () => {
			const o = doc.createElement('div');
			o.appendChild(doc.createElement('span'));
			o.textContent = 'foo';

			expect(o.innerHTML).toEqual('foo');
		});

		it('returns the text content of all child nodes', () => {
			const o = doc.createElement('div');
			const child = doc.createElement('span');
			o.appendChild(doc.createTextNode('abc'));
			o.appendChild(child);
			child.appendChild(doc.createTextNode('def'));
			o.appendChild(doc.createTextNode('ghi'));

			expect(o.textContent).toEqual('abcdefghi');
		});
	});

	describe('attributes', () => {
		it('keeps a key/value map of attributes', () => {
			const o = doc.createElement('div');
			o.setAttribute('foo', 'bar');
			o.setAttribute('zig', 'zag');
			o.setAttribute('foo', 'baz');

			expect(o.getAttribute('foo')).toEqual('baz');
			expect(o.getAttribute('zig')).toEqual('zag');
			expect(o.getAttribute('nope')).toEqual(undefined);
		});
	});

	describe('events', () => {
		let o = null;
		let called = null;
		let fn = null;

		beforeEach(() => {
			o = doc.createElement('div');
			called = 0;
			fn = () => {
				++ called;
			};
		});

		it('stores and triggers event listeners', () => {
			o.addEventListener('foo', fn);

			o.dispatchEvent(new Event('foo'));

			expect(called).toEqual(1);
		});

		it('removes listeners when removeEventListener is called', () => {
			o.addEventListener('foo', fn);
			o.removeEventListener('foo', fn);

			o.dispatchEvent(new Event('foo'));

			expect(called).toEqual(0);
		});

		it('stores multiple event listeners', () => {
			const fn2 = () => {
				called += 10;
			};
			o.addEventListener('foo', fn);
			o.addEventListener('foo', fn2);

			o.dispatchEvent(new Event('foo'));

			expect(called).toEqual(11);
		});

		it('invokes listeners according to their type', () => {
			o.addEventListener('foo', fn);

			o.dispatchEvent(new Event('bar'));

			expect(called).toEqual(0);
		});
	});

	describe('outerHTML', () => {
		it('returns the tag in HTML form', () => {
			const o = doc.createElement('div');

			expect(o.outerHTML).toEqual('<div></div>');
		});

		it('includes attributes', () => {
			const o = doc.createElement('div');
			o.setAttribute('foo', 'bar');
			o.setAttribute('zig', 'zag');

			expect(o.outerHTML).toEqual('<div foo="bar" zig="zag"></div>');
		});

		it('escapes attributes', () => {
			const o = doc.createElement('div');
			o.setAttribute('foo', 'b&a"r');

			expect(o.outerHTML).toEqual('<div foo="b&#38;a&#34;r"></div>');
		});

		it('includes all children', () => {
			const o = doc.createElement('div');
			const child = doc.createElement('span');
			o.appendChild(doc.createTextNode('abc'));
			o.appendChild(child);
			child.appendChild(doc.createTextNode('def'));
			o.appendChild(doc.createTextNode('ghi'));

			expect(o.outerHTML).toEqual('<div>abc<span>def</span>ghi</div>');
		});

		it('escapes text content', () => {
			const o = doc.createElement('div');
			o.appendChild(doc.createTextNode('a<b>c'));

			expect(o.outerHTML).toEqual('<div>a&#60;b&#62;c</div>');
		});
	});
});
