define(() => {
	'use strict';

	function indexOf(list, element, equalityCheck = null) {
		if(equalityCheck === null) {
			return list.indexOf(element);
		}
		for(let i = 0; i < list.length; ++ i) {
			if(equalityCheck(list[i], element)) {
				return i;
			}
		}
		return -1;
	}

	function mergeSets(target, b = null, equalityCheck = null) {
		if(!b) {
			return;
		}
		for(let i = 0; i < b.length; ++ i) {
			if(indexOf(target, b[i], equalityCheck) === -1) {
				target.push(b[i]);
			}
		}
	}

	function removeAll(target, b = null, equalityCheck = null) {
		if(!b) {
			return;
		}
		for(let i = 0; i < b.length; ++ i) {
			const p = indexOf(target, b[i], equalityCheck);
			if(p !== -1) {
				target.splice(p, 1);
			}
		}
	}

	function remove(list, item, equalityCheck = null) {
		const p = indexOf(list, item, equalityCheck);
		if(p !== -1) {
			list.splice(p, 1);
		}
	}

	function last(list) {
		return list[list.length - 1];
	}

	return {
		indexOf,
		mergeSets,
		removeAll,
		remove,
		last,
	};
});
