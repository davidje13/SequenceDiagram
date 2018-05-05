import SequenceDiagram from '../SequenceDiagram.mjs';

const CM = window.CodeMirror;

describe('Code Mirror Mode', () => {
	SequenceDiagram.registerCodeMirrorMode(CM);

	const cm = new CM(null, {
		globals: {
			themes: ['Theme', 'Other Theme'],
		},
		mode: 'sequence',
		value: '',
	});

	function getTokens(line) {
		return cm.getLineTokens(line).map((token) => ({
			type: token.type,
			v: token.string,
		}));
	}

	describe('colouring', () => {
		it('highlights comments', () => {
			cm.getDoc().setValue('# foo');

			expect(getTokens(0)).toEqual([
				{type: 'comment', v: '# foo'},
			]);
		});

		it('highlights valid keywords', () => {
			cm.getDoc().setValue('terminators cross');

			expect(getTokens(0)).toEqual([
				{type: 'keyword', v: 'terminators'},
				{type: 'keyword', v: ' cross'},
			]);
		});

		it('highlights comments after content', () => {
			cm.getDoc().setValue('terminators cross # foo');

			expect(getTokens(0)).toEqual([
				{type: 'keyword', v: 'terminators'},
				{type: 'keyword', v: ' cross'},
				{type: 'comment', v: ' # foo'},
			]);
		});

		it('highlights invalid lines', () => {
			cm.getDoc().setValue('terminators huh');

			expect(getTokens(0)[1].type).toContain('line-error');
		});

		it('highlights incomplete lines', () => {
			cm.getDoc().setValue('terminators');

			expect(getTokens(0)[0].type).toContain('line-error');
		});

		it('highlights free text', () => {
			cm.getDoc().setValue('title my free text');

			expect(getTokens(0)).toEqual([
				{type: 'keyword', v: 'title'},
				{type: 'string', v: ' my'},
				{type: 'string', v: ' free'},
				{type: 'string', v: ' text'},
			]);
		});

		it('highlights quoted text', () => {
			cm.getDoc().setValue('title "my free text"');

			expect(getTokens(0)).toEqual([
				{type: 'keyword', v: 'title'},
				{type: 'string', v: ' "my free text"'},
			]);
		});

		it('highlights agent names', () => {
			cm.getDoc().setValue('A -> B');

			expect(getTokens(0)).toEqual([
				{type: 'variable', v: 'A'},
				{type: 'keyword', v: ' ->'},
				{type: 'variable', v: ' B'},
			]);
		});

		it('highlights parallel statements', () => {
			cm.getDoc().setValue('& A -> B');

			expect(getTokens(0)).toEqual([
				{type: 'keyword', v: '&'},
				{type: 'variable', v: ' A'},
				{type: 'keyword', v: ' ->'},
				{type: 'variable', v: ' B'},
			]);
		});

		it('highlights invalid parallel statements', () => {
			cm.getDoc().setValue('& terminators cross');

			expect(getTokens(0)[2].type).toContain('line-error');
		});

		it('does not consider quoted tokens as keywords', () => {
			cm.getDoc().setValue('A "->" -> B');

			expect(getTokens(0)).toEqual([
				{type: 'variable', v: 'A'},
				{type: 'variable', v: ' "->"'},
				{type: 'keyword', v: ' ->'},
				{type: 'variable', v: ' B'},
			]);
		});

		it('highlights agent aliasing syntax', () => {
			cm.getDoc().setValue('define A as B, C as D');

			expect(getTokens(0)).toEqual([
				{type: 'keyword', v: 'define'},
				{type: 'variable', v: ' A'},
				{type: 'keyword', v: ' as'},
				{type: 'variable', v: ' B'},
				{type: 'operator', v: ','},
				{type: 'variable', v: ' C'},
				{type: 'keyword', v: ' as'},
				{type: 'variable', v: ' D'},
			]);
		});

		it('highlights multi-word agent names', () => {
			cm.getDoc().setValue('Foo Bar -> Zig Zag');

			expect(getTokens(0)).toEqual([
				{type: 'variable', v: 'Foo'},
				{type: 'variable', v: ' Bar'},
				{type: 'keyword', v: ' ->'},
				{type: 'variable', v: ' Zig'},
				{type: 'variable', v: ' Zag'},
			]);
		});

		it('highlights connection operators without spaces', () => {
			cm.getDoc().setValue('abc->xyz');

			expect(getTokens(0)).toEqual([
				{type: 'variable', v: 'abc'},
				{type: 'keyword', v: '->'},
				{type: 'variable', v: 'xyz'},
			]);
		});

		it('highlights the lost message operator without spaces', () => {
			cm.getDoc().setValue('abc-xxyz');

			expect(getTokens(0)).toEqual([
				{type: 'variable', v: 'abc'},
				{type: 'keyword', v: '-x'},
				{type: 'variable', v: 'xyz'},
			]);
		});

		it('recognises agent flags on the right', () => {
			cm.getDoc().setValue('Foo -> *Bar');

			expect(getTokens(0)).toEqual([
				{type: 'variable', v: 'Foo'},
				{type: 'keyword', v: ' ->'},
				{type: 'operator', v: ' *'},
				{type: 'variable', v: 'Bar'},
			]);
		});

		it('recognises agent flags on the left', () => {
			cm.getDoc().setValue('*Foo -> Bar');

			expect(getTokens(0)).toEqual([
				{type: 'operator', v: '*'},
				{type: 'variable', v: 'Foo'},
				{type: 'keyword', v: ' ->'},
				{type: 'variable', v: ' Bar'},
			]);
		});

		it('rejects missing agent names', () => {
			cm.getDoc().setValue('+ -> Bar');

			expect(getTokens(0)[2].type).toContain('line-error');

			cm.getDoc().setValue('Bar -> +');

			expect(getTokens(0)[2].type).toContain('line-error');
		});

		it('recognises found messages', () => {
			cm.getDoc().setValue('* -> Bar');

			expect(getTokens(0)[2].type).not.toContain('line-error');

			cm.getDoc().setValue('Bar <- *');

			expect(getTokens(0)[2].type).not.toContain('line-error');
		});

		it('recognises combined agent flags', () => {
			cm.getDoc().setValue('Foo -> +*Bar');

			expect(getTokens(0)).toEqual([
				{type: 'variable', v: 'Foo'},
				{type: 'keyword', v: ' ->'},
				{type: 'operator', v: ' +'},
				{type: 'operator', v: '*'},
				{type: 'variable', v: 'Bar'},
			]);
		});

		it('allows messages after connections', () => {
			cm.getDoc().setValue('Foo -> Bar: hello');

			expect(getTokens(0)).toEqual([
				{type: 'variable', v: 'Foo'},
				{type: 'keyword', v: ' ->'},
				{type: 'variable', v: ' Bar'},
				{type: 'operator', v: ':'},
				{type: 'string', v: ' hello'},
			]);
		});

		it('recognises invalid agent flag combinations', () => {
			cm.getDoc().setValue('Foo -> *!Bar');

			expect(getTokens(0)[3].type).toContain('line-error');

			cm.getDoc().setValue('Foo -> +-Bar');

			expect(getTokens(0)[3].type).toContain('line-error');

			cm.getDoc().setValue('Foo -> +*-Bar');

			expect(getTokens(0)[4].type).toContain('line-error');
		});

		it('highlights delayed message syntax', () => {
			cm.getDoc().setValue('A -> ...x\n...x -> B: hello');

			expect(getTokens(0)).toEqual([
				{type: 'variable', v: 'A'},
				{type: 'keyword', v: ' ->'},
				{type: 'operator', v: ' ...'},
				{type: 'variable', v: 'x'},
			]);

			expect(getTokens(1)).toEqual([
				{type: 'operator', v: '...'},
				{type: 'variable', v: 'x'},
				{type: 'keyword', v: ' ->'},
				{type: 'variable', v: ' B'},
				{type: 'operator', v: ':'},
				{type: 'string', v: ' hello'},
			]);
		});

		it('recognises invalid delayed messages', () => {
			cm.getDoc().setValue('A -> ...x: hello');

			expect(getTokens(0)[4].type).toContain('line-error');
		});

		it('highlights block statements', () => {
			cm.getDoc().setValue(
				'if\n' +
				'if something\n' +
				'else if another thing\n' +
				'else\n' +
				'end\n' +
				'repeat a few times\n' +
				'group foo\n'
			);

			expect(getTokens(0)).toEqual([
				{type: 'keyword', v: 'if'},
			]);

			expect(getTokens(1)).toEqual([
				{type: 'keyword', v: 'if'},
				{type: 'string', v: ' something'},
			]);

			expect(getTokens(2)).toEqual([
				{type: 'keyword', v: 'else'},
				{type: 'keyword', v: ' if'},
				{type: 'string', v: ' another'},
				{type: 'string', v: ' thing'},
			]);

			expect(getTokens(3)).toEqual([
				{type: 'keyword', v: 'else'},
			]);

			expect(getTokens(4)).toEqual([
				{type: 'keyword', v: 'end'},
			]);

			expect(getTokens(5)).toEqual([
				{type: 'keyword', v: 'repeat'},
				{type: 'string', v: ' a'},
				{type: 'string', v: ' few'},
				{type: 'string', v: ' times'},
			]);

			expect(getTokens(6)).toEqual([
				{type: 'keyword', v: 'group'},
				{type: 'string', v: ' foo'},
			]);
		});

		it('allows colons in block statements', () => {
			cm.getDoc().setValue(
				'if: something\n' +
				'else if: another thing\n' +
				'repeat: a few times'
			);

			expect(getTokens(0)).toEqual([
				{type: 'keyword', v: 'if'},
				{type: 'operator', v: ':'},
				{type: 'string', v: ' something'},
			]);

			expect(getTokens(1)).toEqual([
				{type: 'keyword', v: 'else'},
				{type: 'keyword', v: ' if'},
				{type: 'operator', v: ':'},
				{type: 'string', v: ' another'},
				{type: 'string', v: ' thing'},
			]);

			expect(getTokens(2)).toEqual([
				{type: 'keyword', v: 'repeat'},
				{type: 'operator', v: ':'},
				{type: 'string', v: ' a'},
				{type: 'string', v: ' few'},
				{type: 'string', v: ' times'},
			]);
		});

		it('highlights note statements', () => {
			cm.getDoc().setValue(
				'note over A: hi\n' +
				'note over A, B: hi\n' +
				'note left of A, B: hi\n' +
				'note right of A, B: hi\n' +
				'note between A, B: hi'
			);

			expect(getTokens(0)).toEqual([
				{type: 'keyword', v: 'note'},
				{type: 'keyword', v: ' over'},
				{type: 'variable', v: ' A'},
				{type: 'operator', v: ':'},
				{type: 'string', v: ' hi'},
			]);

			expect(getTokens(1)).toEqual([
				{type: 'keyword', v: 'note'},
				{type: 'keyword', v: ' over'},
				{type: 'variable', v: ' A'},
				{type: 'operator', v: ','},
				{type: 'variable', v: ' B'},
				{type: 'operator', v: ':'},
				{type: 'string', v: ' hi'},
			]);

			expect(getTokens(2)).toEqual([
				{type: 'keyword', v: 'note'},
				{type: 'keyword', v: ' left'},
				{type: 'keyword', v: ' of'},
				{type: 'variable', v: ' A'},
				{type: 'operator', v: ','},
				{type: 'variable', v: ' B'},
				{type: 'operator', v: ':'},
				{type: 'string', v: ' hi'},
			]);

			expect(getTokens(3)).toEqual([
				{type: 'keyword', v: 'note'},
				{type: 'keyword', v: ' right'},
				{type: 'keyword', v: ' of'},
				{type: 'variable', v: ' A'},
				{type: 'operator', v: ','},
				{type: 'variable', v: ' B'},
				{type: 'operator', v: ':'},
				{type: 'string', v: ' hi'},
			]);

			expect(getTokens(4)).toEqual([
				{type: 'keyword', v: 'note'},
				{type: 'keyword', v: ' between'},
				{type: 'variable', v: ' A'},
				{type: 'operator', v: ','},
				{type: 'variable', v: ' B'},
				{type: 'operator', v: ':'},
				{type: 'string', v: ' hi'},
			]);
		});

		it('rejects notes between a single agent', () => {
			cm.getDoc().setValue('note between A: hi');

			expect(getTokens(0)[3].type).toContain('line-error');
		});

		it('highlights state statements', () => {
			cm.getDoc().setValue('state over A: hi');

			expect(getTokens(0)).toEqual([
				{type: 'keyword', v: 'state'},
				{type: 'keyword', v: ' over'},
				{type: 'variable', v: ' A'},
				{type: 'operator', v: ':'},
				{type: 'string', v: ' hi'},
			]);
		});

		it('rejects state over multiple agents', () => {
			cm.getDoc().setValue('state over A, B: hi');

			expect(getTokens(0)[3].type).toContain('line-error');
		});

		it('highlights divider statements', () => {
			cm.getDoc().setValue('divider tear with height 60: stuff');

			expect(getTokens(0)).toEqual([
				{type: 'keyword', v: 'divider'},
				{type: 'keyword', v: ' tear'},
				{type: 'keyword', v: ' with'},
				{type: 'keyword', v: ' height'},
				{type: 'number', v: ' 60'},
				{type: 'operator', v: ':'},
				{type: 'string', v: ' stuff'},
			]);
		});

		it('highlights agent info statements', () => {
			cm.getDoc().setValue('A is a red database');

			expect(getTokens(0)).toEqual([
				{type: 'variable', v: 'A'},
				{type: 'keyword', v: ' is'},
				{type: 'keyword', v: ' a'},
				{type: 'keyword', v: ' red'},
				{type: 'keyword', v: ' database'},
			]);
		});

		it('rejects unknown info statements', () => {
			cm.getDoc().setValue('A is a foobar');

			expect(getTokens(0)[3].type).toContain('line-error');
		});

		it('resets error handling on new lines with comments', () => {
			cm.getDoc().setValue('nope\n#foo');

			expect(getTokens(0)[0].type).toContain('line-error');
			expect(getTokens(1)[0].type).not.toContain('line-error');
		});
	});

	describe('autocomplete', () => {
		function getHints(pos, {completeSingle = true} = {}) {
			const [hintFn] = cm.getHelpers(pos, 'hint');
			cm.setCursor(pos);
			return hintFn(cm, Object.assign({completeSingle}, cm.options));
		}

		function getHintTexts(pos, options) {
			const hints = getHints(pos, options);
			return hints.list.map((hint) => hint.text);
		}

		it('suggests commands when used at the start of a line', () => {
			cm.getDoc().setValue('');
			const hints = getHintTexts({ch: 0, line: 0});

			expect(hints).toContain('theme ');
			expect(hints).toContain('title ');
			expect(hints).toContain('headers ');
			expect(hints).toContain('terminators ');
			expect(hints).toContain('divider ');
			expect(hints).toContain('define ');
			expect(hints).toContain('begin ');
			expect(hints).toContain('end ');
			expect(hints).toContain('if ');
			expect(hints).toContain('else\n');
			expect(hints).toContain('else if: ');
			expect(hints).toContain('repeat ');
			expect(hints).toContain('group ');
			expect(hints).toContain('note ');
			expect(hints).toContain('state over ');
			expect(hints).toContain('text ');
			expect(hints).toContain('autolabel ');
			expect(hints).toContain('simultaneously ');
		});

		it('ignores indentation', () => {
			cm.getDoc().setValue('  ');
			const hints = getHintTexts({ch: 2, line: 0});

			expect(hints).toContain('theme ');
			expect(hints).toContain('title ');
		});

		it('suggests known header types', () => {
			cm.getDoc().setValue('headers ');
			const hints = getHintTexts({ch: 8, line: 0});

			expect(hints).toEqual([
				'none\n',
				'cross\n',
				'box\n',
				'fade\n',
				'bar\n',
			]);
		});

		it('suggests known terminator types', () => {
			cm.getDoc().setValue('terminators ');
			const hints = getHintTexts({ch: 12, line: 0});

			expect(hints).toEqual([
				'none\n',
				'cross\n',
				'box\n',
				'fade\n',
				'bar\n',
			]);
		});

		it('suggests divider types', () => {
			cm.getDoc().setValue('divider ');
			const hints = getHintTexts({ch: 8, line: 0});

			expect(hints).toEqual([
				'line ',
				'space ',
				'delay ',
				'tear ',
				'\n',
				': ',
				'with height ',
			]);
		});

		it('suggests divider sizes', () => {
			cm.getDoc().setValue('divider space with height ');
			const hints = getHintTexts({ch: 26, line: 0});

			expect(hints).toEqual([
				'6 ',
				'30 ',
			]);
		});

		it('suggests useful autolabel values', () => {
			cm.getDoc().setValue('autolabel ');
			const hints = getHintTexts({ch: 10, line: 0});

			expect(hints).toContain('off\n');
			expect(hints).toContain('"<label>"\n');
			expect(hints).toContain('"[<inc>] <label>"\n');
		});

		it('suggests note positioning', () => {
			cm.getDoc().setValue('note ');
			const hints = getHintTexts({ch: 5, line: 0});

			expect(hints).toEqual([
				'over ',
				'left of ',
				'left: ',
				'right of ',
				'right: ',
				'between ',
			]);
		});

		it('filters suggestions', () => {
			cm.getDoc().setValue('term');
			const hints = getHintTexts({ch: 4, line: 0});

			expect(hints).toEqual(['terminators ']);
		});

		it('suggests known agent names and flags', () => {
			cm.getDoc().setValue('Foo -> ');
			const hints = getHintTexts({ch: 7, line: 0});

			expect(hints).toEqual([
				'+ ',
				'- ',
				'* ',
				'! ',
				'Foo ',
				'... ',
			]);
		});

		it('only suggests valid flag combinations', () => {
			cm.getDoc().setValue('Foo -> + ');
			const hints = getHintTexts({ch: 10, line: 0});

			expect(hints).toContain('* ');
			expect(hints).not.toContain('! ');
			expect(hints).not.toContain('+ ');
			expect(hints).not.toContain('- ');
			expect(hints).toContain('Foo ');
		});

		it('suggests known agent names at the start of lines', () => {
			cm.getDoc().setValue('Foo -> Bar\n');
			const hints = getHintTexts({ch: 0, line: 1});

			expect(hints).toContain('Foo ');
			expect(hints).toContain('Bar ');
		});

		it('suggests known labels', () => {
			cm.getDoc().setValue('Abc:\nsimultaneously with ');
			const hints = getHintTexts({ch: 20, line: 1});

			expect(hints).toEqual(['Abc ']);
		});

		it('suggests known themes', () => {
			cm.getDoc().setValue('theme ');
			const hints = getHintTexts({ch: 6, line: 0});

			expect(hints).toEqual(['Theme\n', 'Other Theme\n']);
		});

		it('suggests filtered multi-word themes', () => {
			cm.getDoc().setValue('theme Other ');
			const hints = getHintTexts({ch: 12, line: 0});

			expect(hints).toContain('Other Theme\n');
			expect(hints).not.toContain('Theme\n');
		});

		it('suggests multi-word agents', () => {
			cm.getDoc().setValue('Zig Zag -> Meh\nFoo Bar -> ');
			const hints = getHintTexts({ch: 11, line: 1});

			expect(hints).toContain('Zig Zag ');
			expect(hints).toContain('Meh ');
			expect(hints).toContain('Foo Bar ');
		});

		it('suggests quoted agent names if a quote is typed', () => {
			cm.getDoc().setValue('Zig Zag -> Meh\nFoo Bar -> "');
			const hints = getHintTexts({ch: 12, line: 1});

			expect(hints).toEqual([
				'"Zig Zag" ',
				'"Meh" ',
				'"Foo Bar" ',
			]);
		});

		it('suggests filtered multi-word agents', () => {
			cm.getDoc().setValue('Zig Zag -> Meh\nFoo Bar -> Foo ');
			const hints = getHintTexts({ch: 15, line: 1});

			expect(hints).toContain('Foo Bar ');
			expect(hints).not.toContain('Zig Zag ');
			expect(hints).not.toContain('Meh ');
		});

		it('suggests quoted names where required', () => {
			cm.getDoc().setValue('"Zig -> Zag" -> ');
			const hints = getHintTexts({ch: 16, line: 0});

			expect(hints).toContain('"Zig -> Zag" ');
		});

		it('filters quoted names ignoring quotes', () => {
			cm.getDoc().setValue('"Zig -> Zag" -> Zig');
			let hints = getHintTexts({ch: 19, line: 0});

			expect(hints).toContain('"Zig -> Zag" ');

			cm.getDoc().setValue('"Zig -> Zag" -> Zag');
			hints = getHintTexts({ch: 19, line: 0});

			expect(hints).not.toContain('"Zig -> Zag" ');
		});

		it('suggests known delayed agents', () => {
			cm.getDoc().setValue('A -> ...woo\n... ');
			const hints = getHintTexts({ch: 4, line: 1});

			expect(hints).toEqual(['woo ']);
		});

		it('suggests agent properties', () => {
			cm.getDoc().setValue('A is a ');
			const hints = getHintTexts({ch: 7, line: 0});

			expect(hints).toContain('database ');
			expect(hints).toContain('red ');
			expect(hints).not.toContain('\n');
		});

		it('suggests indefinite articles for agent properties', () => {
			cm.getDoc().setValue('A is ');
			const hints = getHintTexts({ch: 5, line: 0});

			expect(hints).toContain('database ');
			expect(hints).toContain('a ');
			expect(hints).toContain('an ');
			expect(hints).not.toContain('\n');
		});

		it('suggests more agent properties after the first', () => {
			cm.getDoc().setValue('A is a red ');
			const hints = getHintTexts({ch: 11, line: 0});

			expect(hints).toContain('database ');
			expect(hints).toContain('\n');
			expect(hints).not.toContain('a ');
			expect(hints).not.toContain('an ');
		});
	});
});
