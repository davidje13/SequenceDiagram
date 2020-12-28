#!/usr/bin/env -S node --disable-proto=delete --disallow-code-generation-from-strings

const {VirtualSequenceDiagram} = require('../lib/sequence-diagram');

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

function getCodeArg() {
	if(process.argv.length > 2 && process.argv[2] !== '-') {
		return Promise.resolve(process.argv[2]);
	} else {
		process.stdin.setEncoding('utf8');
		return read(process.stdin);
	}
}

getCodeArg()
	.then(VirtualSequenceDiagram.render)
	.then((svg) => process.stdout.write(svg + '\n'))
	.catch((err) => process.stderr.write(processError(err) + '\n'));
