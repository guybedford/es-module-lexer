import { readFileSync } from 'node:fs';

/** @param {string} source */
export function inlineBindings(source) {
  const reader = readFileSync('src/import-bindings.js', 'utf8')
    .replace('export function readImportBindings', 'function readImportBindings');
  const importPattern = /import \{ readImportBindings \} from ['"]\.\/import-bindings\.js['"];?/;
  if (!importPattern.test(source)) throw new Error('Missing binding reader import');
  return source.replace(importPattern, () => reader);
}
