// Combines the asm.js wrapper prelude (ASM_IN) with the fastcomp-compiled
// module (EMCC) into the final asm.js bundle (TARGET), rewriting the emscripten
// module shell into the slim hand-tuned exports the reader expects.
//
// Shared by the full and minimal asm builds; paths come from env: ASM_IN, EMCC,
// TARGET.
import { readFileSync, writeFileSync } from 'fs';

const wrapper_start = readFileSync(process.env.ASM_IN, 'utf8');
let source = readFileSync(process.env.EMCC, 'utf8').trim();

const endFuncs = 'EMSCRIPTEN_END_FUNCS';
/**
 * @param {string} value
 * @returns {string}
 */
const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/**
 * @param {string} name
 * @returns {[RegExp, string]}
 */
const removeFunc = name => [new RegExp(`function ${escapeRegex(name)}\\([^]+?}\\s*(function|return\\s?{[^{}]+};?\\s*}\\s*$)`), '$1'];

const replacements = [
  [/Module\["asm"\]=\s?\(\/\*\* @suppress {uselessCode} \*\/ function\(/, 'function asmInit('],
  [/\)$/, ''],
  [/,\s?_(\w+):/g, ',$1:', null, endFuncs],
  ['setSource:', 'ses:', null, endFuncs],
  ['parse:', 'p:', null, endFuncs],
  [/___errno_location:\s?([\w$]+),/, '', removeFunc, endFuncs, true],
  [/_apply_relocations:\s?([\w$]+),/, '', removeFunc, endFuncs, true],
  [/,\s?free:\s?([\w$]+)/, '', removeFunc, endFuncs, true],
  [/,\s?malloc:\s?([\w$]+)/, '', removeFunc, endFuncs, true],
  [/,\s?memcpy:\s?([\w$]+)/, '', removeFunc, endFuncs, true],
  [/,\s?memset:\s?([\w$]+)/, '', removeFunc, endFuncs, true],
  [/,\s?stackAlloc:\s?([\w$]+)/, '', removeFunc, endFuncs, true],
  [/,\s?emscripten_get_sbrk_ptr:\s?([\w$]+)/, '', removeFunc, endFuncs, true],
  [/,\s?stackRestore:\s?([\w$]+)/, '', removeFunc, endFuncs, true],
  [/,\s?stackSave:\s?([\w$]+)/, '', removeFunc, endFuncs, true],
  [/,\s*\w+\s?=\s?env\.\w+\|0,\s*\w+\s?=\s?env\.\w+\|0,\s*\w+\s?=\s?0,\s*\w+\s?=\s?0,\s*\w+\s?=\s?0,\s*\w+\s?=\s?0,\s*\w+\s?=\s?0,\s*\w+\s?=\s?0,\s*\w+\s?=\s?0,\s*\w+\s?=\s?0\.0,\s*\w+\s?=\s?env\.\w+,\s*\w+\s?=\s?env\.\w+,\s*\w+\s?=\s?env\.\w+,\s*\w+\s?=\s?env\.\w+,\s*\w+\s?=\s?env\.\w+,\s*\w+\s?=\s?env\.\w+/, ''],
  [/,\s*\w+\s?=\s?\d+,\s*\w+\s?=\s?0.0;/, ';'],
  [/function \w+\(\w+\)\s?{[^{}]+{[^{}s]+s\(\)[^{}]+}[^{}]+}/, '', null, null, true],
  [/\s*\/\/ EMSCRIPTEN_END_FUNCS\s*return\{/, `  function su(a, b) {
		a = a | 0;
		b = b | 0;
		v = a + b + 15 & -16;
		return b;
	}
	return {
		su,`],
  [/\s*\/\/ EMSCRIPTEN_START_FUNCS\s*/, ''],
];

for (const [from, to, add, after, optional] of replacements) {
  const [matched, match] = source.match(from) || [];
  if (!matched) {
    if (optional) continue;
    console.log(source.slice(0, 1000));
    throw new Error(`Match not found for ${from} -> ${to}${after ? `, after ${after}` : ''}`);
  }
  const afterIndex = after ? source.indexOf(after) : 0;
  const replaced = source.slice(0, afterIndex) + source.slice(afterIndex).replace(from, to);
  if (add) replacements.push(add(match));
  source = replaced;
}

writeFileSync(process.env.TARGET, wrapper_start + source);
