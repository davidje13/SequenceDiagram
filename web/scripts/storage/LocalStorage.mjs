export default class LocalStorage {
	constructor(id) {
		this.id = id;
	}

	set(value) {
		try {
			window.localStorage.setItem(this.id, value);
		} catch(ignore) {
			// Ignore
		}
	}

	get() {
		try {
			return window.localStorage.getItem(this.id) || '';
		} catch(e) {
			return '';
		}
	}
}
