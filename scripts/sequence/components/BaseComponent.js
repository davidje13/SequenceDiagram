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
			visibleAgents,
			textSizer,
			addSpacing,
			addSeparation,
			components,
		}*/) {
		}

		separation(/*stage, {
			theme,
			agentInfos,
			visibleAgents,
			textSizer,
			addSpacing,
			addSeparation,
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
			// return {topShift, agentNames, asynchronousY}
		}

		render(/*stage, {
			topY,
			primaryY,
			blockLayer,
			sectionLayer,
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
		topShift = 0,
		agentNames = [],
		asynchronousY = null,
	} = {}, currentY = null) => {
		return {
			topShift,
			agentNames,
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
