const isLE = new Uint8Array(new Uint16Array([1]).buffer)[0] === 1;

export function parse (source, name = '@') {
  if (!wasm)
    return init.then(() => parse(source));

  const len = source.length + 1;

  // need 2 bytes per code point plus analysis space so we double again
  const extraMem = (wasm.__heap_base.value || wasm.__heap_base) + len * 4 - wasm.memory.buffer.byteLength;
  if (extraMem > 0)
    wasm.memory.grow(Math.ceil(extraMem / 65536));

  const addr = wasm.sa(len - 1);
  (isLE ? copyLE : copyBE)(source, new Uint16Array(wasm.memory.buffer, addr, len));

  if (!wasm.parse())
    throw Object.assign(new Error(`Parse error ${name}:${source.slice(0, wasm.e()).split('\n').length}:${wasm.e() - source.lastIndexOf('\n', wasm.e() - 1)}`), { idx: wasm.e() });

  const imports = [], exports = [];
  while (wasm.ri()) {
    const s = wasm.is();
    const e = wasm.ie();
    let n;
    // only eval safe known strings!
    if (wasm.ip())
      n = decode(source.slice(s - 1, e + 1));
    imports.push({ n, s, e, ss: wasm.ss(), se: wasm.se(), d: wasm.id() });
  }
  while (wasm.re()) exports.push(source.slice(wasm.es(), wasm.ee()));

  function decode (str) {
    try {
      return (0, eval)(str);
    }
    catch {}
  }

  return [imports, exports, !!wasm.f()];
}

function copyBE (src, outBuf16) {
  const len = src.length;
  let i = 0;
  while (i < len) {
    const ch = src.charCodeAt(i);
    outBuf16[i++] = (ch & 0xff) << 8 | ch >>> 8;
  }
}

function copyLE (src, outBuf16) {
  const len = src.length;
  let i = 0;
  while (i < len)
    outBuf16[i] = src.charCodeAt(i++);
}

let wasm;

export const init = WebAssembly.compile(
  (binary => typeof window !== 'undefined' && typeof atob === 'function' ? Uint8Array.from(atob(binary), x => x.charCodeAt(0)) : Buffer.from(binary, 'base64'))
  ('WASM_BINARY')
)
.then(WebAssembly.instantiate)
.then(({ exports }) => { wasm = exports; });
