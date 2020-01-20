import EventObject from '../../../scripts/core/EventObject.mjs';

const PARAM_PATTERN = /\{[^}]+\}/g;

function addNewline(value) {
	if(value.length > 0 && value.charAt(value.length - 1) !== '\n') {
		return value + '\n';
	}
	return value;
}

function findPos(content, index) {
	let p = 0;
	let line = 0;
	for(;;) {
		const nextLn = content.indexOf('\n', p) + 1;
		if(index < nextLn || nextLn === 0) {
			return {ch: index - p, line};
		}
		p = nextLn;
		++ line;
	}
}

function cmInRange(pos, {from, to}) {
	return !(
		pos.line < from.line || (pos.line === from.line && pos.ch < from.ch) ||
		pos.line > to.line || (pos.line === to.line && pos.ch > to.ch)
	);
}

function findNextToken(block, skip) {
	PARAM_PATTERN.lastIndex = 0;
	for(let m = null; (m = PARAM_PATTERN.exec(block));) {
		if(!skip.includes(m[0])) {
			return m[0];
		}
	}
	return null;
}

function lineWithinRange(doc, ln, start, end) {
	const full = doc.getLine(ln);
	const begin = (ln === start.line) ? start.ch : 0;
	return {
		chOffset: begin,
		line: (ln === end.line) ? full.slice(begin, end.ch) : full.slice(begin),
	};
}

export default class CodeEditor extends EventObject {
	constructor(dom, container, {
		mode = '',
		require = null,
		value = '',
	}) {
		super();

		this.mode = mode;
		this.require = require || (() => null);

		this.marker = null;

		this.isAutocompleting = false;
		this.enhanced = false;

		this.code = dom.el('textarea')
			.setClass('editor-simple')
			.val(value)
			.on('input', () => this.trigger('change'))
			.on('focus', () => this.trigger('focus'))
			.attach(container);

		this._enhance();
	}

	markLineHover(ln = null) {
		this.unmarkLineHover();
		if(ln !== null && this.enhanced) {
			this.marker = this.code.markText(
				{ch: 0, line: ln},
				{ch: 0, line: ln + 1},
				{
					className: 'hover',
					clearOnEnter: true,
					inclusiveLeft: false,
					inclusiveRight: false,
				}
			);
		}
	}

	unmarkLineHover() {
		if(this.marker) {
			this.marker.clear();
			this.marker = null;
		}
	}

	selectLine(ln = null) {
		if(ln === null) {
			return;
		}
		if(this.enhanced) {
			this.code.setSelection(
				{ch: 0, line: ln},
				{ch: 0, line: ln + 1},
				{bias: -1, origin: '+focus'}
			);
			this.code.focus();
		}
	}

	enterParams(start, end, block) {
		if(!block.includes('{')) {
			return;
		}
		if(this.cancelParams) {
			this.cancelParams();
		}

		const doc = this.code.getDoc();
		const endBookmark = doc.setBookmark(end);
		const done = [];

		const keydown = (cm, event) => {
			switch(event.keyCode) {
			case 13:
			case 9:
				if(!this.isAutocompleting) {
					event.preventDefault();
				}
				this.advanceParams();
				break;
			case 27:
				if(!this.isAutocompleting) {
					event.preventDefault();
					this.cancelParams();
				}
				break;
			}
		};

		const move = () => {
			if(this.paramMarkers.length === 0) {
				return;
			}
			const m = this.paramMarkers[0].find();
			const [r] = doc.listSelections();
			if(!cmInRange(r.anchor, m) || !cmInRange(r.head, m)) {
				this.cancelParams();
				this.code.setSelection(r.anchor, r.head);
			}
		};

		this.paramMarkers = [];
		this.cancelParams = () => {
			this.code.off('keydown', keydown);
			this.code.off('cursorActivity', move);
			this.paramMarkers.forEach((m) => m.clear());
			this.paramMarkers = null;
			this.code.setCursor(endBookmark.find());
			endBookmark.clear();
			this.cancelParams = null;
			this.advanceParams = null;
		};
		this.advanceParams = () => {
			this.paramMarkers.forEach((m) => m.clear());
			this.paramMarkers.length = 0;
			this.nextParams(start, endBookmark, block, done);
		};

		this.code.on('keydown', keydown);
		this.code.on('cursorActivity', move);

		this.advanceParams();
	}

	nextParams(start, endBookmark, block, done) {
		const tok = findNextToken(block, done);
		if(!tok) {
			this.cancelParams();
			return;
		}
		done.push(tok);

		const doc = this.code.getDoc();
		const ranges = [];
		const end = endBookmark.find();
		for(let ln = start.line; ln <= end.line; ++ ln) {
			const {chOffset, line} = lineWithinRange(doc, ln, start, end);
			for(let p = 0; (p = line.indexOf(tok, p)) !== -1; p += tok.length) {
				const anchor = {ch: chOffset + p, line: ln};
				const head = {ch: chOffset + p + tok.length, line: ln};
				ranges.push({anchor, head});
				this.paramMarkers.push(doc.markText(anchor, head, {
					className: 'param',
					clearWhenEmpty: false,
					inclusiveLeft: true,
					inclusiveRight: true,
				}));
			}
		}

		if(ranges.length > 0) {
			doc.setSelections(ranges, 0);
		} else {
			this.cancelParams();
		}
	}

	hasSelection() {
		const from = this.code.getCursor('from');
		const to = this.code.getCursor('to');
		return from.line !== to.line || from.ch !== to.ch;
	}

	internalAddSurroundCode(block) {
		if(this.enhanced) {
			if(this.hasSelection()) {
				this.code.replaceSelection(
					block.replace(/\{.*\}/, this.code.getSelection()),
					'end',
					'library'
				);
			} else {
				const cur = this.code.getCursor('head');
				this.code.replaceSelection(block, null, 'library');
				const end = {ch: cur.ch + block.length, line: cur.line};
				this.enterParams(cur, end, block);
			}
		} else {
			const value = this.value();
			const s1 = this.code.element.selectionStart;
			const s2 = this.code.element.selectionEnd;
			const wrapped = block.replace(/\{.*\}/, value.substring(s1, s2));
			this.code
				.val(value.substr(0, s1) + wrapped + value.substr(s2))
				.select(s1 + wrapped.length);
			this.trigger('change');
		}
	}

	internalAddIndependentCode(block) {
		if(this.enhanced) {
			const cur = this.code.getCursor('head');
			const pos = {ch: 0, line: cur.line + ((cur.ch > 0) ? 1 : 0)};
			let replaced = addNewline(block);
			if(pos.line >= this.code.lineCount()) {
				replaced = '\n' + replaced;
			}
			this.code.replaceRange(replaced, pos, null, 'library');
			const lines = block.split('\n').length;
			const end = {ch: 0, line: pos.line + lines};
			this.enterParams(pos, end, block);
		} else {
			const value = this.value();
			const cur = this.code.element.selectionStart;
			const pos = ('\n' + value + '\n').indexOf('\n', cur);
			const replaced = (
				addNewline(value.substr(0, pos)) +
				addNewline(block)
			);
			this.code
				.val(replaced + value.substr(pos))
				.select(replaced.length);
			this.trigger('change');
		}
	}

	addCodeBlock(block, surround = false) {
		this.code.focus();

		if(surround) {
			this.internalAddSurroundCode(block);
		} else {
			this.internalAddIndependentCode(block);
		}
	}

	value() {
		if(this.enhanced) {
			return this.code.getDoc().getValue();
		} else {
			return this.code.element.value;
		}
	}

	setValue(code) {
		if(this.enhanced) {
			const doc = this.code.getDoc();
			doc.setValue(code);
			doc.clearHistory();
		} else {
			this.code.val(code);
		}
	}

	_enhance() {
		// Load on demand for progressive enhancement
		// (failure to load external module will not block functionality)
		this.require([
			'cm/lib/codemirror',
			'cm/addon/hint/show-hint',
			'cm/addon/edit/trailingspace',
			'cm/addon/comment/comment',
		], (CodeMirror) => {
			const globals = {};
			this.trigger('enhance', [CodeMirror, globals]);

			const oldCode = this.code;

			const {selectionStart, selectionEnd, value} = oldCode.element;
			const focussed = oldCode.focussed();

			const code = new CodeMirror(oldCode.element.parentNode, {
				extraKeys: {
					'Cmd-/': (cm) => cm.toggleComment({padding: ''}),
					'Cmd-Enter': 'autocomplete',
					'Ctrl-/': (cm) => cm.toggleComment({padding: ''}),
					'Ctrl-Enter': 'autocomplete',
					'Ctrl-Space': 'autocomplete',
					'Shift-Tab': (cm) => cm.execCommand('indentLess'),
					'Tab': (cm) => cm.execCommand('indentMore'),
				},
				globals,
				lineNumbers: true,
				mode: this.mode,
				showTrailingSpace: true,
				value,
			});
			oldCode.detach();

			code.getDoc().setSelection(
				findPos(value, selectionStart),
				findPos(value, selectionEnd)
			);

			let lastKey = 0;
			code.on('keydown', (cm, event) => {
				lastKey = event.keyCode;
			});

			code.on('change', (cm, change) => {
				this.trigger('change');

				if(change.origin === '+input') {
					if(lastKey === 13) {
						lastKey = 0;
						return;
					}
				} else if(change.origin !== 'complete') {
					return;
				}
				CodeMirror.commands.autocomplete(cm, null, {
					completeSingle: false,
				});
			});

			code.on('focus', () => this.trigger('focus'));

			code.on('cursorActivity', () => {
				const from = code.getCursor('from');
				const to = code.getCursor('to');
				this.trigger('cursorActivity', [from, to]);
			});

			/*
			 * See https://github.com/codemirror/CodeMirror/issues/3092
			 * startCompletion will fire even if there are no completions, so
			 * we cannot rely on it. Instead we hack the hints function to
			 * propagate 'shown' as 'hint-shown', which we pick up here
			 */
			code.on('hint-shown', () => {
				this.isAutocompleting = true;
			});

			code.on('endCompletion', () => {
				this.isAutocompleting = false;
			});

			if(focussed) {
				code.focus();
			}

			this.code = code;
			this.enhanced = true;
		});
	}
}
