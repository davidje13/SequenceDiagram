define([
	'./BaseComponent',
	'core/ArrayUtilities',
], (
	BaseComponent,
	array
) => {
	'use strict';

	const OUTLINE_ATTRS = {
		'fill': 'transparent',
		'class': 'outline',
	};

	class BlockSplit extends BaseComponent {
		prepareMeasurements({left, tag, label}, env) {
			const blockInfo = env.state.blocks.get(left);
			const config = env.theme.getBlock(blockInfo.type).section;
			env.textSizer.expectMeasure(config.tag.labelAttrs, tag);
			env.textSizer.expectMeasure(config.label.labelAttrs, label);
		}

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

			const tagRender = env.svg.boxedText({
				padding: config.section.tag.padding,
				boxAttrs: config.section.tag.boxAttrs,
				boxRenderer: config.section.tag.boxRenderer,
				labelAttrs: config.section.tag.labelAttrs,
			}, tag, {x: agentInfoL.x, y});

			const labelRender = env.svg.boxedText({
				padding: config.section.label.padding,
				boxAttrs: {'fill': '#000000'},
				labelAttrs: config.section.label.labelAttrs,
			}, label, {x: agentInfoL.x + tagRender.width, y});

			const labelHeight = Math.max(
				Math.max(tagRender.height, labelRender.height),
				config.section.label.minHeight
			);

			blockInfo.hold.add(tagRender.box);
			env.lineMaskLayer.add(labelRender.box);
			clickable.add(
				env.svg.box(OUTLINE_ATTRS, {
					'x': agentInfoL.x,
					'y': y,
					'width': agentInfoR.x - agentInfoL.x,
					'height': labelHeight,
				}),
				tagRender.label,
				labelRender.label
			);

			if(!first) {
				blockInfo.hold.add(config.sepRenderer({
					'x1': agentInfoL.x,
					'y1': y,
					'x2': agentInfoR.x,
					'y2': y,
				}));
			} else if(blockInfo.canHide) {
				clickable.addClass(blockInfo.hide ? 'collapsed' : 'expanded');
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
			const canHide = stage.canHide;
			const blockInfo = {
				type: stage.blockType,
				canHide,
				hide: canHide && env.renderer.isCollapsed(stage.ln),
				hold: null,
				startY: null,
			};
			env.state.blocks.set(stage.left, blockInfo);
			return blockInfo;
		}

		prepareMeasurements(stage, env) {
			this.storeBlockInfo(stage, env);
			super.prepareMeasurements(stage, env);
		}

		separationPre(stage, env) {
			this.storeBlockInfo(stage, env);
			super.separationPre(stage, env);
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
			const hold = env.svg.el('g');
			env.blockLayer.add(hold);

			const blockInfo = env.state.blocks.get(stage.left);
			blockInfo.hold = hold;
			blockInfo.startY = env.primaryY;

			return super.render(stage, env, true);
		}

		shouldHide({left}, env) {
			const blockInfo = env.state.blocks.get(left);
			return {
				self: false,
				nest: blockInfo.hide ? 1 : 0,
			};
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

			let renderFn = config.boxRenderer;
			if(blockInfo.hide) {
				renderFn = config.collapsedBoxRenderer || renderFn;
			}

			let shapes = renderFn({
				x: agentInfoL.x,
				y: blockInfo.startY,
				width: agentInfoR.x - agentInfoL.x,
				height: env.primaryY - blockInfo.startY,
			});
			if(!shapes.shape) {
				shapes = {shape: shapes};
			}

			blockInfo.hold.add(shapes.shape);
			env.fillLayer.add(shapes.fill);
			env.lineMaskLayer.add(shapes.mask);

			return env.primaryY + config.margin.bottom + env.theme.actionMargin;
		}

		shouldHide({left}, env) {
			const blockInfo = env.state.blocks.get(left);
			return {
				self: false,
				nest: blockInfo.hide ? -1 : 0,
			};
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
