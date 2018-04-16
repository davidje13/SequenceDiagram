import hypothetical from 'rollup-plugin-hypothetical';

export default [
	{
		input: 'scripts/standalone.js',
		output: {
			format: 'iife',
			file: 'lib/sequence-diagram.js',
			name: 'SequenceDiagram',
		},
	},
	{
		input: 'scripts/editor.js',
		plugins: [
			hypothetical({
				allowFallthrough: true,
				files: {
					'./scripts/sequence/SequenceDiagram.js':
						'export default window.SequenceDiagram;'
				},
			}),
		],
		output: {
			format: 'iife',
			file: 'weblib/editor.js',
			name: 'SequenceDiagramEditor',
		},
	},
]
