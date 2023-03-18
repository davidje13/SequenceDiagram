import '../../../node_modules/codemirror/lib/codemirror.js';
import '../../../node_modules/codemirror/addon/hint/show-hint.js';
import '../../../node_modules/codemirror/addon/edit/trailingspace.js';
import '../../../node_modules/codemirror/addon/comment/comment.js';

// CodeMirror is not actually ESM - fetch it from window:
export const { CodeMirror } = globalThis;
