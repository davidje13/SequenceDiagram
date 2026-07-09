import {
	CONTINUE,
	HTTPError,
	getQuery,
	requestHandler,
	sendEncoded,
} from 'web-listener';
import {VirtualSequenceDiagram} from '../lib/sequence-diagram.mjs';

const NUM_MATCH = '[0-9]+(?:\\.[0-9]+)?';
const RENDER_PATH = new RegExp(
	'^/' +
	`(?:(?:w(${NUM_MATCH}))?(?:h(${NUM_MATCH}))?/|z(${NUM_MATCH})/)?` +
	'(?:(uri|b64)/)?' +
	'(.*?)' +
	'(?:\\.(svg))?$',
	'i',
);

const SKETCH_CSS_SHA = 'sha256-s7UPtBgvov5WNF9C1DlTZDpqwLgEmfiWha5a5p/Zn7E=';

const RENDER_CSP = [
	'base-uri \'self\'',
	'default-src \'none\'',
	`style-src '${SKETCH_CSS_SHA}'`,
	'connect-src \'none\'',
	'font-src data:',
	'form-action \'none\'',
].join('; ');

const PREVIEW_CSP = [
	'base-uri \'self\'',
	'default-src \'none\'',
	`style-src 'self' '${SKETCH_CSS_SHA}'`,
	'connect-src \'none\'',
	'img-src \'self\'',
	'form-action \'none\'',
	'frame-ancestors \'self\'',
	'frame-src \'self\'',
].join('; ');

function getNumeric(v, name) {
	if(!v) {
		return null;
	}
	const n = Number.parseFloat(v);
	if(Number.isNaN(n)) {
		throw new HTTPError(400, {body: 'Invalid value for ' + name});
	}
	return n;
}

function readEncoded(str, encoding) {
	switch(encoding) {
	case 'b64':
		return Buffer
			.from(decodeURIComponent(str), 'base64')
			.toString('utf8');
	case 'uri':
		return str.split('/').map(decodeURIComponent).join('\n');
	default:
		throw new HTTPError(400, {body: 'Unknown encoding'});
	}
}

const escapeHTML = (v) => v
	.replaceAll('&', '&amp;')
	.replaceAll('<', '&lt;')
	.replaceAll('>', '&gt;')
	.replaceAll('"', '&quot;');

export const render = requestHandler((req, res) => {
	const match = RENDER_PATH.exec(req.url);
	if(!match || (req.method !== 'GET' && req.method !== 'HEAD')) {
		throw CONTINUE;
	}

	const [
		,
		urlWidth,
		urlHeight,
		urlZoom,
		urlEncoding = 'uri',
		urlCode,
		urlFormat = 'svg',
	] = match;

	res.setHeader('Access-Control-Allow-Origin', '*');
	res.setHeader('Cache-Control', [
		'immutable',
		'max-age=2592000',
		'stale-while-revalidate=31536000',
		'stale-if-error=31536000',
	].join(', '));
	res.setHeader('Content-Security-Policy', RENDER_CSP);
	res.setHeader('Cross-Origin-Opener-Policy', 'unsafe-none');
	res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

	const size = {
		height: getNumeric(urlHeight, 'height'),
		width: getNumeric(urlWidth, 'width'),
		zoom: getNumeric(urlZoom, 'zoom'),
	};

	const code = readEncoded(urlCode, urlEncoding.toLowerCase());

	const svg = VirtualSequenceDiagram.render(code, {size});

	switch(urlFormat.toLowerCase()) {
	case 'svg':
		res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
		return sendEncoded(req, res, svg, {encoding: 'utf-8'});
	default:
		throw new HTTPError(400, {body: 'Unsupported image format'});
	}
});

export const preview = requestHandler((req, res) => {
	res.setHeader('Cache-Control', [
		'max-age=3600',
		'stale-while-revalidate=86400',
		'stale-if-error=86400',
	].join(', '));
	res.setHeader('Content-Security-Policy', PREVIEW_CSP);

	const code = getQuery(req, 'c') ?? '';
	const encoded = code
		.replaceAll(/[\r\n]+/g, '\n')
		.split('\n')
		.filter((ln) => ln !== '')
		.map(encodeURIComponent)
		.join('/');
	const previewImage = `/render/uri/${encoded}.svg`;

	let content = '';
	try {
		new VirtualSequenceDiagram().process(code);
		content = [
			'<!DOCTYPE html>',
			'<html lang="en">',
			'<head>',
			'<link rel="stylesheet" href="/preview.css">',
			'</head>',
			'<body>',
			`<img src="${escapeHTML(previewImage)}" download="diagram.svg">`,
			'</body>',
			'</html>',
		].join('');
	} catch(e) {
		content = [
			'<!DOCTYPE html>',
			'<html lang="en">',
			'<head>',
			'<link rel="stylesheet" href="/preview.css">',
			'</head>',
			'<body>',
			`<div class="error">${escapeHTML(String(e))}</div>`,
			'</body>',
			'</html>',
		].join('');
	}

	res.setHeader('Content-Type', 'text/html; charset=utf-8');
	sendEncoded(req, res, content, 'utf-8');
});
