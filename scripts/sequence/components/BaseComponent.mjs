/* eslint-disable spaced-comment */
/* eslint-disable capitalized-comments */

export default class BaseComponent {
	makeState(/*state*/) {
		// Override if required
	}

	resetState(state) {
		// Override if required
		this.makeState(state);
	}

	prepareMeasurements(/*stage, {
		renderer,
		theme,
		agentInfos,
		textSizer,
		state,
		components,
	}*/) {
		// Override if required
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
		// Override if required
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
		// Override if required
	}

	renderPre(/*stage, {
		renderer,
		theme,
		agentInfos,
		textSizer,
		state,
		components,
	}*/) {
		// Override if required
		// Return {topShift, agentIDs, asynchronousY}
	}

	render(/*stage, {
		renderer,
		topY,
		primaryY,
		fillLayer,
		blockLayer,
		theme,
		agentInfos,
		svg,
		textSizer,
		addDef,
		makeRegion,
		state,
		components,
	}*/) {
		// Override if required
		// Return bottom Y coordinate
	}

	renderHidden(/*stage, {
		(same args as render, with primaryY = topY)
	}*/) {
		// Override if required
	}

	shouldHide(/*stage, {
		renderer,
		theme,
		agentInfos,
		textSizer,
		state,
		components,
	}*/) {
		// Override if required
		// Return {self, nest}
	}
}

export function cleanRenderPreResult({
	agentIDs = [],
	topShift = 0,
	y = null,
	asynchronousY = null,
} = {}, currentY = null) {
	let ts = topShift;
	if(y !== null && currentY !== null) {
		ts = Math.max(ts, y - currentY);
	}
	return {
		agentIDs,
		asynchronousY: (asynchronousY === null) ? currentY : asynchronousY,
		topShift: ts,
		y,
	};
}

const components = new Map();

export function register(name, component) {
	components.set(name, component);
}

export function getComponents() {
	return components;
}
