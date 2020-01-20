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
	constructor(renderBase = '', editBase = '') {
		this.renderBase = renderBase;
		this.editBase = editBase;
	}

	setRenderBase(renderBase) {
		this.renderBase = renderBase;
	}

	setEditBase(editBase) {
		this.editBase = editBase;
	}

	_convertCode(code, keepBlankLines = false) {
		let lines = code
			.split('\n')
			.map(encodeURIComponent);

		if(keepBlankLines) {
			// Always trim trailing blank lines
			while(lines.length > 0 && lines[lines.length - 1] === '') {
				-- lines.length;
			}
		} else {
			lines = lines.filter((ln) => ln !== '');
		}

		return lines.join('/');
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

	getRenderURL(code, size = {}) {
		return (
			this.renderBase +
			this._convertSize(size) +
			this._convertCode(code) +
			'.svg'
		);
	}

	getEditURL(code) {
		return (
			this.editBase +
			'#edit:' +
			this._convertCode(code, true)
		);
	}
}
