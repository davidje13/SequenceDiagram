import {Async, Mark} from './Marker.mjs';
import {getComponents} from './BaseComponent.mjs';

const mark = new Mark();
const async = new Async();

describe('Mark', () => {
	it('registers itself with the component store', () => {
		const components = getComponents();

		expect(components.get('mark')).toEqual(jasmine.any(Mark));
	});

	it('records y coordinates when rendered', () => {
		const state = {};
		mark.makeState(state);
		mark.render({name: 'foo'}, {state, topY: 7});

		expect(state.marks.get('foo')).toEqual(7);
	});
});

describe('Async', () => {
	it('registers itself with the component store', () => {
		const components = getComponents();

		expect(components.get('async')).toEqual(jasmine.any(Async));
	});

	it('retrieves y coordinates when rendered', () => {
		const state = {};
		mark.makeState(state);
		mark.render({name: 'foo'}, {state, topY: 7});
		const result = async.renderPre({target: 'foo'}, {state});

		expect(result.asynchronousY).toEqual(7);
	});

	it('returns 0 if no target is given', () => {
		const state = {};
		mark.makeState(state);
		mark.render({name: 'foo'}, {state, topY: 7});
		const result = async.renderPre({target: ''}, {state});

		expect(result.asynchronousY).toEqual(0);
	});

	it('falls-back to 0 if the target is not found', () => {
		const state = {};
		mark.makeState(state);
		mark.render({name: 'foo'}, {state, topY: 7});
		const result = async.renderPre({target: 'bar'}, {state});

		expect(result.asynchronousY).toEqual(0);
	});
});
