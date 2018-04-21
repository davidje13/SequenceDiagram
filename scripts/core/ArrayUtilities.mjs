export function indexOf(list, element, equalityCheck = null) {
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

export function mergeSets(target, b = null, equalityCheck = null) {
	if(!b) {
		return;
	}
	for(let i = 0; i < b.length; ++ i) {
		if(indexOf(target, b[i], equalityCheck) === -1) {
			target.push(b[i]);
		}
	}
}

export function hasIntersection(a, b, equalityCheck = null) {
	for(let i = 0; i < b.length; ++ i) {
		if(indexOf(a, b[i], equalityCheck) !== -1) {
			return true;
		}
	}
	return false;
}

export function removeAll(target, b = null, equalityCheck = null) {
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

export function remove(list, item, equalityCheck = null) {
	const p = indexOf(list, item, equalityCheck);
	if(p !== -1) {
		list.splice(p, 1);
	}
}

export function last(list) {
	return list[list.length - 1];
}

function combineRecur(parts, position, current, target) {
	if(position >= parts.length) {
		target.push(current.slice());
		return;
	}
	const choices = parts[position];
	if(!Array.isArray(choices)) {
		current.push(choices);
		combineRecur(parts, position + 1, current, target);
		current.pop();
		return;
	}
	for(let i = 0; i < choices.length; ++ i) {
		current.push(choices[i]);
		combineRecur(parts, position + 1, current, target);
		current.pop();
	}
}

export function combine(parts) {
	const target = [];
	combineRecur(parts, 0, [], target);
	return target;
}

export function flatMap(list, fn) {
	const result = [];
	list.forEach((item) => {
		result.push(...fn(item));
	});
	return result;
}
