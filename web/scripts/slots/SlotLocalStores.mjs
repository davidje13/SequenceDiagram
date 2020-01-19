const VALID_SLOT_KEY = /^s[0-9]+$/;

export default class SlotLocalStores {
	getSlotKey(slot) {
		return `s${slot}`;
	}

	getAllSlots() {
		const result = [];
		try {
			for(const key in window.localStorage) {
				if(VALID_SLOT_KEY.test(key)) {
					result.push(Number(key.substr(1)));
				}
			}
		} catch(e) {
			// Ignore
		}
		return result;
	}

	nextAvailableSlot(limit = Number.MAX_SAFE_INTEGER) {
		try {
			for(let i = 1; i < limit; ++ i) {
				if(window.localStorage.getItem(this.getSlotKey(i)) === null) {
					return i;
				}
			}
			return null;
		} catch(e) {
			return null;
		}
	}

	set(slot, value) {
		try {
			window.localStorage.setItem(this.getSlotKey(slot), value);
		} catch(ignore) {
			// Ignore
		}
	}

	get(slot) {
		try {
			return window.localStorage.getItem(this.getSlotKey(slot)) || '';
		} catch(e) {
			return '';
		}
	}

	remove(slot) {
		try {
			window.localStorage.removeItem(this.getSlotKey(slot));
		} catch(ignore) {
			// Ignore
		}
	}
}
