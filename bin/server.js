#!/usr/bin/env node

const {VirtualSequenceDiagram} = require('../lib/sequence-diagram');
const {HttpError, Server} = require('./server/Server');

const DEV = process.argv.includes('dev');
const HOSTNAME = '127.0.0.1';
const PORT = 8080;

function beginTimer() {
	return process.hrtime();
}

function endTimer(timer) {
	const delay = process.hrtime(timer);
	return delay[0] * 1e9 + delay[1];
}

const NUM_MATCH = '[0-9]+(?:\\.[0-9]+)?';
const MATCH_RENDER = new RegExp(
	'^/render/' +
	`(?:(?:w(${NUM_MATCH}))?(?:h(${NUM_MATCH}))?/|z(${NUM_MATCH})/)?` +
	'(?:(uri|b64)/)?' +
	'(.*?)' +
	'(?:\\.(svg))?$',
	'i'
);

function getNumeric(v, name) {
	if(!v) {
		return null;
	}
	const n = Number.parseFloat(v);
	if(Number.isNaN(n)) {
		throw new HttpError(400, 'Invalid value for ' + name);
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
		return str.split('/').map((ln) => decodeURIComponent(ln)).join('\n');
	default:
		throw new HttpError(400, 'Unknown encoding');
	}
}

function handleRender(req, res, {match, pickEncoding, log, writeEncoded}) {
	res.setHeader('Access-Control-Allow-Origin', '*');

	const encoding = pickEncoding();
	const size = {
		height: getNumeric(match[2], 'height'),
		width: getNumeric(match[1], 'width'),
		zoom: getNumeric(match[3], 'zoom'),
	};
	const code = readEncoded(match[5], (match[4] || 'uri').toLowerCase());
	const format = (match[6] || 'svg').toLowerCase();

	const timer = beginTimer();
	const svg = VirtualSequenceDiagram.render(code, {size});
	const delay = endTimer(timer);
	log('RENDER (' + (delay / 1e6).toFixed(3) + 'ms)');

	switch(format) {
	case 'svg':
		res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
		writeEncoded(encoding, svg);
		break;
	default:
		throw new HttpError(400, 'Unsupported image format');
	}
}

const server = new Server()
	.addMimeType('htm', 'text/html; charset=utf-8')
	.addMimeType('html', 'text/html; charset=utf-8')
	.addMimeType('js', 'application/javascript; charset=utf-8')
	.addMimeType('mjs', 'application/javascript; charset=utf-8')
	.addMimeType('css', 'text/css; charset=utf-8')
	.addMimeType('png', 'image/png')
	.addMimeType('svg', 'image/svg+xml; charset=utf-8')
	.addHandler('GET', MATCH_RENDER, handleRender)
	.addShutdownHook(() => process.stdout.write('\nShutdown.\n'));

function devMapper(file, type, data) {
	if(!type.includes('text/html')) {
		return data;
	}

	const code = data.toString('utf8');
	if(DEV) {
		return code
			.replace(/<!--* *DEV *-*>?([^]*?)(?:<!)?-* *\/DEV *-->/g, '$1')
			.replace(/<!--* *LIVE[^]*? *\/LIVE *-->/g, '');
	} else {
		return code
			.replace(/<!--* *LIVE *-*>?([^]*?)(?:<!)?-* *\/LIVE *-->/g, '$1')
			.replace(/<!--* *DEV[^]*? *\/DEV *-->/g, '');
	}
}

server.addStaticResources('/', '', [
	'index.html',
	'library.htm',
	'styles',
	'lib',
	'weblib',
	'favicon.png',
	'apple-touch-icon.png',
], devMapper);

if(DEV) {
	server.addStaticResources('/', '', [
		'node_modules/requirejs/require.js',
		'scripts',
		'web',
	]);
	server.setFileWatch(true);
}

server
	.listen(PORT, HOSTNAME)
	.then(() => server.printListeningInfo(process.stdout));
