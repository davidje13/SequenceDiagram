define(() => {
	'use strict';

	class BaseComponent {
		makeState(/*state*/) {
		}

		resetState(state) {
			this.makeState(state);
		}

		separationPre(/*stage, {
			renderer,
			theme,
			agentInfos,
			visibleAgentIDs,
			momentaryAgentIDs,
			textSizer,
			addSpacing,
			addSeparation,
			state,
			components,
		}*/) {
		}

		separation(/*stage, {
			renderer,
			theme,
			agentInfos,
			visibleAgentIDs,
			momentaryAgentIDs,
			textSizer,
			addSpacing,
			addSeparation,
			state,
			components,
		}*/) {
		}

		renderPre(/*stage, {
			renderer,
			theme,
			agentInfos,
			textSizer,
			state,
			components,
		}*/) {
			// return {topShift, agentIDs, asynchronousY}
		}

		render(/*stage, {
			renderer,
			topY,
			primaryY,
			fillLayer,
			blockLayer,
			theme,
			agentInfos,
			textSizer,
			SVGTextBlockClass,
			addDef,
			makeRegion,
			state,
			components,
		}*/) {
			// return bottom Y coordinate
		}

		renderHidden(/*stage, {
			(same args as render, with primaryY = topY)
		}*/) {
		}

		shouldHide(/*stage, {
			renderer,
			theme,
			agentInfos,
			textSizer,
			state,
			components,
		}*/) {
			// return {self, nest}
		}
	}

	BaseComponent.cleanRenderPreResult = ({
		agentIDs = [],
		topShift = 0,
		y = null,
		asynchronousY = null,
	} = {}, currentY = null) => {
		if(y !== null && currentY !== null) {
			topShift = Math.max(topShift, y - currentY);
		}
		return {
			agentIDs,
			topShift,
			y,
			asynchronousY: (asynchronousY !== null) ? asynchronousY : currentY,
		};
	};

	const components = new Map();

	BaseComponent.register = (name, component) => {
		components.set(name, component);
	};

	BaseComponent.getComponents = () => {
		return components;
	};

	return BaseComponent;
});
