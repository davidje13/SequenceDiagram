define([
	'core/ArrayUtilities',
	'svg/SVGUtilities',
	'svg/SVGTextBlock',
	'svg/SVGShapes',
], (
	array,
	svg,
	SVGTextBlock,
	SVGShapes
) => {
	'use strict';

	const LINE_HEIGHT = 1.3;

	const SETTINGS = {
		titleMargin: 10,
		outerMargin: 5,
		agentMargin: 10,
		actionMargin: 5,

		agentCap: {
			box: {
				padding: {
					top: 5,
					left: 10,
					right: 10,
					bottom: 5,
				},
				boxAttrs: {
					'fill': '#FFFFFF',
					'stroke': '#000000',
					'stroke-width': 1,
				},
				labelAttrs: {
					'font-family': 'sans-serif',
					'font-size': 12,
					'line-height': LINE_HEIGHT,
					'text-anchor': 'middle',
				},
			},
			cross: {
				size: 20,
				attrs: {
					'fill': 'none',
					'stroke': '#000000',
					'stroke-width': 1,
				},
			},
			bar: {
				attrs: {
					'fill': '#000000',
					'height': 5,
				},
			},
			none: {
				height: 10,
			},
		},

		connect: {
			loopbackRadius: 6,
			lineAttrs: {
				'solid': {
					'fill': 'none',
					'stroke': '#000000',
					'stroke-width': 1,
				},
				'dash': {
					'fill': 'none',
					'stroke': '#000000',
					'stroke-width': 1,
					'stroke-dasharray': '4, 2',
				},
			},
			arrow: {
				width: 4,
				height: 8,
				attrs: {
					'fill': '#000000',
					'stroke': '#000000',
					'stroke-width': 1,
					'stroke-linejoin': 'miter',
				},
			},
			label: {
				padding: 6,
				margin: {top: 2, bottom: 1},
				attrs: {
					'font-family': 'sans-serif',
					'font-size': 8,
					'line-height': LINE_HEIGHT,
					'text-anchor': 'middle',
				},
				loopbackAttrs: {
					'font-family': 'sans-serif',
					'font-size': 8,
					'line-height': LINE_HEIGHT,
				},
			},
			mask: {
				padding: {
					top: 0,
					left: 3,
					right: 3,
					bottom: 0,
				},
				maskAttrs: {
					'fill': '#FFFFFF',
				},
			},
		},

		block: {
			margin: {
				top: 0,
				bottom: 0,
			},
			boxAttrs: {
				'fill': 'none',
				'stroke': '#000000',
				'stroke-width': 1.5,
				'rx': 2,
				'ry': 2,
			},
			section: {
				padding: {
					top: 3,
					bottom: 2,
				},
				mode: {
					padding: {
						top: 1,
						left: 3,
						right: 3,
						bottom: 0,
					},
					boxAttrs: {
						'fill': '#FFFFFF',
						'stroke': '#000000',
						'stroke-width': 1,
						'rx': 2,
						'ry': 2,
					},
					labelAttrs: {
						'font-family': 'sans-serif',
						'font-weight': 'bold',
						'font-size': 9,
						'line-height': LINE_HEIGHT,
						'text-anchor': 'left',
					},
				},
				label: {
					padding: {
						top: 1,
						left: 5,
						right: 3,
						bottom: 0,
					},
					maskAttrs: {
						'fill': '#FFFFFF',
					},
					labelAttrs: {
						'font-family': 'sans-serif',
						'font-size': 8,
						'line-height': LINE_HEIGHT,
						'text-anchor': 'left',
					},
				},
			},
			separator: {
				attrs: {
					'stroke': '#000000',
					'stroke-width': 1.5,
					'stroke-dasharray': '4, 2',
				},
			},
		},

		note: {
			'note': {
				margin: {top: 0, left: 5, right: 5, bottom: 0},
				padding: {top: 5, left: 5, right: 10, bottom: 5},
				overlap: {left: 10, right: 10},
				boxRenderer: SVGShapes.renderNote.bind(null, {
					'fill': '#FFFFFF',
					'stroke': '#000000',
					'stroke-width': 1,
				}, {
					'fill': 'none',
					'stroke': '#000000',
					'stroke-width': 1,
				}),
				labelAttrs: {
					'font-family': 'sans-serif',
					'font-size': 8,
					'line-height': LINE_HEIGHT,
				},
			},
			'state': {
				margin: {top: 0, left: 5, right: 5, bottom: 0},
				padding: {top: 7, left: 7, right: 7, bottom: 7},
				overlap: {left: 10, right: 10},
				boxRenderer: SVGShapes.renderBox.bind(null, {
					'fill': '#FFFFFF',
					'stroke': '#000000',
					'stroke-width': 1,
					'rx': 10,
					'ry': 10,
				}),
				labelAttrs: {
					'font-family': 'sans-serif',
					'font-size': 8,
					'line-height': LINE_HEIGHT,
				},
			},
		},

		titleAttrs: {
			'font-family': 'sans-serif',
			'font-size': 20,
			'line-height': LINE_HEIGHT,
			'text-anchor': 'middle',
			'class': 'title',
		},

		agentLineAttrs: {
			'fill': 'none',
			'stroke': '#000000',
			'stroke-width': 1,
		},
	};

	return class Theme {
		constructor() {
			Object.assign(this, SETTINGS);
		}
	};
});
