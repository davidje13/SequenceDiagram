export default class VoidStorage {
	constructor() {
		this.value = '';
	}

	set(value) {
		this.value = value;
	}

	get() {
		return this.value;
	}

	remove() {
		this.value = '';
	}
}
