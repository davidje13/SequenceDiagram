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
				topShift: 0,
				agentIDs: [],
				asynchronousY: null,
			};

			return this.invokeChildren(stage, env, 'renderPre')
				.map((r) => BaseComponent.cleanRenderPreResult(r))
				.reduce(mergeResults, baseResults);
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

		renderHidden(stage, env) {
			this.invokeChildren(stage, env, 'renderHidden');
		}

		shouldHide(stage, env) {
			const baseResults = {
				self: false,
				nest: 0,
			};
			return this.invokeChildren(stage, env, 'shouldHide')
				.reduce((result, {self = false, nest = 0} = {}) => ({
					self: result.self || Boolean(self),
					nest: result.nest + nest,
				}), baseResults);
		}
	}

	BaseComponent.register('parallel', new Parallel());

	return Parallel;
});
