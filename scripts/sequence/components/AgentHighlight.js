define(['./BaseComponent'], (BaseComponent) => {
	'use strict';

	class AgentHighlight extends BaseComponent {
		radius(highlighted, env) {
			return highlighted ? env.theme.agentLineHighlightRadius : 0;
		}

		separationPre({agentNames, highlighted}, env) {
			const r = this.radius(highlighted, env);
			agentNames.forEach((name) => {
				const agentInfo = env.agentInfos.get(name);
				agentInfo.currentRad = r;
				agentInfo.currentMaxRad = Math.max(agentInfo.currentMaxRad, r);
			});
		}

		renderPre({agentNames, highlighted}, env) {
			const r = this.radius(highlighted, env);
			agentNames.forEach((name) => {
				const agentInfo = env.agentInfos.get(name);
				agentInfo.currentMaxRad = Math.max(agentInfo.currentMaxRad, r);
			});
		}

		render({agentNames, highlighted}, env) {
			const r = this.radius(highlighted, env);
			agentNames.forEach((name) => {
				env.drawAgentLine(name, env.primaryY);
				env.agentInfos.get(name).currentRad = r;
			});
		}
	}

	BaseComponent.register('agent highlight', new AgentHighlight());

	return AgentHighlight;
});
