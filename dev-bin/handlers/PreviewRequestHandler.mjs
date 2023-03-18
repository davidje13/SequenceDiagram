import {RequestHandler} from '../server/RequestHandler.mjs';
import {VirtualSequenceDiagram} from '../../lib/sequence-diagram.mjs';

const UNSAFE_HTML = /[^a-zA-Z0-9 :;.,]/g;
const escChar = (c) => `&#x${c.charCodeAt(0).toString(16).padStart(4, '0')};`;
const escapeHTML = (v) => v.replaceAll(UNSAFE_HTML, escChar);

export class PreviewRequestHandler extends RequestHandler {
	constructor(baseUrlPattern) {
		super('GET', new RegExp(`^${baseUrlPattern}/?(.*)$`, 'i'));
		this.info = `Rendering preview at ${baseUrlPattern}/`;
	}

	handle(req, res, {match, pickEncoding, writeEncoded}) {
		this.applyCommonHeaders(req, res);
		res.setHeader('Content-Type', 'text/html; charset=utf-8');

		const encoding = pickEncoding();
		const params = new URLSearchParams(match[1]);
		const code = params.get('c');
		const encoded = code
			.replaceAll(/[\r\n]+/g, '\n')
			.split('\n')
			.filter((ln) => ln !== '')
			.map(encodeURIComponent)
			.join('/');

		let content = '';
		try {
			new VirtualSequenceDiagram().process(code);
			content = [
				'<!DOCTYPE html>',
				'<html lang="en">',
				'<head>',
				'<link rel="stylesheet" href="web/styles/preview.css">',
				'</head>',
				'<body>',
				`<img src="/render/uri/${encoded}.svg" download="diagram.svg">`,
				'</body>',
				'</html>',
			].join('');
		} catch(e) {
			content = [
				'<!DOCTYPE html>',
				'<html lang="en">',
				'<head>',
				'<link rel="stylesheet" href="web/styles/preview.css">',
				'</head>',
				'<body>',
				`<div class="error">${escapeHTML(String(e))}</div>`,
				'</body>',
				'</html>',
			].join('');
		}

		writeEncoded(encoding, content);
	}
}
