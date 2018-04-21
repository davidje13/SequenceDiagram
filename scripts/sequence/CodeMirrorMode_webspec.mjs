/* eslint-disable max-lines */
/* eslint-disable max-statements */
/* eslint-disable sort-keys */ // Maybe later

import SequenceDiagram from './SequenceDiagram.mjs';

const CM = window.CodeMirror;

describe('Code Mirror Mode', () => {
	SequenceDiagram.registerCodeMirrorMode(CM);

	const cm = new CM(null, {
		value: '',
		mode: 'sequence',
		globals: {
			themes: ['Theme', 'Other Theme'],
		},
	});

	function getTokens(line) {
		return cm.getLineTokens(line).map((token) => ({
			v: token.string,
			type: token.type,
		}));
	}

	describe('colouring', () => {
		it('highlights comments', () => {
			cm.getDoc().setValue('# foo');

			expect(getTokens(0)).toEqual([
				{v: '# foo', type: 'comment'},
			]);
		});

		it('highlights valid keywords', () => {
			cm.getDoc().setValue('terminators cross');

			expect(getTokens(0)).toEqual([
				{v: 'terminators', type: 'keyword'},
				{v: ' cross', type: 'keyword'},
			]);
		});

		it('highlights comments after content', () => {
			cm.getDoc().setValue('terminators cross # foo');

			expect(getTokens(0)).toEqual([
				{v: 'terminators', type: 'keyword'},
				{v: ' cross', type: 'keyword'},
				{v: ' # foo', type: 'comment'},
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
				{v: 'title', type: 'keyword'},
				{v: ' my', type: 'string'},
				{v: ' free', type: 'string'},
				{v: ' text', type: 'string'},
			]);
		});

		it('highlights quoted text', () => {
			cm.getDoc().setValue('title "my free text"');

			expect(getTokens(0)).toEqual([
				{v: 'title', type: 'keyword'},
				{v: ' "my free text"', type: 'string'},
			]);
		});

		it('highlights agent names', () => {
			cm.getDoc().setValue('A -> B');

			expect(getTokens(0)).toEqual([
				{v: 'A', type: 'variable'},
				{v: ' ->', type: 'keyword'},
				{v: ' B', type: 'variable'},
			]);
		});

		it('does not consider quoted tokens as keywords', () => {
			cm.getDoc().setValue('A "->" -> B');

			expect(getTokens(0)).toEqual([
				{v: 'A', type: 'variable'},
				{v: ' "->"', type: 'variable'},
				{v: ' ->', type: 'keyword'},
				{v: ' B', type: 'variable'},
			]);
		});

		it('highlights agent aliasing syntax', () => {
			cm.getDoc().setValue('define A as B, C as D');

			expect(getTokens(0)).toEqual([
				{v: 'define', type: 'keyword'},
				{v: ' A', type: 'variable'},
				{v: ' as', type: 'keyword'},
				{v: ' B', type: 'variable'},
				{v: ',', type: 'operator'},
				{v: ' C', type: 'variable'},
				{v: ' as', type: 'keyword'},
				{v: ' D', type: 'variable'},
			]);
		});

		it('highlights multi-word agent names', () => {
			cm.getDoc().setValue('Foo Bar -> Zig Zag');

			expect(getTokens(0)).toEqual([
				{v: 'Foo', type: 'variable'},
				{v: ' Bar', type: 'variable'},
				{v: ' ->', type: 'keyword'},
				{v: ' Zig', type: 'variable'},
				{v: ' Zag', type: 'variable'},
			]);
		});

		it('highlights connection operators without spaces', () => {
			cm.getDoc().setValue('abc->xyz');

			expect(getTokens(0)).toEqual([
				{v: 'abc', type: 'variable'},
				{v: '->', type: 'keyword'},
				{v: 'xyz', type: 'variable'},
			]);
		});

		it('highlights the lost message operator without spaces', () => {
			cm.getDoc().setValue('abc-xxyz');

			expect(getTokens(0)).toEqual([
				{v: 'abc', type: 'variable'},
				{v: '-x', type: 'keyword'},
				{v: 'xyz', type: 'variable'},
			]);
		});

		it('recognises agent flags on the right', () => {
			cm.getDoc().setValue('Foo -> *Bar');

			expect(getTokens(0)).toEqual([
				{v: 'Foo', type: 'variable'},
				{v: ' ->', type: 'keyword'},
				{v: ' *', type: 'operator'},
				{v: 'Bar', type: 'variable'},
			]);
		});

		it('recognises agent flags on the left', () => {
			cm.getDoc().setValue('*Foo -> Bar');

			expect(getTokens(0)).toEqual([
				{v: '*', type: 'operator'},
				{v: 'Foo', type: 'variable'},
				{v: ' ->', type: 'keyword'},
				{v: ' Bar', type: 'variable'},
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
				{v: 'Foo', type: 'variable'},
				{v: ' ->', type: 'keyword'},
				{v: ' +', type: 'operator'},
				{v: '*', type: 'operator'},
				{v: 'Bar', type: 'variable'},
			]);
		});

		it('allows messages after connections', () => {
			cm.getDoc().setValue('Foo -> Bar: hello');

			expect(getTokens(0)).toEqual([
				{v: 'Foo', type: 'variable'},
				{v: ' ->', type: 'keyword'},
				{v: ' Bar', type: 'variable'},
				{v: ':', type: 'operator'},
				{v: ' hello', type: 'string'},
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
				{v: 'A', type: 'variable'},
				{v: ' ->', type: 'keyword'},
				{v: ' ...', type: 'operator'},
				{v: 'x', type: 'variable'},
			]);

			expect(getTokens(1)).toEqual([
				{v: '...', type: 'operator'},
				{v: 'x', type: 'variable'},
				{v: ' ->', type: 'keyword'},
				{v: ' B', type: 'variable'},
				{v: ':', type: 'operator'},
				{v: ' hello', type: 'string'},
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
				{v: 'if', type: 'keyword'},
			]);

			expect(getTokens(1)).toEqual([
				{v: 'if', type: 'keyword'},
				{v: ' something', type: 'string'},
			]);

			expect(getTokens(2)).toEqual([
				{v: 'else', type: 'keyword'},
				{v: ' if', type: 'keyword'},
				{v: ' another', type: 'string'},
				{v: ' thing', type: 'string'},
			]);

			expect(getTokens(3)).toEqual([
				{v: 'else', type: 'keyword'},
			]);

			expect(getTokens(4)).toEqual([
				{v: 'end', type: 'keyword'},
			]);

			expect(getTokens(5)).toEqual([
				{v: 'repeat', type: 'keyword'},
				{v: ' a', type: 'string'},
				{v: ' few', type: 'string'},
				{v: ' times', type: 'string'},
			]);

			expect(getTokens(6)).toEqual([
				{v: 'group', type: 'keyword'},
				{v: ' foo', type: 'string'},
			]);
		});

		it('allows colons in block statements', () => {
			cm.getDoc().setValue(
				'if: something\n' +
				'else if: another thing\n' +
				'repeat: a few times'
			);

			expect(getTokens(0)).toEqual([
				{v: 'if', type: 'keyword'},
				{v: ':', type: 'operator'},
				{v: ' something', type: 'string'},
			]);

			expect(getTokens(1)).toEqual([
				{v: 'else', type: 'keyword'},
				{v: ' if', type: 'keyword'},
				{v: ':', type: 'operator'},
				{v: ' another', type: 'string'},
				{v: ' thing', type: 'string'},
			]);

			expect(getTokens(2)).toEqual([
				{v: 'repeat', type: 'keyword'},
				{v: ':', type: 'operator'},
				{v: ' a', type: 'string'},
				{v: ' few', type: 'string'},
				{v: ' times', type: 'string'},
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
				{v: 'note', type: 'keyword'},
				{v: ' over', type: 'keyword'},
				{v: ' A', type: 'variable'},
				{v: ':', type: 'operator'},
				{v: ' hi', type: 'string'},
			]);

			expect(getTokens(1)).toEqual([
				{v: 'note', type: 'keyword'},
				{v: ' over', type: 'keyword'},
				{v: ' A', type: 'variable'},
				{v: ',', type: 'operator'},
				{v: ' B', type: 'variable'},
				{v: ':', type: 'operator'},
				{v: ' hi', type: 'string'},
			]);

			expect(getTokens(2)).toEqual([
				{v: 'note', type: 'keyword'},
				{v: ' left', type: 'keyword'},
				{v: ' of', type: 'keyword'},
				{v: ' A', type: 'variable'},
				{v: ',', type: 'operator'},
				{v: ' B', type: 'variable'},
				{v: ':', type: 'operator'},
				{v: ' hi', type: 'string'},
			]);

			expect(getTokens(3)).toEqual([
				{v: 'note', type: 'keyword'},
				{v: ' right', type: 'keyword'},
				{v: ' of', type: 'keyword'},
				{v: ' A', type: 'variable'},
				{v: ',', type: 'operator'},
				{v: ' B', type: 'variable'},
				{v: ':', type: 'operator'},
				{v: ' hi', type: 'string'},
			]);

			expect(getTokens(4)).toEqual([
				{v: 'note', type: 'keyword'},
				{v: ' between', type: 'keyword'},
				{v: ' A', type: 'variable'},
				{v: ',', type: 'operator'},
				{v: ' B', type: 'variable'},
				{v: ':', type: 'operator'},
				{v: ' hi', type: 'string'},
			]);
		});

		it('rejects notes between a single agent', () => {
			cm.getDoc().setValue('note between A: hi');

			expect(getTokens(0)[3].type).toContain('line-error');
		});

		it('highlights state statements', () => {
			cm.getDoc().setValue('state over A: hi');

			expect(getTokens(0)).toEqual([
				{v: 'state', type: 'keyword'},
				{v: ' over', type: 'keyword'},
				{v: ' A', type: 'variable'},
				{v: ':', type: 'operator'},
				{v: ' hi', type: 'string'},
			]);
		});

		it('rejects state over multiple agents', () => {
			cm.getDoc().setValue('state over A, B: hi');

			expect(getTokens(0)[3].type).toContain('line-error');
		});

		it('highlights divider statements', () => {
			cm.getDoc().setValue('divider tear with height 60: stuff');

			expect(getTokens(0)).toEqual([
				{v: 'divider', type: 'keyword'},
				{v: ' tear', type: 'keyword'},
				{v: ' with', type: 'keyword'},
				{v: ' height', type: 'keyword'},
				{v: ' 60', type: 'number'},
				{v: ':', type: 'operator'},
				{v: ' stuff', type: 'string'},
			]);
		});

		it('highlights agent info statements', () => {
			cm.getDoc().setValue('A is a red database');

			expect(getTokens(0)).toEqual([
				{v: 'A', type: 'variable'},
				{v: ' is', type: 'keyword'},
				{v: ' a', type: 'keyword'},
				{v: ' red', type: 'keyword'},
				{v: ' database', type: 'keyword'},
			]);
		});

		it('rejects unknown info statements', () => {
			cm.getDoc().setValue('A is a foobar');

			expect(getTokens(0)[3].type).toContain('line-error');
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
			const hints = getHintTexts({line: 0, ch: 0});

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
			const hints = getHintTexts({line: 0, ch: 2});

			expect(hints).toContain('theme ');
			expect(hints).toContain('title ');
		});

		it('suggests known header types', () => {
			cm.getDoc().setValue('headers ');
			const hints = getHintTexts({line: 0, ch: 8});

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
			const hints = getHintTexts({line: 0, ch: 12});

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
			const hints = getHintTexts({line: 0, ch: 8});

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
			const hints = getHintTexts({line: 0, ch: 26});

			expect(hints).toEqual([
				'6 ',
				'30 ',
			]);
		});

		it('suggests useful autolabel values', () => {
			cm.getDoc().setValue('autolabel ');
			const hints = getHintTexts({line: 0, ch: 10});

			expect(hints).toContain('off\n');
			expect(hints).toContain('"<label>"\n');
			expect(hints).toContain('"[<inc>] <label>"\n');
		});

		it('suggests note positioning', () => {
			cm.getDoc().setValue('note ');
			const hints = getHintTexts({line: 0, ch: 5});

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
			const hints = getHintTexts({line: 0, ch: 4});

			expect(hints).toEqual(['terminators ']);
		});

		it('suggests known agent names and flags', () => {
			cm.getDoc().setValue('Foo -> ');
			const hints = getHintTexts({line: 0, ch: 7});

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
			const hints = getHintTexts({line: 0, ch: 10});

			expect(hints).toContain('* ');
			expect(hints).not.toContain('! ');
			expect(hints).not.toContain('+ ');
			expect(hints).not.toContain('- ');
			expect(hints).toContain('Foo ');
		});

		it('suggests known agent names at the start of lines', () => {
			cm.getDoc().setValue('Foo -> Bar\n');
			const hints = getHintTexts({line: 1, ch: 0});

			expect(hints).toContain('Foo ');
			expect(hints).toContain('Bar ');
		});

		it('suggests known labels', () => {
			cm.getDoc().setValue('Abc:\nsimultaneously with ');
			const hints = getHintTexts({line: 1, ch: 20});

			expect(hints).toEqual(['Abc ']);
		});

		it('suggests known themes', () => {
			cm.getDoc().setValue('theme ');
			const hints = getHintTexts({line: 0, ch: 6});

			expect(hints).toEqual(['Theme\n', 'Other Theme\n']);
		});

		it('suggests filtered multi-word themes', () => {
			cm.getDoc().setValue('theme Other ');
			const hints = getHintTexts({line: 0, ch: 12});

			expect(hints).toContain('Other Theme\n');
			expect(hints).not.toContain('Theme\n');
		});

		it('suggests multi-word agents', () => {
			cm.getDoc().setValue('Zig Zag -> Meh\nFoo Bar -> ');
			const hints = getHintTexts({line: 1, ch: 11});

			expect(hints).toContain('Zig Zag ');
			expect(hints).toContain('Meh ');
			expect(hints).toContain('Foo Bar ');
		});

		it('suggests quoted agent names if a quote is typed', () => {
			cm.getDoc().setValue('Zig Zag -> Meh\nFoo Bar -> "');
			const hints = getHintTexts({line: 1, ch: 12});

			expect(hints).toEqual([
				'"Zig Zag" ',
				'"Meh" ',
				'"Foo Bar" ',
			]);
		});

		it('suggests filtered multi-word agents', () => {
			cm.getDoc().setValue('Zig Zag -> Meh\nFoo Bar -> Foo ');
			const hints = getHintTexts({line: 1, ch: 15});

			expect(hints).toContain('Foo Bar ');
			expect(hints).not.toContain('Zig Zag ');
			expect(hints).not.toContain('Meh ');
		});

		it('suggests quoted names where required', () => {
			cm.getDoc().setValue('"Zig -> Zag" -> ');
			const hints = getHintTexts({line: 0, ch: 16});

			expect(hints).toContain('"Zig -> Zag" ');
		});

		it('filters quoted names ignoring quotes', () => {
			cm.getDoc().setValue('"Zig -> Zag" -> Zig');
			let hints = getHintTexts({line: 0, ch: 19});

			expect(hints).toContain('"Zig -> Zag" ');

			cm.getDoc().setValue('"Zig -> Zag" -> Zag');
			hints = getHintTexts({line: 0, ch: 19});

			expect(hints).not.toContain('"Zig -> Zag" ');
		});

		it('suggests known delayed agents', () => {
			cm.getDoc().setValue('A -> ...woo\n... ');
			const hints = getHintTexts({line: 1, ch: 4});

			expect(hints).toEqual(['woo ']);
		});

		it('suggests agent properties', () => {
			cm.getDoc().setValue('A is a ');
			const hints = getHintTexts({line: 0, ch: 7});

			expect(hints).toContain('database ');
			expect(hints).toContain('red ');
			expect(hints).not.toContain('\n');
		});

		it('suggests indefinite articles for agent properties', () => {
			cm.getDoc().setValue('A is ');
			const hints = getHintTexts({line: 0, ch: 5});

			expect(hints).toContain('database ');
			expect(hints).toContain('a ');
			expect(hints).toContain('an ');
			expect(hints).not.toContain('\n');
		});

		it('suggests more agent properties after the first', () => {
			cm.getDoc().setValue('A is a red ');
			const hints = getHintTexts({line: 0, ch: 11});

			expect(hints).toContain('database ');
			expect(hints).toContain('\n');
			expect(hints).not.toContain('a ');
			expect(hints).not.toContain('an ');
		});
	});
});
