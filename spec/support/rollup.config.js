import multiEntry from 'rollup-plugin-multi-entry';

export default [
	{
		input: [
			'spec/helpers/**/*.js',
			'spec/helpers/**/*.mjs',
			'**/*_spec.js',
			'**/*_spec.mjs',
		],
		output: {
			file: 'ephemeral/spec_bundle.js',
			format: 'iife',
			name: 'Tests',
			sourcemap: true,
		},
		plugins: [multiEntry()],
	},
];
