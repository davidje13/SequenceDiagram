import BaseComponent, {register} from './BaseComponent.mjs';
import {mergeSets, removeAll} from '../../../core/ArrayUtilities.mjs';

const OUTLINE_ATTRS = {
	'class': 'outline',
	'fill': 'transparent',
};

export class BlockSplit extends BaseComponent {
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
			boxAttrs: config.section.tag.boxAttrs,
			boxRenderer: config.section.tag.boxRenderer,
			labelAttrs: config.section.tag.labelAttrs,
			padding: config.section.tag.padding,
		}, tag, {x: agentInfoL.x, y});

		const labelRender = env.svg.boxedText({
			boxAttrs: {'fill': '#000000'},
			labelAttrs: config.section.label.labelAttrs,
			padding: config.section.label.padding,
		}, label, {x: agentInfoL.x + tagRender.width, y});

		const labelHeight = Math.max(
			Math.max(tagRender.height, labelRender.height),
			config.section.label.minHeight
		);

		blockInfo.hold.add(tagRender.box);
		env.lineMaskLayer.add(labelRender.box);
		clickable.add(
			env.svg.box(OUTLINE_ATTRS, {
				height: labelHeight,
				width: agentInfoR.x - agentInfoL.x,
				x: agentInfoL.x,
				y,
			}),
			tagRender.label,
			labelRender.label
		);

		if(!first) {
			blockInfo.hold.add(config.sepRenderer({
				'x1': agentInfoL.x,
				'x2': agentInfoR.x,
				'y1': y,
				'y2': y,
			}));
		} else if(blockInfo.canHide) {
			clickable.addClass(blockInfo.hide ? 'collapsed' : 'expanded');
		}

		return y + labelHeight + config.section.padding.top;
	}
}

export class BlockBegin extends BlockSplit {
	makeState(state) {
		state.blocks = new Map();
	}

	resetState(state) {
		state.blocks.clear();
	}

	storeBlockInfo(stage, env) {
		const {canHide} = stage;
		const blockInfo = {
			canHide,
			hide: canHide && env.renderer.isCollapsed(stage.ln),
			hold: null,
			startY: null,
			type: stage.blockType,
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
		mergeSets(env.visibleAgentIDs, [stage.left, stage.right]);
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
			nest: blockInfo.hide ? 1 : 0,
			self: false,
		};
	}
}

export class BlockEnd extends BaseComponent {
	separation({left, right}, env) {
		removeAll(env.visibleAgentIDs, [left, right]);
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
			height: env.primaryY - blockInfo.startY,
			width: agentInfoR.x - agentInfoL.x,
			x: agentInfoL.x,
			y: blockInfo.startY,
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
			nest: blockInfo.hide ? -1 : 0,
			self: false,
		};
	}
}

register('block begin', new BlockBegin());
register('block split', new BlockSplit());
register('block end', new BlockEnd());
