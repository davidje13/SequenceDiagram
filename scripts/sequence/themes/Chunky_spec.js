import {dom, textSizerFactory} from '../../stubs/TestDOM.js';
import {Factory} from './Chunky.js';
import SVG from '../../svg/SVG.js';

describe('Chunky Theme', () => {
	const svg = new SVG(dom, textSizerFactory);

	const themeFactory = new Factory();
	const theme = themeFactory.build(svg);

	it('has a name', () => {
		expect(themeFactory.name).toEqual('chunky');
	});

	it('contains settings for the theme', () => {
		expect(theme.outerMargin).toEqual(5);
	});
});
