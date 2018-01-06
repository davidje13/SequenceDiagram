define([
	'core/ArrayUtilities',
	'svg/SVGUtilities',
	'svg/SVGShapes',
	'./HandleeFontData',
], (
	array,
	svg,
	SVGShapes,
	Handlee
) => {
	'use strict';

	// TODO:
	// * fade starter/terminator sometimes does not fully cover line
	// * blocks (if/else/repeat/ref)

	const FONT = Handlee.name;
	const FONT_FAMILY = '"' + FONT + '",cursive';
	const LINE_HEIGHT = 1.5;

	function deepCopy(o) {
		if(typeof o !== 'object' || !o) {
			return o;
		}
		const r = {};
		for(let k in o) {
			if(o.hasOwnProperty(k)) {
				r[k] = deepCopy(o[k]);
			}
		}
		return r;
	}

	const PENCIL = {
		'stroke': 'rgba(0,0,0,0.7)',
		'stroke-width': 0.8,
		'stroke-linejoin': 'round',
		'stroke-linecap': 'round',
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
				width: 8,
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
					attrs: Object.assign({
						'fill': 'none',
					}, PENCIL),
					render: null,
					renderRev: null,
				},
				'dash': {
					attrs: Object.assign({
						'fill': 'none',
						'stroke-dasharray': '4, 2',
					}, PENCIL),
					render: null,
					renderRev: null,
				},
				'wave': {
					attrs: Object.assign({
						'fill': 'none',
						'stroke-linejoin': 'round',
						'stroke-linecap': 'round',
						'wave-width': 6,
						'wave-height': 0.5,
					}, PENCIL),
					render: null,
					renderRev: null,
				},
			},
			arrow: {
				'single': {
					width: 5,
					height: 6,
					attrs: Object.assign({
						'fill': 'rgba(0,0,0,0.9)',
					}, PENCIL),
					render: null,
				},
				'double': {
					width: 4,
					height: 8,
					attrs: Object.assign({
						'fill': 'none',
					}, PENCIL),
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
						'font-family': FONT_FAMILY,
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
						'font-family': FONT_FAMILY,
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

	const NOTES = {
		'text': {
			margin: {top: 0, left: 2, right: 2, bottom: 0},
			padding: {top: 2, left: 2, right: 2, bottom: 2},
			overlap: {left: 10, right: 10},
			boxRenderer: SVGShapes.renderBox.bind(null, {
				'fill': '#FFFFFF',
			}),
			labelAttrs: {
				'font-family': FONT_FAMILY,
				'font-size': 8,
				'line-height': LINE_HEIGHT,
			},
		},
		'note': {
			margin: {top: 0, left: 5, right: 5, bottom: 0},
			padding: {top: 5, left: 5, right: 10, bottom: 5},
			overlap: {left: 10, right: 10},
			boxRenderer: null,
			labelAttrs: {
				'font-family': FONT_FAMILY,
				'font-size': 8,
				'line-height': LINE_HEIGHT,
			},
		},
		'state': {
			margin: {top: 0, left: 5, right: 5, bottom: 0},
			padding: {top: 7, left: 7, right: 7, bottom: 7},
			overlap: {left: 10, right: 10},
			boxRenderer: null,
			labelAttrs: {
				'font-family': FONT_FAMILY,
				'font-size': 8,
				'line-height': LINE_HEIGHT,
			},
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

	class SketchTheme {
		constructor(handedness = RIGHT) {
			if(handedness === RIGHT) {
				this.name = 'sketch';
				this.handedness = 1;
			} else {
				this.name = 'sketch left handed';
				this.handedness = -1;
			}
			this.random = new Random();
			Object.assign(this, deepCopy(SETTINGS));
			this.notes = deepCopy(NOTES);
			this.agentCap.cross.render = this.renderCross.bind(this);
			this.agentCap.bar.render = this.renderBar.bind(this);
			this.agentCap.box.boxRenderer = this.renderBox.bind(this);
			this.connect.arrow.single.render = this.renderArrowHead.bind(this);
			this.connect.arrow.double.render = this.renderArrowHead.bind(this);
			this.connect.line.solid.render = this.renderConnect.bind(this);
			this.connect.line.dash.render = this.renderConnect.bind(this);
			this.notes.note.boxRenderer = this.renderNote.bind(this);
			this.notes.state.boxRenderer = this.renderState.bind(this);
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

		vary(range) {
			if(!range) {
				return 0;
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
			return Math.asin(rand * 2 - 1) * 2 * range / Math.PI;
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
			const rough = Math.min(Math.sqrt(length) * 0.2, 5);
			const x1 = p1.x + this.vary(var1 * varX * rough);
			const y1 = p1.y + this.vary(var1 * varY * rough);
			const x2 = p2.x + this.vary(var2 * varX * rough);
			const y2 = p2.y + this.vary(var2 * varY * rough);

			// -1 = p1 higher, 1 = p2 higher
			const upper = Math.max(-1, Math.min(1,
				(y1 - y2) / (Math.abs(x1 - x2) + 0.001)
			));
			const frac = upper / 6 + 0.5;

			// Line curve is to top / left (simulates right-handed drawing)
			// or top / right (left-handed)
			const curveX = (0.5 + this.vary(0.5)) * rough;
			const curveY = (0.5 + this.vary(0.5)) * rough;
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
			}, PENCIL));
			return shape;
		}

		renderBox({x, y, width, height}, {fill = null} = {}) {
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

			const shape = svg.make('path', Object.assign({
				'd': lT.nodes + lR.nodes + lB.nodes + lL.nodes,
				'fill': fill || '#FFFFFF',
			}, PENCIL));

			return shape;
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

			const g = svg.make('g');
			g.appendChild(svg.make('path', Object.assign({
				'd': (
					lT.nodes +
					lF.nodes +
					lR.nodes +
					lB.nodes +
					lL.nodes
				),
				'fill': '#FFFFFF',
			}, PENCIL)));
			g.appendChild(svg.make('path', Object.assign({
				'd': lF1.nodes + lF2.nodes,
				'fill': 'none',
			}, PENCIL)));

			return g;
		}

		renderConnect({x1, dx1, x2, dx2, y}, attrs) {
			const ln = this.lineNodes(
				{x: x1 + dx1, y},
				{x: x2 + dx2, y},
				{varX: 0.3}
			);
			return {
				shape: svg.make('path', Object.assign({'d': ln.nodes}, attrs)),
				p1: {x: ln.p1.x - dx1, y: ln.p2.y},
				p2: {x: ln.p2.x - dx2, y: ln.p2.y},
			};
		}

		renderArrowHead({x, y, dx, dy, attrs}) {
			const w = dx * (1 + this.vary(0.2));
			const h = dy * (1 + this.vary(0.3));
			const l1 = this.lineNodes(
				{x: x + w, y: y - h},
				{x, y},
				{var1: 2.0, var2: 0.2}
			);
			const l2 = this.lineNodes(
				l1.p2,
				{x: x + w, y: y + h},
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
			// TODO: rounded corners
			return this.renderBox({x, y, width, height});
		}

		renderBar({x, y, width, height}) {
			return this.renderBox({x, y, width, height}, {fill: '#000000'});
		}

		renderCross({x, y, radius}) {
			const r1 = (this.vary(0.2) + 1) * radius;
			const l1 = this.lineNodes(
				{x: x - r1, y: y - r1},
				{x: x + r1, y: y + r1},
				{}
			);
			const r2 = (this.vary(0.2) + 1) * radius;
			const l2 = this.lineNodes(
				{x: x + r2, y: y - r2},
				{x: x - r2, y: y + r2},
				{}
			);

			return svg.make('path', Object.assign({
				'd': l1.nodes + l2.nodes,
				'fill': 'none',
			}, PENCIL));
		}

		getNote(type) {
			return this.notes[type];
		}

		drawAgentLine(container, {x, y0, y1, width, className}) {
			if(width > 0) {
				const shape = this.renderBox({
					x: x - width / 2,
					y: y0,
					width,
					height: y1 - y0,
				}, {fill: 'none'});
				shape.setAttribute('class', className);
				container.appendChild(shape);
			} else {
				const shape = this.renderLine(
					{x, y: y0},
					{x, y: y1},
					{varY: 0.3}
				);
				shape.setAttribute('class', className);
				container.appendChild(shape);
			}
		}
	}

	SketchTheme.RIGHT = RIGHT;
	SketchTheme.LEFT = LEFT;

	return SketchTheme;
});
