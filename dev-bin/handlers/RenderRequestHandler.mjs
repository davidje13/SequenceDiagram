import {HttpError} from '../server/HttpError.mjs';
import {RequestHandler} from '../server/RequestHandler.mjs';
import {VirtualSequenceDiagram} from '../../lib/sequence-diagram.mjs';

const NUM_MATCH = '[0-9]+(?:\\.[0-9]+)?';

function beginTimer() {
	return process.hrtime();
}

function endTimer(timer) {
	const delay = process.hrtime(timer);
	return delay[0] * 1e9 + delay[1];
}

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
		return str.split('/').map(decodeURIComponent).join('\n');
	default:
		throw new HttpError(400, 'Unknown encoding');
	}
}

export class RenderRequestHandler extends RequestHandler {
	constructor(baseUrlPattern) {
		super('GET', new RegExp(
			`^${baseUrlPattern}/` +
			`(?:(?:w(${NUM_MATCH}))?(?:h(${NUM_MATCH}))?/|z(${NUM_MATCH})/)?` +
			'(?:(uri|b64)/)?' +
			'(.*?)' +
			'(?:\\.(svg))?$',
			'i',
		));
		this.info = `Rendering sequence diagrams at ${baseUrlPattern}/`;
	}

	handle(req, res, {match, pickEncoding, log, writeEncoded}) {
		this.applyCommonHeaders(req, res);

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
}
