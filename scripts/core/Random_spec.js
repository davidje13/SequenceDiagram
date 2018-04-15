defineDescribe('Random', ['./Random'], (Random) => {
	'use strict';

	let random = null;

	beforeEach(() => {
		random = new Random();
		random.reset();
	});

	describe('.nextFloat', () => {
		it('produces values between 0 and 1', () => {
			for(let i = 0; i < 1000; ++ i) {
				const v = random.nextFloat();
				expect(v).not.toBeLessThan(0);
				expect(v).toBeLessThan(1);
			}
		});

		it('produces the same sequence when reset', () => {
			const values = [];
			for(let i = 0; i < 1000; ++ i) {
				values.push(random.nextFloat());
			}
			random.reset();
			for(let i = 0; i < 1000; ++ i) {
				expect(random.nextFloat()).toEqual(values[i]);
			}
		});

		it('produces a roughly uniform range of values', () => {
			const samples = 10000;
			const granularity = 10;
			const buckets = [];
			buckets.length = granularity;
			buckets.fill(0);
			for(let i = 0; i < samples; ++ i) {
				const v = random.nextFloat() * granularity;
				++ buckets[Math.floor(v)];
			}
			const threshold = (samples / granularity) * 0.9;
			for(let i = 0; i < granularity; ++ i) {
				expect(buckets[i]).not.toBeLessThan(threshold);
			}
		});
	});
});
