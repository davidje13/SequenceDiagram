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

	const SETTINGS = {
		titleMargin: 10,
		outerMargin: 5,
		agentMargin: 10,
		actionMargin: 10,
		minActionMargin: 3,
		agentLineHighlightRadius: 4,

		agentCap: {
			box: {
				padding: {
					top: 5,
					left: 10,
					right: 10,
					bottom: 5,
				},
				arrowBottom: 5 + 12 * 1.3 / 2,
				boxAttrs: {
					'fill': '#FFFFFF',
					'stroke': '#000000',
					'stroke-width': 1,
				},
				labelAttrs: {
					'font-family': FONT,
					'font-size': 12,
					'line-height': LINE_HEIGHT,
					'text-anchor': 'middle',
				},
			},
			cross: {
				size: 20,
				render: BaseTheme.renderCross.bind(null, {
					'fill': 'none',
					'stroke': '#000000',
					'stroke-width': 1,
				}),
			},
			bar: {
				height: 4,
				render: SVGShapes.renderBox.bind(null, {
					'fill': '#000000',
					'stroke': '#000000',
					'stroke-width': 1,
				}),
			},
			fade: {
				width: 5,
				height: 6,
			},
			none: {
				height: 10,
			},
		},

		connect: {
			loopbackRadius: 6,
			line: {
				'solid': {
					attrs: {
						'fill': 'none',
						'stroke': '#000000',
						'stroke-width': 1,
					},
				},
				'dash': {
					attrs: {
						'fill': 'none',
						'stroke': '#000000',
						'stroke-width': 1,
						'stroke-dasharray': '4, 2',
					},
				},
				'wave': {
					attrs: {
						'fill': 'none',
						'stroke': '#000000',
						'stroke-width': 1,
						'stroke-linejoin': 'round',
						'stroke-linecap': 'round',
						'wave-width': 6,
						'wave-height': 0.5,
					},
				},
			},
			arrow: {
				'single': {
					width: 5,
					height: 10,
					render: BaseTheme.renderHorizArrowHead,
					attrs: {
						'fill': '#000000',
						'stroke-width': 0,
						'stroke-linejoin': 'miter',
					},
				},
				'double': {
					width: 4,
					height: 6,
					render: BaseTheme.renderHorizArrowHead,
					attrs: {
						'fill': 'none',
						'stroke': '#000000',
						'stroke-width': 1,
						'stroke-linejoin': 'miter',
					},
				},
			},
			label: {
				padding: 6,
				margin: {top: 2, bottom: 1},
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
					top: 0,
					left: 3,
					right: 3,
					bottom: 1,
				},
			},
		},

		titleAttrs: {
			'font-family': FONT,
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

	const SHARED_BLOCK_SECTION = {
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
			boxRenderer: BaseTheme.renderTag.bind(null, {
				'fill': '#FFFFFF',
				'stroke': '#000000',
				'stroke-width': 1,
				'rx': 2,
				'ry': 2,
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
				top: 1,
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
				'stroke-width': 1.5,
				'rx': 2,
				'ry': 2,
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
				'stroke-width': 1.5,
				'rx': 2,
				'ry': 2,
			}),
			section: SHARED_BLOCK_SECTION,
			sepRenderer: SVGShapes.renderLine.bind(null, {
				'stroke': '#000000',
				'stroke-width': 1.5,
				'stroke-dasharray': '4, 2',
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
			labelAttrs: NOTE_ATTRS,
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
			labelAttrs: NOTE_ATTRS,
		},
	};

	return class BasicTheme extends BaseTheme {
		constructor() {
			super({
				name: 'basic',
				settings: SETTINGS,
				blocks: BLOCKS,
				notes: NOTES,
			});
		}
	};
});
