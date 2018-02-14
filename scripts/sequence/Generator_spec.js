defineDescribe('Sequence Generator', ['./Generator'], (Generator) => {
	'use strict';

	const generator = new Generator();

	function makeParsedAgents(source) {
		return source.map((item) => {
			if(typeof item === 'object') {
				return item;
			} else {
				return {name: item, alias: '', flags: []};
			}
		});
	}

	function textFormatter(text) {
		return text + '!';
	}

	const any = () => jasmine.anything();

	const PARSED = {
		sourceAgent: {name: '', alias: '', flags: ['source']},

		blockBegin: (tag, label, {ln = 0} = {}) => {
			return {type: 'block begin', blockType: tag, tag, label, ln};
		},

		blockSplit: (tag, label, {ln = 0} = {}) => {
			return {type: 'block split', blockType: tag, tag, label, ln};
		},

		blockEnd: ({ln = 0} = {}) => {
			return {type: 'block end', ln};
		},

		labelPattern: (pattern, {ln = 0} = {}) => {
			return {type: 'label pattern', pattern, ln};
		},

		groupBegin: (alias, agentIDs, {label = '', ln = 0} = {}) => {
			return {
				type: 'group begin',
				agents: makeParsedAgents(agentIDs),
				blockType: 'ref',
				tag: 'ref',
				label,
				alias,
				ln,
			};
		},

		defineAgents: (agentIDs, {ln = 0} = {}) => {
			return {
				type: 'agent define',
				agents: makeParsedAgents(agentIDs),
				ln,
			};
		},

		agentOptions: (agentID, options, {ln = 0} = {}) => {
			return {
				type: 'agent options',
				agent: makeParsedAgents([agentID])[0],
				options,
				ln,
			};
		},

		beginAgents: (agentIDs, {mode = 'box', ln = 0} = {}) => {
			return {
				type: 'agent begin',
				agents: makeParsedAgents(agentIDs),
				mode,
				ln,
			};
		},

		endAgents: (agentIDs, {mode = 'cross', ln = 0} = {}) => {
			return {
				type: 'agent end',
				agents: makeParsedAgents(agentIDs),
				mode,
				ln,
			};
		},

		connect: (agentIDs, {
			label = '',
			line = '',
			left = 0,
			right = 0,
			ln = 0,
		} = {}) => {
			return {
				type: 'connect',
				agents: makeParsedAgents(agentIDs),
				label,
				options: {
					line,
					left,
					right,
				},
				ln,
			};
		},

		connectDelayBegin: (agentID, {
			label = '',
			tag = '',
			line = '',
			left = 0,
			right = 0,
			ln = 0,
		} = {}) => {
			return {
				type: 'connect-delay-begin',
				ln,
				tag,
				agent: makeParsedAgents([agentID])[0],
				options: {
					line,
					left,
					right,
				},
			};
		},

		connectDelayEnd: (agentID, {
			label = '',
			tag = '',
			line = '',
			left = 0,
			right = 0,
			ln = 0,
		} = {}) => {
			return {
				type: 'connect-delay-end',
				ln,
				tag,
				agent: makeParsedAgents([agentID])[0],
				label,
				options: {
					line,
					left,
					right,
				},
			};
		},

		note: (type, agentIDs, {
			mode = '',
			label = '',
			ln = 0,
		} = {}) => {
			return {
				type,
				agents: makeParsedAgents(agentIDs),
				mode,
				label,
				ln,
			};
		},
	};

	const GENERATED = {
		agent: (id, {
			formattedLabel = any(),
			anchorRight = any(),
			isVirtualSource = any(),
			options = any(),
		} = {}) => {
			return {id, formattedLabel, anchorRight, isVirtualSource, options};
		},

		beginAgents: (agentIDs, {
			mode = any(),
			ln = any(),
		} = {}) => {
			return {
				type: 'agent begin',
				agentIDs,
				mode,
				ln,
			};
		},

		endAgents: (agentIDs, {
			mode = any(),
			ln = any(),
		} = {}) => {
			return {
				type: 'agent end',
				agentIDs,
				mode,
				ln,
			};
		},

		blockBegin: (blockType, {
			tag = any(),
			label = any(),
			canHide = any(),
			left = any(),
			right = any(),
			ln = any(),
		} = {}) => {
			return {
				type: 'block begin',
				blockType,
				tag,
				label,
				canHide,
				left,
				right,
				ln,
			};
		},

		blockSplit: (blockType, {
			tag = any(),
			label = any(),
			left = any(),
			right = any(),
			ln = any(),
		} = {}) => {
			return {
				type: 'block split',
				blockType,
				tag,
				label,
				left,
				right,
				ln,
			};
		},

		blockEnd: ({
			left = any(),
			right = any(),
			ln = any(),
		} = {}) => {
			return {
				type: 'block end',
				left,
				right,
				ln,
			};
		},

		connect: (agentIDs, {
			label = any(),
			line = any(),
			left = any(),
			right = any(),
			ln = any(),
		} = {}) => {
			return {
				type: 'connect',
				agentIDs,
				label,
				options: {
					line,
					left,
					right,
				},
				ln,
			};
		},

		connectDelayBegin: (agentIDs, {
			label = any(),
			tag = any(),
			line = any(),
			left = any(),
			right = any(),
			ln = any(),
		} = {}) => {
			return {
				type: 'connect-delay-begin',
				agentIDs,
				label,
				tag,
				options: {
					line,
					left,
					right,
				},
				ln,
			};
		},

		connectDelayEnd: ({
			tag = any(),
			ln = any(),
		} = {}) => {
			return {
				type: 'connect-delay-end',
				tag,
				ln,
			};
		},

		highlight: (agentIDs, highlighted, {
			ln = any(),
		} = {}) => {
			return {
				type: 'agent highlight',
				agentIDs,
				highlighted,
				ln,
			};
		},

		note: (type, agentIDs, {
			mode = any(),
			label = any(),
			ln = any(),
		} = {}) => {
			return {
				type,
				agentIDs,
				mode,
				label,
				ln,
			};
		},

		parallel: (stages, {
			ln = any(),
		} = {}) => {
			return {
				type: 'parallel',
				stages,
				ln,
			};
		},
	};

	function invoke(stages, meta = {}) {
		return generator.generate({
			meta: Object.assign({textFormatter}, meta),
			stages: stages,
		});
	}

	describe('.generate', () => {
		it('propagates title, theme and code metadata', () => {
			const sequence = invoke([], {
				title: 'bar',
				theme: 'zig',
				code: 'zoom',
				nope: 'skip',
			});
			expect(sequence.meta).toEqual({
				title: 'bar!',
				theme: 'zig',
				code: 'zoom',
			});
		});

		it('returns an empty sequence for blank input', () => {
			const sequence = invoke([]);
			expect(sequence.stages).toEqual([]);
		});

		it('includes implicit hidden left/right agents', () => {
			const sequence = invoke([]);
			expect(sequence.agents).toEqual([
				GENERATED.agent('[', {anchorRight: true}),
				GENERATED.agent(']', {anchorRight: false}),
			]);
		});

		it('passes marks and async through', () => {
			const sequence = invoke([
				{type: 'mark', name: 'foo', ln: 0},
				{type: 'async', target: 'foo', ln: 1},
				{type: 'async', target: '', ln: 2},
			]);
			expect(sequence.stages).toEqual([
				{type: 'mark', name: 'foo', ln: 0},
				{type: 'async', target: 'foo', ln: 1},
				{type: 'async', target: '', ln: 2},
			]);
		});

		it('passes dividers through', () => {
			const sequence = invoke([{
				type: 'divider',
				mode: 'foo',
				height: 7,
				label: 'woo',
				ln: 0,
			}]);
			expect(sequence.stages).toEqual([{
				type: 'divider',
				mode: 'foo',
				height: 7,
				formattedLabel: 'woo!',
				ln: 0,
			}]);
		});

		it('rejects attempts to jump to markers not yet defined', () => {
			expect(() => invoke([
				{type: 'async', target: 'foo', ln: 10},
				{type: 'mark', name: 'foo'},
			])).toThrow(new Error('Unknown marker: foo at line 11'));
		});

		it('returns aggregated agents', () => {
			const sequence = invoke([
				PARSED.connect(['A', 'B']),
				PARSED.connect(['C', 'D']),
				PARSED.beginAgents(['E']),
			]);
			expect(sequence.agents).toEqual([
				GENERATED.agent('['),
				GENERATED.agent('A'),
				GENERATED.agent('B'),
				GENERATED.agent('C'),
				GENERATED.agent('D'),
				GENERATED.agent('E'),
				GENERATED.agent(']'),
			]);
		});

		it('uses the textFormatter on agent labels', () => {
			const sequence = invoke([
				PARSED.connect(['A', 'B']),
			]);
			expect(sequence.agents).toEqual([
				GENERATED.agent('['),
				GENERATED.agent('A', {formattedLabel: 'A!'}),
				GENERATED.agent('B', {formattedLabel: 'B!'}),
				GENERATED.agent(']'),
			]);
		});

		it('always puts the implicit right agent on the right', () => {
			const sequence = invoke([
				PARSED.connect([']', 'B']),
			]);
			expect(sequence.agents).toEqual([
				GENERATED.agent('['),
				GENERATED.agent('B'),
				GENERATED.agent(']'),
			]);
		});

		it('accounts for define calls when ordering agents', () => {
			const sequence = invoke([
				PARSED.defineAgents(['B']),
				PARSED.connect(['A', 'B']),
			]);
			expect(sequence.agents).toEqual([
				GENERATED.agent('['),
				GENERATED.agent('B'),
				GENERATED.agent('A'),
				GENERATED.agent(']'),
			]);
		});

		it('applies options to agents', () => {
			const sequence = invoke([
				PARSED.agentOptions('A', ['foo']),
			]);
			expect(sequence.agents).toEqual([
				any(),
				GENERATED.agent('A', {options: ['foo']}),
				any(),
			]);
		});

		it('combines agent options', () => {
			const sequence = invoke([
				PARSED.agentOptions('A', ['foo', 'bar']),
				PARSED.agentOptions('B', ['zig']),
				PARSED.agentOptions('A', ['zag', 'bar']),
			]);
			expect(sequence.agents).toEqual([
				any(),
				GENERATED.agent('A', {options: ['foo', 'bar', 'zag']}),
				GENERATED.agent('B', {options: ['zig']}),
				any(),
			]);
		});

		it('converts aliases', () => {
			const sequence = invoke([
				PARSED.defineAgents([{name: 'Baz', alias: 'B', flags: []}]),
				PARSED.connect(['A', 'B']),
			]);
			expect(sequence.agents).toEqual([
				GENERATED.agent('['),
				GENERATED.agent('Baz'),
				GENERATED.agent('A'),
				GENERATED.agent(']'),
			]);
		});

		it('rejects duplicate aliases', () => {
			expect(() => invoke([
				PARSED.defineAgents([{name: 'Foo', alias: 'B', flags: []}]),
				PARSED.defineAgents([{name: 'Bar', alias: 'B', flags: []}]),
			])).toThrow(new Error(
				'Cannot use B as an alias; it is already in use at line 1'
			));
		});

		it('rejects using agent names as aliases', () => {
			expect(() => invoke([
				PARSED.defineAgents([{name: 'Foo', alias: 'B', flags: []}]),
				PARSED.defineAgents([{name: 'Bar', alias: 'Foo', flags: []}]),
			])).toThrow(new Error(
				'Cannot use Foo as an alias; it is already in use at line 1'
			));
		});

		it('creates implicit begin stages for agents when used', () => {
			const sequence = invoke([
				PARSED.connect(['A', 'B']),
				PARSED.connect(['B', 'C']),
			]);
			expect(sequence.stages).toEqual([
				GENERATED.beginAgents(['A', 'B']),
				any(),
				GENERATED.beginAgents(['C']),
				any(),
				any(),
			]);
		});

		it('passes connects through', () => {
			const sequence = invoke([
				PARSED.connect(['A', 'B']),
			]);
			expect(sequence.stages).toEqual([
				any(),
				GENERATED.connect(['A', 'B']),
				any(),
			]);
		});

		it('propagates connect information', () => {
			const sequence = invoke([
				PARSED.connect(['A', 'B'], {
					label: 'foo',
					line: 'bar',
					left: 1,
					right: 0,
				}),
			]);
			expect(sequence.stages).toEqual([
				any(),
				GENERATED.connect(['A', 'B'], {
					label: 'foo!',
					line: 'bar',
					left: 1,
					right: 0,
				}),
				any(),
			]);
		});

		it('converts source agents into virtual agents', () => {
			const sequence = invoke([
				PARSED.connect(['A', PARSED.sourceAgent]),
			]);
			expect(sequence.agents).toEqual([
				GENERATED.agent('['),
				GENERATED.agent('A'),
				GENERATED.agent('__0', {
					anchorRight: false,
					isVirtualSource: true,
				}),
				GENERATED.agent(']'),
			]);
			expect(sequence.stages).toEqual([
				GENERATED.beginAgents(['A']),
				GENERATED.connect(['A', '__0']),
				GENERATED.endAgents(['A']),
			]);
		});

		it('converts sources into distinct virtual agents', () => {
			const sequence = invoke([
				PARSED.connect(['A', PARSED.sourceAgent]),
				PARSED.connect(['A', PARSED.sourceAgent]),
			]);
			expect(sequence.agents).toEqual([
				GENERATED.agent('['),
				GENERATED.agent('A'),
				GENERATED.agent('__1'),
				GENERATED.agent('__0'),
				GENERATED.agent(']'),
			]);
			expect(sequence.stages).toEqual([
				GENERATED.beginAgents(['A']),
				GENERATED.connect(['A', '__0']),
				GENERATED.connect(['A', '__1']),
				GENERATED.endAgents(['A']),
			]);
		});

		it('places source agents near the connected agent', () => {
			const sequence = invoke([
				PARSED.beginAgents(['A', 'B', 'C']),
				PARSED.connect(['B', PARSED.sourceAgent]),
			]);
			expect(sequence.agents).toEqual([
				GENERATED.agent('['),
				GENERATED.agent('A'),
				GENERATED.agent('B'),
				GENERATED.agent('__0', {
					anchorRight: false,
					isVirtualSource: true,
				}),
				GENERATED.agent('C'),
				GENERATED.agent(']'),
			]);
		});

		it('places source agents left when connections are reversed', () => {
			const sequence = invoke([
				PARSED.beginAgents(['A', 'B', 'C']),
				PARSED.connect([PARSED.sourceAgent, 'B']),
			]);
			expect(sequence.agents).toEqual([
				GENERATED.agent('['),
				GENERATED.agent('A'),
				GENERATED.agent('__0', {
					anchorRight: true,
					isVirtualSource: true,
				}),
				GENERATED.agent('B'),
				GENERATED.agent('C'),
				GENERATED.agent(']'),
			]);
		});

		it('rejects connections between virtual agents', () => {
			expect(() => invoke([
				PARSED.connect([PARSED.sourceAgent, PARSED.sourceAgent]),
			])).toThrow(new Error(
				'Cannot connect found messages at line 1'
			));
		});

		it('rejects connections between virtual agents and sides', () => {
			expect(() => invoke([
				PARSED.connect([PARSED.sourceAgent, ']']),
			])).toThrow(new Error(
				'Cannot connect found messages to special agents at line 1'
			));
		});

		it('uses label patterns for connections', () => {
			const sequence = invoke([
				PARSED.labelPattern(['foo ', {token: 'label'}, ' bar']),
				PARSED.connect(['A', 'B'], {label: 'myLabel'}),
			]);
			expect(sequence.stages).toEqual([
				any(),
				GENERATED.connect(['A', 'B'], {
					label: 'foo myLabel bar!',
				}),
				any(),
			]);
		});

		it('applies counters in label patterns', () => {
			const sequence = invoke([
				PARSED.labelPattern([{start: 3, inc: 2, dp: 0}, ' suffix']),
				PARSED.connect(['A', 'B'], {label: 'foo'}),
				PARSED.connect(['A', 'B'], {label: 'bar'}),
			]);
			expect(sequence.stages).toEqual([
				any(),
				GENERATED.connect(['A', 'B'], {
					label: '3 suffix!',
				}),
				GENERATED.connect(['A', 'B'], {
					label: '5 suffix!',
				}),
				any(),
			]);
		});

		it('applies counter rounding in label patterns', () => {
			const sequence = invoke([
				PARSED.labelPattern([{start: 0.52, inc: 1, dp: 1}, ' suffix']),
				PARSED.connect(['A', 'B'], {label: 'foo'}),
				PARSED.connect(['A', 'B'], {label: 'bar'}),
			]);
			expect(sequence.stages).toEqual([
				any(),
				GENERATED.connect(['A', 'B'], {
					label: '0.5 suffix!',
				}),
				GENERATED.connect(['A', 'B'], {
					label: '1.5 suffix!',
				}),
				any(),
			]);
		});

		it('aggregates delayed connect information in the first entry', () => {
			const sequence = invoke([
				PARSED.beginAgents(['A', 'B']),
				PARSED.connectDelayBegin('A', {
					ln: 0,
					tag: 'foo',
					line: 'solid',
					left: 0,
					right: 1,
				}),
				PARSED.connectDelayEnd('B', {
					ln: 1,
					tag: 'foo',
					label: 'woo',
					line: 'solid',
					left: 0,
					right: 1,
				}),
			]);
			expect(sequence.stages).toEqual([
				any(),
				GENERATED.connectDelayBegin(['A', 'B'], {
					label: 'woo!',
					tag: '__0',
					line: 'solid',
					left: 0,
					right: 1,
					ln: 0,
				}),
				GENERATED.connectDelayEnd({
					tag: '__0',
					ln: 1,
				}),
				any(),
			]);
		});

		it('converts self connections into delayed connections', () => {
			const sequence = invoke([
				PARSED.connect(['A', 'A'], {
					ln: 0,
					label: 'woo',
					line: 'solid',
					left: 0,
					right: 1,
				}),
			]);
			expect(sequence.stages).toEqual([
				any(),
				GENERATED.connectDelayBegin(['A', 'A'], {
					label: 'woo!',
					tag: '__0',
					line: 'solid',
					left: 0,
					right: 1,
					ln: 0,
				}),
				GENERATED.connectDelayEnd({
					tag: '__0',
					ln: 0,
				}),
				any(),
			]);
		});

		it('adds parallel highlighting stages to self connections', () => {
			const sequence = invoke([
				PARSED.connect([
					{name: 'A', alias: '', flags: ['start']},
					{name: 'A', alias: '', flags: ['stop']},
				], {label: 'woo'}),
			]);
			expect(sequence.stages).toEqual([
				any(),
				GENERATED.parallel([
					GENERATED.highlight(['A'], true),
					GENERATED.connectDelayBegin(['A', 'A'], {label: 'woo!'}),
				]),
				GENERATED.parallel([
					GENERATED.connectDelayEnd(),
					GENERATED.highlight(['A'], false),
				]),
				any(),
			]);
		});

		it('merges delayed connect arrows', () => {
			const sequence = invoke([
				PARSED.beginAgents(['A', 'B']),
				PARSED.connectDelayBegin('A', {
					tag: 'foo',
					line: 'solid',
					left: 1,
					right: 0,
				}),
				PARSED.connectDelayEnd('B', {
					tag: 'foo',
					line: 'solid',
					left: 0,
					right: 1,
				}),
			]);
			expect(sequence.stages).toEqual([
				any(),
				GENERATED.connectDelayBegin(['A', 'B'], {
					line: 'solid',
					left: 1,
					right: 1,
				}),
				any(),
				any(),
			]);
		});

		it('rejects conflicting delayed message arrows', () => {
			expect(() => invoke([
				PARSED.beginAgents(['A', 'B']),
				PARSED.connectDelayBegin('A', {
					tag: 'foo',
					line: 'abc',
				}),
				PARSED.connectDelayEnd('B', {
					ln: 1,
					tag: 'foo',
					line: 'def',
				}),
			])).toThrow(new Error(
				'Mismatched delayed connection arrows at line 2'
			));
		});

		it('implicitly begins agents in delayed connections', () => {
			const sequence = invoke([
				PARSED.connectDelayBegin('A', {tag: 'foo'}),
				PARSED.connectDelayEnd('B', {tag: 'foo'}),
			]);
			expect(sequence.stages).toEqual([
				GENERATED.beginAgents(['A']),
				GENERATED.connectDelayBegin(['A', 'B']),
				GENERATED.beginAgents(['B']),
				GENERATED.connectDelayEnd(),
				GENERATED.endAgents(['A', 'B']),
			]);
		});

		it('rejects unknown delayed connections', () => {
			expect(() => invoke([
				PARSED.connectDelayBegin('A', {
					ln: 0,
					tag: 'foo',
				}),
				PARSED.connectDelayEnd('B', {
					ln: 1,
					tag: 'foo',
				}),
				PARSED.connectDelayEnd('B', {
					ln: 2,
					tag: 'bar',
				}),
			])).toThrow(new Error(
				'Unknown delayed connection "bar" at line 3'
			));
		});

		it('rejects overused delayed connections', () => {
			expect(() => invoke([
				PARSED.connectDelayBegin('A', {
					ln: 0,
					tag: 'foo',
				}),
				PARSED.connectDelayEnd('B', {
					ln: 1,
					tag: 'foo',
				}),
				PARSED.connectDelayEnd('B', {
					ln: 2,
					tag: 'foo',
				}),
			])).toThrow(new Error(
				'Unknown delayed connection "foo" at line 3'
			));
		});

		it('rejects unused delayed connections', () => {
			expect(() => invoke([
				PARSED.connectDelayBegin('A', {
					ln: 0,
					tag: 'foo',
				}),
			])).toThrow(new Error(
				'Unused delayed connection "foo" at line 1'
			));
		});

		it('rejects duplicate delayed connection names', () => {
			expect(() => invoke([
				PARSED.connectDelayBegin('A', {
					ln: 0,
					tag: 'foo',
				}),
				PARSED.connectDelayBegin('B', {
					ln: 1,
					tag: 'foo',
				}),
			])).toThrow(new Error(
				'Duplicate delayed connection "foo" at line 2'
			));
		});

		it('rejects delayed connections passing block boundaries', () => {
			expect(() => invoke([
				PARSED.connectDelayBegin('A', {
					ln: 0,
					tag: 'foo',
				}),
				PARSED.blockBegin('if', ''),
				PARSED.connectDelayEnd('B', {
					ln: 1,
					tag: 'foo',
				}),
				PARSED.blockEnd(),
			])).toThrow(new Error(
				'Unknown delayed connection "foo" at line 2'
			));
		});

		it('creates implicit end stages for all remaining agents', () => {
			const sequence = invoke([
				PARSED.connect(['A', 'B']),
			], {
				terminators: 'foo',
			});
			expect(sequence.stages).toEqual([
				any(),
				any(),
				GENERATED.endAgents(['A', 'B'], {mode: 'foo'}),
			]);
		});

		it('defaults to mode "none" for implicit end stages', () => {
			const sequence = invoke([
				PARSED.connect(['A', 'B']),
			]);
			expect(sequence.stages).toEqual([
				any(),
				any(),
				GENERATED.endAgents(['A', 'B'], {mode: 'none'}),
			]);
		});

		it('defaults to mode "cross" for explicit end stages', () => {
			const sequence = invoke([
				PARSED.connect(['A', 'B']),
				PARSED.endAgents(['A', 'B']),
			]);
			expect(sequence.stages).toEqual([
				any(),
				any(),
				GENERATED.endAgents(['A', 'B'], {mode: 'cross'}),
			]);
		});

		it('does not create duplicate begin stages', () => {
			const sequence = invoke([
				PARSED.beginAgents(['A', 'B', 'C']),
				PARSED.connect(['A', 'B']),
				PARSED.connect(['B', 'C']),
			]);
			expect(sequence.stages).toEqual([
				GENERATED.beginAgents(['A', 'B', 'C']),
				GENERATED.connect(any()),
				GENERATED.connect(any()),
				GENERATED.endAgents(['A', 'B', 'C']),
			]);
		});

		it('redisplays agents if they have been hidden', () => {
			const sequence = invoke([
				PARSED.beginAgents(['A', 'B']),
				PARSED.connect(['A', 'B']),
				PARSED.endAgents(['B']),
				PARSED.connect(['A', 'B']),
			]);
			expect(sequence.stages).toEqual([
				any(),
				any(),
				GENERATED.endAgents(['B']),
				GENERATED.beginAgents(['B']),
				any(),
				any(),
			]);
		});

		it('removes duplicate begin agents', () => {
			const sequence = invoke([
				PARSED.beginAgents(['A', 'A']),
			]);
			expect(sequence.stages).toEqual([
				GENERATED.beginAgents(['A']),
				any(),
			]);
		});

		it('collapses adjacent begin statements', () => {
			const sequence = invoke([
				PARSED.connect(['A', 'B']),
				PARSED.beginAgents(['D']),
				PARSED.connect(['B', 'C']),
				PARSED.connect(['C', 'D']),
			]);
			expect(sequence.stages).toEqual([
				GENERATED.beginAgents(['A', 'B']),
				GENERATED.connect(any()),
				GENERATED.beginAgents(['D', 'C']),
				GENERATED.connect(any()),
				GENERATED.connect(any()),
				any(),
			]);
		});

		it('collapses chains of adjacent begin statements', () => {
			const sequence = invoke([
				PARSED.beginAgents(['A']),
				PARSED.beginAgents(['B']),
				PARSED.beginAgents(['C']),
			]);
			expect(sequence.stages).toEqual([
				GENERATED.beginAgents(['A', 'B', 'C']),
				any(),
			]);
		});

		it('collapses chains of adjacent end statements', () => {
			const sequence = invoke([
				PARSED.beginAgents(['A', 'B', 'C']),
				PARSED.endAgents(['A']),
				PARSED.endAgents(['B']),
				PARSED.endAgents(['C']),
			]);
			expect(sequence.stages).toEqual([
				any(),
				GENERATED.endAgents(['A', 'B', 'C']),
			]);
		});

		it('removes superfluous begin statements', () => {
			const sequence = invoke([
				PARSED.connect(['A', 'B']),
				PARSED.beginAgents(['A', 'C', 'D']),
				PARSED.beginAgents(['C', 'E']),
			]);
			expect(sequence.stages).toEqual([
				GENERATED.beginAgents(['A', 'B']),
				GENERATED.connect(any()),
				GENERATED.beginAgents(['C', 'D', 'E']),
				any(),
			]);
		});

		it('uses the header theme for the topmost begin statement', () => {
			const sequence = invoke([
				PARSED.connect(['A', 'B']),
				PARSED.connect(['B', 'C']),
			], {
				headers: 'foo',
			});
			expect(sequence.stages).toEqual([
				GENERATED.beginAgents(['A', 'B'], {mode: 'foo'}),
				any(),
				GENERATED.beginAgents(['C'], {mode: 'box'}),
				any(),
				any(),
			]);
		});

		it('removes duplicate end agents', () => {
			const sequence = invoke([
				PARSED.beginAgents(['A']),
				PARSED.endAgents(['A', 'A']),
			]);
			expect(sequence.stages).toEqual([
				any(),
				GENERATED.endAgents(['A']),
			]);
		});

		it('removes superfluous end statements', () => {
			const sequence = invoke([
				PARSED.defineAgents(['E']),
				PARSED.beginAgents(['C', 'D']),
				PARSED.connect(['A', 'B']),
				PARSED.endAgents(['A', 'B', 'C']),
				PARSED.endAgents(['A', 'D', 'E']),
			]);
			expect(sequence.stages).toEqual([
				any(),
				GENERATED.connect(any()),
				GENERATED.endAgents(['A', 'B', 'C', 'D']),
			]);
		});

		it('does not merge different modes of end', () => {
			const sequence = invoke([
				PARSED.beginAgents(['A', 'B', 'C', 'D']),
				PARSED.connect(['A', 'B']),
				PARSED.endAgents(['A', 'B', 'C']),
			]);
			expect(sequence.stages).toEqual([
				any(),
				GENERATED.connect(any()),
				GENERATED.endAgents(['A', 'B', 'C'], {mode: 'cross'}),
				GENERATED.endAgents(['D'], {mode: 'none'}),
			]);
		});

		it('adds parallel highlighting stages', () => {
			const sequence = invoke([
				PARSED.connect(['A', {name: 'B', alias: '', flags: ['start']}]),
				PARSED.connect(['A', {name: 'B', alias: '', flags: ['stop']}]),
			]);
			expect(sequence.stages).toEqual([
				any(),
				GENERATED.parallel([
					GENERATED.highlight(['B'], true),
					GENERATED.connect(['A', 'B']),
				]),
				GENERATED.parallel([
					GENERATED.connect(['A', 'B']),
					GENERATED.highlight(['B'], false),
				]),
				any(),
			]);
		});

		it('adds parallel begin stages', () => {
			const sequence = invoke([
				PARSED.connect(['A', {name: 'B', alias: '', flags: ['begin']}]),
			]);
			expect(sequence.stages).toEqual([
				GENERATED.beginAgents(['A']),
				GENERATED.parallel([
					GENERATED.beginAgents(['B']),
					GENERATED.connect(['A', 'B']),
				]),
				GENERATED.endAgents(['A', 'B']),
			]);
		});

		it('adds parallel end stages', () => {
			const sequence = invoke([
				PARSED.connect(['A', {name: 'B', alias: '', flags: ['end']}]),
			]);
			expect(sequence.stages).toEqual([
				GENERATED.beginAgents(['A', 'B']),
				GENERATED.parallel([
					GENERATED.connect(['A', 'B']),
					GENERATED.endAgents(['B']),
				]),
				GENERATED.endAgents(['A']),
			]);
		});

		it('implicitly ends highlighting when ending a stage', () => {
			const sequence = invoke([
				PARSED.connect(['A', {name: 'B', alias: '', flags: ['start']}]),
				PARSED.connect(['A', {name: 'B', alias: '', flags: ['end']}]),
			]);
			expect(sequence.stages).toEqual([
				any(),
				any(),
				GENERATED.parallel([
					GENERATED.connect(['A', 'B']),
					GENERATED.highlight(['B'], false),
					GENERATED.endAgents(['B']),
				]),
				GENERATED.endAgents(['A']),
			]);
		});

		it('rejects conflicting flags', () => {
			expect(() => invoke([
				PARSED.connect([
					'A',
					{name: 'B', alias: '', flags: ['start', 'stop']},
				]),
			])).toThrow(new Error(
				'Cannot set agent highlighting multiple times at line 1'
			));

			expect(() => invoke([
				PARSED.connect([
					'A',
					{name: 'B', alias: '', flags: ['begin', 'end']},
				]),
			])).toThrow(new Error(
				'Cannot set agent visibility multiple times at line 1'
			));
		});

		it('adds implicit highlight end with implicit terminator', () => {
			const sequence = invoke([
				PARSED.connect([
					'A',
					{name: 'B', alias: '', flags: ['start']},
				]),
			]);
			expect(sequence.stages).toEqual([
				any(),
				any(),
				GENERATED.parallel([
					GENERATED.highlight(['B'], false),
					GENERATED.endAgents(['A', 'B']),
				]),
			]);
		});

		it('adds implicit highlight end with explicit terminator', () => {
			const sequence = invoke([
				PARSED.connect(['A', {name: 'B', alias: '', flags: ['start']}]),
				PARSED.endAgents(['A', 'B']),
			]);
			expect(sequence.stages).toEqual([
				any(),
				any(),
				GENERATED.parallel([
					GENERATED.highlight(['B'], false),
					GENERATED.endAgents(['A', 'B']),
				]),
			]);
		});

		it('collapses adjacent end statements containing highlighting', () => {
			const sequence = invoke([
				PARSED.connect([
					{name: 'A', alias: '', flags: ['start']},
					{name: 'B', alias: '', flags: ['start']},
				]),
				PARSED.endAgents(['A']),
				PARSED.endAgents(['B']),
			]);
			expect(sequence.stages).toEqual([
				any(),
				any(),
				GENERATED.parallel([
					GENERATED.highlight(['A', 'B'], false),
					GENERATED.endAgents(['A', 'B']),
				]),
			]);
		});

		it('creates virtual agents for block statements', () => {
			const sequence = invoke([
				PARSED.blockBegin('if', 'abc'),
				PARSED.connect(['A', 'B']),
				PARSED.blockEnd(),
			]);

			expect(sequence.agents).toEqual([
				GENERATED.agent('['),
				GENERATED.agent('__BLOCK0[', {anchorRight: true}),
				GENERATED.agent('A'),
				GENERATED.agent('B'),
				GENERATED.agent('__BLOCK0]', {anchorRight: false}),
				GENERATED.agent(']'),
			]);
		});

		it('positions virtual block agents near involved agents', () => {
			const sequence = invoke([
				PARSED.connect(['A', 'B']),
				PARSED.blockBegin('if', 'abc'),
				PARSED.connect(['C', 'D']),
				PARSED.blockBegin('if', 'abc'),
				PARSED.connect(['E', 'F']),
				PARSED.blockEnd(),
				PARSED.blockEnd(),
				PARSED.connect(['G', 'H']),
			]);

			expect(sequence.agents).toEqual([
				GENERATED.agent('['),
				GENERATED.agent('A'),
				GENERATED.agent('B'),
				GENERATED.agent('__BLOCK0['),
				GENERATED.agent('C'),
				GENERATED.agent('D'),
				GENERATED.agent('__BLOCK1['),
				GENERATED.agent('E'),
				GENERATED.agent('F'),
				GENERATED.agent('__BLOCK1]'),
				GENERATED.agent('__BLOCK0]'),
				GENERATED.agent('G'),
				GENERATED.agent('H'),
				GENERATED.agent(']'),
			]);
		});

		it('ignores defines when setting block bounds', () => {
			const sequence = invoke([
				PARSED.blockBegin('if', 'abc'),
				PARSED.connect(['A', 'B']),
				PARSED.defineAgents(['C']),
				PARSED.blockEnd(),
			]);
			expect(sequence.agents).toEqual([
				GENERATED.agent('['),
				GENERATED.agent('__BLOCK0['),
				GENERATED.agent('A'),
				GENERATED.agent('B'),
				GENERATED.agent('__BLOCK0]'),
				GENERATED.agent('C'),
				GENERATED.agent(']'),
			]);
		});

		it('ignores side agents when calculating block bounds', () => {
			const sequence = invoke([
				PARSED.beginAgents(['A', 'B', 'C']),
				PARSED.blockBegin('if', 'abc'),
				PARSED.connect(['[', 'B']),
				PARSED.connect(['B', ']']),
				PARSED.blockEnd(),
			]);

			expect(sequence.agents).toEqual([
				GENERATED.agent('['),
				GENERATED.agent('A'),
				GENERATED.agent('__BLOCK0['),
				GENERATED.agent('B'),
				GENERATED.agent('__BLOCK0]'),
				GENERATED.agent('C'),
				GENERATED.agent(']'),
			]);
		});

		it('propagates block statements', () => {
			const sequence = invoke([
				PARSED.blockBegin('if', 'abc', {ln: 10}),
				PARSED.connect(['A', 'B']),
				PARSED.blockSplit('else', 'xyz', {ln: 20}),
				PARSED.connect(['A', 'B']),
				PARSED.blockEnd({ln: 30}),
			]);

			expect(sequence.stages).toEqual([
				GENERATED.blockBegin(
					'if',
					{tag: 'if!', label: 'abc!', canHide: true, ln: 10}
				),
				any(),
				any(),
				GENERATED.blockSplit(
					'else',
					{tag: 'else!', label: 'xyz!', ln: 20}
				),
				any(),
				GENERATED.blockEnd({ln: 30}),
				any(),
			]);
		});

		it('records virtual block agent names in block commands', () => {
			const sequence = invoke([
				PARSED.blockBegin('if', 'abc'),
				PARSED.connect(['A', 'B']),
				PARSED.blockSplit('else', 'xyz'),
				PARSED.connect(['A', 'B']),
				PARSED.blockEnd(),
			]);

			const bounds = {
				left: '__BLOCK0[',
				right: '__BLOCK0]',
			};

			const stages = sequence.stages;
			expect(stages[0]).toEqual(GENERATED.blockBegin('if', bounds));
			expect(stages[3]).toEqual(GENERATED.blockSplit('else', bounds));
			expect(stages[5]).toEqual(GENERATED.blockEnd(bounds));
		});

		it('records virtual block agents in nested blocks', () => {
			const sequence = invoke([
				PARSED.blockBegin('if', 'abc'),
				PARSED.connect(['A', 'B']),
				PARSED.blockSplit('else', 'xyz'),
				PARSED.blockBegin('if', 'def'),
				PARSED.connect(['A', 'C']),
				PARSED.blockEnd(),
				PARSED.blockEnd(),
			]);

			expect(sequence.agents).toEqual([
				GENERATED.agent('['),
				GENERATED.agent('__BLOCK0['),
				GENERATED.agent('__BLOCK1['),
				GENERATED.agent('A'),
				GENERATED.agent('B'),
				GENERATED.agent('C'),
				GENERATED.agent('__BLOCK1]'),
				GENERATED.agent('__BLOCK0]'),
				GENERATED.agent(']'),
			]);

			const bounds0 = {
				left: '__BLOCK0[',
				right: '__BLOCK0]',
			};

			const bounds1 = {
				left: '__BLOCK1[',
				right: '__BLOCK1]',
			};

			const stages = sequence.stages;
			expect(stages[0]).toEqual(GENERATED.blockBegin('if', bounds0));
			expect(stages[4]).toEqual(GENERATED.blockBegin('if', bounds1));
			expect(stages[7]).toEqual(GENERATED.blockEnd(bounds1));
			expect(stages[8]).toEqual(GENERATED.blockEnd(bounds0));
		});

		it('preserves block boundaries when agents exist outside', () => {
			const sequence = invoke([
				PARSED.connect(['A', 'B']),
				PARSED.blockBegin('if', 'abc'),
				PARSED.blockBegin('if', 'def'),
				PARSED.connect(['A', 'B']),
				PARSED.blockEnd(),
				PARSED.blockEnd(),
			]);

			expect(sequence.agents).toEqual([
				GENERATED.agent('['),
				GENERATED.agent('__BLOCK0['),
				GENERATED.agent('__BLOCK1['),
				GENERATED.agent('A'),
				GENERATED.agent('B'),
				GENERATED.agent('__BLOCK1]'),
				GENERATED.agent('__BLOCK0]'),
				GENERATED.agent(']'),
			]);

			const bounds0 = {
				left: '__BLOCK0[',
				right: '__BLOCK0]',
			};

			const bounds1 = {
				left: '__BLOCK1[',
				right: '__BLOCK1]',
			};

			const stages = sequence.stages;
			expect(stages[2]).toEqual(GENERATED.blockBegin('if', bounds0));
			expect(stages[3]).toEqual(GENERATED.blockBegin('if', bounds1));
			expect(stages[5]).toEqual(GENERATED.blockEnd(bounds1));
			expect(stages[6]).toEqual(GENERATED.blockEnd(bounds0));
		});

		it('allows empty block parts after split', () => {
			expect(() => invoke([
				PARSED.blockBegin('if', 'abc'),
				PARSED.connect(['A', 'B']),
				PARSED.blockSplit('else', 'xyz'),
				PARSED.blockEnd(),
			])).not.toThrow();
		});

		it('allows empty block parts before split', () => {
			expect(() => invoke([
				PARSED.blockBegin('if', 'abc'),
				PARSED.blockSplit('else', 'xyz'),
				PARSED.connect(['A', 'B']),
				PARSED.blockEnd(),
			])).not.toThrow();
		});

		it('allows deeply nested blocks', () => {
			expect(() => invoke([
				PARSED.blockBegin('if', 'abc'),
				PARSED.blockBegin('if', 'def'),
				PARSED.connect(['A', 'B']),
				PARSED.blockEnd(),
				PARSED.blockEnd(),
			])).not.toThrow();
		});

		it('rejects entirely empty blocks', () => {
			expect(() => invoke([
				PARSED.blockBegin('if', 'abc'),
				PARSED.blockSplit('else', 'xyz'),
				PARSED.blockEnd(),
			])).toThrow(new Error('Empty block at line 1'));
		});

		it('rejects blocks containing only define statements / markers', () => {
			expect(() => invoke([
				PARSED.blockBegin('if', 'abc'),
				PARSED.defineAgents(['A']),
				{type: 'mark', name: 'foo'},
				PARSED.blockEnd(),
			])).toThrow(new Error('Empty block at line 1'));
		});

		it('rejects entirely empty nested blocks', () => {
			expect(() => invoke([
				PARSED.blockBegin('if', 'abc', {ln: 10}),
				PARSED.connect(['A', 'B']),
				PARSED.blockSplit('else', 'xyz', {ln: 20}),
				PARSED.blockBegin('if', 'abc', {ln: 30}),
				PARSED.blockEnd({ln: 40}),
				PARSED.blockEnd({ln: 50}),
			])).toThrow(new Error('Empty block at line 41'));
		});

		it('converts groups into block commands', () => {
			const sequence = invoke([
				PARSED.beginAgents(['A', 'B']),
				PARSED.groupBegin('Bar', ['A', 'B'], {label: 'Foo'}),
				PARSED.endAgents(['Bar']),
			]);

			const bounds = {
				left: '__BLOCK0[',
				right: '__BLOCK0]',
			};

			expect(sequence.agents).toEqual([
				GENERATED.agent('['),
				GENERATED.agent('__BLOCK0['),
				GENERATED.agent('A'),
				GENERATED.agent('B'),
				GENERATED.agent('__BLOCK0]'),
				GENERATED.agent(']'),
			]);

			expect(sequence.stages).toEqual([
				any(),
				GENERATED.blockBegin('ref', {
					tag: 'ref!',
					label: 'Foo!',
					canHide: false,
					left: bounds.left,
					right: bounds.right,
				}),
				GENERATED.blockEnd(bounds),
				GENERATED.endAgents(['A', 'B']),
			]);
		});

		it('adds implicit begin statements when creating groups', () => {
			const sequence = invoke([
				PARSED.groupBegin('Bar', ['A', 'B'], {label: 'Foo'}),
				PARSED.endAgents(['Bar']),
			]);

			expect(sequence.stages).toEqual([
				GENERATED.beginAgents(['A', 'B'], {mode: 'box'}),
				any(),
				any(),
				any(),
			]);
		});

		it('augments explicit begin statements when creating groups', () => {
			const sequence = invoke([
				PARSED.beginAgents(['A']),
				PARSED.groupBegin('Bar', ['A', 'B'], {label: 'Foo'}),
				PARSED.endAgents(['Bar']),
			]);

			expect(sequence.stages).toEqual([
				GENERATED.beginAgents(['A', 'B'], {mode: 'box'}),
				any(),
				any(),
				any(),
			]);
		});

		it('rejects unterminated groups', () => {
			expect(() => invoke([
				PARSED.beginAgents(['A', 'B']),
				PARSED.groupBegin('Bar', ['A', 'B'], {label: 'Foo'}),
			])).toThrow(new Error('Unterminated group'));
		});

		it('uses group agent list when positioning bounds', () => {
			const sequence = invoke([
				PARSED.beginAgents(['A', 'B', 'C', 'D']),
				PARSED.groupBegin('Bar', ['B', 'C'], {label: 'Foo'}),
				PARSED.endAgents(['Bar']),
			]);

			expect(sequence.agents).toEqual([
				GENERATED.agent('['),
				GENERATED.agent('A'),
				GENERATED.agent('__BLOCK0['),
				GENERATED.agent('B'),
				GENERATED.agent('C'),
				GENERATED.agent('__BLOCK0]'),
				GENERATED.agent('D'),
				GENERATED.agent(']'),
			]);
		});

		it('surrounds references with block bounds', () => {
			const sequence = invoke([
				PARSED.beginAgents(['A', 'B', 'C', 'D']),
				PARSED.blockBegin('if', ''),
				PARSED.groupBegin('Bar', ['B', 'C']),
				PARSED.endAgents(['Bar']),
				PARSED.blockEnd(),
			]);

			expect(sequence.agents).toEqual([
				GENERATED.agent('['),
				GENERATED.agent('A'),
				GENERATED.agent('__BLOCK0['),
				GENERATED.agent('__BLOCK1['),
				GENERATED.agent('B'),
				GENERATED.agent('C'),
				GENERATED.agent('__BLOCK1]'),
				GENERATED.agent('__BLOCK0]'),
				GENERATED.agent('D'),
				GENERATED.agent(']'),
			]);
		});

		it('implicitly adds contained agents to groups', () => {
			const sequence = invoke([
				PARSED.beginAgents(['A', 'B', 'C', 'D', 'E']),
				PARSED.groupBegin('Bar', ['B', 'D'], {label: 'Foo'}),
				PARSED.endAgents(['Bar']),
			]);

			expect(sequence.agents).toEqual([
				GENERATED.agent('['),
				GENERATED.agent('A'),
				GENERATED.agent('__BLOCK0['),
				GENERATED.agent('B'),
				GENERATED.agent('C'),
				GENERATED.agent('D'),
				GENERATED.agent('__BLOCK0]'),
				GENERATED.agent('E'),
				GENERATED.agent(']'),
			]);
		});

		it('repoints explicit group connectors at bounds', () => {
			const sequence = invoke([
				PARSED.beginAgents(['A', 'B', 'C', 'D']),
				PARSED.groupBegin('Bar', ['B', 'C'], {label: 'Foo'}),
				PARSED.connect(['A', 'Bar']),
				PARSED.connect(['D', 'Bar']),
				PARSED.endAgents(['Bar']),
			]);

			expect(sequence.stages).toEqual([
				any(),
				any(),
				GENERATED.connect(['A', '__BLOCK0[']),
				GENERATED.connect(['D', '__BLOCK0]']),
				any(),
				any(),
			]);
		});

		it('correctly positions new agents when repointing at bounds', () => {
			const sequence1 = invoke([
				PARSED.beginAgents(['B', 'C']),
				PARSED.groupBegin('Bar', ['B', 'C'], {label: 'Foo'}),
				PARSED.connect(['D', 'Bar']),
				PARSED.endAgents(['Bar']),
			]);

			expect(sequence1.stages).toEqual([
				any(),
				any(),
				any(),
				GENERATED.connect(['D', '__BLOCK0]']),
				any(),
				any(),
			]);

			const sequence2 = invoke([
				PARSED.beginAgents(['B', 'C']),
				PARSED.groupBegin('Bar', ['B', 'C'], {label: 'Foo'}),
				PARSED.connect(['Bar', 'D']),
				PARSED.endAgents(['Bar']),
			]);

			expect(sequence2.stages).toEqual([
				any(),
				any(),
				any(),
				GENERATED.connect(['__BLOCK0]', 'D']),
				any(),
				any(),
			]);
		});

		it('repoints explicit group notes at bounds', () => {
			const sequence = invoke([
				PARSED.beginAgents(['A', 'B', 'C', 'D']),
				PARSED.groupBegin('Bar', ['B', 'C'], {label: 'Foo'}),
				PARSED.note('note over', ['Bar']),
				PARSED.endAgents(['Bar']),
			]);

			expect(sequence.stages).toEqual([
				any(),
				any(),
				GENERATED.note('note over', ['__BLOCK0[', '__BLOCK0]']),
				any(),
				any(),
			]);
		});

		it('repoints group self-connections to right bound', () => {
			const sequence = invoke([
				PARSED.beginAgents(['A', 'B', 'C', 'D']),
				PARSED.groupBegin('Bar', ['B', 'C'], {label: 'Foo'}),
				PARSED.connect(['B', 'B']),
				PARSED.connect(['Bar', 'Bar']),
				PARSED.endAgents(['Bar']),
			]);

			expect(sequence.stages).toEqual([
				any(),
				any(),
				GENERATED.connectDelayBegin(['__BLOCK0]', '__BLOCK0]']),
				GENERATED.connectDelayEnd(),
				GENERATED.connectDelayBegin(['__BLOCK0]', '__BLOCK0]']),
				GENERATED.connectDelayEnd(),
				any(),
				any(),
			]);
		});

		it('rejects using an agent in multiple groups simultaneously', () => {
			expect(() => invoke([
				PARSED.groupBegin('Bar', ['A', 'B'], {label: 'Foo'}),
				PARSED.groupBegin('Baz', ['B', 'C'], {label: 'Foob'}),
				PARSED.endAgents(['Bar']),
				PARSED.endAgents(['Baz']),
			])).toThrow(new Error('Agent B is in a group at line 1'));
		});

		it('rejects explicit group connectors after ending', () => {
			expect(() => invoke([
				PARSED.groupBegin('Bar', ['A'], {label: 'Foo'}),
				PARSED.endAgents(['Bar']),
				PARSED.connect(['B', 'Bar']),
			])).toThrow(new Error('Duplicate agent name: Bar at line 1'));
		});

		it('rejects notes over groups after ending', () => {
			expect(() => invoke([
				PARSED.groupBegin('Bar', ['A'], {label: 'Foo'}),
				PARSED.endAgents(['Bar']),
				PARSED.note('note over', ['Bar']),
			])).toThrow(new Error('Duplicate agent name: Bar at line 1'));
		});

		it('repoints implicit group connectors at bounds', () => {
			const sequence = invoke([
				PARSED.beginAgents(['A', 'B', 'C', 'D']),
				PARSED.groupBegin('Bar', ['B', 'C'], {label: 'Foo'}),
				PARSED.connect(['A', 'C']),
				PARSED.connect(['D', 'C']),
				PARSED.endAgents(['Bar']),
			]);

			expect(sequence.stages).toEqual([
				any(),
				any(),
				GENERATED.connect(['A', '__BLOCK0[']),
				GENERATED.connect(['D', '__BLOCK0]']),
				any(),
				any(),
			]);
		});

		it('does not repoint implicit group connectors after ending', () => {
			const sequence = invoke([
				PARSED.beginAgents(['A', 'B', 'C', 'D']),
				PARSED.groupBegin('Bar', ['B', 'C'], {label: 'Foo'}),
				PARSED.endAgents(['Bar']),
				PARSED.connect(['A', 'C']),
				PARSED.connect(['D', 'C']),
			]);

			expect(sequence.stages).toEqual([
				any(),
				any(),
				any(),
				GENERATED.connect(['A', 'C']),
				GENERATED.connect(['D', 'C']),
				any(),
			]);
		});

		it('can connect multiple reference blocks', () => {
			const sequence = invoke([
				PARSED.beginAgents(['A', 'B', 'C', 'D']),
				PARSED.groupBegin('AB', ['A', 'B'], {label: 'Foo'}),
				PARSED.groupBegin('CD', ['C', 'D'], {label: 'Foo'}),
				PARSED.connect(['AB', 'CD']),
				PARSED.connect(['CD', 'AB']),
				PARSED.endAgents(['AB']),
				PARSED.endAgents(['CD']),
			]);

			expect(sequence.stages).toEqual([
				any(),
				any(),
				any(),
				GENERATED.connect(['__BLOCK0]', '__BLOCK1[']),
				GENERATED.connect(['__BLOCK1[', '__BLOCK0]']),
				any(),
				any(),
				any(),
			]);
		});

		it('rejects interactions with agents involved in references', () => {
			expect(() => invoke([
				PARSED.beginAgents(['A', 'B', 'C']),
				PARSED.groupBegin('Bar', ['A', 'C']),
				PARSED.endAgents(['A']),
				PARSED.endAgents(['Bar']),
			])).toThrow(new Error('Agent A is in a group at line 1'));
		});

		it('rejects flags on agents involved in references', () => {
			expect(() => invoke([
				PARSED.beginAgents(['A', 'B', 'C', 'D']),
				PARSED.groupBegin('Bar', ['A', 'C']),
				PARSED.connect([{name: 'A', alias: '', flags: ['start']}, 'D']),
				PARSED.endAgents(['Bar']),
			])).toThrow(new Error('Agent A is in a group at line 1'));
		});

		it('rejects interactions with agents hidden beneath references', () => {
			expect(() => invoke([
				PARSED.beginAgents(['A', 'B', 'C', 'D']),
				PARSED.groupBegin('AC', ['A', 'C'], {label: 'Foo'}),
				PARSED.connect(['B', 'D']),
				PARSED.endAgents(['AC']),
			])).toThrow(new Error('Agent B is hidden behind group at line 1'));

			expect(() => invoke([
				PARSED.beginAgents(['A', 'B', 'C']),
				PARSED.groupBegin('Bar', ['A', 'C']),
				PARSED.endAgents(['B']),
				PARSED.endAgents(['Bar']),
			])).toThrow(new Error('Agent B is hidden behind group at line 1'));

			expect(() => invoke([
				PARSED.beginAgents(['A', 'B', 'C']),
				PARSED.groupBegin('Bar', ['A', 'C']),
				PARSED.note('note over', ['B']),
				PARSED.endAgents(['Bar']),
			])).toThrow(new Error('Agent B is hidden behind group at line 1'));
		});

		it('encompasses entire reference boxes in block statements', () => {
			const sequenceR = invoke([
				PARSED.beginAgents(['A', 'B', 'C', 'D']),
				PARSED.groupBegin('BC', ['B', 'C'], {label: 'Foo'}),
				PARSED.blockBegin('if', 'abc'),
				PARSED.connect(['BC', 'D']),
				PARSED.blockEnd(),
				PARSED.endAgents(['BC']),
			]);

			expect(sequenceR.agents).toEqual([
				GENERATED.agent('['),
				GENERATED.agent('A'),
				GENERATED.agent('__BLOCK1['),
				GENERATED.agent('__BLOCK0[', {anchorRight: true}),
				GENERATED.agent('B'),
				GENERATED.agent('C'),
				GENERATED.agent('__BLOCK0]', {anchorRight: false}),
				GENERATED.agent('D'),
				GENERATED.agent('__BLOCK1]'),
				GENERATED.agent(']'),
			]);

			const sequenceL = invoke([
				PARSED.beginAgents(['A', 'B', 'C', 'D']),
				PARSED.groupBegin('BC', ['B', 'C'], {label: 'Foo'}),
				PARSED.blockBegin('if', 'abc'),
				PARSED.connect(['BC', 'A']),
				PARSED.blockEnd(),
				PARSED.endAgents(['BC']),
			]);

			expect(sequenceL.agents).toEqual([
				GENERATED.agent('['),
				GENERATED.agent('__BLOCK1['),
				GENERATED.agent('A'),
				GENERATED.agent('__BLOCK0['),
				GENERATED.agent('B'),
				GENERATED.agent('C'),
				GENERATED.agent('__BLOCK0]'),
				GENERATED.agent('__BLOCK1]'),
				GENERATED.agent('D'),
				GENERATED.agent(']'),
			]);
		});

		it('allows connections between sources and references', () => {
			const sequence = invoke([
				PARSED.beginAgents(['A', 'B', 'C', 'D']),
				PARSED.groupBegin('Bar', ['B', 'C'], {label: 'Foo'}),
				PARSED.connect([PARSED.sourceAgent, 'Bar']),
				PARSED.connect(['Bar', PARSED.sourceAgent]),
				PARSED.endAgents(['Bar']),
			]);

			expect(sequence.agents).toEqual([
				GENERATED.agent('['),
				GENERATED.agent('A'),
				GENERATED.agent('__1', {
					anchorRight: true,
					isVirtualSource: true,
				}),
				GENERATED.agent('__BLOCK0['),
				GENERATED.agent('B'),
				GENERATED.agent('C'),
				GENERATED.agent('__BLOCK0]'),
				GENERATED.agent('__2', {
					anchorRight: false,
					isVirtualSource: true,
				}),
				GENERATED.agent('D'),
				GENERATED.agent(']'),
			]);
		});

		it('rejects unterminated blocks', () => {
			expect(() => invoke([
				PARSED.blockBegin('if', 'abc'),
				PARSED.connect(['A', 'B']),
			])).toThrow(new Error('Unterminated section at line 1'));

			expect(() => invoke([
				PARSED.blockBegin('if', 'abc'),
				PARSED.blockBegin('if', 'def'),
				PARSED.connect(['A', 'B']),
				PARSED.blockEnd(),
			])).toThrow(new Error('Unterminated section at line 1'));
		});

		it('rejects extra block terminations', () => {
			expect(() => invoke([
				PARSED.blockEnd(),
			])).toThrow(new Error(
				'Invalid block nesting (too many "end"s) at line 1'
			));

			expect(() => invoke([
				PARSED.blockBegin('if', 'abc'),
				PARSED.connect(['A', 'B']),
				PARSED.blockEnd({ln: 10}),
				PARSED.blockEnd({ln: 20}),
			])).toThrow(new Error(
				'Invalid block nesting (too many "end"s) at line 21'
			));
		});

		it('rejects block splitting without a block', () => {
			expect(() => invoke([
				PARSED.blockSplit('else', 'xyz'),
			])).toThrow(new Error(
				'Invalid block nesting ("else" inside global) at line 1'
			));

			expect(() => invoke([
				PARSED.blockBegin('if', 'abc'),
				PARSED.connect(['A', 'B']),
				PARSED.blockEnd(),
				PARSED.blockSplit('else', 'xyz'),
			])).toThrow(new Error(
				'Invalid block nesting ("else" inside global) at line 1'
			));
		});

		it('rejects block splitting in non-splittable blocks', () => {
			expect(() => invoke([
				PARSED.blockBegin('repeat', 'abc'),
				PARSED.blockSplit('else', 'xyz'),
				PARSED.connect(['A', 'B']),
				PARSED.blockEnd(),
			])).toThrow(new Error(
				'Invalid block nesting ("else" inside repeat) at line 1'
			));
		});

		it('passes notes through', () => {
			const sequence = invoke([
				PARSED.note('note right', ['A', 'B'], {
					mode: 'foo',
					label: 'bar',
				}),
			]);
			expect(sequence.stages).toEqual([
				any(),
				GENERATED.note('note right', ['A', 'B'], {
					mode: 'foo',
					label: 'bar!',
				}),
				any(),
			]);
		});

		it('rejects note between with a repeated agent', () => {
			expect(() => invoke([
				PARSED.note('note between', ['A', 'A'], {
					mode: 'foo',
					label: 'bar!',
				}),
			])).toThrow(new Error(
				'note between requires at least 2 agents at line 1'
			));
		});

		it('defaults to showing notes around the entire diagram', () => {
			const sequence = invoke([
				PARSED.note('note right', []),
				PARSED.note('note left', []),
				PARSED.note('note over', []),
			]);
			expect(sequence.stages).toEqual([
				GENERATED.note('note right', [']']),
				GENERATED.note('note left', ['[']),
				GENERATED.note('note over', ['[', ']']),
			]);
		});

		it('rejects creating agents with the same name as a group', () => {
			expect(() => invoke([
				PARSED.groupBegin('Bar', ['A', 'B'], {label: 'Foo'}),
				PARSED.endAgents(['Bar']),
				PARSED.beginAgents(['Bar']),
				PARSED.endAgents(['Bar']),
			])).toThrow(new Error('Duplicate agent name: Bar at line 1'));

			expect(() => invoke([
				PARSED.beginAgents(['Bar']),
				PARSED.endAgents(['Bar']),
				PARSED.groupBegin('Bar', ['A', 'B'], {label: 'Foo'}),
				PARSED.endAgents(['Bar']),
			])).toThrow(new Error('Duplicate agent name: Bar at line 1'));
		});

		it('rejects explicit interactions with virtual group agents', () => {
			expect(() => invoke([
				PARSED.groupBegin('Bar', ['A', 'B'], {label: 'Foo'}),
				PARSED.connect(['C', '__BLOCK0[']),
				PARSED.endAgents(['Bar']),
			])).toThrow(new Error('__BLOCK0[ is a reserved name at line 1'));

			expect(() => invoke([
				PARSED.groupBegin('Bar', ['A', 'B'], {label: 'Foo'}),
				PARSED.endAgents(['Bar']),
				PARSED.connect(['C', '__BLOCK0[']),
			])).toThrow(new Error('__BLOCK0[ is a reserved name at line 1'));

			expect(() => invoke([
				PARSED.connect(['C', '__BLOCK0[']),
				PARSED.groupBegin('Bar', ['A', 'B'], {label: 'Foo'}),
				PARSED.endAgents(['Bar']),
			])).toThrow(new Error('__BLOCK0[ is a reserved name at line 1'));
		});

		it('rejects explicit interactions with virtual block agents', () => {
			expect(() => invoke([
				PARSED.blockBegin('if', 'abc'),
				PARSED.connect(['C', '__BLOCK0[']),
				PARSED.blockEnd(),
			])).toThrow(new Error('__BLOCK0[ is a reserved name at line 1'));

			expect(() => invoke([
				PARSED.blockBegin('if', 'abc'),
				PARSED.connect(['A', 'B']),
				PARSED.blockEnd(),
				PARSED.connect(['C', '__BLOCK0[']),
			])).toThrow(new Error('__BLOCK0[ is a reserved name at line 1'));

			expect(() => invoke([
				PARSED.connect(['C', '__BLOCK0[']),
				PARSED.blockBegin('if', 'abc'),
				PARSED.connect(['A', 'B']),
				PARSED.blockEnd(),
			])).toThrow(new Error('__BLOCK0[ is a reserved name at line 1'));
		});

		it('rejects attempts to change virtual agents', () => {
			expect(() => invoke([
				PARSED.beginAgents(['[']),
			])).toThrow(new Error('Cannot begin/end agent: [ at line 1'));

			expect(() => invoke([
				PARSED.beginAgents([']']),
			])).toThrow(new Error('Cannot begin/end agent: ] at line 1'));

			expect(() => invoke([
				PARSED.endAgents(['[']),
			])).toThrow(new Error('Cannot begin/end agent: [ at line 1'));

			expect(() => invoke([
				PARSED.endAgents([']']),
			])).toThrow(new Error('Cannot begin/end agent: ] at line 1'));
		});
	});
});
