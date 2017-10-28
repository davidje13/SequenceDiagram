define(() => {
	'use strict';

	function mergeSets(target, b = null) {
		if(!b) {
			return;
		}
		for(let i = 0; i < b.length; ++ i) {
			if(target.indexOf(b[i]) === -1) {
				target.push(b[i]);
			}
		}
	}

	function removeAll(target, b = null) {
		if(!b) {
			return;
		}
		for(let i = 0; i < b.length; ++ i) {
			const p = target.indexOf(b[i]);
			if(p !== -1) {
				target.splice(p, 1);
			}
		}
	}

	function remove(list, item) {
		const p = list.indexOf(item);
		if(p !== -1) {
			list.splice(p, 1);
		}
	}

	function last(list) {
		return list[list.length - 1];
	}

	return {
		mergeSets,
		removeAll,
		remove,
		last,
	};
});
