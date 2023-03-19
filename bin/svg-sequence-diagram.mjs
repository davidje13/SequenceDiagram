#!/usr/bin/env -S node --disable-proto delete --disallow-code-generation-from-strings

import {VirtualSequenceDiagram} from '../lib/sequence-diagram.mjs';
import {text} from 'node:stream/consumers';

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
		return text(process.stdin);
	}
}

getCodeArg()
	.then(VirtualSequenceDiagram.render)
	.then((svg) => process.stdout.write(svg + '\n'))
	.catch((err) => process.stderr.write(processError(err) + '\n'));
