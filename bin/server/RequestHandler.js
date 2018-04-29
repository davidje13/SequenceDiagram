class RequestHandler {
	constructor(method, matcher, handleFn) {
		this.method = method;
		this.matcher = matcher;
		this.handleFn = handleFn;
		this.info = 'Custom handler at ' + this.method + ' ' + this.matcher;
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
