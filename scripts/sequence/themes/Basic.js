define([
	'core/ArrayUtilities',
	'svg/SVGUtilities',
	'svg/SVGShapes',
], (
	array,
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
				render: ({x, y, radius}) => {
					return svg.make('path', {
						'd': (
							'M' + (x - radius) + ' ' + (y - radius) +
							'l' + (radius * 2) + ' ' + (radius * 2) +
							'm0 ' + (-radius * 2) +
							'l' + (-radius * 2) + ' ' + (radius * 2)
						),
						'fill': 'none',
						'stroke': '#000000',
						'stroke-width': 1,
					});
				},
			},
			bar: {
				height: 4,
				render: ({x, y, width, height}) => {
					return svg.make('rect', {
						'x': x,
						'y': y,
						'width': width,
						'height': height,
						'fill': '#000000',
						'stroke': '#000000',
						'stroke-width': 1,
					});
				},
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
				'wave': {
					'fill': 'none',
					'stroke': '#000000',
					'stroke-width': 1,
					'stroke-linejoin': 'round',
					'stroke-linecap': 'round',
					'wave-width': 6,
					'wave-height': 0.5,
				},
			},
			arrow: {
				single: {
					width: 5,
					height: 10,
					attrs: {
						'fill': '#000000',
						'stroke-width': 0,
						'stroke-linejoin': 'miter',
					},
				},
				double: {
					width: 4,
					height: 6,
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
						'stroke-width': 1.5,
						'rx': 2,
						'ry': 2,
					},
				},
				'': {
					boxAttrs: {
						'fill': 'none',
						'stroke': '#000000',
						'stroke-width': 1.5,
						'rx': 2,
						'ry': 2,
					},
				},
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
			},
			separator: {
				attrs: {
					'stroke': '#000000',
					'stroke-width': 1.5,
					'stroke-dasharray': '4, 2',
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

	const NOTES = {
		'text': {
			margin: {top: 0, left: 2, right: 2, bottom: 0},
			padding: {top: 2, left: 2, right: 2, bottom: 2},
			overlap: {left: 10, right: 10},
			boxRenderer: SVGShapes.renderBox.bind(null, {
				'fill': '#FFFFFF',
			}),
			labelAttrs: {
				'font-family': FONT,
				'font-size': 8,
				'line-height': LINE_HEIGHT,
			},
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
			labelAttrs: {
				'font-family': FONT,
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
				'font-family': FONT,
				'font-size': 8,
				'line-height': LINE_HEIGHT,
			},
		},
	};

	return class BasicTheme {
		constructor() {
			this.name = 'basic';
			Object.assign(this, SETTINGS);
		}

		reset() {
		}

		addDefs() {
		}

		getNote(type) {
			return NOTES[type];
		}

		drawAgentLine(container, {x, y0, y1, width, className}) {
			if(width > 0) {
				container.appendChild(svg.make('rect', Object.assign({
					'x': x - width / 2,
					'y': y0,
					'width': width,
					'height': y1 - y0,
					'class': className,
				}, this.agentLineAttrs)));
			} else {
				container.appendChild(svg.make('line', Object.assign({
					'x1': x,
					'y1': y0,
					'x2': x,
					'y2': y1,
					'class': className,
				}, this.agentLineAttrs)));
			}
		}
	};
});
