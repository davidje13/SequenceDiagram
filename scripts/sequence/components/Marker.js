define(['./BaseComponent'], (BaseComponent) => {
	'use strict';

	class Mark extends BaseComponent {
		makeState(state) {
			state.marks = new Map();
		}

		resetState(state) {
			state.marks.clear();
		}

		render({name}, {topY, state}) {
			state.marks.set(name, topY);
		}
	}

	class Async extends BaseComponent {
		renderPre({target}, {state}) {
			let y = 0;
			if(target && state.marks) {
				y = state.marks.get(target) || 0;
			}
			return {
				asynchronousY: y,
			};
		}
	}

	BaseComponent.register('mark', new Mark());
	BaseComponent.register('async', new Async());

	return {
		Mark,
		Async,
	};
});
