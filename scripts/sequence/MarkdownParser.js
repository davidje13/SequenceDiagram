define(() => {
	'use strict';

	function parseMarkdown(text) {
		if(!text) {
			return [];
		}

		const lines = text.split('\n');
		const result = [];
		const attrs = null;
		lines.forEach((line) => {
			result.push([{text: line, attrs}]);
		});
		return result;
	}

	return parseMarkdown;
});
