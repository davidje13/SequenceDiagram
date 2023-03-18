import Activation from './Activation.mjs';
import {getComponents} from './BaseComponent.mjs';

describe('Activation', () => {
	const activation = new Activation();

	const theme = {
		agentLineActivationRadius: 2,
	};

	it('registers itself with the component store', () => {
		const components = getComponents();

		expect(components.get('agent activation')).toEqual(
			jasmine.any(Activation),
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
		activation.separationPre({activated: true, agentIDs: ['foo']}, env);

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
		activation.separationPre({activated: true, agentIDs: ['foo']}, env);

		expect(agentInfo.currentRad).toEqual(2);
		expect(agentInfo.currentMaxRad).toEqual(3);
	});

	it('sets the radius to 0 when activation is disabled', () => {
		const agentInfo = {currentMaxRad: 1, currentRad: 0};
		const agentInfos = new Map();
		agentInfos.set('foo', agentInfo);
		const env = {
			agentInfos,
			theme,
		};
		activation.separationPre({activated: false, agentIDs: ['foo']}, env);

		expect(agentInfo.currentRad).toEqual(0);
		expect(agentInfo.currentMaxRad).toEqual(1);
	});
});
