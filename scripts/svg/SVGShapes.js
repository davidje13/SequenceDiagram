define([
	'./SVGUtilities',
	'./SVGTextBlock',
	'./PatternedLine',
], (
	svg,
	SVGTextBlock,
	PatternedLine
) => {
	'use strict';

	function renderBox(attrs, position) {
		return svg.make('rect', Object.assign({}, position, attrs));
	}

	function renderLine(attrs, position) {
		return svg.make('line', Object.assign({}, position, attrs));
	}

	function renderNote(attrs, flickAttrs, position) {
		const x0 = position.x;
		const x1 = position.x + position.width;
		const y0 = position.y;
		const y1 = position.y + position.height;
		const flick = 7;

		return svg.make('g', {}, [
			svg.make('polygon', Object.assign({
				'points': (
					x0 + ' ' + y0 + ' ' +
					(x1 - flick) + ' ' + y0 + ' ' +
					x1 + ' ' + (y0 + flick) + ' ' +
					x1 + ' ' + y1 + ' ' +
					x0 + ' ' + y1
				),
			}, attrs)),
			svg.make('polyline', Object.assign({
				'points': (
					(x1 - flick) + ' ' + y0 + ' ' +
					(x1 - flick) + ' ' + (y0 + flick) + ' ' +
					x1 + ' ' + (y0 + flick)
				),
			}, flickAttrs)),
		]);
	}

	function calculateAnchor(x, attrs, padding) {
		let shift = 0;
		let anchorX = x;
		switch(attrs['text-anchor']) {
		case 'middle':
			shift = 0.5;
			anchorX += (padding.left - padding.right) / 2;
			break;
		case 'end':
			shift = 1;
			anchorX -= padding.right;
			break;
		default:
			shift = 0;
			anchorX += padding.left;
			break;
		}
		return {shift, anchorX};
	}

	function renderBoxedText(formatted, {
		x,
		y,
		padding,
		boxAttrs,
		labelAttrs,
		boxLayer,
		labelLayer,
		boxRenderer = null,
		SVGTextBlockClass = SVGTextBlock,
	}) {
		if(!formatted || !formatted.length) {
			return {width: 0, height: 0, label: null, box: null};
		}

		const {shift, anchorX} = calculateAnchor(x, labelAttrs, padding);

		const label = new SVGTextBlockClass(labelLayer, {
			attrs: labelAttrs,
			formatted,
			x: anchorX,
			y: y + padding.top,
		});

		const width = (label.width + padding.left + padding.right);
		const height = (label.height + padding.top + padding.bottom);

		let box = null;
		if(boxRenderer) {
			box = boxRenderer({
				'x': anchorX - label.width * shift - padding.left,
				'y': y,
				'width': width,
				'height': height,
			});
		} else {
			box = renderBox(boxAttrs, {
				'x': anchorX - label.width * shift - padding.left,
				'y': y,
				'width': width,
				'height': height,
			});
		}

		if(boxLayer === labelLayer) {
			boxLayer.insertBefore(box, label.firstLine());
		} else {
			boxLayer.appendChild(box);
		}

		return {width, height, label, box};
	}

	return {
		renderBox,
		renderLine,
		renderNote,
		renderBoxedText,
		TextBlock: SVGTextBlock,
		PatternedLine,
	};
});
