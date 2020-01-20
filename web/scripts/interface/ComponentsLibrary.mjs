export default [
	{
		code: '{Agent1} -> {Agent2}: {Message}',
		title: 'Simple arrow (synchronous)',
	},
	{
		code: '{Agent1} --> {Agent2}: {Message}',
		title: 'Arrow with dotted line (response)',
	},
	{
		code: '{Agent1} ->> {Agent2}: {Message}',
		title: 'Open arrow (asynchronous)',
	},
	{
		code: '{Agent1} -x {Agent2}: {Message}',
		title: 'Lost message',
	},
	{
		code: '{Agent1} ~> {Agent2}: {Message}',
		title: 'Wavy line',
	},
	{
		code: '{Agent1} -> {Agent1}: {Message}',
		title: 'Self-connection',
	},
	{
		code: '{Agent1} -> ...{id}\n...{id} -> {Agent2}: {Message}',
		preview: (
			'begin A, B\n' +
			'A -> ...x\n' +
			'...x -> B: Message'
		),
		title: 'Asynchronous message',
	},
	{
		code: '* -> {Agent1}: {Message}',
		title: 'Found message',
	},
	{
		code: (
			'{Agent1} -> {Agent2}\n' +
			'& {Agent1} -> {Agent3}: {Broadcast}'
		),
		title: 'Broadcast message',
	},
	{
		code: (
			'{Agent1} -> +{Agent2}: {Request}\n' +
			'{Agent1} <-- -{Agent2}: {Response}'
		),
		title: 'Request/response pair',
	},
	{
		code: (
			'{Agent1} -> *{Agent2}: {Request}\n' +
			'{Agent1} <-- !{Agent2}: {Response}'
		),
		title: 'Inline agent creation / destruction',
	},
	{
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
		title: 'Agent creation / destruction',
	},
	{
		code: 'autolabel "[<inc>] <label>"',
		preview: (
			'autolabel "[<inc>] <label>"\n' +
			'A -> B: Foo\n' +
			'A <- B: Bar\n' +
			'A -> B: Baz'
		),
		title: 'Numbered labels',
	},
	{
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
		title: 'Conditional blocks',
	},
	{
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
		title: 'Repeated block',
	},
	{
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
		title: 'Reference',
	},
	{
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
		title: 'Reference over agents',
	},
	{
		code: (
			'group {Label}\n' +
			'  {Agent1} -> {Agent2}\n' +
			'end'
		),
		preview: (
			'begin A, B\n' +
			'group Label\n' +
			'  A -> B\n' +
			'end'
		),
		title: 'Group',
	},
	{
		code: 'note over {Agent1}: {Message}',
		title: 'Note over agent',
	},
	{
		code: 'note over {Agent1}, {Agent2}: {Message}',
		title: 'Note over multiple agents',
	},
	{
		code: 'note left of {Agent1}: {Message}',
		title: 'Note left of agent',
	},
	{
		code: 'note right of {Agent1}: {Message}',
		title: 'Note right of agent',
	},
	{
		code: 'note between {Agent1}, {Agent2}: {Message}',
		title: 'Note between agents',
	},
	{
		code: (
			'{Agent1} -> {Agent2}\n' +
			'& note right of {Agent2}: {Message}'
		),
		title: 'Inline note',
	},
	{
		code: 'state over {Agent1}: {State}',
		title: 'State over agent',
	},
	{
		code: '[ -> {Agent1}: {Message1}\n{Agent1} -> ]: {Message2}',
		title: 'Arrows to/from the sides',
	},
	{
		code: '{Agent1} -~ ]: {Message1}\n{Agent1} <-~ ]: {Message2}',
		title: 'Fading arrows',
	},
	{
		code: 'text right: {Message}',
		preview: (
			'A -> B\n' +
			'simultaneously:\n' +
			'text right: "Message\\non the\\nside"'
		),
		title: 'Text beside the diagram',
	},
	{
		code: 'divider space with height 10: {message}',
		preview: (
			'begin A, B, C, D, E, F\n' +
			'divider space with height 30: message'
		),
		title: 'Vertical space divider',
	},
	{
		code: 'divider line with height 10: {message}',
		preview: (
			'begin A, B, C, D, E, F\n' +
			'divider line with height 30: message'
		),
		title: 'Line divider',
	},
	{
		code: 'divider delay with height 10: {message}',
		preview: (
			'begin A, B, C, D, E, F\n' +
			'divider delay with height 30: message'
		),
		title: 'Delay divider',
	},
	{
		code: 'divider tear with height 10: {message}',
		preview: (
			'begin A, B, C, D, E, F\n' +
			'divider tear with height 30: message'
		),
		title: 'Tear divider',
	},
	{
		code: 'title {Title}',
		preview: 'headers box\ntitle Title\nA -> B',
		title: 'Title',
	},
	{
		code: '**{text}**',
		preview: 'A -> B: **bold**',
		surround: true,
		title: 'Bold markdown',
	},
	{
		code: '_{text}_',
		preview: 'A -> B: _italic_',
		surround: true,
		title: 'Italic markdown',
	},
	{
		code: '~{text}~',
		preview: 'A -> B: ~strikeout~',
		surround: true,
		title: 'Strikeout markdown',
	},
	{
		code: '<u>{text}</u>',
		preview: 'A -> B: <u>underline</u>',
		surround: true,
		title: 'Underline markdown',
	},
	{
		code: '<o>{text}</o>',
		preview: 'A -> B: <o>overline</o>',
		surround: true,
		title: 'Overline markdown',
	},
	{
		code: '<sup>{text}</sup>',
		preview: 'A -> B: super<sup>script</sup>',
		surround: true,
		title: 'Superscript markdown',
	},
	{
		code: '<sub>{text}</sub>',
		preview: 'A -> B: sub<sub>script</sub>',
		surround: true,
		title: 'Subscript markdown',
	},
	{
		code: '`{text}`',
		preview: 'A -> B: `mono`',
		surround: true,
		title: 'Monospace markdown',
	},
	{
		code: '<red>{text}</red>',
		preview: 'A -> B: <red>red</red>',
		surround: true,
		title: 'Red markdown',
	},
	{
		code: '<highlight>{text}</highlight>',
		preview: 'A -> B: <highlight>highlight</highlight>',
		surround: true,
		title: 'Highlight markdown',
	},
	{
		code: '{Agent} is red',
		preview: 'headers box\nA is red\nbegin A',
		title: 'Red agent line',
	},
	{
		code: '{Agent} is a person',
		preview: 'headers box\nA is a person\nbegin A',
		title: 'Person indicator',
	},
	{
		code: '{Agent} is a database',
		preview: 'headers box\nA is a database\nbegin A',
		title: 'Database indicator',
	},
	{
		code: 'theme monospace',
		preview: 'headers box\ntitle mono\ntheme monospace\nA -> B',
		title: 'Monospace theme',
	},
	{
		code: 'theme chunky',
		preview: 'headers box\ntitle chunky\ntheme chunky\nA -> B',
		title: 'Chunky theme',
	},
	{
		code: 'theme sketch',
		preview: 'headers box\ntitle sketch\ntheme sketch\nA -> B',
		title: 'Sketch theme',
	},
	{
		code: 'terminators cross',
		preview: 'begin A\nterminators cross',
		title: 'Cross terminators',
	},
	{
		code: 'terminators fade',
		preview: 'begin A\nterminators fade',
		title: 'Fade terminators',
	},
	{
		code: 'terminators bar',
		preview: 'begin A\nterminators bar',
		title: 'Bar terminators',
	},
	{
		code: 'terminators box',
		preview: 'begin A\nterminators box',
		title: 'Box terminators',
	},
];
