export default class LocalStorage {
	constructor(id) {
		this.id = id;
	}

	set(value) {
		if(!this.id) {
			return;
		}
		try {
			window.localStorage.setItem(this.id, value);
		} catch(ignore) {
			// Ignore
		}
	}

	get() {
		if(!this.id) {
			return '';
		}
		try {
			return window.localStorage.getItem(this.id) || '';
		} catch(e) {
			return '';
		}
	}
}
