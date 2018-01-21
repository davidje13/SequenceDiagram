((() => {
	'use strict';

	requirejs.config(window.getRequirejsCDN());

	// Set to false during development to avoid need to minify sources
	const release = !window.location.href.includes('editor-dev.htm');

	requirejs([
		'interface/Interface',
		release ? '../lib/sequence-diagram.min' : 'sequence/SequenceDiagram',
	], (
		Interface,
		SequenceDiagram
	) => {
		const defaultCode = (
			'title Labyrinth\n' +
			'\n' +
			'Bowie -> Goblin: You remind me of the babe\n' +
			'Goblin -> Bowie: What babe?\n' +
			'Bowie -> Goblin: The babe with the power\n' +
			'Goblin -> Bowie: What power?\n' +
			'note right of Bowie, Goblin: Most people get muddled here!\n' +
			'Bowie -> Goblin: "The power of voodoo"\n' +
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
				title: 'Simple arrow (synchronous)',
				code: '{Agent1} -> {Agent2}: {Message}',
			},
			{
				title: 'Arrow with dotted line (response)',
				code: '{Agent1} --> {Agent2}: {Message}',
			},
			{
				title: 'Open arrow (asynchronous)',
				code: '{Agent1} ->> {Agent2}: {Message}',
			},
			{
				title: 'Lost message',
				code: '{Agent1} -x {Agent2}: {Message}',
			},
			{
				title: 'Wavy line',
				code: '{Agent1} ~> {Agent2}: {Message}',
			},
			{
				title: 'Self-connection',
				code: '{Agent1} -> {Agent1}: {Message}',
			},
			{
				title: 'Found message',
				code: '* -> {Agent1}: {Message}',
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
				title: 'Repeated block',
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
				title: 'Reference',
				code: (
					'begin reference: {Label} as {Name}\n' +
					'{Agent1} -> {Name}\n' +
					'end {Name}'
				),
				preview: (
					'begin A\n' +
					'begin reference: "See 1.3" as myRef\n' +
					'A -> myRef\n' +
					'myRef -> A\n' +
					'end myRef'
				),
			},
			{
				title: 'Reference over agents',
				code: (
					'begin reference over {Covered}: {Label} as {Name}\n' +
					'{Agent1} -> {Name}\n' +
					'end {Name}'
				),
				preview: (
					'begin A, B, C\n' +
					'begin reference over B, C: "See 1.3" as myRef\n' +
					'A -> myRef\n' +
					'myRef -> A\n' +
					'end myRef'
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
				title: 'Vertical space divider',
				code: 'divider space with height 10: {message}',
				preview: (
					'begin A, B, C, D, E, F\n' +
					'divider space with height 30: message'
				),
			},
			{
				title: 'Line divider',
				code: 'divider line with height 10: {message}',
				preview: (
					'begin A, B, C, D, E, F\n' +
					'divider line with height 30: message'
				),
			},
			{
				title: 'Delay divider',
				code: 'divider delay with height 10: {message}',
				preview: (
					'begin A, B, C, D, E, F\n' +
					'divider delay with height 30: message'
				),
			},
			{
				title: 'Tear divider',
				code: 'divider tear with height 10: {message}',
				preview: (
					'begin A, B, C, D, E, F\n' +
					'divider tear with height 30: message'
				),
			},
			{
				title: 'Title',
				code: 'title {Title}',
				preview: 'headers box\ntitle Title\nA -> B',
			},
			{
				title: 'Bold markdown',
				code: '**{text}**',
				preview: 'A -> B: **bold**',
			},
			{
				title: 'Italic markdown',
				code: '_{text}_',
				preview: 'A -> B: _italic_',
			},
			{
				title: 'Strikeout markdown',
				code: '~{text}~',
				preview: 'A -> B: ~strikeout~',
			},
			{
				title: 'Monospace markdown',
				code: '`{text}`',
				preview: 'A -> B: `mono`',
			},
			{
				title: 'Monospace theme',
				code: 'theme monospace',
				preview: 'headers box\ntitle mono\ntheme monospace\nA -> B',
			},
			{
				title: 'Chunky theme',
				code: 'theme chunky',
				preview: 'headers box\ntitle chunky\ntheme chunky\nA -> B',
			},
			{
				title: 'Sketch theme',
				code: 'theme sketch',
				preview: 'headers box\ntitle sketch\ntheme sketch\nA -> B',
			},
			{
				title: 'Cross terminators',
				code: 'terminators cross',
				preview: 'begin A\nterminators cross',
			},
			{
				title: 'Fade terminators',
				code: 'terminators fade',
				preview: 'begin A\nterminators fade',
			},
			{
				title: 'Bar terminators',
				code: 'terminators bar',
				preview: 'begin A\nterminators bar',
			},
			{
				title: 'Box terminators',
				code: 'terminators box',
				preview: 'begin A\nterminators box',
			},
		];

		const loader = document.getElementById('loader');
		const nav = loader.getElementsByTagName('nav')[0];
		const linkElements = nav.getElementsByTagName('a');
		const links = [];
		for(let i = 0; i < linkElements.length; ++ i) {
			links.push({
				label: linkElements[i].innerText,
				href: linkElements[i].getAttribute('href'),
			});
		}

		const ui = new Interface({
			defaultCode,
			sequenceDiagram: new SequenceDiagram(),
			library,
			links,
			localStorage: 'src',
		});
		loader.parentNode.removeChild(loader);
		ui.build(document.body);
	});
})());
