/* eslint-disable sort-keys */ // Maybe later

import BaseTheme, {WavePattern} from './BaseTheme.mjs';

const FONT = 'Helvetica,Arial,Liberation Sans,sans-serif';
const LINE_HEIGHT = 1.3;

const WAVE = new WavePattern(6, 0.5);

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

export default class BasicTheme extends BaseTheme {
	constructor(svg) {
		super(svg);

		const sharedBlockSection = {
			padding: {
				top: 3,
				bottom: 2,
			},
			tag: {
				padding: {
					top: 1,
					left: 3,
					right: 3,
					bottom: 0,
				},
				boxRenderer: this.renderTag.bind(this, {
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
				minHeight: 4,
				padding: {
					top: 1,
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
				database: {
					padding: {
						top: 12,
						left: 10,
						right: 10,
						bottom: 3,
					},
					arrowBottom: 5 + 12 * 1.3 / 2,
					boxRenderer: this.renderDB.bind(this, {
						'fill': '#FFFFFF',
						'stroke': '#000000',
						'stroke-width': 1,
						'db-z': 5,
					}),
					labelAttrs: {
						'font-family': FONT,
						'font-size': 12,
						'line-height': LINE_HEIGHT,
						'text-anchor': 'middle',
					},
				},
				cross: {
					size: 20,
					render: svg.crossFactory({
						'fill': 'none',
						'stroke': '#000000',
						'stroke-width': 1,
					}),
				},
				bar: {
					height: 4,
					render: svg.boxFactory({
						'fill': '#000000',
						'stroke': '#000000',
						'stroke-width': 1,
					}),
				},
				fade: {
					width: 5,
					height: 6,
					extend: 1,
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
						renderFlat: this.renderFlatConnect.bind(this, null),
						renderRev: this.renderRevConnect.bind(this, null),
					},
					'dash': {
						attrs: {
							'fill': 'none',
							'stroke': '#000000',
							'stroke-width': 1,
							'stroke-dasharray': '4, 2',
						},
						renderFlat: this.renderFlatConnect.bind(this, null),
						renderRev: this.renderRevConnect.bind(this, null),
					},
					'wave': {
						attrs: {
							'fill': 'none',
							'stroke': '#000000',
							'stroke-width': 1,
							'stroke-linejoin': 'round',
							'stroke-linecap': 'round',
						},
						renderFlat: this.renderFlatConnect.bind(this, WAVE),
						renderRev: this.renderRevConnect.bind(this, WAVE),
					},
				},
				arrow: {
					'single': {
						width: 5,
						height: 10,
						render: this.renderArrowHead.bind(this),
						attrs: {
							'fill': '#000000',
							'stroke-width': 0,
							'stroke-linejoin': 'miter',
						},
					},
					'double': {
						width: 4,
						height: 6,
						render: this.renderArrowHead.bind(this),
						attrs: {
							'fill': 'none',
							'stroke': '#000000',
							'stroke-width': 1,
							'stroke-linejoin': 'miter',
						},
					},
					'cross': {
						short: 7,
						radius: 3,
						render: svg.crossFactory({
							'fill': 'none',
							'stroke': '#000000',
							'stroke-width': 1,
						}),
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
				source: {
					radius: 2,
					render: svg.circleFactory({
						'fill': '#000000',
						'stroke': '#000000',
						'stroke-width': 1,
					}),
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
				'': {
					'fill': 'none',
					'stroke': '#000000',
					'stroke-width': 1,
				},
				'red': {
					'stroke': '#CC0000',
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
						'stroke-width': 1.5,
						'rx': 2,
						'ry': 2,
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
						'stroke-width': 1.5,
						'rx': 2,
						'ry': 2,
					}),
					collapsedBoxRenderer: this.renderRef.bind(this, {
						'fill': '#FFFFFF',
						'stroke': '#000000',
						'stroke-width': 1.5,
						'rx': 2,
						'ry': 2,
					}),
					section: sharedBlockSection,
					sepRenderer: svg.lineFactory({
						'stroke': '#000000',
						'stroke-width': 1.5,
						'stroke-dasharray': '4, 2',
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
					padding: {top: 5, left: 5, right: 10, bottom: 5},
					overlap: {left: 10, right: 10},
					boxRenderer: svg.noteFactory({
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
					boxRenderer: svg.boxFactory({
						'fill': '#FFFFFF',
						'stroke': '#000000',
						'stroke-width': 1,
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
						},
					}),
				},
				'delay': {
					labelAttrs: DIVIDER_LABEL_ATTRS,
					padding: {top: 2, left: 5, right: 5, bottom: 2},
					extend: 0,
					margin: 0,
					render: this.renderDelayDivider.bind(this, {
						dotSize: 1,
						gapSize: 2,
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
						},
					}),
				},
			},
		});
	}
}

export class Factory {
	constructor() {
		this.name = 'basic';
	}

	build(svg) {
		return new BasicTheme(svg);
	}
}
