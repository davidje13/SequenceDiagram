import BaseComponent, {register} from './BaseComponent.mjs';

export class Mark extends BaseComponent {
	makeState(state) {
		state.marks = new Map();
	}

	resetState(state) {
		state.marks.clear();
	}

	render({name}, {topY, state}) {
		state.marks.set(name, topY);
	}

	renderHidden(stage, env) {
		this.render(stage, env);
	}
}

export class Async extends BaseComponent {
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

register('mark', new Mark());
register('async', new Async());
