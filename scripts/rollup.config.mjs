import terser from '@rollup/plugin-terser';

export default [
	{
		input: 'scripts/standalone-web.mjs',
		output: [
			{
				file: 'lib/sequence-diagram-web.js',
				format: 'cjs',
				name: 'SequenceDiagram',
			},
			{
				file: 'lib/sequence-diagram-web.mjs',
				format: 'es',
			},
		],
		plugins: [terser()],
	},
	{
		external: ['node:path', 'opentype.js'],
		input: 'scripts/standalone.mjs',
		output: [
			{
				file: 'lib/sequence-diagram.js',
				format: 'cjs',
			},
			{
				file: 'lib/sequence-diagram.mjs',
				format: 'es',
			},
		],
		plugins: [terser()],
	},
];
