defineDescribe('AgentHighlight', [
	'./AgentHighlight',
	'./BaseComponent',
], (
	AgentHighlight,
	BaseComponent
) => {
	'use strict';

	const highlight = new AgentHighlight();

	const theme = {
		agentLineHighlightRadius: 2,
	};

	it('registers itself with the component store', () => {
		const components = BaseComponent.getComponents();
		expect(components.get('agent highlight')).toEqual(
			jasmine.any(AgentHighlight)
		);
	});

	it('updates the radius of the agent lines when checking separation', () => {
		const agentInfo = {currentRad: 0, currentMaxRad: 1};
		const agentInfos = new Map();
		agentInfos.set('foo', agentInfo);
		const env = {
			theme,
			agentInfos,
		};
		highlight.separationPre({agentNames: ['foo'], highlighted: true}, env);
		expect(agentInfo.currentRad).toEqual(2);
		expect(agentInfo.currentMaxRad).toEqual(2);
	});

	it('keeps the largest maximum radius', () => {
		const agentInfo = {currentRad: 0, currentMaxRad: 3};
		const agentInfos = new Map();
		agentInfos.set('foo', agentInfo);
		const env = {
			theme,
			agentInfos,
		};
		highlight.separationPre({agentNames: ['foo'], highlighted: true}, env);
		expect(agentInfo.currentRad).toEqual(2);
		expect(agentInfo.currentMaxRad).toEqual(3);
	});

	it('sets the radius to 0 when highlighting is disabled', () => {
		const agentInfo = {currentRad: 0, currentMaxRad: 1};
		const agentInfos = new Map();
		agentInfos.set('foo', agentInfo);
		const env = {
			theme,
			agentInfos,
		};
		highlight.separationPre({agentNames: ['foo'], highlighted: false}, env);
		expect(agentInfo.currentRad).toEqual(0);
		expect(agentInfo.currentMaxRad).toEqual(1);
	});
});
