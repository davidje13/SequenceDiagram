define([
	'./BaseComponent',
	'core/ArrayUtilities',
], (
	BaseComponent,
	array
) => {
	'use strict';

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
		array.mergeSets(a.agentIDs, b.agentIDs);
		return {
			agentIDs: a.agentIDs,
			topShift: Math.max(a.topShift, b.topShift),
			y: nullableMax(a.y, b.y),
			asynchronousY: nullableMax(a.asynchronousY, b.asynchronousY),
		};
	}

	class Parallel extends BaseComponent {
		separationPre(stage, env) {
			stage.stages.forEach((subStage) => {
				env.components.get(subStage.type).separationPre(subStage, env);
			});
		}

		separation(stage, env) {
			stage.stages.forEach((subStage) => {
				env.components.get(subStage.type).separation(subStage, env);
			});
		}

		renderPre(stage, env) {
			const baseResults = {
				topShift: 0,
				agentIDs: [],
				asynchronousY: null,
			};

			return stage.stages.map((subStage) => {
				const component = env.components.get(subStage.type);
				const subResult = component.renderPre(subStage, env);
				return BaseComponent.cleanRenderPreResult(subResult);
			}).reduce(mergeResults, baseResults);
		}

		render(stage, env) {
			const originalMakeRegion = env.makeRegion;
			let bottomY = 0;
			stage.stages.forEach((subStage) => {
				env.makeRegion = (options = {}) => {
					return originalMakeRegion(Object.assign({
						stageOverride: subStage,
					}, options));
				};

				const component = env.components.get(subStage.type);
				const baseY = component.render(subStage, env) || 0;
				bottomY = Math.max(bottomY, baseY);
			});
			env.makeRegion = originalMakeRegion;
			return bottomY;
		}
	}

	BaseComponent.register('parallel', new Parallel());

	return Parallel;
});
