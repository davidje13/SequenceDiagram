import multiEntry from 'rollup-plugin-multi-entry';

export default [
	{
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
