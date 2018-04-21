export const require = window.requirejs;

const paths = {};
const hashes = {};
const metaTags = window.document.getElementsByTagName('meta');

for(let i = 0; i < metaTags.length; ++ i) {
	const metaTag = metaTags[i];
	const name = metaTag.getAttribute('name');
	if(name && name.startsWith('cdn-')) {
		const module = name.substr('cdn-'.length);
		let src = metaTag.getAttribute('content');
		if(src.endsWith('.mjs')) {
			src = src.substr(0, src.length - '.mjs'.length);
		} else if(src.endsWith('.js')) {
			src = src.substr(0, src.length - '.js'.length);
		}
		paths[module] = src;
		const integrity = metaTag.getAttribute('data-integrity');
		if(integrity) {
			hashes[module] = integrity;
		}
	}
}

require.config({
	hashes,
	onNodeCreated: (node, config, module) => {
		if(config.hashes[module]) {
			// Thanks, https://stackoverflow.com/a/37065379/1180785
			node.setAttribute('integrity', config.hashes[module]);
			node.setAttribute('crossorigin', 'anonymous');
		}
	},
	paths,
});
