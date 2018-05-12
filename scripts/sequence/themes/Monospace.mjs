/* eslint-disable sort-keys */ // Maybe later

import BaseTheme, {WavePattern} from './BaseTheme.mjs';

const FONT = 'Courier New,Liberation Mono,monospace';
const LINE_HEIGHT = 1.3;

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

export default class MonospaceTheme extends BaseTheme {
	constructor(svg) {
		super(svg, {
			'font-family': FONT,
			'font-size': 8,
			'line-height': LINE_HEIGHT,
		});

		const sharedBlockSection = {
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
				boxRenderer: this.renderTag.bind(this, {
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
				minHeight: 8,
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

		Object.assign(this, {
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
				person: {
					padding: {
						top: 16,
						left: 8,
						right: 8,
						bottom: 4,
					},
					arrowBottom: 12,
					boxRenderer: this.renderPerson.bind(this, {
						iconHeight: 12,
						iconWidth: 14,
					}, {
						'fill': '#000000',
					}, {
						'fill': '#FFFFFF',
						'stroke': '#000000',
						'stroke-width': 1,
					}),
					labelAttrs: {
						'font-family': FONT,
						'font-size': 12,
						'line-height': LINE_HEIGHT,
						'text-anchor': 'middle',
					},
				},
				database: {
					padding: {
						top: 9,
						left: 8,
						right: 8,
						bottom: 3,
					},
					arrowBottom: 12,
					boxRenderer: this.renderDB.bind(this, {tilt: 4}, {
						'fill': '#FFFFFF',
						'stroke': '#000000',
						'stroke-width': 1,
					}),
					labelAttrs: {
						'font-family': FONT,
						'font-size': 12,
						'line-height': LINE_HEIGHT,
						'text-anchor': 'middle',
					},
				},
				cross: {
					size: 16,
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
					height: 8,
					extend: 1,
				},
				none: {
					height: 8,
				},
			},

			connect: {
				loopbackRadius: 4,
				arrow: {
					'single': {
						width: 4,
						height: 8,
						render: this.renderArrowHead.bind(this),
						attrs: {
							'fill': '#000000',
							'stroke-width': 0,
							'stroke-linejoin': 'miter',
						},
					},
					'double': {
						width: 3,
						height: 6,
						render: this.renderArrowHead.bind(this),
						attrs: {
							'fill': 'none',
							'stroke': '#000000',
							'stroke-width': 1,
							'stroke-linejoin': 'miter',
						},
					},
					'fade': {
						short: 2,
						size: 10,
					},
					'cross': {
						short: 8,
						radius: 4,
						render: svg.crossFactory({
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

			agentLineAttrs: {
				'': {
					'fill': 'none',
					'stroke': '#000000',
					'stroke-width': 1,
				},
				'red': {
					'stroke': '#AA0000',
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
						'stroke-width': 2,
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
						'stroke-width': 2,
					}),
					collapsedBoxRenderer: this.renderRef.bind(this, {
						'fill': '#FFFFFF',
						'stroke': '#000000',
						'stroke-width': 2,
					}),
					section: sharedBlockSection,
					sepRenderer: svg.lineFactory({
						'stroke': '#000000',
						'stroke-width': 2,
						'stroke-dasharray': '8, 4',
					}),
				},
			},
			notes: {
				'text': {
					margin: {top: 0, left: 8, right: 8, bottom: 0},
					padding: {top: 4, left: 4, right: 4, bottom: 4},
					overlap: {left: 8, right: 8},
					boxRenderer: svg.boxFactory({
						'fill': '#FFFFFF',
					}),
					labelAttrs: NOTE_ATTRS,
				},
				'note': {
					margin: {top: 0, left: 8, right: 8, bottom: 0},
					padding: {top: 8, left: 8, right: 8, bottom: 8},
					overlap: {left: 8, right: 8},
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
					margin: {top: 0, left: 8, right: 8, bottom: 0},
					padding: {top: 8, left: 8, right: 8, bottom: 8},
					overlap: {left: 8, right: 8},
					boxRenderer: svg.boxFactory({
						'fill': '#FFFFFF',
						'stroke': '#000000',
						'stroke-width': 1,
						'rx': 8,
						'ry': 8,
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
					extend: 8,
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
						dotSize: 2,
						gapSize: 2,
					}),
				},
				'tear': {
					labelAttrs: DIVIDER_LABEL_ATTRS,
					padding: {top: 2, left: 5, right: 5, bottom: 2},
					extend: 8,
					margin: 8,
					render: this.renderTearDivider.bind(this, {
						fadeBegin: 4,
						fadeSize: 4,
						zigWidth: 4,
						zigHeight: 1,
						lineAttrs: {
							'stroke': '#000000',
						},
					}),
				},
			},
		});

		this.addConnectLine('solid', {attrs: {
			'stroke': '#000000',
			'stroke-width': 1,
		}});
		this.addConnectLine('dash', {attrs: {
			'stroke-dasharray': '4, 4',
		}});
		this.addConnectLine('wave', {
			pattern: new WavePattern(6, [
				+0,
				-0.25,
				-0.5,
				-0.25,
				+0,
				+0.25,
				+0.5,
				+0.25,
			]),
		});
	}
}

export class Factory {
	constructor() {
		this.name = 'monospace';
	}

	build(svg) {
		return new MonospaceTheme(svg);
	}
}
