import EventObject from './EventObject.js';

describe('EventObject', () => {
	let o = null;

	beforeEach(() => {
		o = new EventObject();
	});

	describe('trigger', () => {
		it('invokes registered listeners', () => {
			let triggered = 0;
			o.addEventListener('foo', () => {
				++ triggered;
			});

			o.trigger('foo');

			expect(triggered).toEqual(1);
		});

		it('invokes with the given parameters', () => {
			let capturedParam1 = null;
			let capturedParam2 = null;
			o.addEventListener('foo', (param1, param2) => {
				capturedParam1 = param1;
				capturedParam2 = param2;
			});

			o.trigger('foo', ['a', 'b']);

			expect(capturedParam1).toEqual('a');
			expect(capturedParam2).toEqual('b');
		});

		it('only invokes relevant callbacks', () => {
			let triggered = 0;
			o.addEventListener('foo', () => {
				++ triggered;
			});

			o.trigger('bar');

			expect(triggered).toEqual(0);
		});

		it('forwards to registered objects', () => {
			let capturedType = null;
			o.addEventForwarding({trigger: (type) => {
				capturedType = type;
			}});

			o.trigger('bar');

			expect(capturedType).toEqual('bar');
		});

		it('forwards with the given parameters', () => {
			let capturedParams = null;
			o.addEventForwarding({trigger: (type, params) => {
				capturedParams = params;
			}});

			o.trigger('bar', ['a', 'b']);

			expect(capturedParams[0]).toEqual('a');
			expect(capturedParams[1]).toEqual('b');
		});
	});

	describe('countEventListeners', () => {
		it('returns the number of event listeners of a given type', () => {
			o.addEventListener('foo', () => null);
			o.addEventListener('foo', () => null);

			expect(o.countEventListeners('foo')).toEqual(2);
		});

		it('does not count unrequested types', () => {
			o.addEventListener('foo', () => null);
			o.addEventListener('foo', () => null);
			o.addEventListener('bar', () => null);

			expect(o.countEventListeners('bar')).toEqual(1);
		});

		it('returns 0 for events which have no listeners', () => {
			expect(o.countEventListeners('foo')).toEqual(0);
		});
	});

	describe('removeEventListener', () => {
		it('removes the requested listener', () => {
			let triggered = 0;
			const fn = () => {
				++ triggered;
			};

			o.addEventListener('foo', fn);
			o.trigger('foo');

			expect(triggered).toEqual(1);

			triggered = 0;
			o.removeEventListener('foo', fn);
			o.trigger('foo');

			expect(triggered).toEqual(0);
		});

		it('leaves other listeners', () => {
			let triggered = 0;
			const fn1 = () => null;
			const fn2 = () => {
				++ triggered;
			};

			o.addEventListener('foo', fn1);
			o.addEventListener('foo', fn2);
			o.removeEventListener('foo', fn1);
			o.trigger('foo');

			expect(triggered).toEqual(1);
		});

		it('leaves other listener types', () => {
			let triggered = 0;
			const fn = () => {
				++ triggered;
			};

			o.addEventListener('foo', fn);
			o.addEventListener('bar', fn);
			o.removeEventListener('foo', fn);
			o.trigger('bar');

			expect(triggered).toEqual(1);
		});

		it('silently ignores non-existent listeners', () => {
			expect(() => o.removeEventListener('foo', () => null))
				.not.toThrow();
		});
	});

	describe('removeAllEventListeners', () => {
		it('removes all listeners for the requested type', () => {
			let triggered = 0;
			const fn = () => {
				++ triggered;
			};

			o.addEventListener('foo', fn);
			o.trigger('foo');

			expect(triggered).toEqual(1);

			triggered = 0;
			o.removeAllEventListeners('foo');
			o.trigger('foo');

			expect(triggered).toEqual(0);
		});

		it('leaves other listener types', () => {
			let triggered = 0;
			const fn = () => {
				++ triggered;
			};

			o.addEventListener('foo', fn);
			o.addEventListener('bar', fn);
			o.removeAllEventListeners('foo');
			o.trigger('bar');

			expect(triggered).toEqual(1);
		});

		it('silently ignores non-existent types', () => {
			expect(() => o.removeAllEventListeners('foo')).not.toThrow();
		});

		it('removes all listener types when given no argument', () => {
			let triggered = 0;
			const fn = () => {
				++ triggered;
			};

			o.addEventListener('foo', fn);
			o.addEventListener('bar', fn);
			o.removeAllEventListeners();
			o.trigger('foo');
			o.trigger('bar');

			expect(triggered).toEqual(0);
		});
	});
});
