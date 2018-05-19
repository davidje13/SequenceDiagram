import DOMWrapper from '../../../scripts/core/DOMWrapper.mjs';

export default function split(nodes, options) {
	const filteredNodes = [];
	const filteredOpts = {
		direction: options.direction,
		minSize: [],
		sizes: [],
		snapOffset: options.snapOffset,
	};

	let total = 0;
	for(let i = 0; i < nodes.length; ++ i) {
		if(nodes[i]) {
			filteredNodes.push(nodes[i]);
			filteredOpts.minSize.push(options.minSize[i]);
			filteredOpts.sizes.push(options.sizes[i]);
			total += options.sizes[i];
		}
	}
	for(let i = 0; i < filteredNodes.length; ++ i) {
		filteredOpts.minSize[i] *= 100 / total;
		filteredOpts.sizes[i] *= 100 / total;

		const percent = filteredOpts.sizes[i] + '%';
		if(filteredOpts.direction === 'vertical') {
			nodes[i].styles({
				boxSizing: 'border-box',
				height: percent,
				width: '100%',
			});
		} else {
			nodes[i].styles({
				boxSizing: 'border-box',
				display: 'inline-block',
				height: '100%',
				verticalAlign: 'top', // Safari fix
				width: percent,
			});
		}
	}

	if(filteredNodes.length < 2) {
		return;
	}

	// Load on demand for progressive enhancement
	// (failure to load external module will not block functionality)
	options.require(['split'], (Split) => {
		// Patches for:
		// https://github.com/nathancahill/Split.js/issues/97
		// https://github.com/nathancahill/Split.js/issues/111
		const parent = nodes[0].element.parentNode;
		const oldAEL = parent.addEventListener;
		const oldREL = parent.removeEventListener;
		parent.addEventListener = (event, callback) => {
			if(event === 'mousemove' || event === 'touchmove') {
				window.addEventListener(event, callback, {passive: true});
			} else {
				oldAEL.call(parent, event, callback);
			}
		};
		parent.removeEventListener = (event, callback) => {
			if(event === 'mousemove' || event === 'touchmove') {
				window.removeEventListener(event, callback);
			} else {
				oldREL.call(parent, event, callback);
			}
		};

		let oldCursor = null;
		const cursor = (filteredOpts.direction === 'vertical') ?
			'row-resize' : 'col-resize';

		return new Split(
			filteredNodes.map((node) => node.element),
			Object.assign({
				cursor,
				direction: 'vertical',
				gutterSize: 0,
				onDragEnd: () => {
					document.body.style.cursor = oldCursor;
					oldCursor = null;
				},
				onDragStart: () => {
					oldCursor = document.body.style.cursor;
					document.body.style.cursor = cursor;
				},
			}, filteredOpts)
		);
	});
}

DOMWrapper.WrappedElement.prototype.split = function(nodes, options) {
	this.add(nodes);
	split(nodes, options);
	return this;
};
