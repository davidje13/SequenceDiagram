import DOMWrapper from '../../../scripts/core/DOMWrapper.mjs';

export const VERTICAL = true;
export const HORIZONTAL = false;

DOMWrapper.WrappedElement.prototype.split = function(
	dom,
	vertical,
	options,
	nodes,
) {
	const filtered = nodes.filter(({node}) => node);
	if(filtered.length < 2) {
		this.add(filtered.map(({node}) => node));
		return this;
	}
	if(filtered.length > 2) {
		throw new Error('unsupported');
	}

	this.addClass(vertical ? 'split-v' : 'split-h');

	for(const {node, initialSize, minSize} of filtered) {
		if(vertical) {
			node.styles({
				flex: initialSize,
				minHeight: minSize + 'px',
			});
		} else {
			node.styles({
				flex: initialSize,
				minWidth: minSize + 'px',
			});
		}
	}

	const divider = dom.el('div').addClass('divider');

	let start = 0;
	let end = 0;
	let dragShift = 0;

	const drag = (e) => {
		let curPos = (vertical ? e.clientY : e.clientX) - dragShift;
		if(curPos < start + filtered[0].minSize + options.snap) {
			curPos = start + filtered[0].minSize;
		}
		if(curPos > end - filtered[1].minSize - options.snap) {
			curPos = end - filtered[1].minSize;
		}
		const frac = (curPos - start) / (end - start);
		filtered[0].node.styles({ flex: frac });
		filtered[1].node.styles({ flex: 1 - frac });
	};

	divider.on('pointerdown', (e) => {
		e.preventDefault();
		const divBound = divider.element.getBoundingClientRect();
		const parentBounds = this.element.getBoundingClientRect();
		dragShift = vertical ?
			(e.clientY - (divBound.top + divBound.bottom) / 2) :
			(e.clientX - (divBound.left + divBound.right) / 2);
		start = vertical ? parentBounds.top : parentBounds.left;
		end = vertical ? parentBounds.bottom : parentBounds.right;
		divider.element.setPointerCapture(e.pointerId);
		divider.on('pointermove', drag);
	});

	divider.on('pointerup', (e) => {
		divider.off('pointermove', drag);
		divider.element.releasePointerCapture(e.pointerId);
	});

	return this.add(filtered[0].node, divider, filtered[1].node);
};
