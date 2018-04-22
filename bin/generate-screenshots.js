#!/usr/bin/env node

const {VirtualSequenceDiagram} = require('../lib/sequence-diagram');
const buffer2stream = require('buffer-to-stream');
const fs = require('fs');
const PngCrush = require('pngcrush');
const svg2png = require('svg2png');

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
		return new Promise((resolve, reject) => {
			fs.readFile(process.argv[2], (err, data) => {
				if(err) {
					reject(err);
				} else {
					resolve(data);
				}
			});
		});
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
	 *   'A -> B\n' +
	 *   'B -> ]\n' +
	 *   '] -> B\n' +
	 *   'B -> A\n' +
	 *   'terminators fade'
	 *  ),
	 *  file: 'favicon.png',
	 *  size: {height: 16, width: 16},
	 * });
	 */

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

function renderSample({file, code, size}) {
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

	return diagram.getSVGCode()
		.then((svg) => svg2png(svg, {height, width}))
		.then(compressImageBuffer)
		.then((buffer) => new Promise((resolve, reject) => {
			fs.writeFile(file, buffer, {mode: 0o644}, (err) => {
				if(err) {
					reject(err);
				} else {
					resolve();
				}
			});
		}))
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
