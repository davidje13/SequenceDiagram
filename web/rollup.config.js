import hypothetical from 'rollup-plugin-hypothetical';

export default [
	{
		input: 'web/editor.mjs',
		output: {
			file: 'weblib/editor.js',
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
