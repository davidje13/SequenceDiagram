define([
	'./BaseTheme',
	'svg/SVGUtilities',
	'svg/SVGShapes',
], (
	BaseTheme,
	svg,
	SVGShapes
) => {
	'use strict';

	const FONT = 'sans-serif';
	const LINE_HEIGHT = 1.3;

	const WAVE = new BaseTheme.WavePattern(10, 1);

	const SETTINGS = {
		titleMargin: 12,
		outerMargin: 5,
		agentMargin: 8,
		actionMargin: 5,
		minActionMargin: 5,
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
					'font-family': FONT,
					'font-weight': 'bold',
					'font-size': 14,
					'line-height': LINE_HEIGHT,
					'text-anchor': 'middle',
				},
			},
			cross: {
				size: 20,
				render: BaseTheme.renderCross.bind(null, {
					'fill': 'none',
					'stroke': '#000000',
					'stroke-width': 3,
					'stroke-linecap': 'round',
				}),
			},
			bar: {
				height: 4,
				render: SVGShapes.renderBox.bind(null, {
					'fill': '#000000',
					'stroke': '#000000',
					'stroke-width': 3,
					'rx': 2,
					'ry': 2,
				}),
			},
			fade: {
				width: 5,
				height: 10,
				extend: 1,
			},
			none: {
				height: 10,
			},
		},

		connect: {
			loopbackRadius: 8,
			line: {
				'solid': {
					attrs: {
						'fill': 'none',
						'stroke': '#000000',
						'stroke-width': 3,
					},
					renderFlat: BaseTheme.renderFlatConnector.bind(null, null),
					renderRev: BaseTheme.renderRevConnector.bind(null, null),
				},
				'dash': {
					attrs: {
						'fill': 'none',
						'stroke': '#000000',
						'stroke-width': 3,
						'stroke-dasharray': '10, 4',
					},
					renderFlat: BaseTheme.renderFlatConnector.bind(null, null),
					renderRev: BaseTheme.renderRevConnector.bind(null, null),
				},
				'wave': {
					attrs: {
						'fill': 'none',
						'stroke': '#000000',
						'stroke-width': 3,
						'stroke-linejoin': 'round',
						'stroke-linecap': 'round',
					},
					renderFlat: BaseTheme.renderFlatConnector.bind(null, WAVE),
					renderRev: BaseTheme.renderRevConnector.bind(null, WAVE),
				},
			},
			arrow: {
				single: {
					width: 10,
					height: 12,
					render: BaseTheme.renderHorizArrowHead,
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
					render: BaseTheme.renderHorizArrowHead,
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
					'font-family': FONT,
					'font-size': 8,
					'line-height': LINE_HEIGHT,
					'text-anchor': 'middle',
				},
				loopbackAttrs: {
					'font-family': FONT,
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

		titleAttrs: {
			'font-family': FONT,
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

	const SHARED_BLOCK_SECTION = {
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
			boxRenderer: BaseTheme.renderTag.bind(null, {
				'fill': '#FFFFFF',
				'stroke': '#000000',
				'stroke-width': 2,
				'rx': 3,
				'ry': 3,
			}),
			labelAttrs: {
				'font-family': FONT,
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
				'font-family': FONT,
				'font-size': 8,
				'line-height': LINE_HEIGHT,
				'text-anchor': 'left',
			},
		},
	};

	const BLOCKS = {
		'ref': {
			margin: {
				top: 0,
				bottom: 0,
			},
			boxRenderer: SVGShapes.renderBox.bind(null, {
				'fill': '#FFFFFF',
				'stroke': '#000000',
				'stroke-width': 4,
				'rx': 5,
				'ry': 5,
			}),
			section: SHARED_BLOCK_SECTION,
		},
		'': {
			margin: {
				top: 0,
				bottom: 0,
			},
			boxRenderer: SVGShapes.renderBox.bind(null, {
				'fill': 'none',
				'stroke': '#000000',
				'stroke-width': 4,
				'rx': 5,
				'ry': 5,
			}),
			section: SHARED_BLOCK_SECTION,
			sepRenderer: SVGShapes.renderLine.bind(null, {
				'stroke': '#000000',
				'stroke-width': 2,
				'stroke-dasharray': '5, 3',
			}),
		},
	};

	const NOTE_ATTRS = {
		'font-family': FONT,
		'font-size': 8,
		'line-height': LINE_HEIGHT,
	};

	const NOTES = {
		'text': {
			margin: {top: 0, left: 2, right: 2, bottom: 0},
			padding: {top: 2, left: 2, right: 2, bottom: 2},
			overlap: {left: 10, right: 10},
			boxRenderer: SVGShapes.renderBox.bind(null, {
				'fill': '#FFFFFF',
			}),
			labelAttrs: NOTE_ATTRS,
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
			labelAttrs: NOTE_ATTRS,
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
			labelAttrs: NOTE_ATTRS,
		},
	};

	return class ChunkyTheme extends BaseTheme {
		constructor() {
			super({
				name: 'chunky',
				settings: SETTINGS,
				blocks: BLOCKS,
				notes: NOTES,
			});
		}
	};
});
