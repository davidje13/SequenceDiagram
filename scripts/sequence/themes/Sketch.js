define([
	'./BaseTheme',
	'svg/SVGUtilities',
	'svg/SVGShapes',
	'./HandleeFontData',
], (
	BaseTheme,
	svg,
	SVGShapes,
	Handlee
) => {
	'use strict';

	const FONT = Handlee.name;
	const FONT_FAMILY = '\'' + FONT + '\',cursive';
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
				labelAttrs: {
					'font-family': FONT_FAMILY,
					'font-size': 12,
					'line-height': LINE_HEIGHT,
					'text-anchor': 'middle',
				},
				boxRenderer: null,
			},
			cross: {
				size: 15,
				render: null,
			},
			bar: {
				height: 6,
				render: null,
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
			line: {
				'solid': {
					attrs: Object.assign({
						'fill': 'none',
					}, PENCIL.normal),
					renderFlat: null,
					renderRev: null,
				},
				'dash': {
					attrs: Object.assign({
						'fill': 'none',
						'stroke-dasharray': '4, 2',
					}, PENCIL.normal),
					renderFlat: null,
					renderRev: null,
				},
				'wave': {
					attrs: Object.assign({
						'fill': 'none',
						'stroke-linejoin': 'round',
						'stroke-linecap': 'round',
					}, PENCIL.normal),
					renderFlat: null,
					renderRev: null,
				},
			},
			arrow: {
				'single': {
					width: 5,
					height: 6,
					attrs: Object.assign({
						'fill': 'rgba(0,0,0,0.9)',
					}, PENCIL.normal),
					render: null,
				},
				'double': {
					width: 4,
					height: 8,
					attrs: Object.assign({
						'fill': 'none',
					}, PENCIL.normal),
					render: null,
				},
				'cross': {
					short: 5,
					radius: 3,
					render: null,
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
			'font-family': FONT_FAMILY,
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
				left: 3,
				right: 5,
				bottom: 0,
			},
			boxRenderer: null,
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

	const BLOCKS = {
		'ref': {
			margin: {
				top: 0,
				bottom: 0,
			},
			boxRenderer: null,
			section: SHARED_BLOCK_SECTION,
		},
		'': {
			margin: {
				top: 0,
				bottom: 0,
			},
			boxRenderer: null,
			collapsedBoxRenderer: null,
			section: SHARED_BLOCK_SECTION,
			sepRenderer: null,
		},
	};

	const NOTE_ATTRS = {
		'font-family': FONT_FAMILY,
		'font-size': 8,
		'line-height': LINE_HEIGHT,
	};

	const NOTES = {
		'text': {
			margin: {top: 0, left: 6, right: 6, bottom: 0},
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
			boxRenderer: null,
			labelAttrs: NOTE_ATTRS,
		},
		'state': {
			margin: {top: 0, left: 5, right: 5, bottom: 0},
			padding: {top: 7, left: 7, right: 7, bottom: 7},
			overlap: {left: 10, right: 10},
			boxRenderer: null,
			labelAttrs: NOTE_ATTRS,
		},
	};

	const DIVIDER_LABEL_ATTRS = {
		'font-family': FONT_FAMILY,
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
			extend: 10,
			margin: 0,
			render: null,
		},
		'delay': {
			labelAttrs: DIVIDER_LABEL_ATTRS,
			padding: {top: 2, left: 5, right: 5, bottom: 2},
			extend: 0,
			margin: 0,
			render: BaseTheme.renderDelayDivider.bind(null, {
				dotSize: 1,
				gapSize: 2,
			}),
		},
		'tear': {
			labelAttrs: DIVIDER_LABEL_ATTRS,
			padding: {top: 2, left: 5, right: 5, bottom: 2},
			extend: 10,
			margin: 10,
			render: null,
		},
	};

	class Random {
		// xorshift+ 64-bit random generator
		// https://en.wikipedia.org/wiki/Xorshift

		constructor() {
			this.s = new Uint32Array(4);
		}

		reset() {
			// Arbitrary random seed with roughly balanced 1s / 0s
			// (taken from running Math.random a few times)
			this.s[0] = 0x177E9C74;
			this.s[1] = 0xAE6FFDCE;
			this.s[2] = 0x3CF4F32B;
			this.s[3] = 0x46449F88;
		}

		nextFloat() {
			/* jshint -W016 */ // bit-operations are part of the algorithm
			const range = 0x100000000;
			let x0 = this.s[0];
			let x1 = this.s[1];
			const y0 = this.s[2];
			const y1 = this.s[3];
			this.s[0] = y0;
			this.s[1] = y1;
			x0 ^= (x0 << 23) | (x1 >>> 9);
			x1 ^= (x1 << 23);
			this.s[2] = x0 ^ y0 ^ (x0 >>> 17) ^ (y0 >>> 26);
			this.s[3] = (
				x1 ^ y1 ^
				(x0 << 15 | x1 >>> 17) ^
				(y0 << 6 | y1 >>> 26)
			);
			return (((this.s[3] + y1) >>> 0) % range) / range;
		}
	}

	const RIGHT = {};
	const LEFT = {};

	class SketchWavePattern extends BaseTheme.WavePattern {
		constructor(width, handedness) {
			const heights = [
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
				heights.reverse();
			}
			super(6, heights);
		}

		getDelta(p) {
			return super.getDelta(p) + Math.sin(p * 0.03) * 0.5;
		}
	}

	class SketchTheme extends BaseTheme {
		constructor(handedness = RIGHT) {
			super({
				name: '',
				settings: SETTINGS,
				blocks: BLOCKS,
				notes: NOTES,
				dividers: DIVIDERS,
			});

			if(handedness === RIGHT) {
				this.name = 'sketch';
				this.handedness = 1;
			} else {
				this.name = 'sketch left handed';
				this.handedness = -1;
			}
			this.random = new Random();
			this.wave = new SketchWavePattern(4, handedness);

			this._assignCapFunctions();
			this._assignConnectFunctions();
			this._assignNoteFunctions();
			this._assignBlockFunctions();
			this._assignDividerFunctions();
		}

		_assignCapFunctions() {
			this.renderBar = this.renderBar.bind(this);
			this.renderBox = this.renderBox.bind(this);

			this.agentCap.cross.render = this.renderCross.bind(this);
			this.agentCap.bar.render = this.renderBar;
			this.agentCap.box.boxRenderer = this.renderBox;
		}

		_assignConnectFunctions() {
			this.renderArrowHead = this.renderArrowHead.bind(this);
			this.renderFlatConnector = this.renderFlatConnector.bind(this);
			this.renderRevConnector = this.renderRevConnector.bind(this);

			this.connect.arrow.single.render = this.renderArrowHead;
			this.connect.arrow.double.render = this.renderArrowHead;
			this.connect.arrow.cross.render = this.renderCross.bind(this);

			this.connect.line.solid.renderFlat = this.renderFlatConnector;
			this.connect.line.solid.renderRev = this.renderRevConnector;
			this.connect.line.dash.renderFlat = this.renderFlatConnector;
			this.connect.line.dash.renderRev = this.renderRevConnector;
			this.connect.line.wave.renderFlat =
				this.renderFlatConnectorWave.bind(this);
			this.connect.line.wave.renderRev =
				this.renderRevConnectorWave.bind(this);
		}

		_assignNoteFunctions() {
			this.notes.note.boxRenderer = this.renderNote.bind(this);
			this.notes.state.boxRenderer = this.renderState.bind(this);
		}

		_assignBlockFunctions() {
			this.renderTag = this.renderTag.bind(this);

			this.blocks.ref.boxRenderer = this.renderRefBlock.bind(this);
			this.blocks[''].boxRenderer = this.renderBlock.bind(this);
			this.blocks[''].collapsedBoxRenderer =
				this.renderCollapsedBlock.bind(this);
			this.blocks.ref.section.tag.boxRenderer = this.renderTag;
			this.blocks[''].section.tag.boxRenderer = this.renderTag;
			this.blocks[''].sepRenderer = this.renderSeparator.bind(this);
		}

		_assignDividerFunctions() {
			this.dividers.line.render = this.renderLineDivider.bind(this);
			this.dividers.tear.render = BaseTheme.renderTearDivider.bind(null, {
				fadeBegin: 5,
				fadeSize: 10,
				pattern: this.wave,
				lineAttrs: PENCIL.normal,
			});
		}

		reset() {
			this.random.reset();
		}

		addDefs(builder) {
			builder('sketch_font', () => {
				const style = document.createElement('style');
				// For some uses, it is fine to load this font externally,
				// but this fails when exporting as SVG / PNG (svg tags must
				// have no external dependencies).
//				const url = 'https://fonts.googleapis.com/css?family=' + FONT;
//				style.innerText = '@import url("' + url + '")';
				style.innerText = (
					'@font-face{' +
					'font-family:"' + Handlee.name + '";' +
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
			// cosine distribution [-pi/2 pi/2] scaled to [-range range]
			// int(cos(x))dx = sin(x)
			// from -pi/2: sin(x) - sin(-pi/2) = sin(x) + 1
			// total: sin(pi/2) + 1 = 2
			// normalise to area 1: /2
			// (sin(x) + 1) / 2
			// inverse: p = (sin(x) + 1) / 2
			// asin(2p - 1) = x
			// normalise range
			// x = asin(2p - 1) * range / (pi/2)
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
			const upper = Math.max(-1, Math.min(1,
				(y1 - y2) / (Math.abs(x1 - x2) + 0.001)
			));
			const frac = upper / 6 + 0.5;

			// Line curve is to top / left (simulates right-handed drawing)
			// or top / right (left-handed)
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
			const shape = svg.make('path', Object.assign({
				'd': line.nodes,
				'fill': 'none',
				'stroke-dasharray': lineOptions.dash ? '6, 5' : 'none',
			}, lineOptions.thick ? PENCIL.thick : PENCIL.normal));
			return shape;
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

		renderBox(position, {fill = null, thick = false} = {}) {
			return svg.make('path', Object.assign({
				'd': this.boxNodes(position),
				'fill': fill || '#FFFFFF',
			}, thick ? PENCIL.thick : PENCIL.normal));
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

			return svg.make('g', {}, [
				svg.make('path', Object.assign({
					'd': (
						lT.nodes +
						lF.nodes +
						lR.nodes +
						lB.nodes +
						lL.nodes
					),
					'fill': '#FFFFFF',
				}, PENCIL.normal)),
				svg.make('path', Object.assign({
					'd': lF1.nodes + lF2.nodes,
					'fill': 'none',
				}, PENCIL.normal)),
			]);
		}

		renderLineDivider({x, y, labelWidth, width, height}) {
			let shape = null;
			const yPos = y + height / 2;
			if(labelWidth > 0) {
				shape = svg.make('g', {}, [
					this.renderLine(
						{x, y: yPos},
						{x: x + (width - labelWidth) / 2, y: yPos},
						{}
					),
					this.renderLine(
						{x: x + (width + labelWidth) / 2, y: yPos},
						{x: x + width, y: yPos},
						{}
					),
				]);
			} else {
				shape = this.renderLine(
					{x, y: yPos},
					{x: x + width, y: yPos},
					{}
				);
			}
			return {shape};
		}

		renderFlatConnector(attrs, {x1, y1, x2, y2}) {
			const ln = this.lineNodes(
				{x: x1, y: y1},
				{x: x2, y: y2},
				{varX: 0.3}
			);
			return {
				shape: svg.make('path', Object.assign({'d': ln.nodes}, attrs)),
				p1: ln.p1,
				p2: ln.p2,
			};
		}

		renderRevConnector(attrs, {x1, y1, x2, y2, xR}) {
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
				shape: svg.make('path', Object.assign({
					d: (
						'M' + p1x + ' ' + p1y +
						'C' + p1x + ' ' + p1y +
						',' + b1x + ' ' + b1y +
						',' + p2x + ' ' + p2y +
						'S' + b2x + ' ' + b2y +
						',' + p3x + ' ' + p3y
					),
				}, attrs)),
				p1: {x: p1x, y: p1y},
				p2: {x: p3x, y: p3y},
			};
		}

		renderFlatConnectorWave(attrs, {x1, y1, x2, y2}) {
			const x1v = x1 + this.vary(0.3);
			const x2v = x2 + this.vary(0.3);
			const y1v = y1 + this.vary(1);
			const y2v = y2 + this.vary(1);
			return {
				shape: svg.make('path', Object.assign({
					d: new SVGShapes.PatternedLine(this.wave)
						.move(x1v, y1v)
						.line(x2v, y2v)
						.cap()
						.asPath(),
				}, attrs)),
				p1: {x: x1v, y: y1v},
				p2: {x: x2v, y: y2v},
			};
		}

		renderRevConnectorWave(attrs, {x1, y1, x2, y2, xR}) {
			const x1v = x1 + this.vary(0.3);
			const x2v = x2 + this.vary(0.3);
			const y1v = y1 + this.vary(1);
			const y2v = y2 + this.vary(1);
			return {
				shape: svg.make('path', Object.assign({
					d: new SVGShapes.PatternedLine(this.wave)
						.move(x1v, y1v)
						.line(xR, y1)
						.arc(xR, (y1 + y2) / 2, Math.PI)
						.line(x2v, y2v)
						.cap()
						.asPath(),
				}, attrs)),
				p1: {x: x1v, y: y1v},
				p2: {x: x2v, y: y2v},
			};
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
			return svg.make('path', Object.assign({
				'd': l1.nodes + l2.nodes + l3.nodes,
			}, attrs));
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

			return svg.make('path', Object.assign({
				'd': (
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
				),
				'fill': '#FFFFFF',
			}, PENCIL.normal));
		}

		renderRefBlock(position) {
			const nodes = this.boxNodes(position);
			return {
				shape: svg.make('path', Object.assign({
					'd': nodes,
					'fill': 'none',
				}, PENCIL.thick)),
				mask: svg.make('path', {
					'd': nodes,
					'fill': '#000000',
				}),
				fill: svg.make('path', {
					'd': nodes,
					'fill': '#FFFFFF',
				}),
			};
		}

		renderBlock(position) {
			return this.renderBox(position, {fill: 'none', thick: true});
		}

		renderCollapsedBlock(position) {
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

			return svg.make('g', {}, [
				svg.make('path', {
					'd': line + 'L' + x + ' ' + y,
					'fill': '#FFFFFF',
				}),
				svg.make('path', Object.assign({
					'd': line,
					'fill': '#FFFFFF',
				}, PENCIL.normal)),
			]);
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

			return svg.make('path', Object.assign({
				'd': l1.nodes + l2.nodes,
				'fill': 'none',
			}, PENCIL.normal));
		}

		renderAgentLine({x, y0, y1, width, className}) {
			if(width > 0) {
				const shape = this.renderBox({
					x: x - width / 2,
					y: y0,
					width,
					height: y1 - y0,
				}, {fill: 'none'});
				shape.setAttribute('class', className);
				return shape;
			} else {
				const shape = this.renderLine(
					{x, y: y0},
					{x, y: y1},
					{varY: 0.3}
				);
				shape.setAttribute('class', className);
				return shape;
			}
		}
	}

	SketchTheme.RIGHT = RIGHT;
	SketchTheme.LEFT = LEFT;

	return SketchTheme;
});
