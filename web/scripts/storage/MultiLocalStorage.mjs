export default class MultiLocalStorage {
	constructor(slotManager, slotStorage) {
		this.slotManager = slotManager;
		this.slotStorage = slotStorage;
		this.slot = this.slotManager.getSlot();
		this.value = this.get();
		this.originalValue = this.value;
		this.loadTime = Date.now();
		this.internalStorageListener = this.internalStorageListener.bind(this);

		window.addEventListener('storage', this.internalStorageListener);
		this.checkSlot();
	}

	getCurrentValue() {
		// If the page just loaded, clone the original document
		// (works around glitches with CodeMirror when duplicating tabs)
		if(Date.now() < this.loadTime + 500) {
			return this.originalValue;
		}
		return this.value;
	}

	key() {
		return this.slotStorage.getSlotKey(this.slot);
	}

	checkSlot() {
		const key = this.key();
		window.localStorage.removeItem(`chk-${key}`);
		window.localStorage.removeItem(`res-${key}`);
		window.localStorage.removeItem(`ack-${key}`);

		// Check if any other tabs are viewing the same document
		window.localStorage.setItem(`chk-${key}`, '1');
	}

	cloneSlot() {
		const slotLimit = this.slotManager.maxSlots();
		const newSlot = this.slotStorage.nextAvailableSlot(slotLimit);
		if(!newSlot) {
			return;
		}

		const value = this.getCurrentValue();
		this.slotStorage.set(newSlot, value);
		this.slot = newSlot;
		this.slotManager.setSlot(newSlot);

		// Force editor to load corrected content if needed
		if(value !== this.value) {
			document.location.reload();
		}
	}

	// eslint-disable-next-line complexity
	internalStorageListener({ storageArea, key, newValue }) {
		if(storageArea !== window.localStorage) {
			return;
		}

		const ownKey = this.key();
		if(key === ownKey && newValue !== this.value) {
			if(newValue === null) {
				// Somebody deleted our document; put it back
				// (a nicer explanation for the deleter may be nice, but later)
				window.localStorage.setItem(ownKey, this.value);
			}
			// Another tab unexpectedly changed a value we own
			// Remind them that we own the document
			window.localStorage.removeItem(`res-${ownKey}`);
			window.localStorage.setItem(`res-${ownKey}`, '1');
		}

		if(key === `chk-${ownKey}` && newValue) {
			// Another tab is checking if our slot is in use; reply yes
			window.localStorage.setItem(`res-${ownKey}`, '1');
		}

		if(key === `res-${ownKey}` && newValue) {
			// Another tab owns our slot; clone the document
			window.localStorage.removeItem(`chk-${ownKey}`);
			window.localStorage.removeItem(`res-${ownKey}`);
			window.localStorage.setItem(`ack-${ownKey}`, '1');
			this.cloneSlot();
		}

		if(key === `ack-${ownKey}` && newValue) {
			// Another tab has acknowledged us as the owner of the document
			// Restore 'correct' value in case it was clobbered accidentally
			window.localStorage.removeItem(`ack-${ownKey}`, '1');
			window.localStorage.setItem(ownKey, this.value);
		}
	}

	set(value) {
		this.value = value;
		this.slotStorage.set(this.slot, value);
	}

	get() {
		return this.slotStorage.get(this.slot);
	}

	remove() {
		this.slotStorage.remove(this.slot);
	}

	close() {
		window.removeEventListener('storage', this.internalStorageListener);
	}
}
