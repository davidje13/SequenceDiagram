((() => {
	'use strict';

	requirejs.config(window.getRequirejsCDN());

	function makeText(text = '') {
		return document.createTextNode(text);
	}

	function makeNode(type, attrs = {}, children = []) {
		const o = document.createElement(type);
		for(const k in attrs) {
			if(attrs.hasOwnProperty(k)) {
				o.setAttribute(k, attrs[k]);
			}
		}
		for(const c of children) {
			o.appendChild(c);
		}
		return o;
	}

	const RESOLUTION = 4;

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
			size: {width: 16, height: 16},
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

	requirejs(['sequence/SequenceDiagram'], (SequenceDiagram) => {
		const statusText = makeText('Loading\u2026');
		const status = makeNode('div', {'class': 'status'}, [statusText]);
		document.body.appendChild(status);

		function renderSample({file, code, size}) {
			const diagram = new SequenceDiagram(code);

			const raster = makeNode('img', {
				'src': '',
				'class': 'raster',
				'title': 'new',
			});

			const downloadPNG = makeNode('a', {
				'href': '#',
				'download': filename(file),
			}, [makeText('Download PNG')]);

			document.body.appendChild(makeNode('div', {'class': 'hold'}, [
				diagram.dom(),
				raster,
				makeNode('img', {
					'src': file,
					'class': 'original',
					'title': 'original',
				}),
				downloadPNG,
			]));

			diagram.getPNG({resolution: RESOLUTION, size}).then(({url}) => {
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
