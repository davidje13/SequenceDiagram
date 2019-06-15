const opentype = require('opentype.js');
const path = require('path');

const FONTDIR = process.env.FONTDIR || './fonts/';
const FONTS = new Map();

function loadFont(relativePath) {
	// Must be synchronous so that measurements are ready once startup completes
	/* eslint-disable no-sync */
	return opentype.loadSync(path.join(FONTDIR, relativePath));
	/* eslint-enable no-sync */
}

function addFont(name, variants) {
	const types = new Map();
	for(const v in variants) {
		if(Object.prototype.hasOwnProperty.call(variants, v)) {
			const font = loadFont(variants[v]);
			font.id = name + '-' + v;
			types.set(v, font);
		}
	}
	FONTS.set(name.toLowerCase(), types);
}

addFont('sans-serif', {
	'': 'liberation-fonts/LiberationSans-Regular.ttf',
	'bold': 'liberation-fonts/LiberationSans-Bold.ttf',
	'bold-italic': 'liberation-fonts/LiberationSans-BoldItalic.ttf',
	'italic': 'liberation-fonts/LiberationSans-Italic.ttf',
});
addFont('monospace', {
	'': 'liberation-fonts/LiberationMono-Regular.ttf',
	'bold': 'liberation-fonts/LiberationMono-Bold.ttf',
	'bold-italic': 'liberation-fonts/LiberationMono-BoldItalic.ttf',
	'italic': 'liberation-fonts/LiberationMono-Italic.ttf',
});
addFont('handlee', {
	'': 'handlee/Handlee.ttf',
});

const DEFAULT_FONT = 'sans-serif';

const OPENTYPE_OPTIONS = {hinting: true};

function getFont(attrs) {
	const family = (attrs['font-family'] || DEFAULT_FONT).split(',');
	for(const nm of family) {
		const name = nm.trim().replace(/['"]/g, '').toLowerCase();
		const font = FONTS.get(name);
		if(font) {
			return font;
		}
	}
	return FONTS.get(DEFAULT_FONT);
}

function tryVariant(font, condition, name) {
	if(!condition) {
		return null;
	}
	return font.get(name) || null;
}

function getVariantRaw(font, {bold, italic}) {
	return (
		tryVariant(font, bold && italic, 'bold-italic') ||
		tryVariant(font, bold, 'bold') ||
		tryVariant(font, italic, 'italic') ||
		font.get('')
	);
}

function getVariant(font, attrs) {
	const weight = attrs['font-weight'] || '';
	const style = attrs['font-style'] || '';
	const bold = (weight.includes('bold') || Number(weight) > 400);
	const italic = style.includes('italic');

	return getVariantRaw(font, {bold, italic});
}

function getFontSize(attrs) {
	return Number(attrs['font-size']);
}

function measure(attrs, text) {
	const font = getFont(attrs);
	const variant = getVariant(font, attrs);
	const size = getFontSize(attrs);
	return variant.getAdvanceWidth(text, size, OPENTYPE_OPTIONS);
}

function combineAttrs(base, next) {
	if(!next) {
		return base;
	}
	const result = Object.assign({}, base, next);
	const nextSize = next['font-size'];
	if(typeof nextSize === 'string' && nextSize.endsWith('em')) {
		const ratio = Number.parseFloat(
			nextSize.substr(0, nextSize.length - 2)
		);
		result['font-size'] = base['font-size'] * ratio;
	}
	return result;
}

export default class VirtualTextSizer {
	baseline({attrs}) {
		return getFontSize(attrs);
	}

	measureHeight({attrs, formatted}) {
		const size = this.baseline({attrs, formatted});
		const lineHeight = size * (Number(attrs['line-height']) || 1);
		return formatted.length * lineHeight;
	}

	prepMeasurement(attrs, formatted) {
		return {attrs, formatted};
	}

	prepComplete() {
		// No-op
	}

	performMeasurement({attrs, formatted}) {
		let len = 0;
		for(const part of formatted) {
			if(!part.text) {
				continue;
			}
			const combinedAttrs = combineAttrs(attrs, part.attrs);
			len += measure(combinedAttrs, part.text);
		}
		return len;
	}

	teardown() {
		// No-op
	}
}
