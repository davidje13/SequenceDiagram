define([
	'./BaseComponent',
	'svg/SVGUtilities',
	'svg/SVGShapes',
], (
	BaseComponent,
	svg,
	SVGShapes
) => {
	'use strict';

	class Divider extends BaseComponent {
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

			const clickable = env.makeRegion({unmasked: true});

			let labelWidth = 0;
			let labelHeight = 0;
			if(formattedLabel) {
				labelHeight = env.textSizer.measureHeight(
					config.labelAttrs,
					formattedLabel
				);
			}

			const fullHeight = Math.max(height, labelHeight) + config.margin;

			if(formattedLabel) {
				const boxed = SVGShapes.renderBoxedText(formattedLabel, {
					x: (left.x + right.x) / 2,
					y: (
						env.primaryY +
						(fullHeight - labelHeight) / 2 -
						config.padding.top
					),
					padding: config.padding,
					boxAttrs: {'fill': '#000000'},
					labelAttrs: config.labelAttrs,
					boxLayer: env.fullMaskLayer,
					labelLayer: clickable,
					SVGTextBlockClass: env.SVGTextBlockClass,
				});
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
			if(shape) {
				clickable.insertBefore(shape, clickable.firstChild);
			}
			if(mask) {
				env.fullMaskLayer.appendChild(mask);
			}
			clickable.insertBefore(svg.make('rect', {
				'x': left.x - config.extend,
				'y': env.primaryY,
				'width': right.x - left.x + config.extend * 2,
				'height': fullHeight,
				'fill': 'transparent',
				'class': 'outline',
			}), clickable.firstChild);

			return env.primaryY + fullHeight + env.theme.actionMargin;
		}
	}

	BaseComponent.register('divider', new Divider());

	return Divider;
});
