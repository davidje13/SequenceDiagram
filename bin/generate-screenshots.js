#!/usr/bin/env -S node --disable-proto delete --disallow-code-generation-from-strings

const {VirtualSequenceDiagram} = require('../lib/sequence-diagram');
const buffer2stream = require('buffer-to-stream');
const fs = require('fs');
const PngCrush = require('pngcrush');
const svg2png = require('svg2png');
const util = require('util');

const readFile = util.promisify(fs.readFile);
const writeFile = util.promisify(fs.writeFile);

function make(parent, tag, attrs = {}) {
	const doc = parent.ownerDocument;
	const element = doc.createElement(tag);
	for(const k in attrs) {
		if(Object.prototype.hasOwnProperty.call(attrs, k)) {
			element.setAttribute(k, attrs[k]);
		}
	}
	parent.appendChild(element);
	return element;
}

function read(pipe) {
	return new Promise((resolve) => {
		let all = '';
		pipe.on('readable', () => {
			const chunk = pipe.read();
			if(chunk !== null) {
				all += chunk;
			}
		});
		pipe.on('end', () => {
			resolve(all);
		});
	});
}

function processError(err) {
	if(typeof err === 'object' && err.message) {
		return err.message;
	} else {
		return err;
	}
}

function getReadmeFile() {
	if(process.argv.length > 2 && process.argv[2] !== '-') {
		return readFile(process.argv[2]);
	} else {
		process.stdin.setEncoding('utf8');
		return read(process.stdin);
	}
}

const RESOLUTION = 4;

const SAMPLE_REGEX = new RegExp(
	/<img src="([^"]*)"[^>]*>[\s]*```(?!shell).*\n([^]+?)```/g
);

function findSamples(content) {
	SAMPLE_REGEX.lastIndex = 0;
	const results = [];
	for(;;) {
		const match = SAMPLE_REGEX.exec(content);
		if(!match) {
			break;
		}
		results.push({
			code: match[2],
			file: match[1],
		});
	}

	/*
	 * Currently the favicon is drawn in an image editor, but eventually it
	 * could be rendered by the project:
	 * results.push({
	 *  code: (
	 *   'theme chunky\n' +
	 *   'define ABC as A, DEF as B\n' +
	 *   'A is red\n' +
	 *   'B is blue\n' +
	 *   'A -> B\n' +
	 *   'B -~ ]\n' +
	 *   'divider space with height 0\n' +
	 *   '] ~-> B\n' +
	 *   'B -> A\n' +
	 *   'terminators fade'
	 *  ),
	 *  file: 'web/resources/favicon.png',
	 *  size: {height: 16, width: 16},
	 * });
	 */

	results.push({
		code: (
			'theme monospace\n' +
			'begin A, B\n' +
			'A -> B: sequence\n' +
			'B -> A: diagram\n'
		),
		file: 'web/resources/apple-touch-icon.png',
		mutator: (diagram) => {
			const base = diagram.dom();
			const [defs] = base.getElementsByTagName('defs');
			const grad = make(defs, 'linearGradient', {
				'id': 'background',
				'x1': 0,
				'x2': 0,
				'y1': 0.1,
				'y2': 0.9,
			});
			make(grad, 'stop', {'offset': '0%', 'stop-color': '#9BCDFD'});
			make(grad, 'stop', {'offset': '100%', 'stop-color': '#8BC2FF'});

			const offset = 5;
			const size = diagram.getSize();
			const fill = make(base, 'rect', {
				'fill': 'url(#background)',
				'height': size.height * 1.2,
				'width': size.width * 1.2,
				'x': -offset - size.width * 0.1,
				'y': -offset - size.height * 0.1,
			});
			base.insertBefore(fill, base.firstChild);

			for(const txt of base.getElementsByTagName('text')) {
				const sz = txt.getAttribute('font-size');
				txt.setAttribute('font-size', sz * 1.2);
				txt.setAttribute('font-family', 'courier');
			}
		},
		size: {height: 432, width: 432},
	});

	return results;
}

function stream2buffer(stream) {
	return new Promise((resolve) => {
		// Thanks, https://stackoverflow.com/a/14269536/1180785
		const bufs = [];
		stream.on('data', (d) => bufs.push(d));
		stream.on('end', () => resolve(Buffer.concat(bufs)));
	});
}

function compressImageBuffer(buffer) {
	const compressed = buffer2stream(buffer)
		.pipe(new PngCrush(['-rem', 'allb', '-brute', '-l', '9']));
	return stream2buffer(compressed);
}

function renderSample({file, code, mutator, size}) {
	process.stdout.write('generating ' + file + '\n');

	const diagram = new VirtualSequenceDiagram(code);

	let width = null;
	let height = null;
	if(size) {
		width = size.width;
		height = size.width;
	} else {
		width = diagram.getSize().width * RESOLUTION;
		height = diagram.getSize().height * RESOLUTION;
	}

	if(mutator) {
		mutator(diagram);
	}

	return diagram.getSVGCode()
		.then((svg) => svg2png(svg, {height, width}))
		.then(compressImageBuffer)
		.then((buffer) => writeFile(file, buffer, {mode: 0o644}))
		.then(() => process.stdout.write(file + ' complete\n'))
		.catch((err) => process.stderr.write(
			'Failed to generate ' + file + ': ' +
			processError(err) + '\n'
		));
}

getReadmeFile()
	.then(findSamples)
	.then((samples) => Promise.all(samples.map(renderSample)))
	.then(() => process.stdout.write('done.\n'))
	.catch((err) => process.stderr.write(processError(err) + '\n'));
