import multiEntry from '@rollup/plugin-multi-entry';
import { nodeResolve } from '@rollup/plugin-node-resolve';
import path from 'node:path';
import replace from '@rollup/plugin-replace';

const SELFDIR = path.dirname(new URL(import.meta.url).pathname);
const STUBSDIR = path.join(SELFDIR, '..', 'stubs') + '/';

export default [
	{
		external: [
			/node_modules/,
			/stubs\/codemirror\.mjs/,
		],
		input: [
			'spec/helpers/**/*.mjs',
			'scripts/**/*_spec.mjs',
			'scripts/**/*_nodespec.mjs',
			'spec/**/*_spec.mjs',
			'spec/**/*_nodespec.mjs',
			'web/**/*_spec.mjs',
			'web/**/*_nodespec.mjs',
			'bin/**/*_spec.mjs',
			'bin/**/*_nodespec.mjs',
			'dev-bin/**/*_spec.mjs',
			'dev-bin/**/*_nodespec.mjs',
		],
		output: {
			file: 'ephemeral/spec_bundle.js',
			format: 'cjs',
			inlineDynamicImports: true,
			sourcemap: true,
		},
		plugins: [nodeResolve({ browser: false }), replace({
			delimiters: ['\'', '\''],
			preventAssignment: true,
			values: {
				'../../../node_modules/codemirror/addon/comment/comment.js':
					JSON.stringify(STUBSDIR + 'void.js'),
				'../../../node_modules/codemirror/addon/edit/trailingspace.js':
					JSON.stringify(STUBSDIR + 'void.js'),
				'../../../node_modules/codemirror/addon/hint/show-hint.js':
					JSON.stringify(STUBSDIR + 'void.js'),
				'../../../node_modules/codemirror/lib/codemirror.js':
					JSON.stringify(STUBSDIR + 'codemirror.js'),
			},
		}), multiEntry()],
	},
];
