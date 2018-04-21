#!/usr/bin/env node

const {
	headlessTextSizerFactory,
	SequenceDiagram,
	VirtualDocument,
} = require('../lib/sequence-diagram');

function render(code) {
	const sd = new SequenceDiagram({
		code,
		document: new VirtualDocument(),
		namespace: '',
		textSizerFactory: headlessTextSizerFactory,
	});

	return sd.dom().outerHTML;
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

function getCodeArg() {
	if(process.argv.length > 2 && process.argv[2] !== '-') {
		return Promise.resolve(process.argv[2]);
	} else {
		process.stdin.setEncoding('utf8');
		return read(process.stdin);
	}
}

getCodeArg().then((code) => {
	process.stdout.write(render(code) + '\n');
});
