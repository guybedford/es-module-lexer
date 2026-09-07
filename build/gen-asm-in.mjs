// Generates the asm.js wrapper prelude (lib/lexer[.min].asm.in.js) from the
// reader source (src/lexer.asm.js) and the closure-disabled fastcomp layout
// sidecar. Resolves {{OFFSET}} (dictionary heap address), {{STATIC_TOP}}
// (source/stack base) and {{WORDS}} (keyword dictionary) from the actual layout
// rather than hardcoding them, since they shift with toolchain/source changes.
//
// Shared by the full and minimal asm builds; paths and the MINIMAL flag come
// from env: SRC, LAYOUT, OUT, MINIMAL.
import { readFileSync, writeFileSync } from 'fs';

const SRC = process.env.SRC;
const LAYOUT = process.env.LAYOUT;
const OUT = process.env.TARGET;
const MINIMAL = process.env.MINIMAL === '1';

const layout = readFileSync(LAYOUT, 'utf8');
const constant = name => {
  const m = layout.match(new RegExp(name + ' ?= ?(\\d+)'));
  if (!m) throw new Error(`${name} not found in ${LAYOUT}`);
  return +m[1];
};
const GLOBAL_BASE = constant('GLOBAL_BASE');
const STACK_BASE = constant('STACK_BASE');

// Extract the keyword dictionary directly from the static memory image: it is
// the longest run of ascii char16 (printable low byte, zero high byte).
const mem = readFileSync(LAYOUT + '.mem');
let best = { start: -1, str: '' }, cur = null;
for (let i = 0; i + 1 < mem.length; i += 2) {
  if (mem[i + 1] === 0 && mem[i] >= 0x20 && mem[i] <= 0x7e) {
    if (!cur) cur = { start: i, str: '' };
    cur.str += String.fromCharCode(mem[i]);
    if (cur.str.length > best.str.length) best = cur;
  } else cur = null;
}
if (best.start === -1)
  throw new Error(`keyword dictionary not found in ${LAYOUT}.mem`);

let words = best.str;
// The image can drop the trailing zero high byte of the final char16, leaving a
// lone printable low byte at the very end.
const tail = best.start + words.length * 2;
if (tail === mem.length - 1 && mem[tail] >= 0x20 && mem[tail] <= 0x7e)
  words += String.fromCharCode(mem[tail]);

let out = readFileSync(SRC, 'utf8')
  .replace('{{WORDS}}', JSON.stringify(words))
  .replace('{{OFFSET}}', GLOBAL_BASE + best.start)
  .replace('{{STATIC_TOP}}', STACK_BASE);

// minimal variant: flip the build-time flag so terser drops the full-only paths
if (MINIMAL)
  out = out.replace('const MINIMAL = false', 'const MINIMAL = true');

writeFileSync(OUT, out);
