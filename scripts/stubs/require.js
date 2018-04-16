import CodeMirror from './codemirror.js';
import Split from './split.js';

const stubLibs = new Map();
stubLibs.set('cm/lib/codemirror', CodeMirror);
stubLibs.set('split', Split);

export default function(libs, fn) {
	fn(...libs.map((lib) => (stubLibs.get(lib) || null)));
}
