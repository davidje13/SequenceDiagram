import { nodeResolve } from '@rollup/plugin-node-resolve';
import terser from '@rollup/plugin-terser';

export default [
	{
		input: ['web/scripts/editor.mjs', 'web/scripts/docs.mjs'],
		moduleContext: {
			'node_modules/codemirror/lib/codemirror.js': 'null',
		},
		output: {dir: 'web/build/static', format: 'es'},
		plugins: [nodeResolve({ browser: true }), terser()],
	},
	{
		external: ['web-listener'],
		input: 'web/render.js',
		// Must be cjs for opentype.js to work (it uses require() internally)
		output: {file: 'web/build/render.js', format: 'cjs'},
		plugins: [nodeResolve(), terser()],
	},
];
