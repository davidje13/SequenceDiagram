import {HttpError} from './HttpError.mjs';
import {Readable} from 'node:stream';
import zlib from 'zlib';

const MATCH_ACCEPT = new RegExp('^ *([^;]+)(?:;q=([0-9]+(?:\\.[0-9]+)?))? *$');

export function parseAcceptEncoding(accept) {
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

export function pickAcceptEncoding(types, preferred) {
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

export function writeEncoded(res, encoding, compressionOpts, data) {
	if(encoding === 'identity') {
		res.end(data);
		return;
	}

	res.setHeader('Content-Encoding', encoding);

	const raw = new Readable();
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
