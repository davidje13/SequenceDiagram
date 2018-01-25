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

	const FONT = 'monospace';
	const LINE_HEIGHT = 1.3;

	const WAVE = new BaseTheme.WavePattern(6, [
		+0,
		-0.25,
		-0.5,
		-0.25,
		+0,
		+0.25,
		+0.5,
		+0.25,
	]);

	const SETTINGS = {
		titleMargin: 8,
		outerMargin: 4,
		agentMargin: 12,
		actionMargin: 12,
		minActionMargin: 4,
		agentLineHighlightRadius: 4,

		agentCap: {
			box: {
				padding: {
					top: 4,
					left: 8,
					right: 8,
					bottom: 4,
				},
				arrowBottom: 12,
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
				size: 16,
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
				height: 8,
				extend: 1,
			},
			none: {
				height: 8,
			},
		},

		connect: {
			loopbackRadius: 4,
			line: {
				'solid': {
					attrs: {
						'fill': 'none',
						'stroke': '#000000',
						'stroke-width': 1,
					},
					renderFlat: BaseTheme.renderFlatConnector.bind(null, null),
					renderRev: BaseTheme.renderRevConnector.bind(null, null),
				},
				'dash': {
					attrs: {
						'fill': 'none',
						'stroke': '#000000',
						'stroke-width': 1,
						'stroke-dasharray': '4, 4',
					},
					renderFlat: BaseTheme.renderFlatConnector.bind(null, null),
					renderRev: BaseTheme.renderRevConnector.bind(null, null),
				},
				'wave': {
					attrs: {
						'fill': 'none',
						'stroke': '#000000',
						'stroke-width': 1,
					},
					renderFlat: BaseTheme.renderFlatConnector.bind(null, WAVE),
					renderRev: BaseTheme.renderRevConnector.bind(null, WAVE),
				},
			},
			arrow: {
				'single': {
					width: 4,
					height: 8,
					render: BaseTheme.renderArrowHead,
					attrs: {
						'fill': '#000000',
						'stroke-width': 0,
						'stroke-linejoin': 'miter',
					},
				},
				'double': {
					width: 3,
					height: 6,
					render: BaseTheme.renderArrowHead,
					attrs: {
						'fill': 'none',
						'stroke': '#000000',
						'stroke-width': 1,
						'stroke-linejoin': 'miter',
					},
				},
				'cross': {
					short: 8,
					radius: 4,
					render: BaseTheme.renderCross.bind(null, {
						'fill': 'none',
						'stroke': '#000000',
						'stroke-width': 1,
					}),
				},
			},
			label: {
				padding: 4,
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
			source: {
				radius: 2,
				render: ({x, y, radius}) => {
					return svg.make('circle', {
						'cx': x,
						'cy': y,
						'r': radius,
						'fill': '#000000',
						'stroke': '#000000',
						'stroke-width': 1,
					});
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
		tag: {
			padding: {
				top: 2,
				left: 4,
				right: 4,
				bottom: 2,
			},
			boxRenderer: BaseTheme.renderTag.bind(null, {
				'fill': '#FFFFFF',
				'stroke': '#000000',
				'stroke-width': 1,
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
				left: 8,
				right: 8,
				bottom: 2,
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
				'stroke-width': 2,
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
				'stroke-width': 2,
			}),
			section: SHARED_BLOCK_SECTION,
			sepRenderer: SVGShapes.renderLine.bind(null, {
				'stroke': '#000000',
				'stroke-width': 2,
				'stroke-dasharray': '8, 4',
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
			margin: {top: 0, left: 8, right: 8, bottom: 0},
			padding: {top: 4, left: 4, right: 4, bottom: 4},
			overlap: {left: 8, right: 8},
			boxRenderer: SVGShapes.renderBox.bind(null, {
				'fill': '#FFFFFF',
			}),
			labelAttrs: NOTE_ATTRS,
		},
		'note': {
			margin: {top: 0, left: 8, right: 8, bottom: 0},
			padding: {top: 8, left: 8, right: 8, bottom: 8},
			overlap: {left: 8, right: 8},
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
			margin: {top: 0, left: 8, right: 8, bottom: 0},
			padding: {top: 8, left: 8, right: 8, bottom: 8},
			overlap: {left: 8, right: 8},
			boxRenderer: SVGShapes.renderBox.bind(null, {
				'fill': '#FFFFFF',
				'stroke': '#000000',
				'stroke-width': 1,
				'rx': 8,
				'ry': 8,
			}),
			labelAttrs: NOTE_ATTRS,
		},
	};

	const DIVIDER_LABEL_ATTRS = {
		'font-family': FONT,
		'font-size': 8,
		'line-height': LINE_HEIGHT,
		'text-anchor': 'middle',
	};

	const DIVIDERS = {
		'': {
			labelAttrs: DIVIDER_LABEL_ATTRS,
			padding: {top: 2, left: 5, right: 5, bottom: 2},
			extend: 0,
			margin: 0,
			render: () => ({}),
		},
		'line': {
			labelAttrs: DIVIDER_LABEL_ATTRS,
			padding: {top: 2, left: 5, right: 5, bottom: 2},
			extend: 8,
			margin: 0,
			render: BaseTheme.renderLineDivider.bind(null, {
				lineAttrs: {
					'stroke': '#000000',
				},
			}),
		},
		'delay': {
			labelAttrs: DIVIDER_LABEL_ATTRS,
			padding: {top: 2, left: 5, right: 5, bottom: 2},
			extend: 0,
			margin: 0,
			render: BaseTheme.renderDelayDivider.bind(null, {
				dotSize: 2,
				gapSize: 2,
			}),
		},
		'tear': {
			labelAttrs: DIVIDER_LABEL_ATTRS,
			padding: {top: 2, left: 5, right: 5, bottom: 2},
			extend: 8,
			margin: 8,
			render: BaseTheme.renderTearDivider.bind(null, {
				fadeBegin: 4,
				fadeSize: 4,
				zigWidth: 4,
				zigHeight: 1,
				lineAttrs: {
					'stroke': '#000000',
				},
			}),
		},
	};

	return class MonospaceTheme extends BaseTheme {
		constructor() {
			super({
				name: 'monospace',
				settings: SETTINGS,
				blocks: BLOCKS,
				notes: NOTES,
				dividers: DIVIDERS,
			});
		}
	};
});
