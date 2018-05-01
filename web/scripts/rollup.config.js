import hypothetical from 'rollup-plugin-hypothetical';

export default [
	{
		input: 'web/scripts/editor.mjs',
		output: {
			file: 'web/lib/editor.js',
			format: 'iife',
			name: 'SequenceDiagramEditor',
		},
		plugins: [
			hypothetical({
				allowFallthrough: true,
				files: {
					'./scripts/sequence/SequenceDiagram.mjs':
						'export default window.SequenceDiagram;',
				},
			}),
		],
	},
];
