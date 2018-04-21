export default [
	{
		input: 'scripts/standalone-web.mjs',
		output: {
			file: 'lib/sequence-diagram-web.js',
			format: 'iife',
			name: 'SequenceDiagram',
		},
	},
	{
		input: 'scripts/standalone.mjs',
		output: {
			file: 'lib/sequence-diagram.js',
			format: 'iife',
			name: 'SequenceDiagram',
		},
	},
];
