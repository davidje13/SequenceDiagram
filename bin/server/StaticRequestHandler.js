const {RequestHandler} = require('./RequestHandler');
const fs = require('fs');
const util = require('util');
const zlib = require('zlib');

const MATCH_INDEX = new RegExp('^(.*/)index\\.[^./]+$', 'i');
const PREF_ENCODINGS = ['gzip', 'deflate', 'identity'];

function passthroughMapper(file, type, data) {
	return data;
}

function bufferIfBetter(buffer, check) {
	if(buffer.byteLength < check.byteLength) {
		return buffer;
	}
	return null;
}

function getIndent(strings) {
	let maxLen = 0;
	for(const string of strings) {
		maxLen = Math.max(maxLen, string.length);
	}
	let indent = '';
	for(let i = 0; i < maxLen; ++ i) {
		indent += ' ';
	}
	return indent;
}

class StaticRequestHandler extends RequestHandler {
	constructor(baseUrlPattern) {
		super('GET', new RegExp('^' + baseUrlPattern + '([^?]*)(\\?.*)?$'));

		this.baseUrlPattern = baseUrlPattern;
		this.mimes = new Map();
		this.defaultMime = 'text/plain; charset=utf-8';
		this.resources = new Map();
		this.awaiting = [];
		this.watchFiles = false;
		this.watchers = [];

		this.compressionOptions = {
			level: 9,
			memLevel: 8,
			windowBits: 15,
		};
	}

	_handleResource(req, res, resource, {pickEncoding, log}) {
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
		return this._handleResource(req, res, resource, info);
	}

	_addWatchers(log) {
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
						log('RELOADED ' + entry.file);
					}
				});
			});
			entry.watcher = makeWatcher();
		});
	}

	_add(path, type, content) {
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
			util.promisify(zlib.deflate)(data, this.compressionOptions),
			util.promisify(zlib.gzip)(data, this.compressionOptions),
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

	_addFile(path, file, mapper) {
		const type = this.mimeTypeFor(file);
		const map = mapper || passthroughMapper;
		const fn = () => util.promisify(fs.readFile)(file)
			.then((data) => map(file, type, data))
			.then((data) => this._add(path, type, data));
		this.watchers.push({file, fn, watcher: null});
		return fn();
	}

	_addDir(path, file, mapper) {
		return util.promisify(fs.readdir)(file)
			.then((subFiles) => this._addResources(
				path + '/',
				file + '/',
				subFiles.filter((sub) => !sub.startsWith('.')),
				mapper
			));
	}

	_addResource(path, file, mapper) {
		return util.promisify(fs.stat)(file)
			.then((stats) => {
				if(stats.isDirectory()) {
					return this._addDir(path, file, mapper);
				} else {
					return this._addFile(path, file, mapper);
				}
			});
	}

	_addResources(basePath, baseFs, files, mapper) {
		return Promise.all(files.map((file) => this._addResource(
			basePath + file,
			baseFs + file,
			mapper
		)));
	}

	addMimeType(extension, type) {
		this.mimes.set(extension, type);
		return this;
	}

	mimeTypeFor(file) {
		const ext = file.substr(file.lastIndexOf('.') + 1);
		return this.mimes.get(ext) || this.defaultMime;
	}

	add(path, type, content = null) {
		let promise = null;
		if(content === null) {
			promise = this._add(path, this.mimeTypeFor(path), type);
		} else {
			promise = this._add(path, type, content);
		}
		this.awaiting.push(promise);
		return this;
	}

	addFile(path, file, mapper = null) {
		this.awaiting.push(this._addFile(path, file, mapper));
		return this;
	}

	addDir(basePath, baseFile, mapper = null) {
		this.awaiting.push(this._addDir(basePath, baseFile, mapper));
		return this;
	}

	addResource(path, file, mapper = null) {
		this.awaiting.push(this._addResource(path, file, mapper));
		return this;
	}

	addResources(basePath, baseFs, files, mapper = null) {
		this.awaiting.push(
			this._addResources(basePath, baseFs, files, mapper)
		);
		return this;
	}

	setFileWatch(enabled) {
		this.watchFiles = enabled;
		return this;
	}

	printInfo(target) {
		target.write(
			'Serving static resources at ' +
			(this.baseUrlPattern || '/') + ':\n'
		);

		const indent = getIndent(this.resources.keys());

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

	begin({log}) {
		return Promise.all(this.awaiting).then(() => {
			if(this.watchFiles) {
				this._addWatchers(log);
			}
		});
	}

	close() {
		this.watchers.forEach((entry) => {
			if(entry.watcher) {
				entry.watcher.close();
				entry.watcher = null;
			}
		});
	}
}

module.exports = {StaticRequestHandler};
