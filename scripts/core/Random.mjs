export default class Random {
	// Xorshift+ 64-bit random generator https://en.wikipedia.org/wiki/Xorshift

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
		/* eslint-disable no-bitwise */ // Bit-ops are part of the algorithm
		/* eslint-disable prefer-destructuring */ // Clearer this way
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
			((x0 << 15) | (x1 >>> 17)) ^
			((y0 << 6) | (y1 >>> 26))
		);
		return (((this.s[3] + y1) >>> 0) % range) / range;
		/* eslint-enable no-bitwise */
		/* eslint-enable prefer-destructuring */
	}
}
