/* eslint-disable sort-keys */ // Maybe later

import BaseTheme, {WavePattern} from './BaseTheme.mjs';

const FONT = 'Helvetica,Arial,Liberation Sans,sans-serif';
const LINE_HEIGHT = 1.3;

const WAVE = new WavePattern(10, 1);

const NOTE_ATTRS = {
	'font-family': FONT,
	'font-size': 8,
	'line-height': LINE_HEIGHT,
};

const DIVIDER_LABEL_ATTRS = {
	'font-family': FONT,
	'font-size': 8,
	'line-height': LINE_HEIGHT,
	'text-anchor': 'middle',
};

export default class ChunkyTheme extends BaseTheme {
	constructor(svg) {
		super(svg);

		const sharedBlockSection = {
			padding: {
				top: 3,
				bottom: 4,
			},
			tag: {
				padding: {
					top: 2,
					left: 5,
					right: 5,
					bottom: 1,
				},
				boxRenderer: this.renderTag.bind(this, {
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
				minHeight: 5,
				padding: {
					top: 2,
					left: 5,
					right: 3,
					bottom: 1,
				},
				labelAttrs: {
					'font-family': FONT,
					'font-size': 8,
					'line-height': LINE_HEIGHT,
					'text-anchor': 'left',
				},
			},
		};

		Object.assign(this, {
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
				database: {
					padding: {
						top: 4,
						left: 3,
						right: 3,
						bottom: 0,
					},
					arrowBottom: 2 + 14 * 1.3 / 2,
					boxRenderer: this.renderDB.bind(this, {
						'fill': '#FFFFFF',
						'stroke': '#000000',
						'stroke-width': 3,
						'db-z': 2,
					}),
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
					render: svg.crossFactory({
						'fill': 'none',
						'stroke': '#000000',
						'stroke-width': 3,
						'stroke-linecap': 'round',
					}),
				},
				bar: {
					height: 4,
					render: svg.boxFactory({
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
						renderFlat: this.renderFlatConnect.bind(this, null),
						renderRev: this.renderRevConnect.bind(this, null),
					},
					'dash': {
						attrs: {
							'fill': 'none',
							'stroke': '#000000',
							'stroke-width': 3,
							'stroke-dasharray': '10, 4',
						},
						renderFlat: this.renderFlatConnect.bind(this, null),
						renderRev: this.renderRevConnect.bind(this, null),
					},
					'wave': {
						attrs: {
							'fill': 'none',
							'stroke': '#000000',
							'stroke-width': 3,
							'stroke-linejoin': 'round',
							'stroke-linecap': 'round',
						},
						renderFlat: this.renderFlatConnect.bind(this, WAVE),
						renderRev: this.renderRevConnect.bind(this, WAVE),
					},
				},
				arrow: {
					'single': {
						width: 10,
						height: 12,
						render: this.renderArrowHead.bind(this),
						attrs: {
							'fill': '#000000',
							'stroke': '#000000',
							'stroke-width': 3,
							'stroke-linejoin': 'round',
						},
					},
					'double': {
						width: 10,
						height: 12,
						render: this.renderArrowHead.bind(this),
						attrs: {
							'fill': 'none',
							'stroke': '#000000',
							'stroke-width': 3,
							'stroke-linejoin': 'round',
							'stroke-linecap': 'round',
						},
					},
					'cross': {
						short: 10,
						radius: 5,
						render: svg.crossFactory({
							'fill': 'none',
							'stroke': '#000000',
							'stroke-width': 3,
							'stroke-linejoin': 'round',
							'stroke-linecap': 'round',
						}),
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
				source: {
					radius: 5,
					render: svg.circleFactory({
						'fill': '#000000',
						'stroke': '#000000',
						'stroke-width': 3,
					}),
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
				'': {
					'fill': 'none',
					'stroke': '#000000',
					'stroke-width': 3,
				},
				'red': {
					'stroke': '#DD0000',
				},
			},
			blocks: {
				'ref': {
					margin: {
						top: 0,
						bottom: 0,
					},
					boxRenderer: this.renderRef.bind(this, {
						'fill': '#FFFFFF',
						'stroke': '#000000',
						'stroke-width': 4,
						'rx': 5,
						'ry': 5,
					}),
					section: sharedBlockSection,
				},
				'': {
					margin: {
						top: 0,
						bottom: 0,
					},
					boxRenderer: svg.boxFactory({
						'fill': 'none',
						'stroke': '#000000',
						'stroke-width': 4,
						'rx': 5,
						'ry': 5,
					}),
					collapsedBoxRenderer: this.renderRef.bind(this, {
						'fill': '#FFFFFF',
						'stroke': '#000000',
						'stroke-width': 4,
						'rx': 5,
						'ry': 5,
					}),
					section: sharedBlockSection,
					sepRenderer: svg.lineFactory({
						'stroke': '#000000',
						'stroke-width': 2,
						'stroke-dasharray': '5, 3',
					}),
				},
			},
			notes: {
				'text': {
					margin: {top: 0, left: 2, right: 2, bottom: 0},
					padding: {top: 2, left: 2, right: 2, bottom: 2},
					overlap: {left: 10, right: 10},
					boxRenderer: svg.boxFactory({
						'fill': '#FFFFFF',
					}),
					labelAttrs: NOTE_ATTRS,
				},
				'note': {
					margin: {top: 0, left: 5, right: 5, bottom: 0},
					padding: {top: 3, left: 3, right: 10, bottom: 3},
					overlap: {left: 10, right: 10},
					boxRenderer: svg.noteFactory({
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
					boxRenderer: svg.boxFactory({
						'fill': '#FFFFFF',
						'stroke': '#000000',
						'stroke-width': 3,
						'rx': 10,
						'ry': 10,
					}),
					labelAttrs: NOTE_ATTRS,
				},
			},
			dividers: {
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
					extend: 10,
					margin: 0,
					render: this.renderLineDivider.bind(this, {
						lineAttrs: {
							'stroke': '#000000',
							'stroke-width': 2,
							'stroke-linecap': 'round',
						},
					}),
				},
				'delay': {
					labelAttrs: DIVIDER_LABEL_ATTRS,
					padding: {top: 2, left: 5, right: 5, bottom: 2},
					extend: 0,
					margin: 0,
					render: this.renderDelayDivider.bind(this, {
						dotSize: 3,
						gapSize: 3,
					}),
				},
				'tear': {
					labelAttrs: DIVIDER_LABEL_ATTRS,
					padding: {top: 2, left: 5, right: 5, bottom: 2},
					extend: 10,
					margin: 10,
					render: this.renderTearDivider.bind(this, {
						fadeBegin: 5,
						fadeSize: 10,
						zigWidth: 6,
						zigHeight: 1,
						lineAttrs: {
							'stroke': '#000000',
							'stroke-width': 2,
							'stroke-linejoin': 'round',
						},
					}),
				},
			},
		});
	}
}

export class Factory {
	constructor() {
		this.name = 'chunky';
	}

	build(svg) {
		return new ChunkyTheme(svg);
	}
}
