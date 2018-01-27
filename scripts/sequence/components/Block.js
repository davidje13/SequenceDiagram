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
		separation({left, right, tag, label}, env) {
			const blockInfo = env.state.blocks.get(left);
			const config = env.theme.getBlock(blockInfo.type).section;
			const width = (
				env.textSizer.measure(config.tag.labelAttrs, tag).width +
				config.tag.padding.left +
				config.tag.padding.right +
				env.textSizer.measure(config.label.labelAttrs, label).width +
				config.label.padding.left +
				config.label.padding.right
			);
			env.addSeparation(left, right, width);
		}

		renderPre({left, right}) {
			return {
				agentIDs: [left, right],
			};
		}

		render({left, right, tag, label}, env, first = false) {
			const blockInfo = env.state.blocks.get(left);
			const config = env.theme.getBlock(blockInfo.type);
			const agentInfoL = env.agentInfos.get(left);
			const agentInfoR = env.agentInfos.get(right);

			let y = env.primaryY;

			if(!first) {
				y += config.section.padding.bottom;
			}

			const clickable = env.makeRegion();

			const tagRender = SVGShapes.renderBoxedText(tag, {
				x: agentInfoL.x,
				y,
				padding: config.section.tag.padding,
				boxAttrs: config.section.tag.boxAttrs,
				boxRenderer: config.section.tag.boxRenderer,
				labelAttrs: config.section.tag.labelAttrs,
				boxLayer: blockInfo.hold,
				labelLayer: clickable,
				SVGTextBlockClass: env.SVGTextBlockClass,
			});

			const labelRender = SVGShapes.renderBoxedText(label, {
				x: agentInfoL.x + tagRender.width,
				y,
				padding: config.section.label.padding,
				boxAttrs: {'fill': '#000000'},
				labelAttrs: config.section.label.labelAttrs,
				boxLayer: env.maskLayer,
				labelLayer: clickable,
				SVGTextBlockClass: env.SVGTextBlockClass,
			});

			const labelHeight = Math.max(tagRender.height, labelRender.height);

			clickable.insertBefore(svg.make('rect', {
				'x': agentInfoL.x,
				'y': y,
				'width': agentInfoR.x - agentInfoL.x,
				'height': labelHeight,
				'fill': 'transparent',
				'class': 'outline',
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
			const blockInfo = {
				type: stage.blockType,
				hold: null,
				startY: null,
			};
			env.state.blocks.set(stage.left, blockInfo);
			return blockInfo;
		}

		separationPre(stage, env) {
			this.storeBlockInfo(stage, env);
		}

		separation(stage, env) {
			array.mergeSets(env.visibleAgentIDs, [stage.left, stage.right]);
			super.separation(stage, env);
		}

		renderPre(stage, env) {
			const blockInfo = this.storeBlockInfo(stage, env);

			const config = env.theme.getBlock(blockInfo.type);

			return {
				agentIDs: [stage.left, stage.right],
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
			array.removeAll(env.visibleAgentIDs, [left, right]);
		}

		renderPre({left, right}, env) {
			const blockInfo = env.state.blocks.get(left);
			const config = env.theme.getBlock(blockInfo.type);

			return {
				agentIDs: [left, right],
				topShift: config.section.padding.bottom,
			};
		}

		render({left, right}, env) {
			const blockInfo = env.state.blocks.get(left);
			const config = env.theme.getBlock(blockInfo.type);
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
