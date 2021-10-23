#!/usr/bin/env -S node --disable-proto delete --disallow-code-generation-from-strings

const {Server} = require('./server/Server');
const {StaticRequestHandler} = require('./server/StaticRequestHandler');
const {RenderRequestHandler} = require('./handlers/RenderRequestHandler');
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

const STATIC_MAX_AGE = 10 * 60; // 10 minutes
const RENDER_MAX_AGE = 60 * 60 * 24 * 7; // 1 week
const SKETCH_CSS_SHA = 'sha256-s7UPtBgvov5WNF9C1DlTZDpqwLgEmfiWha5a5p/Zn7E=';

const statics = new StaticRequestHandler('')
	.setCacheMaxAge(DEV ? 0 : STATIC_MAX_AGE)
	.addHeader('Content-Security-Policy', [
		'base-uri \'self\'',
		'default-src \'none\'',
		'script-src \'self\' https://unpkg.com',
		`style-src 'self' '${SKETCH_CSS_SHA}'`,
		'connect-src \'self\'',
		'font-src \'self\' data:',
		'img-src \'self\' blob:',
		'form-action \'none\'',
		'frame-ancestors \'none\'',
	].join('; '))
	.addHeader('X-Content-Type-Options', 'nosniff')
	.addHeader('X-Frame-Options', 'DENY')
	.addHeader('X-XSS-Protection', '1; mode=block')
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
		'lib',
		'web/lib',
		'web/resources',
		'web/styles',
	], devMapper);

if(DEV) {
	statics.addResources('/', BASEDIR, [
		'node_modules/requirejs/require.js',
		'node_modules/codemirror/lib',
		'node_modules/codemirror/addon',
		'node_modules/codemirror/mode',
		'scripts',
		'web/scripts',
	]);
	statics.setFileWatch(true);
}

const render = new RenderRequestHandler('/render')
	.setCacheMaxAge(DEV ? 0 : RENDER_MAX_AGE)
	.setCrossOrigin(true)
	.addHeader('Content-Security-Policy', [
		'base-uri \'self\'',
		'default-src \'none\'',
		`style-src '${SKETCH_CSS_SHA}'`,
		'connect-src \'none\'',
		'font-src data:',
		'form-action \'none\'',
	].join('; '))
	.addHeader('X-Content-Type-Options', 'nosniff');

new Server()
	.addHandler(render)
	.addHandler(statics)
	.listen(PORT, HOSTNAME)
	.then((server) => server.printListeningInfo(process.stdout));
