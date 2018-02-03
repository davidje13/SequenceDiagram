define(() => {
	'use strict';

	class BaseComponent {
		makeState(/*state*/) {
		}

		resetState(state) {
			this.makeState(state);
		}

		separationPre(/*stage, {
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
			theme,
			agentInfos,
			textSizer,
			state,
			components,
		}*/) {
			// return {topShift, agentIDs, asynchronousY}
		}

		render(/*stage, {
			topY,
			primaryY,
			fillLayer,
			blockLayer,
			shapeLayer,
			labelLayer,
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
