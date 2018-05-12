import BaseComponent, {register} from './BaseComponent.mjs';

export default class Activation extends BaseComponent {
	radius(activated, env) {
		return activated ? env.theme.agentLineActivationRadius : 0;
	}

	separationPre({agentIDs, activated}, env) {
		const r = this.radius(activated, env);
		agentIDs.forEach((id) => {
			const agentInfo = env.agentInfos.get(id);
			agentInfo.currentRad = r;
			agentInfo.currentMaxRad = Math.max(agentInfo.currentMaxRad, r);
		});
	}

	renderPre({agentIDs, activated}, env) {
		const r = this.radius(activated, env);
		agentIDs.forEach((id) => {
			const agentInfo = env.agentInfos.get(id);
			agentInfo.currentMaxRad = Math.max(agentInfo.currentMaxRad, r);
		});
	}

	render({agentIDs, activated}, env) {
		const r = this.radius(activated, env);
		agentIDs.forEach((id) => {
			env.drawAgentLine(id, env.primaryY);
			env.agentInfos.get(id).currentRad = r;
		});
		return env.primaryY + env.theme.actionMargin;
	}

	renderHidden(stage, env) {
		this.render(stage, env);
	}
}

register('agent activation', new Activation());
