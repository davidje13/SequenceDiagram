import { nodeResolve } from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

export default [
	{
		input: ['web/scripts/editor.mjs', 'web/scripts/docs.mjs'],
		moduleContext: {
			'node_modules/codemirror/lib/codemirror.js': 'null',
		},
		output: {dir: 'web/lib', format: 'es'},
		plugins: [nodeResolve({ browser: true }), terser()],
	},
];
