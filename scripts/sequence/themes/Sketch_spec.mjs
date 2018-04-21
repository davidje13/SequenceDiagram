import {dom, textSizerFactory} from '../../../spec/stubs/TestDOM.mjs';
import {Factory} from './Sketch.mjs';
import SVG from '../../svg/SVG.mjs';

describe('Sketch Theme', () => {
	const svg = new SVG(dom, textSizerFactory);

	const themeFactory = new Factory(Factory.RIGHT);
	const themeFactoryL = new Factory(Factory.LEFT);
	const theme = themeFactory.build(svg);
	const themeL = themeFactory.build(svg);

	it('has a name', () => {
		expect(themeFactory.name).toEqual('sketch');
	});

	it('has a left-handed variant', () => {
		expect(themeFactoryL.name).toEqual('sketch left handed');
	});

	it('contains settings for the theme', () => {
		expect(theme.outerMargin).toEqual(5);
		expect(themeL.outerMargin).toEqual(5);
	});
});
