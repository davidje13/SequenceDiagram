import {dirname} from 'node:path';
import {fileURLToPath} from 'node:url';

export const BASEDIR = dirname(fileURLToPath(import.meta.url));
