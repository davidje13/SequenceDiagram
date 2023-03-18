#!/usr/bin/env -S node --disable-proto delete --disallow-code-generation-from-strings

import {PreviewRequestHandler} from './handlers/PreviewRequestHandler.mjs';
import {RenderRequestHandler} from './handlers/RenderRequestHandler.mjs';
import {Server} from './server/Server.mjs';
import {StaticRequestHandler} from './server/StaticRequestHandler.mjs';
import path from 'node:path';

const DEV = process.argv.includes('dev');
const HOSTNAME = '127.0.0.1';
const SELFDIR = path.dirname(new URL(import.meta.url).pathname);
const BASEDIR = path.join(SELFDIR, '..') + '/';

let PORT = Number.parseInt(process.argv[2], 10);
if(Number.isNaN(PORT)) {
	PORT = 8080;
}

const MINUTE = 60;
const HOUR = MINUTE * 60;
const DAY = HOUR * 24;
const YEAR = DAY * 365;

const STATIC_CACHE = {
	maxAgeSeconds: 10 * MINUTE,
	staleIfErrorSeconds: YEAR,
	staleWhileRevalidateSeconds: YEAR,
};
const RENDER_CACHE = {
	immutable: true,
	maxAgeSeconds: 30 * DAY,
	staleIfErrorSeconds: YEAR,
	staleWhileRevalidateSeconds: YEAR,
};
const PREVIEW_CACHE = {
	maxAgeSeconds: HOUR,
	staleIfErrorSeconds: DAY,
	staleWhileRevalidateSeconds: DAY,
};
const SKETCH_CSS_SHA = 'sha256-s7UPtBgvov5WNF9C1DlTZDpqwLgEmfiWha5a5p/Zn7E=';

const PERMISSIONS_POLICY = [
	'accelerometer=()',
	'autoplay=()',
	'camera=()',
	'geolocation=()',
	'gyroscope=()',
	'interest-cohort=()',
	'magnetometer=()',
	'microphone=()',
	'payment=()',
	'sync-xhr=()',
	'usb=()',
].join(', ');

const statics = new StaticRequestHandler('')
	.setCache(DEV ? {} : STATIC_CACHE)
	.addHeader('Content-Security-Policy', [
		'base-uri \'self\'',
		'default-src \'none\'',
		'script-src \'self\'',
		`style-src 'self' '${SKETCH_CSS_SHA}'`,
		'connect-src \'self\'',
		'font-src \'self\' data:',
		'img-src \'self\' blob:',
		'form-action \'self\'',
		'frame-ancestors \'self\'',
		'frame-src \'self\'',
	].join('; '))
	.addHeader('Cross-Origin-Embedder-Policy', 'require-corp')
	.addHeader('Cross-Origin-Opener-Policy', 'same-origin')
	.addHeader('Cross-Origin-Resource-Policy', 'same-origin')
	.addHeader('Permissions-Policy', PERMISSIONS_POLICY)
	.addHeader('Referrer-Policy', 'no-referrer')
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
	.add('/ads.txt', [
		'# Deny inclusion in any advertising system\n',
		'placeholder.example.com, placeholder, DIRECT, placeholder\n',
	].join(''))
	.add('/.well-known/security.txt', [
		'Contact: https://github.com/davidje13/SequenceDiagram/issues\n',
		'Preferred-Languages: en\n',
		'Expires: 3000-01-01T00:00:00Z\n',
	].join(''))
	.addResources('/', BASEDIR, [
		'index.html',
		'library.htm',
		'lib',
		'web/lib',
		'web/resources',
		'web/styles',
	]);

if(DEV) {
	statics.setFileWatch(true);
}

const render = new RenderRequestHandler('/render')
	.setCache(DEV ? {} : RENDER_CACHE)
	.setCrossOrigin(true)
	.addHeader('Content-Security-Policy', [
		'base-uri \'self\'',
		'default-src \'none\'',
		`style-src '${SKETCH_CSS_SHA}'`,
		'connect-src \'none\'',
		'font-src data:',
		'form-action \'none\'',
	].join('; '))
	.addHeader('Cross-Origin-Embedder-Policy', 'require-corp')
	.addHeader('Cross-Origin-Opener-Policy', 'unsafe-none')
	.addHeader('Cross-Origin-Resource-Policy', 'cross-origin')
	.addHeader('Permissions-Policy', PERMISSIONS_POLICY)
	.addHeader('Referrer-Policy', 'no-referrer')
	.addHeader('X-Content-Type-Options', 'nosniff');

const preview = new PreviewRequestHandler('/preview')
	.setCache(DEV ? {} : PREVIEW_CACHE)
	.addHeader('Content-Security-Policy', [
		'base-uri \'self\'',
		'default-src \'none\'',
		'style-src \'self\'',
		'connect-src \'none\'',
		'img-src \'self\'',
		'form-action \'none\'',
		'frame-ancestors \'self\'',
		'frame-src \'self\'',
	].join('; '))
	.addHeader('Cross-Origin-Embedder-Policy', 'require-corp')
	.addHeader('Cross-Origin-Opener-Policy', 'same-origin')
	.addHeader('Cross-Origin-Resource-Policy', 'same-origin')
	.addHeader('Permissions-Policy', PERMISSIONS_POLICY)
	.addHeader('Referrer-Policy', 'no-referrer')
	.addHeader('X-Content-Type-Options', 'nosniff');

new Server()
	.addHandler(render)
	.addHandler(preview)
	.addHandler(statics)
	.listen(PORT, HOSTNAME)
	.then((server) => server.printListeningInfo(process.stdout));
