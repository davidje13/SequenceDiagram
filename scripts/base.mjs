import path from 'node:path';

export const BASEDIR = path.dirname(new URL(import.meta.url).pathname);
