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
			const blockInfo = env.state.blocks.get(left);
			const config = env.theme.getBlock(blockInfo.mode).section;
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
			const blockInfo = env.state.blocks.get(left);
			const config = env.theme.getBlock(blockInfo.mode);
			const agentInfoL = env.agentInfos.get(left);
			const agentInfoR = env.agentInfos.get(right);

			let y = env.primaryY;

			if(!first) {
				y += config.section.padding.bottom;
			}

			const clickable = env.makeRegion();

			const modeRender = SVGShapes.renderBoxedText(mode, {
				x: agentInfoL.x,
				y,
				padding: config.section.mode.padding,
				boxAttrs: config.section.mode.boxAttrs,
				boxRenderer: config.section.mode.boxRenderer,
				labelAttrs: config.section.mode.labelAttrs,
				boxLayer: blockInfo.hold,
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

			if(!first) {
				blockInfo.hold.appendChild(config.sepRenderer({
					'x1': agentInfoL.x,
					'y1': y,
					'x2': agentInfoR.x,
					'y2': y,
				}));
			}

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

		storeBlockInfo(stage, env) {
			env.state.blocks.set(stage.left, {
				mode: stage.mode,
				hold: null,
				startY: null,
			});
		}

		separationPre(stage, env) {
			this.storeBlockInfo(stage, env);
		}

		separation(stage, env) {
			array.mergeSets(env.visibleAgents, [stage.left, stage.right]);
			super.separation(stage, env);
		}

		renderPre(stage, env) {
			this.storeBlockInfo(stage, env);

			const config = env.theme.getBlock(stage.mode);

			return {
				agentNames: [stage.left, stage.right],
				topShift: config.margin.top,
			};
		}

		render(stage, env) {
			const hold = svg.make('g');
			env.blockLayer.appendChild(hold);

			const blockInfo = env.state.blocks.get(stage.left);
			blockInfo.hold = hold;
			blockInfo.startY = env.primaryY;

			return super.render(stage, env, true);
		}
	}

	class BlockEnd extends BaseComponent {
		separation({left, right}, env) {
			array.removeAll(env.visibleAgents, [left, right]);
		}

		renderPre({left, right}, env) {
			const blockInfo = env.state.blocks.get(left);
			const config = env.theme.getBlock(blockInfo.mode);

			return {
				agentNames: [left, right],
				topShift: config.section.padding.bottom,
			};
		}

		render({left, right}, env) {
			const blockInfo = env.state.blocks.get(left);
			const config = env.theme.getBlock(blockInfo.mode);
			const agentInfoL = env.agentInfos.get(left);
			const agentInfoR = env.agentInfos.get(right);

			blockInfo.hold.appendChild(config.boxRenderer({
				x: agentInfoL.x,
				y: blockInfo.startY,
				width: agentInfoR.x - agentInfoL.x,
				height: env.primaryY - blockInfo.startY,
			}));

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
