define(['./BaseComponent'], (BaseComponent) => {
	'use strict';

	class AgentHighlight extends BaseComponent {
		radius(highlighted, env) {
			return highlighted ? env.theme.agentLineHighlightRadius : 0;
		}

		separationPre({agentIDs, highlighted}, env) {
			const r = this.radius(highlighted, env);
			agentIDs.forEach((id) => {
				const agentInfo = env.agentInfos.get(id);
				agentInfo.currentRad = r;
				agentInfo.currentMaxRad = Math.max(agentInfo.currentMaxRad, r);
			});
		}

		renderPre({agentIDs, highlighted}, env) {
			const r = this.radius(highlighted, env);
			agentIDs.forEach((id) => {
				const agentInfo = env.agentInfos.get(id);
				agentInfo.currentMaxRad = Math.max(agentInfo.currentMaxRad, r);
			});
		}

		render({agentIDs, highlighted}, env) {
			const r = this.radius(highlighted, env);
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

	BaseComponent.register('agent highlight', new AgentHighlight());

	return AgentHighlight;
});
