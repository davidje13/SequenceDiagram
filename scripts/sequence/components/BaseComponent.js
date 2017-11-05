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
		}*/) {
		}

		separation(/*stage, {
			theme,
			agentInfos,
			visibleAgents,
			textSizer,
			addSpacing,
			addSeparation,
		}*/) {
		}

		renderPre(/*stage, {
			theme,
			agentInfos,
			textSizer,
			state,
		}*/) {
		}

		render(/*stage, {
			topY,
			primaryY,
			shapeLayer,
			labelLayer,
			theme,
			agentInfos,
			textSizer,
			SVGTextBlockClass,
			addDef,
			state,
		}*/) {
		}
	}

	const components = new Map();

	BaseComponent.register = (name, component) => {
		components.set(name, component);
	};

	BaseComponent.getComponents = () => {
		return components;
	};

	return BaseComponent;
});
