export function parse (source, name = '@') {
  if (!wasm)
    return init.then(() => parse(source));

  // need 2 bytes per code point plus analysis space so we double again
  const extraMem = (wasm.__heap_base.value || wasm.__heap_base) + source.length * 4 +  - wasm.memory.buffer.byteLength;
  if (extraMem > 0)
    wasm.memory.grow(Math.ceil(extraMem / 65536));

  copy(source, new Uint16Array(wasm.memory.buffer, wasm.sa(source.length), source.length + 1));

  if (!wasm.parse())
    throw Object.assign(new Error(`Parse error ${name}:${source.slice(0, wasm.e()).split('\n').length}:${wasm.e() - source.lastIndexOf('\n', wasm.e() - 1)}`), { idx: wasm.e() });

  const imports = [], exports = [];
  while (wasm.ri()) imports.push({ s: wasm.is(), e: wasm.ie(), d: wasm.id() });
  while (wasm.re()) exports.push(source.slice(wasm.es(), wasm.ee()));

  return [imports, exports];
}

function copy (src, outBuf16) {
  const len = src.length;
  let i = 0;
  while (i < len)
    outBuf16[i] = src.charCodeAt(i++);
}

let wasm;

export const init = WebAssembly.compile(
  (binary => typeof atob === 'function' ? Uint8Array.from(atob(binary), x => x.charCodeAt(0)) : Buffer.from(binary, 'base64'))
  ('WASM_BINARY')
)
.then(WebAssembly.instantiate)
.then(({ exports }) => { wasm = exports; });
