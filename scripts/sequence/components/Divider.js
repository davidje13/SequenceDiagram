define([
	'./BaseComponent',
], (
	BaseComponent
) => {
	'use strict';

	const OUTLINE_ATTRS = {
		'fill': 'transparent',
		'class': 'outline',
	};

	class Divider extends BaseComponent {
		prepareMeasurements({mode, formattedLabel}, env) {
			const config = env.theme.getDivider(mode);
			env.textSizer.expectMeasure(config.labelAttrs, formattedLabel);
		}

		separation({mode, formattedLabel}, env) {
			const config = env.theme.getDivider(mode);

			const width = (
				env.textSizer.measure(config.labelAttrs, formattedLabel).width +
				config.padding.left +
				config.padding.right
			);

			env.addSeparation('[', ']', width);
			env.addSpacing('[', {left: config.extend, right: 0});
			env.addSpacing(']', {left: 0, right: config.extend});
		}

		renderPre() {
			return {
				agentIDs: ['[', ']'],
			};
		}

		render({mode, height, formattedLabel}, env) {
			const config = env.theme.getDivider(mode);

			const left = env.agentInfos.get('[');
			const right = env.agentInfos.get(']');

			let labelWidth = 0;
			let labelHeight = 0;
			if(formattedLabel) {
				labelHeight = env.textSizer.measureHeight(
					config.labelAttrs,
					formattedLabel
				);
			}

			const fullHeight = Math.max(height, labelHeight) + config.margin;

			let labelText = null;
			if(formattedLabel) {
				const boxed = env.svg.boxedText({
					padding: config.padding,
					boxAttrs: {'fill': '#000000'},
					labelAttrs: config.labelAttrs,
				}, formattedLabel, {
					x: (left.x + right.x) / 2,
					y: (
						env.primaryY +
						(fullHeight - labelHeight) / 2 -
						config.padding.top
					),
				});
				env.fullMaskLayer.add(boxed.box);
				labelText = boxed.label;
				labelWidth = boxed.width;
			}

			const {shape, mask} = config.render({
				x: left.x - config.extend,
				y: env.primaryY + (fullHeight - height) / 2,
				labelWidth,
				labelHeight,
				width: right.x - left.x + config.extend * 2,
				height,
				env,
			});
			env.fullMaskLayer.add(mask);

			env.makeRegion({unmasked: true}).add(
				env.svg.box(OUTLINE_ATTRS, {
					'x': left.x - config.extend,
					'y': env.primaryY,
					'width': right.x - left.x + config.extend * 2,
					'height': fullHeight,
				}),
				shape,
				labelText
			);

			return env.primaryY + fullHeight + env.theme.actionMargin;
		}
	}

	BaseComponent.register('divider', new Divider());

	return Divider;
});
