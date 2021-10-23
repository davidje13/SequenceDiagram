class RequestHandler {
	constructor(method, matcher, handleFn) {
		this.method = method;
		this.matcher = matcher;
		this.handleFn = handleFn;
		this.cacheMaxAge = 0;
		this.allowAllOrigins = false;
		this.staticHeaders = [];
		this.info = `Custom handler at ${this.method} ${this.matcher}`;
	}

	setCacheMaxAge(seconds) {
		this.cacheMaxAge = seconds;
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
		if(this.cacheMaxAge > 0) {
			res.setHeader(
				'Cache-Control',
				`public, max-age=${this.cacheMaxAge}`
			);
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
