import DOMWrapper from '../../../scripts/core/DOMWrapper.mjs';
import SequenceDiagram from '../../../scripts/sequence/SequenceDiagram.mjs';

export default (hashNav, slotStorage) => {
	if(hashNav.getSlot() !== null) {
		return Promise.resolve();
	}

	const slots = slotStorage.getAllSlots().sort((a, b) => (a - b));
	if(!slots.length) {
		hashNav.setSlot(1);
		return Promise.resolve();
	}

	const dom = new DOMWrapper(window.document);
	const container = dom.el('div').setClass('pick-document')
		.add(dom.el('h1').text('Diagrams on this device:'))
		.add(dom.el('p').text('(right-click to delete)'))
		.attach(document.body);

	function remove(slot) {
		// eslint-disable-next-line no-alert
		if(window.confirm('Delete this diagram?')) {
			slotStorage.remove(slot);
			window.location.reload();
		}
	}

	const diagram = new SequenceDiagram();
	return new Promise((resolve) => {
		const diagrams = slots.map((slot) => {
			const code = slotStorage.get(slot);

			const holdInner = dom.el('div')
				.attr('title', code.trim());

			const hold = dom.el('a')
				.attr('href', `#${slot}`)
				.setClass('pick-document-item')
				.add(holdInner)
				.on('click', (e) => {
					e.preventDefault();
					resolve(slot);
				})
				.on('contextmenu', (e) => {
					e.preventDefault();
					remove(slot);
				})
				.attach(container);

			return diagram.clone({
				code,
				container: holdInner.element,
				render: false,
			}).on('error', (sd, e) => {
				window.console.warn('Failed to render preview', e);
				hold.attr('class', 'pick-document-item broken');
				holdInner.text(code);
			});
		});

		try {
			diagram.renderAll(diagrams);
		} catch(ignore) {
			// Ignore
		}

		if(slots.length < hashNav.maxSlots()) {
			dom.el('div')
				.setClass('pick-document-item new')
				.add(dom.el('div').attr('title', 'New document'))
				.on('click', () => resolve(slotStorage.nextAvailableSlot()))
				.attach(container);
		}
	}).then((slot) => {
		container.detach();
		hashNav.setSlot(slot);
	});
};
