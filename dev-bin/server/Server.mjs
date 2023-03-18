import {
	parseAcceptEncoding,
	pickAcceptEncoding,
	writeEncoded,
} from './encoding.mjs';
import {HttpError} from './HttpError.mjs';
import http from 'node:http';

const PREF_ENCODINGS = ['gzip', 'deflate', 'identity'];

export { HttpError };

export class Server {
	constructor() {
		this.running = false;
		this.handlers = [];
		this.urlMaxLength = 65536;
		this.server = http.createServer(this._handleRequest.bind(this));
		this.log = this.log.bind(this);
		this.logTarget = process.stdout;
		this.shutdownCallbacks = [];
		this.compressionOptions = {
			level: 5,
			memLevel: 9,
			windowBits: 15,
		};

		this.close = this.close.bind(this);
	}

	addHandler(handler) {
		this.handlers.push(handler);
		return this;
	}

	addShutdownHook(callback) {
		this.shutdownCallbacks.push(callback);
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
			req.headers['accept-encoding'],
		);
		return {
			log: this.log,
			pickEncoding: (opts) => pickAcceptEncoding(
				acceptEncoding,
				opts || PREF_ENCODINGS,
			),
			writeEncoded: (encoding, data) => writeEncoded(
				res,
				encoding,
				this.compressionOptions,
				data,
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
			throw new HttpError(404, 'Not Found');
		} catch(e) {
			this._handleError(req, res, e);
		}
	}

	baseurl() {
		return 'http://' + this.hostname + ':' + this.port + '/';
	}

	listen(port, hostname) {
		if(this.running) {
			throw new Error('Already listening');
		}
		const env = {
			hostname,
			log: this.log,
			port,
		};
		return Promise.all(this.handlers.map((h) => h.begin(env)))
			.then(() => new Promise((resolve) => {
				this.server.listen(port, hostname, () => {
					this.running = true;
					this.port = port;
					this.hostname = hostname;
					process.on('SIGINT', this.close);
					resolve(this);
				});
			}));
	}

	close() {
		if(!this.running) {
			return Promise.resolve(this);
		}
		this.running = false;
		const env = {
			log: this.log,
		};
		this.logTarget.write('\n'); // Skip line containing Ctrl+C indicator
		this.log('Shutting down...');
		return new Promise((resolve) => this.server.close(() => resolve()))
			.then(() => Promise.all(this.handlers.map((h) => h.close(env))))
			.then(() => {
				this.shutdownCallbacks.forEach((fn) => fn(this));
				process.removeListener('SIGINT', this.close);
				this.log('Shutdown');
				return this;
			});
	}

	printListeningInfo(target) {
		for(const handler of this.handlers) {
			handler.printInfo(target);
			target.write('\n');
		}
		target.write('Available at ' + this.baseurl() + '\n\n');
	}
}
