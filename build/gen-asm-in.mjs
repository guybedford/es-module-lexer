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

// Reconstruct the keyword dictionary from the static memory image. The keyword
// tables (lexer.c) are the char16 runs of printable-low-byte / zero-high-byte;
// the compiler may split them across non-adjacent offsets (e.g. `nterface`
// landed before the main run), so copy the whole span from the first keyword
// byte to the last as one blob. Gaps become NUL chars, preserving every
// constant's compiled offset relative to {{OFFSET}}.
const mem = readFileSync(LAYOUT + '.mem');
const isDictByte = i => mem[i + 1] === 0 && mem[i] >= 0x20 && mem[i] <= 0x7e;

let start = -1, end = -1;
for (let i = 0; i + 1 < mem.length; i += 2) {
  if (isDictByte(i)) {
    if (start === -1) start = i;
    end = i + 2;
  }
}
// The image can drop the trailing zero high byte of the final char16, leaving a
// lone printable low byte at the very end.
if (end === mem.length - 1 && mem[end] >= 0x20 && mem[end] <= 0x7e)
  end += 1;
if (start === -1)
  throw new Error(`keyword dictionary not found in ${LAYOUT}.mem`);

let words = '';
for (let i = start; i < end; i += 2)
  words += String.fromCharCode(mem[i] | (i + 1 < mem.length ? mem[i + 1] << 8 : 0));

let out = readFileSync(SRC, 'utf8')
  // JSON.stringify so NUL gap bytes and any quote / backslash / line terminator
  // in the dictionary blob are emitted as a valid JS string literal.
  .replace('{{WORDS}}', JSON.stringify(words))
  .replace('{{OFFSET}}', GLOBAL_BASE + start)
  .replace('{{STATIC_TOP}}', STACK_BASE);

// minimal variant: flip the build-time flag so terser drops the full-only paths
if (MINIMAL)
  out = out.replace('const MINIMAL = false', 'const MINIMAL = true');

writeFileSync(OUT, out);
