define(['./BaseComponent'], (BaseComponent) => {
	'use strict';

	class AgentHighlight extends BaseComponent {
		separationPre({agentNames, highlighted}, env) {
			const rad = highlighted ? env.theme.agentLineHighlightRadius : 0;
			agentNames.forEach((name) => {
				const agentInfo = env.agentInfos.get(name);
				const maxRad = Math.max(agentInfo.currentMaxRad, rad);
				agentInfo.currentRad = rad;
				agentInfo.currentMaxRad = maxRad;
			});
		}

		render({agentNames, highlighted}, env) {
			const rad = highlighted ? env.theme.agentLineHighlightRadius : 0;
			agentNames.forEach((name) => {
				env.drawAgentLine(name, env.primaryY);
				env.agentInfos.get(name).currentRad = rad;
			});
		}
	}

	BaseComponent.register('agent highlight', new AgentHighlight());

	return AgentHighlight;
});
