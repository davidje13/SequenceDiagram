import {dom, textSizerFactory} from '../../stubs/TestDOM.js';
import {Factory} from './Monospace.js';
import SVG from '../../svg/SVG.js';

describe('Monospace Theme', () => {
	const svg = new SVG(dom, textSizerFactory);

	const themeFactory = new Factory();
	const theme = themeFactory.build(svg);

	it('has a name', () => {
		expect(themeFactory.name).toEqual('monospace');
	});

	it('contains settings for the theme', () => {
		expect(theme.outerMargin).toEqual(4);
	});
});
