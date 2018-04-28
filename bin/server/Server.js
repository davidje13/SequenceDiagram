const fs = require('fs');
const http = require('http');
const stream = require('stream');
const util = require('util');
const zlib = require('zlib');

const PREF_ENCODINGS = ['gzip', 'deflate', 'identity'];

const PRE_COMPRESS_OPTS = {
	level: 9,
	memLevel: 8,
	windowBits: 15,
};

const LIVE_COMPRESS_OPTS = {
	level: 5,
	memLevel: 9,
	windowBits: 15,
};

const MATCH_ACCEPT = new RegExp('^ *([^;]+)(?:;q=([0-9]+(?:\\.[0-9]+)?))? *$');
const MATCH_INDEX = new RegExp('^(.*/)index\\.[^./]+$', 'i');

function passthroughMapper(file, type, data) {
	return data;
}

class HttpError extends Error {
	constructor(status, message) {
		super(message);
		this.status = status;
	}
}

function parseAcceptEncoding(accept) {
	// https://www.w3.org/Protocols/rfc2616/rfc2616-sec14.html#sec14.3

	const opts = (accept || 'identity;q=1, *;q=0.5').split(',');
	const types = new Map();
	opts.forEach((opt) => {
		const match = MATCH_ACCEPT.exec(opt);
		if(match) {
			let q = Number.parseFloat(match[2] || '1');
			if(q === 0) {
				q = -1;
			}
			types.set(match[1], q);
		}
	});
	if(!types.has('*')) {
		if(!types.has('identity')) {
			types.set('identity', -0.5);
		}
		types.set('*', -1);
	}
	return types;
}

function pickAcceptEncoding(types, preferred) {
	let best = null;
	let bestQ = -1;
	const wildcard = types.get('*');

	preferred.forEach((opt) => {
		const q = types.get(opt) || wildcard;
		if(q > bestQ) {
			best = opt;
			bestQ = q;
		}
	});
	if(best === null) {
		throw new HttpError(406, 'Not Acceptable');
	}
	return best;
}

class RequestHandler {
	constructor(method, matcher, handler) {
		this.method = method;
		this.matcher = matcher;
		this.handler = handler;
	}

	apply(req, res, info) {
		if(req.method !== this.method) {
			return false;
		}
		const match = this.matcher.exec(req.url);
		if(!match) {
			return false;
		}
		if(this.handler(req, res, Object.assign({match}, info)) === false) {
			return false;
		}
		return true;
	}
}

function bufferIfBetter(buffer, check) {
	if(buffer.byteLength < check.byteLength) {
		return buffer;
	}
	return null;
}

class StaticRequestHandler extends RequestHandler {
	constructor(baseUrlPattern) {
		super(
			'GET',
			new RegExp('^' + baseUrlPattern + '([^?]*)(\\?.*)?$'),
			null
		);
		this.handler = this.handle.bind(this);
		this.resources = new Map();
	}

	add(path, type, content) {
		let data = content;
		if(typeof content === 'string') {
			data = Buffer.from(content, 'utf8');
		}
		const existing = this.resources.get(path);
		if(existing && data.equals(existing.encodings.identity)) {
			return Promise.resolve(false);
		}
		return Promise.all([
			data,
			util.promisify(zlib.deflate)(data, PRE_COMPRESS_OPTS),
			util.promisify(zlib.gzip)(data, PRE_COMPRESS_OPTS),
		])
			.then(([identity, deflate, gzip]) => {
				const resource = {
					encodings: {
						deflate: bufferIfBetter(deflate, identity),
						gzip: bufferIfBetter(gzip, identity),
						identity,
					},
					path,
					type,
				};

				const match = MATCH_INDEX.exec(path);
				if(match) {
					this.resources.set(match[1], resource);
				}
				this.resources.set(path, resource);
				return true;
			});
	}

	handleResource(req, res, resource, {pickEncoding, log}) {
		log('SERVE ' + resource.path);

		const encoding = pickEncoding(
			PREF_ENCODINGS.filter((enc) => (resource.encodings[enc] !== null))
		);
		if(encoding !== 'identity') {
			res.setHeader('Content-Encoding', encoding);
		}
		res.setHeader('Content-Type', resource.type);
		res.end(resource.encodings[encoding]);
	}

	handle(req, res, info) {
		const resource = this.resources.get(info.match[1]);
		if(!resource) {
			return false;
		}
		return this.handleResource(req, res, resource, info);
	}

	write(target) {
		let maxLen = 0;
		for(const [path] of this.resources) {
			maxLen = Math.max(maxLen, path.length);
		}
		let indent = '';
		for(let i = 0; i < maxLen; ++ i) {
			indent += ' ';
		}
		for(const [path, res] of this.resources) {
			const {encodings} = res;
			target.write(path + indent.substr(path.length));
			target.write(' ' + encodings.identity.byteLength + 'b');
			for(const enc of ['gzip', 'deflate']) {
				const buf = encodings[enc];
				if(buf !== null) {
					target.write(', ' + enc + ': ' + buf.byteLength + 'b');
				}
			}
			target.write('\n');
		}
	}
}

function writeEncoded(res, encoding, compressionOpts, data) {
	if(encoding === 'identity') {
		res.end(data);
		return;
	}

	res.setHeader('Content-Encoding', encoding);

	const raw = new stream.Readable();
	raw.push(data, 'utf8');
	raw.push(null);

	switch(encoding) {
	case 'gzip':
		raw.pipe(zlib.createGzip(compressionOpts)).pipe(res);
		break;
	case 'deflate':
		raw.pipe(zlib.createDeflate(compressionOpts)).pipe(res);
		break;
	default:
		throw new HttpError(500, 'Failed to encode');
	}
}

class Server {
	constructor() {
		this.awaiting = [];
		this.mimes = new Map();
		this.defaultMime = 'text/plain; charset=utf-8';
		this.handlers = [];
		this.watchFiles = false;
		this.watchers = [];
		this.staticHandler = new StaticRequestHandler('');
		this.urlMaxLength = 65536;
		this.server = http.createServer(this._handleRequest.bind(this));
		this.log = this.log.bind(this);
		this.logTarget = process.stdout;
		this.running = false;
		this.registerShutdown = false;
		this.shutdownCallbacks = [];

		this.close = this.close.bind(this);
	}

	setFileWatch(enabled) {
		this.watchFiles = enabled;
		return this;
	}

	addMimeType(extension, type) {
		this.mimes.set(extension, type);
		return this;
	}

	_addStaticFile(path, file, mapper) {
		const ext = file.substr(file.lastIndexOf('.') + 1);
		const type = this.mimes.get(ext) || this.defaultMime;
		const map = mapper || passthroughMapper;
		const fn = () => util.promisify(fs.readFile)(file)
			.then((data) => map(file, type, data))
			.then((data) => this.staticHandler.add(path, type, data));
		this.watchers.push({file, fn, watcher: null});
		return fn();
	}

	_addStaticDir(path, file, mapper) {
		return util.promisify(fs.readdir)(file)
			.then((subFiles) => this._addStaticResources(
				path + '/',
				file + '/',
				subFiles.filter((sub) => !sub.startsWith('.')),
				mapper
			));
	}

	_addStaticResource(path, file, mapper) {
		return util.promisify(fs.stat)(file)
			.then((stats) => {
				if(stats.isDirectory()) {
					return this._addStaticDir(path, file, mapper);
				} else {
					return this._addStaticFile(path, file, mapper);
				}
			});
	}

	_addStaticResources(basePath, baseFs, files, mapper) {
		return Promise.all(files.map((file) => this._addStaticResource(
			basePath + file,
			baseFs + file,
			mapper
		)));
	}

	addStaticFile(path, file, mapper = null) {
		this.awaiting.push(this._addStaticFile(path, file, mapper));
		return this;
	}

	addStaticDir(basePath, baseFile, mapper = null) {
		this.awaiting.push(this._addStaticDir(basePath, baseFile, mapper));
		return this;
	}

	addStaticResource(path, file, mapper = null) {
		this.awaiting.push(this._addStaticResource(path, file, mapper));
		return this;
	}

	addStaticResources(basePath, baseFs, files, mapper = null) {
		this.awaiting.push(
			this._addStaticResources(basePath, baseFs, files, mapper)
		);
		return this;
	}

	addHandler(method, matcher, handler) {
		this.handlers.push(new RequestHandler(method, matcher, handler));
		return this;
	}

	addShutdownHook(callback) {
		if(callback) {
			this.shutdownCallbacks.push(callback);
		}
		this.registerShutdown = true;
		return this;
	}

	log(message) {
		this.logTarget.write(new Date().toISOString() + ' ' + message + '\n');
	}

	_handleError(req, res, e) {
		let status = 500;
		let message = 'An internal error occurred';
		if(typeof e === 'object' && e.message) {
			status = e.status || 400;
			message = e.message;
		}

		res.statusCode = status;
		res.setHeader('Content-Type', 'text/plain; charset=utf-8');
		res.end(message + '\n');
	}

	_makeInfo(req, res) {
		const acceptEncoding = parseAcceptEncoding(
			req.headers['accept-encoding']
		);
		return {
			log: this.log,
			pickEncoding: (opts) => pickAcceptEncoding(
				acceptEncoding,
				opts || PREF_ENCODINGS
			),
			writeEncoded: (encoding, data) => writeEncoded(
				res,
				encoding,
				LIVE_COMPRESS_OPTS,
				data
			),
		};
	}

	_handleRequest(req, res) {
		try {
			if(req.url.length > this.urlMaxLength) {
				throw new HttpError(400, 'Request too long');
			}
			const info = this._makeInfo(req, res);
			for(const handler of this.handlers) {
				if(handler.apply(req, res, info)) {
					return;
				}
			}
			if(!this.staticHandler.apply(req, res, info)) {
				throw new HttpError(404, 'Not Found');
			}
		} catch(e) {
			this._handleError(req, res, e);
		}
	}

	baseurl() {
		return 'http://' + this.hostname + ':' + this.port + '/';
	}

	_addWatchers() {
		if(this.watchFiles) {
			this.watchers.forEach((entry) => {
				if(entry.watcher) {
					return;
				}
				const makeWatcher = () => fs.watch(entry.file, () => {
					/*
					 * If editor changed file by moving it, we are now
					 * watching the wrong file, so re-create watcher:
					 */
					entry.watcher.close();
					entry.watcher = makeWatcher();

					entry.fn().then((changed) => {
						if(changed) {
							this.log('RELOADED ' + entry.file);
						}
					});
				});
				entry.watcher = makeWatcher();
			});
		}
	}

	_removeWatchers() {
		this.watchers.forEach((entry) => {
			if(entry.watcher) {
				entry.watcher.close();
				entry.watcher = null;
			}
		});
	}

	listen(port, hostname) {
		if(this.running) {
			throw new Error('Already listening');
		}
		this.port = port;
		this.hostname = hostname;
		return Promise.all(this.awaiting).then(() => new Promise((resolve) => {
			this._addWatchers();
			this.server.listen(port, hostname, () => {
				this.running = true;
				if(this.registerShutdown) {
					process.on('SIGINT', this.close);
				}
				resolve(this);
			});
		}));
	}

	close() {
		if(!this.running) {
			return Promise.resolve(this);
		}
		this.running = false;
		this._removeWatchers();
		return new Promise((resolve) => {
			this.server.close(() => {
				this.shutdownCallbacks.forEach((fn) => fn(this));
				resolve(this);
				process.removeListener('SIGINT', this.close);
			});
		});
	}

	printListeningInfo(target) {
		target.write('Serving static resources:\n');
		this.staticHandler.write(target);
		target.write('\n');
		target.write('Available at ' + this.baseurl() + '\n\n');
	}
}

module.exports = {HttpError, Server};
