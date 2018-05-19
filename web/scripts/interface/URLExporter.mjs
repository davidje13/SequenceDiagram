function toCappedFixed(v, cap) {
	const s = v.toString();
	const p = s.indexOf('.');
	if(p === -1 || s.length - p - 1 <= cap) {
		return s;
	}
	return v.toFixed(cap);
}

function valid(v = null) {
	return v !== null && !Number.isNaN(v);
}

export default class URLExporter {
	constructor(base = '') {
		this.base = base;
	}

	setBase(base) {
		this.base = base;
	}

	_convertCode(code) {
		return code
			.split('\n')
			.map(encodeURIComponent)
			.filter((ln) => ln !== '')
			.join('/');
	}

	_convertWidthHeight(width, height) {
		let opts = '';
		if(valid(width)) {
			opts += 'w' + toCappedFixed(Math.max(width, 0), 4);
		}
		if(valid(height)) {
			opts += 'h' + toCappedFixed(Math.max(height, 0), 4);
		}
		return opts + '/';
	}

	_convertZoom(zoom) {
		if(zoom === 1) {
			return '';
		}
		return 'z' + toCappedFixed(Math.max(zoom, 0), 4) + '/';
	}

	_convertSize({height, width, zoom}) {
		if(valid(width) || valid(height)) {
			return this._convertWidthHeight(width, height);
		}
		if(valid(zoom)) {
			return this._convertZoom(zoom);
		}
		return '';
	}

	getURL(code, size = {}) {
		return (
			this.base +
			this._convertSize(size) +
			this._convertCode(code) +
			'.svg'
		);
	}
}
