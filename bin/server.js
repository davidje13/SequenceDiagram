#!/usr/bin/env node

const {Server} = require('./server/Server');
const {StaticRequestHandler} = require('./server/StaticRequestHandler');
const {render} = require('./handlers/render');
const path = require('path');

const DEV = process.argv.includes('dev');
const HOSTNAME = '127.0.0.1';
const BASEDIR = path.join(__dirname, '..') + '/';

let PORT = Number.parseInt(process.argv[2], 10);
if(Number.isNaN(PORT)) {
	PORT = 8080;
}

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

const statics = new StaticRequestHandler('')
	.addMimeType('txt', 'text/plain; charset=utf-8')
	.addMimeType('htm', 'text/html; charset=utf-8')
	.addMimeType('html', 'text/html; charset=utf-8')
	.addMimeType('js', 'application/javascript; charset=utf-8')
	.addMimeType('mjs', 'application/javascript; charset=utf-8')
	.addMimeType('css', 'text/css; charset=utf-8')
	.addMimeType('png', 'image/png')
	.addMimeType('svg', 'image/svg+xml; charset=utf-8');

statics
	.add('/robots.txt', '')
	.addResources('/', BASEDIR, [
		'index.html',
		'library.htm',
		'styles',
		'lib',
		'weblib',
		'favicon.png',
		'apple-touch-icon.png',
	], devMapper);

if(DEV) {
	statics.addResources('/', BASEDIR, [
		'node_modules/requirejs/require.js',
		'scripts',
		'web',
	]);
	statics.setFileWatch(true);
}

new Server()
	.addHandler(render)
	.addHandler(statics)
	.listen(PORT, HOSTNAME)
	.then((server) => server.printListeningInfo(process.stdout));
