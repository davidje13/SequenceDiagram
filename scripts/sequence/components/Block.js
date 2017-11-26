define([
	'./BaseComponent',
	'core/ArrayUtilities',
	'svg/SVGUtilities',
	'svg/SVGShapes',
], (
	BaseComponent,
	array,
	svg,
	SVGShapes
) => {
	'use strict';

	class BlockSplit extends BaseComponent {
		separation({left, right, mode, label}, env) {
			const config = env.theme.block.section;
			const width = (
				env.textSizer.measure(config.mode.labelAttrs, mode).width +
				config.mode.padding.left +
				config.mode.padding.right +
				env.textSizer.measure(config.label.labelAttrs, label).width +
				config.label.padding.left +
				config.label.padding.right
			);
			env.addSeparation(left, right, width);
		}

		renderPre({left, right}) {
			return {
				agentNames: [left, right],
			};
		}

		render({left, right, mode, label}, env, first = false) {
			const config = env.theme.block;
			const agentInfoL = env.agentInfos.get(left);
			const agentInfoR = env.agentInfos.get(right);
			const {hold} = env.state.blocks.get(left);

			let y = env.primaryY;

			if(!first) {
				y += config.section.padding.bottom;
				hold.appendChild(svg.make('line', Object.assign({
					'x1': agentInfoL.x,
					'y1': y,
					'x2': agentInfoR.x,
					'y2': y,
				}, config.separator.attrs)));
			}

			const clickable = env.makeRegion();

			const modeRender = SVGShapes.renderBoxedText(mode, {
				x: agentInfoL.x,
				y,
				padding: config.section.mode.padding,
				boxAttrs: config.section.mode.boxAttrs,
				labelAttrs: config.section.mode.labelAttrs,
				boxLayer: hold,
				labelLayer: clickable,
				SVGTextBlockClass: env.SVGTextBlockClass,
			});

			const labelRender = SVGShapes.renderBoxedText(label, {
				x: agentInfoL.x + modeRender.width,
				y,
				padding: config.section.label.padding,
				boxAttrs: {'fill': '#000000'},
				labelAttrs: config.section.label.labelAttrs,
				boxLayer: env.maskLayer,
				labelLayer: clickable,
				SVGTextBlockClass: env.SVGTextBlockClass,
			});

			const labelHeight = Math.max(modeRender.height, labelRender.height);

			clickable.insertBefore(svg.make('rect', {
				'x': agentInfoL.x,
				'y': y,
				'width': agentInfoR.x - agentInfoL.x,
				'height': labelHeight,
				'fill': 'transparent',
			}), clickable.firstChild);

			return y + labelHeight + config.section.padding.top;
		}
	}

	class BlockBegin extends BlockSplit {
		makeState(state) {
			state.blocks = new Map();
		}

		resetState(state) {
			state.blocks.clear();
		}

		separation(stage, env) {
			array.mergeSets(env.visibleAgents, [stage.left, stage.right]);
			super.separation(stage, env);
		}

		renderPre({left, right}, env) {
			return {
				agentNames: [left, right],
				topShift: env.theme.block.margin.top,
			};
		}

		render(stage, env) {
			const hold = svg.make('g');
			env.blockLayer.appendChild(hold);

			env.state.blocks.set(stage.left, {
				hold,
				mode: stage.mode,
				startY: env.primaryY,
			});

			return super.render(stage, env, true);
		}
	}

	class BlockEnd extends BaseComponent {
		separation({left, right}, env) {
			array.removeAll(env.visibleAgents, [left, right]);
		}

		renderPre({left, right}, env) {
			return {
				agentNames: [left, right],
				topShift: env.theme.block.section.padding.bottom,
			};
		}

		render({left, right}, env) {
			const config = env.theme.block;

			const agentInfoL = env.agentInfos.get(left);
			const agentInfoR = env.agentInfos.get(right);
			const {hold, startY, mode} = env.state.blocks.get(left);
			const configMode = config.modes[mode] || config.modes[''];
			hold.appendChild(svg.make('rect', Object.assign({
				'x': agentInfoL.x,
				'y': startY,
				'width': agentInfoR.x - agentInfoL.x,
				'height': env.primaryY - startY,
			}, configMode.boxAttrs)));

			return env.primaryY + config.margin.bottom + env.theme.actionMargin;
		}
	}

	BaseComponent.register('block begin', new BlockBegin());
	BaseComponent.register('block split', new BlockSplit());
	BaseComponent.register('block end', new BlockEnd());

	return {
		BlockBegin,
		BlockSplit,
		BlockEnd,
	};
});
