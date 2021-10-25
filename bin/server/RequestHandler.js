function makeCacheControlHeader({
	mode = 'public',
	maxAgeSeconds = -1,
	staleIfErrorSeconds = -1,
	staleWhileRevalidateSeconds = -1,
	immutable = false,
}) {
	const parts = [];
	if(mode) {
		parts.push(mode);
	}
	if(maxAgeSeconds >= 0) {
		parts.push(`max-age=${maxAgeSeconds}`);
	}
	if(staleIfErrorSeconds >= 0) {
		parts.push(`stale-if-error=${staleIfErrorSeconds}`);
	}
	if(staleWhileRevalidateSeconds >= 0) {
		parts.push(`stale-while-revalidate=${staleWhileRevalidateSeconds}`);
	}
	if(immutable) {
		parts.push('immutable');
	}
	return parts.join(', ');
}

class RequestHandler {
	constructor(method, matcher, handleFn) {
		this.method = method;
		this.matcher = matcher;
		this.handleFn = handleFn;
		this.cacheControl = '';
		this.allowAllOrigins = false;
		this.staticHeaders = [];
		this.info = `Custom handler at ${this.method} ${this.matcher}`;
	}

	setCache(options) {
		this.cacheControl = options ? makeCacheControlHeader(options) : '';
		return this;
	}

	setCrossOrigin(allowAll) {
		this.allowAllOrigins = allowAll;
		return this;
	}

	addHeader(name, value) {
		this.staticHeaders.push({ name, value });
		return this;
	}

	applyCommonHeaders(req, res) {
		if(this.allowAllOrigins) {
			res.setHeader('Access-Control-Allow-Origin', '*');
		}
		if(this.cacheControl) {
			res.setHeader('Cache-Control', this.cacheControl);
		}
		for(const header of this.staticHeaders) {
			res.setHeader(header.name, header.value);
		}
	}

	apply(req, res, info) {
		if(req.method !== this.method) {
			return false;
		}
		const match = this.matcher.exec(req.url);
		if(!match) {
			return false;
		}
		if(this.handle(req, res, Object.assign({match}, info)) === false) {
			return false;
		}
		return true;
	}

	handle(req, res, info) {
		return this.handleFn(req, res, info);
	}

	printInfo(target) {
		target.write(this.info + '\n');
	}

	begin() {
		return true;
	}

	close() {
		return true;
	}
}

module.exports = {RequestHandler};
