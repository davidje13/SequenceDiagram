import BaseComponent, {
	cleanRenderPreResult,
	register,
} from './BaseComponent.js';
import {mergeSets} from '../../core/ArrayUtilities.js';

function nullableMax(a = null, b = null) {
	if(a === null) {
		return b;
	}
	if(b === null) {
		return a;
	}
	return Math.max(a, b);
}

function mergeResults(a, b) {
	mergeSets(a.agentIDs, b.agentIDs);
	return {
		agentIDs: a.agentIDs,
		asynchronousY: nullableMax(a.asynchronousY, b.asynchronousY),
		topShift: Math.max(a.topShift, b.topShift),
		y: nullableMax(a.y, b.y),
	};
}

export default class Parallel extends BaseComponent {
	invokeChildren(stage, env, methodName) {
		return stage.stages.map((subStage) => {
			const component = env.components.get(subStage.type);
			return component[methodName](subStage, env);
		});
	}

	prepareMeasurements(stage, env) {
		this.invokeChildren(stage, env, 'prepareMeasurements');
	}

	separationPre(stage, env) {
		this.invokeChildren(stage, env, 'separationPre');
	}

	separation(stage, env) {
		this.invokeChildren(stage, env, 'separation');
	}

	renderPre(stage, env) {
		const baseResults = {
			agentIDs: [],
			asynchronousY: null,
			topShift: 0,
		};

		return this.invokeChildren(stage, env, 'renderPre')
			.map((r) => cleanRenderPreResult(r))
			.reduce(mergeResults, baseResults);
	}

	render(stage, env) {
		const originalMakeRegion = env.makeRegion;
		let bottomY = 0;
		stage.stages.forEach((subStage) => {
			env.makeRegion = (options = {}) => (
				originalMakeRegion(Object.assign({
					stageOverride: subStage,
				}, options))
			);

			const component = env.components.get(subStage.type);
			const baseY = component.render(subStage, env) || 0;
			bottomY = Math.max(bottomY, baseY);
		});
		env.makeRegion = originalMakeRegion;
		return bottomY;
	}

	renderHidden(stage, env) {
		this.invokeChildren(stage, env, 'renderHidden');
	}

	shouldHide(stage, env) {
		const baseResults = {
			nest: 0,
			self: false,
		};
		return this.invokeChildren(stage, env, 'shouldHide')
			.reduce((result, {self = false, nest = 0} = {}) => ({
				nest: result.nest + nest,
				self: result.self || Boolean(self),
			}), baseResults);
	}
}

register('parallel', new Parallel());
