import {dom, textSizerFactory} from '../../stubs/TestDOM.js';
import {Factory} from './Basic.js';
import SVG from '../../svg/SVG.js';

describe('Basic Theme', () => {
	const svg = new SVG(dom, textSizerFactory);

	const themeFactory = new Factory();
	const theme = themeFactory.build(svg);

	it('has a name', () => {
		expect(themeFactory.name).toEqual('basic');
	});

	it('contains settings for the theme', () => {
		expect(theme.outerMargin).toEqual(5);
	});
});
