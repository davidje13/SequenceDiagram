import '../../../node_modules/codemirror/lib/codemirror.js';
import '../../../node_modules/codemirror/mode/xml/xml.js';
import '../../../node_modules/codemirror/mode/javascript/javascript.js';
import '../../../node_modules/codemirror/mode/css/css.js';
import '../../../node_modules/codemirror/addon/runmode/runmode.js';
import '../../../node_modules/codemirror/addon/runmode/colorize.js';

// CodeMirror is not actually ESM - fetch it from window:
export const { CodeMirror } = globalThis;
