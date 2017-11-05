((() => {
	'use strict';

	requirejs.config(window.getRequirejsCDN());

	function makeText(text = '') {
		return document.createTextNode(text);
	}

	function makeNode(type, attrs = {}) {
		const o = document.createElement(type);
		for(let k in attrs) {
			if(attrs.hasOwnProperty(k)) {
				o.setAttribute(k, attrs[k]);
			}
		}
		return o;
	}

	const FAVICON_SRC = (
		'theme chunky\n' +
		'define ABC as A, DEF as B\n' +
		'A -> B\n' +
		'B -> ]\n' +
		'] -> B\n' +
		'B -> A\n' +
		'terminators fade'
	);

	const SAMPLE_REGEX = new RegExp(
		/<img src="([^"]*)"[^>]*>[\s]*```(?!shell).*\n([^]+?)```/g
	);

	function findSamples(content) {
		SAMPLE_REGEX.lastIndex = 0;
		const results = [];
		while(true) {
			const match = SAMPLE_REGEX.exec(content);
			if(!match) {
				break;
			}
			results.push({
				file: match[1],
				code: match[2],
			});
		}
		results.push({
			file: 'favicon.png',
			code: FAVICON_SRC,
			height: 64,
		});
		return results;
	}

	function filename(path) {
		const p = path.lastIndexOf('/');
		if(p !== -1) {
			return path.substr(p + 1);
		} else {
			return path;
		}
	}

	const PNG_RESOLUTION = 4;

	/* jshint -W072 */ // Allow several required modules
	requirejs([
		'sequence/Parser',
		'sequence/Generator',
		'sequence/Renderer',
		'sequence/themes/Basic',
		'sequence/themes/Chunky',
		'interface/Exporter',
	], (
		Parser,
		Generator,
		Renderer,
		BasicTheme,
		ChunkyTheme,
		Exporter
	) => {
		const parser = new Parser();
		const generator = new Generator();
		const themes = [
			new BasicTheme(),
			new ChunkyTheme(),
		];

		const status = makeNode('div', {'class': 'status'});
		const statusText = makeText('Loading\u2026');
		status.appendChild(statusText);
		document.body.appendChild(status);

		function renderSample({file, code, height}) {
			const renderer = new Renderer({themes});
			const exporter = new Exporter();

			const hold = makeNode('div', {'class': 'hold'});

			hold.appendChild(renderer.svg());

			const raster = makeNode('img', {
				'src': '',
				'class': 'raster',
				'title': 'new',
			});
			hold.appendChild(raster);

			hold.appendChild(makeNode('img', {
				'src': file,
				'class': 'original',
				'title': 'original',
			}));

			const downloadPNG = makeNode('a', {
				'href': '#',
				'download': filename(file),
			});
			downloadPNG.appendChild(makeText('Download PNG'));
			hold.appendChild(downloadPNG);

			document.body.appendChild(hold);

			const parsed = parser.parse(code);
			const sequence = generator.generate(parsed);
			renderer.render(sequence);
			let resolution = PNG_RESOLUTION;
			if(height) {
				resolution = height / renderer.height;
			}
			exporter.getPNGURL(renderer, resolution, (url) => {
				raster.setAttribute('src', url);
				downloadPNG.setAttribute('href', url);
			});
		}

		(fetch('README.md')
			.then((response) => response.text())
			.then(findSamples)
			.then((samples) => {
				samples.forEach(renderSample);
			})
			.then(() => {
				document.body.removeChild(status);
			})
			.catch((e) => {
				statusText.nodeValue = 'Error: ' + e;
			})
		);
	});
})());
