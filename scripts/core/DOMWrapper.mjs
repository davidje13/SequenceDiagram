function make(value, document) {
	if(typeof value === 'string') {
		return document.createTextNode(value);
	} else if(typeof value === 'number') {
		return document.createTextNode(value.toString(10));
	} else if(typeof value === 'object' && value.element) {
		return value.element;
	} else {
		return value;
	}
}

function unwrap(node) {
	if(node === null) {
		return null;
	} else if(node.element) {
		return node.element;
	} else {
		return node;
	}
}

class WrappedElement {
	constructor(element) {
		this.element = element;
	}

	addBefore(child = null, before = null) {
		if(child === null) {
			return this;
		} else if(Array.isArray(child)) {
			for(const c of child) {
				this.addBefore(c, before);
			}
		} else {
			const childElement = make(child, this.element.ownerDocument);
			this.element.insertBefore(childElement, unwrap(before));
		}
		return this;
	}

	add(...child) {
		return this.addBefore(child, null);
	}

	del(child = null) {
		if(child !== null) {
			this.element.removeChild(unwrap(child));
		}
		return this;
	}

	attr(key, value) {
		this.element.setAttribute(key, value);
		return this;
	}

	attrs(attrs) {
		for(const k in attrs) {
			if(Object.prototype.hasOwnProperty.call(attrs, k)) {
				this.element.setAttribute(k, attrs[k]);
			}
		}
		return this;
	}

	styles(styles) {
		for(const k in styles) {
			if(Object.prototype.hasOwnProperty.call(styles, k)) {
				this.element.style[k] = styles[k];
			}
		}
		return this;
	}

	setClass(cls) {
		return this.attr('class', cls);
	}

	addClass(cls) {
		const classes = this.element.getAttribute('class');
		if(!classes) {
			return this.setClass(cls);
		}
		const list = classes.split(' ');
		if(list.includes(cls)) {
			return this;
		}
		list.push(cls);
		return this.attr('class', list.join(' '));
	}

	delClass(cls) {
		const classes = this.element.getAttribute('class');
		if(!classes) {
			return this;
		}
		const list = classes.split(' ');
		const p = list.indexOf(cls);
		if(p !== -1) {
			list.splice(p, 1);
			this.attr('class', list.join(' '));
		}
		return this;
	}

	text(text) {
		this.element.textContent = text;
		return this;
	}

	on(event, callback, options = {}) {
		if(Array.isArray(event)) {
			for(const e of event) {
				this.on(e, callback, options);
			}
		} else {
			this.element.addEventListener(event, callback, options);
		}
		return this;
	}

	off(event, callback, options = {}) {
		if(Array.isArray(event)) {
			for(const e of event) {
				this.off(e, callback, options);
			}
		} else {
			this.element.removeEventListener(event, callback, options);
		}
		return this;
	}

	val(value) {
		this.element.value = value;
		return this;
	}

	select(start, end = null) {
		this.element.selectionStart = start;
		this.element.selectionEnd = (end === null) ? start : end;
		return this;
	}

	focus() {
		this.element.focus();
		return this;
	}

	focussed() {
		return this.element === this.element.ownerDocument.activeElement;
	}

	empty() {
		while(this.element.childNodes.length > 0) {
			this.element.removeChild(this.element.lastChild);
		}
		return this;
	}

	attach(parent) {
		unwrap(parent).appendChild(this.element);
		return this;
	}

	detach() {
		if(this.element.parentNode) {
			this.element.parentNode.removeChild(this.element);
		}
		return this;
	}
}

export default class DOMWrapper {
	constructor(document) {
		if(!document) {
			throw new Error('Missing document!');
		}
		this.document = document;
		this.wrap = this.wrap.bind(this);
		this.el = this.el.bind(this);
		this.txt = this.txt.bind(this);
	}

	wrap(element) {
		if(element.element) {
			return element;
		} else {
			return new WrappedElement(element);
		}
	}

	el(tag, namespace = null) {
		let element = null;
		if(namespace === null) {
			element = this.document.createElement(tag);
		} else {
			element = this.document.createElementNS(namespace, tag);
		}
		return new WrappedElement(element);
	}

	txt(content = '') {
		return this.document.createTextNode(content);
	}
}

DOMWrapper.WrappedElement = WrappedElement;
