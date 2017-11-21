define(['core/ArrayUtilities', 'svg/SVGShapes'], (array, SVGShapes) => {
	'use strict';

	const LINE_HEIGHT = 1.3;

	const SETTINGS = {
		titleMargin: 12,
		outerMargin: 5,
		agentMargin: 8,
		actionMargin: 5,
		agentLineHighlightRadius: 4,

		agentCap: {
			box: {
				padding: {
					top: 1,
					left: 3,
					right: 3,
					bottom: 1,
				},
				arrowBottom: 2 + 14 * 1.3 / 2,
				boxAttrs: {
					'fill': '#FFFFFF',
					'stroke': '#000000',
					'stroke-width': 3,
					'rx': 4,
					'ry': 4,
				},
				labelAttrs: {
					'font-family': 'sans-serif',
					'font-weight': 'bold',
					'font-size': 14,
					'line-height': LINE_HEIGHT,
					'text-anchor': 'middle',
				},
			},
			cross: {
				size: 20,
				attrs: {
					'fill': 'none',
					'stroke': '#000000',
					'stroke-width': 3,
					'stroke-linecap': 'round',
				},
			},
			bar: {
				attrs: {
					'fill': '#000000',
					'stroke': '#000000',
					'stroke-width': 3,
					'height': 4,
					'rx': 2,
					'ry': 2,
				},
			},
			fade: {
				width: 5,
				height: 10,
			},
			none: {
				height: 10,
			},
		},

		connect: {
			loopbackRadius: 8,
			lineAttrs: {
				'solid': {
					'fill': 'none',
					'stroke': '#000000',
					'stroke-width': 3,
				},
				'dash': {
					'fill': 'none',
					'stroke': '#000000',
					'stroke-width': 3,
					'stroke-dasharray': '10, 4',
				},
				'wave': {
					'fill': 'none',
					'stroke': '#000000',
					'stroke-width': 3,
					'stroke-linejoin': 'round',
					'stroke-linecap': 'round',
					'wave-width': 10,
					'wave-height': 1,
				},
			},
			arrow: {
				single: {
					width: 10,
					height: 12,
					attrs: {
						'fill': '#000000',
						'stroke': '#000000',
						'stroke-width': 3,
						'stroke-linejoin': 'round',
					},
				},
				double: {
					width: 10,
					height: 12,
					attrs: {
						'fill': 'none',
						'stroke': '#000000',
						'stroke-width': 3,
						'stroke-linejoin': 'round',
						'stroke-linecap': 'round',
					},
				},
			},
			label: {
				padding: 7,
				margin: {top: 2, bottom: 3},
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
					top: 1,
					left: 5,
					right: 5,
					bottom: 3,
				},
			},
		},

		block: {
			margin: {
				top: 0,
				bottom: 0,
			},
			modes: {
				'ref': {
					boxAttrs: {
						'fill': '#FFFFFF',
						'stroke': '#000000',
						'stroke-width': 4,
						'rx': 5,
						'ry': 5,
					},
				},
				'': {
					boxAttrs: {
						'fill': 'none',
						'stroke': '#000000',
						'stroke-width': 4,
						'rx': 5,
						'ry': 5,
					},
				},
			},
			section: {
				padding: {
					top: 3,
					bottom: 4,
				},
				mode: {
					padding: {
						top: 2,
						left: 5,
						right: 5,
						bottom: 1,
					},
					boxAttrs: {
						'fill': '#FFFFFF',
						'stroke': '#000000',
						'stroke-width': 2,
						'rx': 3,
						'ry': 3,
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
						top: 2,
						left: 5,
						right: 3,
						bottom: 0,
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
					'stroke-width': 2,
					'stroke-dasharray': '5, 3',
				},
			},
		},

		note: {
			'text': {
				margin: {top: 0, left: 2, right: 2, bottom: 0},
				padding: {top: 2, left: 2, right: 2, bottom: 2},
				overlap: {left: 10, right: 10},
				boxRenderer: SVGShapes.renderBox.bind(null, {
					'fill': '#FFFFFF',
				}),
				labelAttrs: {
					'font-family': 'sans-serif',
					'font-size': 8,
					'line-height': LINE_HEIGHT,
				},
			},
			'note': {
				margin: {top: 0, left: 5, right: 5, bottom: 0},
				padding: {top: 3, left: 3, right: 10, bottom: 3},
				overlap: {left: 10, right: 10},
				boxRenderer: SVGShapes.renderNote.bind(null, {
					'fill': '#FFFFFF',
					'stroke': '#000000',
					'stroke-width': 2,
					'stroke-linejoin': 'round',
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
				padding: {top: 5, left: 7, right: 7, bottom: 5},
				overlap: {left: 10, right: 10},
				boxRenderer: SVGShapes.renderBox.bind(null, {
					'fill': '#FFFFFF',
					'stroke': '#000000',
					'stroke-width': 3,
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
			'font-weight': 'bolder',
			'font-size': 20,
			'line-height': LINE_HEIGHT,
			'text-anchor': 'middle',
			'class': 'title',
		},

		agentLineAttrs: {
			'fill': 'none',
			'stroke': '#000000',
			'stroke-width': 3,
		},
	};

	return class ChunkyTheme {
		constructor() {
			this.name = 'chunky';
			Object.assign(this, SETTINGS);
		}
	};
});
