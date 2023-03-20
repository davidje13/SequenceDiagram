import BaseComponent, {register} from './BaseComponent.mjs';

export default class Activation extends BaseComponent {
	radius(activation, env) {
		return activation * env.theme.agentLineActivationRadius;
	}

	update(state, env, fn) {
		state.agentIDs.forEach((id) => {
			const info = env.agentInfos.get(id);
			info.currentActivation = Math.max(
				0,
				info.currentActivation + state.delta,
			);
			const r = this.radius(info.currentActivation, env);
			fn(info, r);
		});
	}

	separationPre(state, env) {
		this.update(state, env, (info, r) => {
			info.currentRad = r;
			info.currentMaxRad = Math.max(info.currentMaxRad, r);
		});
	}

	renderPre(state, env) {
		this.update(state, env, (info, r) => {
			info.currentMaxRad = Math.max(info.currentMaxRad, r);
		});
	}

	render(state, env) {
		state.agentIDs.forEach((id) => {
			env.drawAgentLine(id, env.primaryY);
			const info = env.agentInfos.get(id);
			info.currentRad = this.radius(info.currentActivation, env);
		});
		return env.primaryY + env.theme.actionMargin;
	}

	renderHidden(stage, env) {
		this.render(stage, env);
	}
}

register('agent activation', new Activation());
