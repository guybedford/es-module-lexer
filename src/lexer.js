const strictReserved = new Set(['implements', 'interface', 'let', 'package', 'private', 'protected', 'public', 'static', 'yield', 'enum']);

let wasm;

export function parse (source, name = '@') {
  if (!wasm)
    throw new Error('Not initialized');

  // need 2 bytes per code point plus analysis space so we double again
  const extraMem = (wasm.__heap_base.value || wasm.__heap_base) + source.length * 4 - wasm.memory.buffer.byteLength;
  if (extraMem > 0)
    wasm.memory.grow(Math.ceil(extraMem / 65536));
    
  const addr = wasm.sa(source.length);
  copy(source, new Uint16Array(wasm.memory.buffer, addr, source.length + 1));

  if (!wasm.parseCJS(addr, source.length, 0, 0))
    throw Object.assign(new _Error(`Parse error ${name}${wasm.e()}:${source.slice(0, wasm.e()).split('\n').length}:${wasm.e() - source.lastIndexOf('\n', wasm.e() - 1)}`), { idx: wasm.e() });

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

function copy (src, outBuf16) {
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
