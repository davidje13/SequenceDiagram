import AgentHighlight from './AgentHighlight.mjs';
import {getComponents} from './BaseComponent.mjs';

describe('AgentHighlight', () => {
	const highlight = new AgentHighlight();

	const theme = {
		agentLineHighlightRadius: 2,
	};

	it('registers itself with the component store', () => {
		const components = getComponents();

		expect(components.get('agent highlight')).toEqual(
			jasmine.any(AgentHighlight)
		);
	});

	it('updates the radius of the agent lines when checking separation', () => {
		const agentInfo = {currentMaxRad: 1, currentRad: 0};
		const agentInfos = new Map();
		agentInfos.set('foo', agentInfo);
		const env = {
			agentInfos,
			theme,
		};
		highlight.separationPre({agentIDs: ['foo'], highlighted: true}, env);

		expect(agentInfo.currentRad).toEqual(2);
		expect(agentInfo.currentMaxRad).toEqual(2);
	});

	it('keeps the largest maximum radius', () => {
		const agentInfo = {currentMaxRad: 3, currentRad: 0};
		const agentInfos = new Map();
		agentInfos.set('foo', agentInfo);
		const env = {
			agentInfos,
			theme,
		};
		highlight.separationPre({agentIDs: ['foo'], highlighted: true}, env);

		expect(agentInfo.currentRad).toEqual(2);
		expect(agentInfo.currentMaxRad).toEqual(3);
	});

	it('sets the radius to 0 when highlighting is disabled', () => {
		const agentInfo = {currentMaxRad: 1, currentRad: 0};
		const agentInfos = new Map();
		agentInfos.set('foo', agentInfo);
		const env = {
			agentInfos,
			theme,
		};
		highlight.separationPre({agentIDs: ['foo'], highlighted: false}, env);

		expect(agentInfo.currentRad).toEqual(0);
		expect(agentInfo.currentMaxRad).toEqual(1);
	});
});
