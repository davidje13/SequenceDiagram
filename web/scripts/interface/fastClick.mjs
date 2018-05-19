import DOMWrapper from '../../../scripts/core/DOMWrapper.mjs';

DOMWrapper.WrappedElement.prototype.fastClick = function() {
	const pt = {x: -1, y: 0};
	return this
		.on('touchstart', (e) => {
			const [touch] = e.touches;
			pt.x = touch.pageX;
			pt.y = touch.pageY;
		}, {passive: true})
		.on('touchend', (e) => {
			if(
				pt.x === -1 ||
				e.touches.length !== 0 ||
				e.changedTouches.length !== 1
			) {
				pt.x = -1;
				return;
			}
			const [touch] = e.changedTouches;
			if(
				Math.abs(pt.x - touch.pageX) < 10 &&
				Math.abs(pt.y - touch.pageY) < 10
			) {
				e.preventDefault();
				e.target.click();
			}
			pt.x = -1;
		});
};
