#!/usr/bin/env -S node --disable-proto delete --disallow-code-generation-from-strings

import {buffer} from 'node:stream/consumers';
import opentype from 'opentype.js';

buffer(process.stdin).then((raw) => {
	const font = opentype.parse(raw.buffer);
	if(!font.supported) {
		throw new Error('Font not supported');
	}
	font.validate();

	process.stderr.write(`Font contains ${font.glyphs.length} glyphs\n`);

	const BLANK_PATH = new opentype.Path();
	for(let i = 0; i < font.glyphs.length; i ++) {
		font.glyphs.get(i).path = BLANK_PATH;
	}

	// Omit empty data to work around error when saving:
	// "Unable to write GSUB: script ---- has no default language system."
	const {gsub} = font.tables;
	if(gsub) {
		const defaultLangSys = {
			featureIndexes: [],
			reqFeatureIndex: 65535,
			reserved: 0,
		};
		gsub.scripts = gsub.scripts.map((o) => {
			if(!o.script.defaultLangSys) {
				o.script.defaultLangSys = defaultLangSys;
			}
			return o;
		});
	}

	const updatedRaw = font.toArrayBuffer();
	process.stdout.write(new Uint8Array(updatedRaw));
});
