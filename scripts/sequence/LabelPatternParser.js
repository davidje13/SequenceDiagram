define(() => {
	'use strict';

	const LABEL_PATTERN = /(.*?)<([^<>]*)>/g;
	const DP_PATTERN = /\.([0-9]*)/;

	function countDP(value) {
		const match = DP_PATTERN.exec(value);
		if(!match || !match[1]) {
			return 0;
		}
		return match[1].length;
	}

	function parseCounter(args) {
		let start = 1;
		let inc = 1;
		let dp = 0;
		if(args[0]) {
			start = Number(args[0]);
			dp = Math.max(dp, countDP(args[0]));
		}
		if(args[1]) {
			inc = Number(args[1]);
			dp = Math.max(dp, countDP(args[1]));
		}
		return {start, inc, dp};
	}

	function parseToken(token) {
		if(token === 'label') {
			return {token: 'label'};
		}

		const p = token.indexOf(' ');
		let type = null;
		let args = null;
		if(p === -1) {
			type = token;
			args = [];
		} else {
			type = token.substr(0, p);
			args = token.substr(p + 1).split(',');
		}

		if(type === 'inc') {
			return parseCounter(args);
		}

		return '<' + token + '>';
	}

	function parsePattern(raw) {
		const pattern = [];
		let match = null;
		let end = 0;
		LABEL_PATTERN.lastIndex = 0;
		while((match = LABEL_PATTERN.exec(raw))) {
			if(match[1]) {
				pattern.push(match[1]);
			}
			if(match[2]) {
				pattern.push(parseToken(match[2]));
			}
			end = LABEL_PATTERN.lastIndex;
		}
		const remainder = raw.substr(end);
		if(remainder) {
			pattern.push(remainder);
		}
		return pattern;
	}

	return parsePattern;
});
