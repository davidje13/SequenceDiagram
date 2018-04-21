import multiEntry from 'rollup-plugin-multi-entry';

export default [
	{
		input: [
			'spec/helpers/**/*.mjs',
			'scripts/**/*_spec.mjs',
			'spec/**/*_spec.mjs',
			'web/**/*_spec.mjs',
			'bin/**/*_spec.mjs',
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
