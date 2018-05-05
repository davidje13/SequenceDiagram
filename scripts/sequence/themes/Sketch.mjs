/* eslint-disable max-lines */
/* eslint-disable sort-keys */ // Maybe later

import BaseTheme from './BaseTheme.mjs';
import Handlee from '../../fonts/HandleeFontData.mjs';
import Random from '../../core/Random.mjs';

const FONT = Handlee.name;
const FONT_FAMILY = FONT + ',cursive';
const LINE_HEIGHT = 1.5;
const MAX_CHAOS = 5;

const PENCIL = {
	normal: {
		'stroke': 'rgba(0,0,0,0.7)',
		'stroke-width': 0.8,
		'stroke-linejoin': 'round',
		'stroke-linecap': 'round',
	},
	thick: {
		'stroke': 'rgba(0,0,0,0.8)',
		'stroke-width': 1.2,
		'stroke-linejoin': 'round',
		'stroke-linecap': 'round',
	},
};

const NOTE_ATTRS = {
	'font-family': FONT_FAMILY,
	'font-size': 8,
	'line-height': LINE_HEIGHT,
};

const DIVIDER_LABEL_ATTRS = {
	'font-family': FONT_FAMILY,
	'font-size': 8,
	'line-height': LINE_HEIGHT,
	'text-anchor': 'middle',
};

export const RIGHT = {};
export const LEFT = {};

class SketchWavePattern {
	constructor(width, handedness) {
		this.deltas = [
			+0.0,
			-0.3,
			-0.6,
			-0.75,
			-0.45,
			+0.0,
			+0.45,
			+0.75,
			+0.6,
			+0.3,
		];
		if(handedness !== RIGHT) {
			this.deltas.reverse();
		}
		this.partWidth = 6 / this.deltas.length;
	}

	getDelta(p) {
		return this.deltas[p % this.deltas.length] + Math.sin(p * 0.03) * 0.5;
	}
}

function clamp(v, low, high) {
	return Math.max(low, Math.min(high, v));
}

export default class SketchTheme extends BaseTheme {
	constructor(svg, handedness = RIGHT) {
		super(svg, {
			'font-family': FONT,
			'font-size': 8,
			'line-height': LINE_HEIGHT,
		});

		this.handedness = (handedness === RIGHT) ? 1 : -1;
		this.random = new Random();
		const wave = new SketchWavePattern(4, handedness);

		const sharedBlockSection = {
			padding: {
				top: 3,
				bottom: 2,
			},
			tag: {
				padding: {
					top: 2,
					left: 3,
					right: 5,
					bottom: 0,
				},
				boxRenderer: this.renderTag.bind(this),
				labelAttrs: {
					'font-family': FONT_FAMILY,
					'font-weight': 'bold',
					'font-size': 9,
					'line-height': LINE_HEIGHT,
					'text-anchor': 'left',
				},
			},
			label: {
				minHeight: 6,
				padding: {
					top: 2,
					left: 5,
					right: 3,
					bottom: 1,
				},
				labelAttrs: {
					'font-family': FONT_FAMILY,
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
					labelAttrs: {
						'font-family': FONT_FAMILY,
						'font-size': 12,
						'line-height': LINE_HEIGHT,
						'text-anchor': 'middle',
					},
					boxRenderer: this.renderBox.bind(this),
				},
				database: {
					padding: {
						top: 12,
						left: 10,
						right: 10,
						bottom: 2,
					},
					arrowBottom: 5 + 12 * 1.3 / 2,
					boxRenderer: this.renderDB.bind(this, Object.assign({
						'fill': '#FFFFFF',
						'db-z': 5,
					}, PENCIL.normal)),
					labelAttrs: {
						'font-family': FONT,
						'font-size': 12,
						'line-height': LINE_HEIGHT,
						'text-anchor': 'middle',
					},
				},
				cross: {
					size: 15,
					render: this.renderCross.bind(this),
				},
				bar: {
					height: 6,
					render: this.renderBar.bind(this),
				},
				fade: {
					width: Math.ceil(MAX_CHAOS * 2 + 2),
					height: 6,
					extend: Math.ceil(MAX_CHAOS * 0.3 + 1),
				},
				none: {
					height: 10,
				},
			},

			connect: {
				loopbackRadius: 6,
				arrow: {
					'single': {
						width: 5,
						height: 6,
						attrs: Object.assign({
							'fill': 'rgba(0,0,0,0.9)',
						}, PENCIL.normal),
						render: this.renderArrowHead.bind(this),
					},
					'double': {
						width: 4,
						height: 8,
						attrs: Object.assign({
							'fill': 'none',
						}, PENCIL.normal),
						render: this.renderArrowHead.bind(this),
					},
					'cross': {
						short: 5,
						radius: 3,
						render: this.renderCross.bind(this),
					},
				},
				label: {
					padding: 6,
					margin: {top: 2, bottom: 1},
					attrs: {
						'font-family': FONT_FAMILY,
						'font-size': 8,
						'line-height': LINE_HEIGHT,
						'text-anchor': 'middle',
					},
					loopbackAttrs: {
						'font-family': FONT_FAMILY,
						'font-size': 8,
						'line-height': LINE_HEIGHT,
					},
				},
				source: {
					radius: 1,
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
				'': Object.assign({
					'fill': 'none',
				}, PENCIL.normal),
				'red': {
					'stroke': 'rgba(200,40,0,0.8)',
				},
			},
			blocks: {
				'ref': {
					margin: {
						top: 0,
						bottom: 0,
					},
					boxRenderer: this.renderRefBlock.bind(this),
					section: sharedBlockSection,
				},
				'': {
					margin: {
						top: 0,
						bottom: 0,
					},
					boxRenderer: this.renderBlock.bind(this),
					collapsedBoxRenderer: this.renderMinBlock.bind(this),
					section: sharedBlockSection,
					sepRenderer: this.renderSeparator.bind(this),
				},
			},
			notes: {
				'text': {
					margin: {top: 0, left: 6, right: 6, bottom: 0},
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
					boxRenderer: this.renderNote.bind(this),
					labelAttrs: NOTE_ATTRS,
				},
				'state': {
					margin: {top: 0, left: 5, right: 5, bottom: 0},
					padding: {top: 7, left: 7, right: 7, bottom: 7},
					overlap: {left: 10, right: 10},
					boxRenderer: this.renderState.bind(this),
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
					render: this.renderLineDivider.bind(this),
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
						pattern: wave,
						lineAttrs: PENCIL.normal,
					}),
				},
			},
		});

		this.addConnectLine('solid', {attrs: PENCIL.normal});
		this.addConnectLine('dash', {attrs: {
			'stroke-dasharray': '4, 2',
		}});
		this.addConnectLine('wave', {
			attrs: {
				'stroke-linejoin': 'round',
				'stroke-linecap': 'round',
			},
			pattern: wave,
		});
	}

	reset() {
		this.random.reset();
	}

	addDefs(builder) {
		builder('sketch_font', () => {
			const style = this.svg.el('style', null);
			// Font must be embedded for exporting as SVG / PNG
			style.text(
				'@font-face{' +
				'font-family:' + Handlee.name + ';' +
				'src:url("data:font/woff2;base64,' + Handlee.woff2 + '");' +
				'}'
			);
			return style;
		});
	}

	vary(range, centre = 0) {
		if(!range) {
			return centre;
		}
		// Cosine distribution [-pi/2 pi/2] scaled to [-range range]
		const rand = this.random.nextFloat(); // [0 1)
		return centre + Math.asin(rand * 2 - 1) * 2 * range / Math.PI;
	}

	lineNodes(p1, p2, {
		var1 = 1,
		var2 = 1,
		varX = 1,
		varY = 1,
		move = true,
	}) {
		const length = Math.sqrt(
			(p2.x - p1.x) * (p2.x - p1.x) +
			(p2.y - p1.y) * (p2.y - p1.y)
		);
		const rough = Math.min(Math.sqrt(length) * 0.2, MAX_CHAOS);
		const x1 = this.vary(var1 * varX * rough, p1.x);
		const y1 = this.vary(var1 * varY * rough, p1.y);
		const x2 = this.vary(var2 * varX * rough, p2.x);
		const y2 = this.vary(var2 * varY * rough, p2.y);

		// -1 = p1 higher, 1 = p2 higher
		const upper = clamp((y1 - y2) / (Math.abs(x1 - x2) + 0.001), -1, 1);
		const frac = upper / 6 + 0.5;

		/*
		 * Line curve is to top / left (simulates right-handed drawing)
		 * or top / right (left-handed)
		 */
		const curveX = this.vary(0.5, 0.5) * rough;
		const curveY = this.vary(0.5, 0.5) * rough;
		const xc = x1 * (1 - frac) + x2 * frac - curveX * this.handedness;
		const yc = y1 * (1 - frac) + y2 * frac - curveY;
		const nodes = (
			(move ? ('M' + x1 + ' ' + y1) : '') +
			'C' + xc + ' ' + yc +
			',' + x2 + ' ' + y2 +
			',' + x2 + ' ' + y2
		);
		return {
			nodes,
			p1: {x: x1, y: y1},
			p2: {x: x2, y: y2},
		};
	}

	renderLine(p1, p2, lineOptions) {
		const line = this.lineNodes(p1, p2, lineOptions);
		return this.svg.el('path')
			.attrs({
				'd': line.nodes,
				'fill': 'none',
				'stroke-dasharray': lineOptions.dash ? '6, 5' : 'none',
			})
			.attrs(lineOptions.attrs || (
				lineOptions.thick ? PENCIL.thick : PENCIL.normal
			));
	}

	boxNodes({x, y, width, height}) {
		const lT = this.lineNodes(
			{x, y},
			{x: x + width, y},
			{}
		);
		const lB = this.lineNodes(
			{x: x + width, y: y + height},
			{x, y: y + height},
			{move: false}
		);
		const lR = this.lineNodes(
			lT.p2,
			lB.p1,
			{var1: 0, var2: 0, move: false}
		);
		const lL = this.lineNodes(
			lB.p2,
			lT.p1,
			{var1: 0, var2: 0.3, move: false}
		);

		return lT.nodes + lR.nodes + lB.nodes + lL.nodes;
	}

	renderBox(position, {fill = null, thick = false, attrs = null} = {}) {
		return this.svg.el('path')
			.attrs({
				'd': this.boxNodes(position),
				'fill': fill || '#FFFFFF',
			})
			.attrs(attrs || (thick ? PENCIL.thick : PENCIL.normal));
	}

	renderNote({x, y, width, height}) {
		const flickSize = 5;
		const lT = this.lineNodes(
			{x, y},
			{x: x + width - flickSize, y},
			{}
		);
		const lF = this.lineNodes(
			lT.p2,
			{x: x + width, y: y + flickSize},
			{move: false, var1: 0}
		);
		const lB = this.lineNodes(
			{x: x + width, y: y + height},
			{x, y: y + height},
			{move: false}
		);
		const lR = this.lineNodes(
			lF.p2,
			lB.p1,
			{var1: 0, var2: 0, move: false}
		);
		const lL = this.lineNodes(
			lB.p2,
			lT.p1,
			{var1: 0, var2: 0.3, move: false}
		);
		const lF1 = this.lineNodes(
			lF.p1,
			{x: x + width - flickSize, y: y + flickSize},
			{var1: 0.3}
		);
		const lF2 = this.lineNodes(
			lF1.p2,
			lF.p2,
			{var1: 0, move: false}
		);

		return this.svg.el('g').add(
			this.svg.el('path')
				.attrs({
					'd': (
						lT.nodes +
						lF.nodes +
						lR.nodes +
						lB.nodes +
						lL.nodes
					),
					'fill': '#FFFFFF',
				})
				.attrs(PENCIL.normal),
			this.svg.el('path')
				.attrs({
					'd': lF1.nodes + lF2.nodes,
					'fill': 'none',
				})
				.attrs(PENCIL.normal)
		);
	}

	renderLineDivider({x, y, labelWidth, width, height}) {
		let shape = null;
		const yPos = y + height / 2;
		if(labelWidth > 0) {
			shape = this.svg.el('g').add(
				this.renderLine(
					{x, y: yPos},
					{x: x + (width - labelWidth) / 2, y: yPos},
					{}
				),
				this.renderLine(
					{x: x + (width + labelWidth) / 2, y: yPos},
					{x: x + width, y: yPos},
					{}
				)
			);
		} else {
			shape = this.renderLine(
				{x, y: yPos},
				{x: x + width, y: yPos},
				{}
			);
		}
		return {shape};
	}

	renderFlatConnect(pattern, attrs, {x1, y1, x2, y2}) {
		if(pattern) {
			const x1v = x1 + this.vary(0.3);
			const x2v = x2 + this.vary(0.3);
			const y1v = y1 + this.vary(1);
			const y2v = y2 + this.vary(1);
			return {
				shape: this.svg.el('path')
					.attr('d', this.svg.patternedLine(pattern)
						.move(x1v, y1v)
						.line(x2v, y2v)
						.cap()
						.asPath())
					.attrs(attrs),
				p1: {x: x1v, y: y1v},
				p2: {x: x2v, y: y2v},
			};
		} else {
			const ln = this.lineNodes(
				{x: x1, y: y1},
				{x: x2, y: y2},
				{varX: 0.3}
			);
			return {
				shape: this.svg.el('path').attr('d', ln.nodes).attrs(attrs),
				p1: ln.p1,
				p2: ln.p2,
			};
		}
	}

	renderRevConnect(pattern, attrs, {x1, y1, x2, y2, xR}) {
		if(pattern) {
			const x1v = x1 + this.vary(0.3);
			const x2v = x2 + this.vary(0.3);
			const y1v = y1 + this.vary(1);
			const y2v = y2 + this.vary(1);
			return {
				shape: this.svg.el('path')
					.attr('d', this.svg.patternedLine(pattern)
						.move(x1v, y1v)
						.line(xR, y1)
						.arc(xR, (y1 + y2) / 2, Math.PI)
						.line(x2v, y2v)
						.cap()
						.asPath())
					.attrs(attrs),
				p1: {x: x1v, y: y1v},
				p2: {x: x2v, y: y2v},
			};
		} else {
			const variance = Math.min((xR - x1) * 0.06, 3);
			const overshoot = Math.min((xR - x1) * 0.5, 6);
			const p1x = x1 + this.vary(variance, -1);
			const p1y = y1 + this.vary(variance, -1);
			const b1x = xR - overshoot * this.vary(0.2, 1);
			const b1y = y1 - this.vary(1, 2);
			const p2x = xR;
			const p2y = y1 + this.vary(1, 1);
			const b2x = xR;
			const b2y = y2 + this.vary(2);
			const p3x = x2 + this.vary(variance, -1);
			const p3y = y2 + this.vary(variance, -1);

			return {
				shape: this.svg.el('path')
					.attr('d', (
						'M' + p1x + ' ' + p1y +
						'C' + p1x + ' ' + p1y +
						',' + b1x + ' ' + b1y +
						',' + p2x + ' ' + p2y +
						'S' + b2x + ' ' + b2y +
						',' + p3x + ' ' + p3y
					))
					.attrs(attrs),
				p1: {x: p1x, y: p1y},
				p2: {x: p3x, y: p3y},
			};
		}
	}

	renderArrowHead(attrs, {x, y, width, height, dir}) {
		const w = width * this.vary(0.2, 1);
		const h = height * this.vary(0.3, 1);
		const wx = w * dir.dx;
		const wy = w * dir.dy;
		const hy = h * 0.5 * dir.dx;
		const hx = -h * 0.5 * dir.dy;
		const l1 = this.lineNodes(
			{x: x + wx - hx, y: y + wy - hy},
			{x, y},
			{var1: 2.0, var2: 0.2}
		);
		const l2 = this.lineNodes(
			l1.p2,
			{x: x + wx + hx, y: y + wy + hy},
			{var1: 0, var2: 2.0, move: false}
		);
		const l3 = (attrs.fill === 'none') ? {nodes: ''} : this.lineNodes(
			l2.p2,
			l1.p1,
			{var1: 0, var2: 0, move: false}
		);
		return this.svg.el('path')
			.attr('d', l1.nodes + l2.nodes + l3.nodes)
			.attrs(attrs);
	}

	renderState({x, y, width, height}) {
		const dx = Math.min(width * 0.06, 3);
		const dy = Math.min(height * 0.06, 3);
		const tlX = x + dx * this.vary(0.6, 1);
		const tlY = y + dy * this.vary(0.6, 1);
		const trX = x + width - dx * this.vary(0.6, 1);
		const trY = y + dy * this.vary(0.6, 1);
		const blX = x + dx * this.vary(0.6, 1);
		const blY = y + height - dy * this.vary(0.6, 1);
		const brX = x + width - dx * this.vary(0.6, 1);
		const brY = y + height - dy * this.vary(0.6, 1);
		const mX = x + width / 2;
		const mY = y + height / 2;
		const cx = dx * this.vary(0.2, 1.2);
		const cy = dy * this.vary(0.2, 1.2);
		const bentT = y - Math.min(width * 0.005, 1);
		const bentB = y + height - Math.min(width * 0.01, 2);
		const bentL = x - Math.min(height * 0.01, 2) * this.handedness;
		const bentR = bentL + width;

		return this.svg.el('path')
			.attr('d', (
				'M' + tlX + ' ' + tlY +
				'C' + (tlX + cx) + ' ' + (tlY - cy) +
				',' + (mX - width * this.vary(0.03, 0.3)) + ' ' + bentT +
				',' + mX + ' ' + bentT +
				'S' + (trX - cx) + ' ' + (trY - cy) +
				',' + trX + ' ' + trY +
				'S' + bentR + ' ' + (mY - height * this.vary(0.03, 0.3)) +
				',' + bentR + ' ' + mY +
				'S' + (brX + cx) + ' ' + (brY - cy) +
				',' + brX + ' ' + brY +
				'S' + (mX + width * this.vary(0.03, 0.3)) + ' ' + bentB +
				',' + mX + ' ' + bentB +
				'S' + (blX + cx) + ' ' + (blY + cy) +
				',' + blX + ' ' + blY +
				'S' + bentL + ' ' + (mY + height * this.vary(0.03, 0.3)) +
				',' + bentL + ' ' + mY +
				'S' + (tlX - cx) + ' ' + (tlY + cy) +
				',' + tlX + ' ' + tlY +
				'Z'
			))
			.attr('fill', '#FFFFFF')
			.attrs(PENCIL.normal);
	}

	renderRefBlock(position) {
		const nodes = this.boxNodes(position);
		return {
			shape: this.svg.el('path')
				.attrs({'d': nodes, 'fill': 'none'})
				.attrs(PENCIL.thick),
			mask: this.svg.el('path')
				.attrs({'d': nodes, 'fill': '#000000'}),
			fill: this.svg.el('path')
				.attrs({'d': nodes, 'fill': '#FFFFFF'}),
		};
	}

	renderBlock(position) {
		return this.renderBox(position, {fill: 'none', thick: true});
	}

	renderMinBlock(position) {
		return this.renderRefBlock(position);
	}

	renderTag({x, y, width, height}) {
		const x2 = x + width;
		const y2 = y + height;

		const l1 = this.lineNodes(
			{x: x2 + 3, y},
			{x: x2 - 2, y: y2},
			{}
		);
		const l2 = this.lineNodes(
			l1.p2,
			{x, y: y2 + 1},
			{var1: 0, move: false}
		);

		const line = l1.nodes + l2.nodes;

		return this.svg.el('g').add(
			this.svg.el('path')
				.attrs({
					'd': line + 'L' + x + ' ' + y,
					'fill': '#FFFFFF',
				}),
			this.svg.el('path')
				.attrs({
					'd': line,
					'fill': '#FFFFFF',
				})
				.attrs(PENCIL.normal)
		);
	}

	renderSeparator({x1, y1, x2, y2}) {
		return this.renderLine(
			{x: x1, y: y1},
			{x: x2, y: y2},
			{thick: true, dash: true}
		);
	}

	renderBar({x, y, width, height}) {
		return this.renderBox({x, y, width, height}, {fill: '#000000'});
	}

	renderCross({x, y, radius}) {
		const r1 = this.vary(0.2, 1) * radius;
		const l1 = this.lineNodes(
			{x: x - r1, y: y - r1},
			{x: x + r1, y: y + r1},
			{}
		);
		const r2 = this.vary(0.2, 1) * radius;
		const l2 = this.lineNodes(
			{x: x + r2, y: y - r2},
			{x: x - r2, y: y + r2},
			{}
		);

		return this.svg.el('path')
			.attrs({
				'd': l1.nodes + l2.nodes,
				'fill': 'none',
			})
			.attrs(PENCIL.normal);
	}

	renderAgentLine({x, y0, y1, width, className, options}) {
		const attrs = this.optionsAttributes(this.agentLineAttrs, options);
		if(width > 0) {
			return this.renderBox({
				x: x - width / 2,
				y: y0,
				width,
				height: y1 - y0,
			}, {fill: 'none', attrs}).setClass(className);
		} else {
			return this.renderLine(
				{x, y: y0},
				{x, y: y1},
				{varY: 0.3, attrs}
			).setClass(className);
		}
	}
}

export class Factory {
	constructor(handedness = RIGHT) {
		const right = (handedness === RIGHT);
		this.name = right ? 'sketch' : 'sketch left handed';
		this.handedness = handedness;
	}

	build(svg) {
		return new SketchTheme(svg, this.handedness);
	}
}

Object.assign(Factory, {RIGHT, LEFT});
