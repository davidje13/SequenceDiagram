const VALID_HASH = /^[0-9]{1,2}$/;

function getHash() {
	const full = window.location.hash;
	return full ? full.substr(1) : '';
}

export default class HashSlotNav {
	constructor(changeListener = () => null) {
		this.hash = getHash();
		window.addEventListener('hashchange', () => {
			// Only trigger listener if change wasn't caused by us
			if(getHash() !== this.hash) {
				changeListener();
			}
		});
	}

	getRawHash() {
		return getHash();
	}

	maxSlots() {
		// Capacity of localStorage is limited
		// So avoid allowing too many documents
		// (also acts as a fail-safe if anything gets loop-ey)
		return 100;
	}

	getSlot() {
		const hash = getHash();
		if(VALID_HASH.test(hash)) {
			return Number(hash);
		}
		return null;
	}

	setSlot(v) {
		this.hash = v.toFixed(0);
		window.location.hash = this.hash;
	}
}
