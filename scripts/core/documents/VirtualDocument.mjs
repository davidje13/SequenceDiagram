function encodeChar(c) {
	return '&#' + c.charCodeAt(0).toString(10) + ';';
}

function escapeHTML(text) {
	return text.replace(/[^\r\n\t -%'-;=?-~]/g, encodeChar);
}

function escapeQuoted(text) {
	return text.replace(/[^\r\n\t !#$%(-;=?-~]/g, encodeChar);
}

class TextNode {
	constructor(content) {
		this.parentNode = null;
		this.nodeValue = content;
	}

	contains() {
		return false;
	}

	get textContent() {
		return this.nodeValue;
	}

	set textContent(value) {
		this.nodeValue = value;
	}

	get isConnected() {
		if(this.parentNode !== null) {
			return this.parentNode.isConnected;
		}
		return false;
	}

	get innerHTML() {
		return escapeHTML(this.nodeValue);
	}

	get outerHTML() {
		return this.innerHTML;
	}
}

class ElementNode {
	constructor(ownerDocument, tag, namespace) {
		this.ownerDocument = ownerDocument;
		this.tagName = tag;
		this.namespaceURI = namespace;
		this.parentNode = null;
		this.childNodes = [];
		this.attributes = new Map();
		this.listeners = new Map();
	}

	setAttribute(key, value) {
		let v = null;
		if(typeof value === 'number') {
			v = value.toString(10);
		} else if(typeof value === 'string') {
			v = value;
		} else {
			throw new Error('Bad value ' + value + ' for attribute ' + key);
		}
		this.attributes.set(key, v);
	}

	getAttribute(key) {
		return this.attributes.get(key);
	}

	addEventListener(event, fn) {
		let list = this.listeners.get(event);
		if(!list) {
			list = [];
			this.listeners.set(event, list);
		}
		list.push(fn);
	}

	removeEventListener(event, fn) {
		const list = this.listeners.get(event) || [];
		const index = list.indexOf(fn);
		if(index !== -1) {
			list.splice(index, 1);
		}
	}

	dispatchEvent(e) {
		const list = this.listeners.get(e.type) || [];
		list.forEach((fn) => fn(e));
	}

	contains(descendant) {
		let check = descendant;
		while(check) {
			if(check === this) {
				return true;
			}
			check = check.parentNode;
		}
		return false;
	}

	getElementsByTagName(tag) {
		const result = [];
		this.traverseDescendants((o) => {
			if(o.tagName === tag) {
				result.push(o);
			}
		});
		return result;
	}

	getElementsByClassName(className) {
		const result = [];
		const check = ' ' + className + ' ';
		this.traverseDescendants((o) => {
			const cls = ' ' + (o.getAttribute('class') || '') + ' ';
			if(cls.indexOf(check) !== -1) {
				result.push(o);
			}
		});
		return result;
	}

	traverseDescendants(fn) {
		if(fn(this) === false) {
			return;
		}
		for(const child of this.childNodes) {
			if(child.traverseDescendants) {
				child.traverseDescendants(fn);
			}
		}
	}

	get firstChild() {
		return this.childNodes[0] || null;
	}

	get lastChild() {
		return this.childNodes[this.childNodes.length - 1] || null;
	}

	indexOf(child) {
		const index = this.childNodes.indexOf(child);
		if(index === -1) {
			throw new Error(child + ' is not a child of ' + this);
		}
		return index;
	}

	insertBefore(child, existingChild) {
		if(child.contains(this)) {
			throw new Error('Cyclic node structures are not permitted');
		}
		if(child.parentNode !== null) {
			child.parentNode.removeChild(child);
		}
		if(existingChild === null) {
			this.childNodes.push(child);
		} else {
			this.childNodes.splice(this.indexOf(existingChild), 0, child);
		}
		child.parentNode = this;
		return child;
	}

	appendChild(child) {
		return this.insertBefore(child, null);
	}

	removeChild(child) {
		this.childNodes.splice(this.indexOf(child), 1);
		child.parentNode = null;
		return child;
	}

	replaceChild(newChild, oldChild) {
		if(newChild === oldChild) {
			return oldChild;
		}
		this.insertBefore(newChild, oldChild);
		return this.removeChild(oldChild);
	}

	get isConnected() {
		return true;
	}

	get textContent() {
		let text = '';
		for(const child of this.childNodes) {
			text += child.textContent;
		}
		return text;
	}

	set textContent(value) {
		for(const child of this.childNodes) {
			child.parentNode = null;
		}
		this.childNodes.length = 0;
		this.appendChild(new TextNode(value));
	}

	get innerHTML() {
		let html = '';
		for(const child of this.childNodes) {
			html += child.outerHTML;
		}
		return html;
	}

	get outerHTML() {
		let attrs = '';
		for(const [key, value] of this.attributes) {
			attrs += ' ' + key + '="' + escapeQuoted(value) + '"';
		}
		return (
			'<' + this.tagName + attrs + '>' +
			this.innerHTML +
			'</' + this.tagName + '>'
		);
	}
}

export class VirtualDocument {
	createElement(tag) {
		return new ElementNode(this, tag, '');
	}

	createElementNS(ns, tag) {
		return new ElementNode(this, tag, ns || '');
	}

	createTextNode(content) {
		return new TextNode(content);
	}
}

export class Event {
	constructor(type) {
		this.type = type;
	}
}
