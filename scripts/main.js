((() => {
	'use strict';

	requirejs.config(window.getRequirejsCDN());

	/* jshint -W072 */ // Allow several required modules
	requirejs([
		'interface/Interface',
		'interface/Exporter',
		'sequence/Parser',
		'sequence/Generator',
		'sequence/Renderer',
		'sequence/themes/Basic',
		'sequence/themes/Chunky',
	], (
		Interface,
		Exporter,
		Parser,
		Generator,
		Renderer,
		BasicTheme,
		ChunkyTheme
	) => {
		/* jshint +W072 */
		const defaultCode = (
			'title Labyrinth\n' +
			'\n' +
			'Bowie -> Goblin: You remind me of the babe\n' +
			'Goblin -> Bowie: What babe?\n' +
			'Bowie -> Goblin: The babe with the power\n' +
			'Goblin -> Bowie: What power?\n' +
			'note right of Bowie, Goblin: Most people get muddled here!\n' +
			'Bowie -> Goblin: \'The power of voodoo\'\n' +
			'Goblin -> Bowie: "Who-do?"\n' +
			'Bowie -> Goblin: You do!\n' +
			'Goblin -> Bowie: Do what?\n' +
			'Bowie -> Goblin: Remind me of the babe!\n' +
			'\n' +
			'Bowie -> Audience: Sings\n' +
			'\n' +
			'terminators box\n'
		);
		const library = [
			{
				title: 'Simple arrow',
				code: '{Agent1} -> {Agent2}: {Message}',
			},
			{
				title: 'Arrow with dotted line',
				code: '{Agent1} --> {Agent2}: {Message}',
			},
			{
				title: 'Open arrow',
				code: '{Agent1} ->> {Agent2}: {Message}',
			},
			{
				title: 'Self-connection',
				code: '{Agent1} -> {Agent1}: {Message}',
			},
			{
				title: 'Request/response pair',
				code: (
					'{Agent1} -> +{Agent2}: {Request}\n' +
					'{Agent1} <-- -{Agent2}: {Response}'
				),
			},
			{
				title: 'Inline agent creation / destruction',
				code: (
					'{Agent1} -> *{Agent2}: {Request}\n' +
					'{Agent1} <-- !{Agent2}: {Response}'
				),
			},
			{
				title: 'Agent creation / destruction',
				code: (
					'{Agent1} -> {Agent2}: {Request}\n' +
					'{Agent1} <-- {Agent2}: {Response}\n' +
					'end {Agent2}'
				),
				preview: (
					'begin A\n' +
					'::\n' +
					'A -> B: Request\n' +
					'A <-- B: Response\n' +
					'end B'
				),
			},
			{
				title: 'Numbered labels',
				code: 'autolabel "[<inc>] <label>"',
				preview: (
					'autolabel "[<inc>] <label>"\n' +
					'A -> B: Foo\n' +
					'A <- B: Bar\n' +
					'A -> B: Baz'
				),
			},
			{
				title: 'Conditional blocks',
				code: (
					'if {Condition1}\n' +
					'  {Agent1} -> {Agent2}\n' +
					'else if {Condition2}\n' +
					'  {Agent1} -> {Agent2}\n' +
					'else\n' +
					'  {Agent1} -> {Agent2}\n' +
					'end'
				),
				preview: (
					'begin A, B\n' +
					'if Condition1\n' +
					'  A -> B\n' +
					'else if Condition2\n' +
					'  A -> B\n' +
					'else\n' +
					'  A -> B\n' +
					'end'
				),
			},
			{
				title: 'Repeated blocks',
				code: (
					'repeat {Condition}\n' +
					'  {Agent1} -> {Agent2}\n' +
					'end'
				),
				preview: (
					'begin A, B\n' +
					'repeat Condition\n' +
					'  A -> B\n' +
					'end'
				),
			},
			{
				title: 'Note over agent',
				code: 'note over {Agent1}: {Message}',
			},
			{
				title: 'Note over multiple agents',
				code: 'note over {Agent1}, {Agent2}: {Message}',
			},
			{
				title: 'Note left of agent',
				code: 'note left of {Agent1}: {Message}',
			},
			{
				title: 'Note right of agent',
				code: 'note right of {Agent1}: {Message}',
			},
			{
				title: 'Note between agents',
				code: 'note between {Agent1}, {Agent2}: {Message}',
			},
			{
				title: 'State over agent',
				code: 'state over {Agent1}: {State}',
			},
			{
				title: 'Arrows to/from the sides',
				code: '[ -> {Agent1}: {Message1}\n{Agent1} -> ]: {Message2}',
			},
			{
				title: 'Text beside the diagram',
				code: 'text right: {Message}',
				preview: (
					'A -> B\n' +
					'simultaneously:\n' +
					'text right: "Message\\non the\\nside"'
				),
			},
			{
				title: 'Title',
				code: 'title {Title}',
				preview: 'title Title\nA -> B',
			},
			{
				title: 'Chunky theme',
				code: 'theme chunky',
				preview: 'theme chunky\nA -> B',
			},
			{
				title: 'Cross terminators',
				code: 'terminators cross',
				preview: 'A -> B\nterminators cross',
			},
			{
				title: 'Fade terminators',
				code: 'terminators fade',
				preview: 'A -> B\nterminators fade',
			},
			{
				title: 'Bar terminators',
				code: 'terminators bar',
				preview: 'A -> B\nterminators bar',
			},
			{
				title: 'Box terminators',
				code: 'terminators box',
				preview: 'A -> B\nterminators box',
			},
		];
		const ui = new Interface({
			defaultCode,
			parser: new Parser(),
			generator: new Generator(),
			renderer: new Renderer({themes: [
				new BasicTheme(),
				new ChunkyTheme(),
			]}),
			exporter: new Exporter(),
			library,
			localStorage: 'src',
		});
		ui.build(document.body);
	});
})());
