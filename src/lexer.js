const strictReserved = new Set(['implements', 'interface', 'let', 'package', 'private', 'protected', 'public', 'static', 'yield', 'enum']);

let wasm;

const isLE = new Uint8Array(new Uint16Array([1]).buffer)[0] === 1;

export function parse (source, name = '@') {
  if (!wasm)
    throw new Error('Not initialized');

  const len = source.length + 1;

  // need 2 bytes per code point plus analysis space so we double again
  const extraMem = (wasm.__heap_base.value || wasm.__heap_base) + len * 4 - wasm.memory.buffer.byteLength;
  if (extraMem > 0)
    wasm.memory.grow(Math.ceil(extraMem / 65536));
    
  const addr = wasm.sa(len);
  (isLE ? copyLE : copyBE)(source, new Uint16Array(wasm.memory.buffer, addr, len));

  if (!wasm.parseCJS(addr, source.length, 0, 0))
    throw Object.assign(new Error(`Parse error ${name}${wasm.e()}:${source.slice(0, wasm.e()).split('\n').length}:${wasm.e() - source.lastIndexOf('\n', wasm.e() - 1)}`), { idx: wasm.e() });

  let exports = new Set(), reexports = new Set();
  while (wasm.rre())
    reexports.add(source.slice(wasm.res(), wasm.ree()));
  while (wasm.re()) {
    let exptStr = source.slice(wasm.es(), wasm.ee());
    if (!strictReserved.has(exptStr))
      exports.add(exptStr);
  }

  return { exports: [...exports], reexports: [...reexports] };
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

let initPromise;
export function init () {
  if (initPromise)
    return initPromise;
  return initPromise = (async () => {
    const compiled = await WebAssembly.compile(
      (binary => typeof atob === 'function' ? Uint8Array.from(atob(binary), x => x.charCodeAt(0)) : Buffer.from(binary, 'base64'))
      ('WASM_BINARY')
    )
    const { exports } = await WebAssembly.instantiate(compiled);
    wasm = exports;
  })();
}
