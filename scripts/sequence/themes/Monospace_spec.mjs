import {dom, textSizerFactory} from '../../../spec/stubs/TestDOM.mjs';
import {Factory} from './Monospace.mjs';
import SVG from '../../svg/SVG.mjs';

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
