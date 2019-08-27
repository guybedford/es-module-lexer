export function parse (source) {
  if (!wasm)
    return init.then(() => parse(source));

  const byteLen = source.length * 2;
  const extraMem = byteLen - (wasm.memory.buffer.byteLength - (wasm.__heap_base.value || wasm.__heap_base));
  if (extraMem > 0)
    wasm.memory.grow(Math.ceil(extraMem / 1024 / 64));

  const outBuf16 = new Uint16Array(wasm.memory.buffer, wasm.salloc(source.length), source.length + 1);
  copy(source, outBuf16);

  if (!wasm.parse()) {
    const idx = wasm.e(), err = new Error(`Parse error at ${idx}.`);
    err.loc = idx;
    throw err;
  }

  const imports = [], exports = [];

  while (wasm.ri()) imports.push({ s: wasm.is(), e: wasm.ie(), d: wasm.id() });
  while (wasm.re()) exports.push(source.slice(wasm.es(), wasm.ee()));

  return [imports, exports];
}

function copy (src, outBuf16) {
  const len = src.length;
  for (let i = 0; i < len; i++)
    outBuf16[i] = src.charCodeAt(i);
}

const wasmBinary = 'WASM_BINARY';

let wasmBuffer;
if (typeof Buffer !== 'undefined') {
  wasmBuffer = Buffer.from(wasmBinary, 'base64');
}
else {
  const str = atob(wasmBinary);
  const len = str.length;
  wasmBuffer = new Uint8Array(len);
  for (let i = 0; i < len; i++)
    wasmBuffer[i] = str.charCodeAt(i);
}

let wasm;
const compile = WebAssembly.compile;
export const init = compile(wasmBuffer)
.then(WebAssembly.instantiate)
.then(({ exports }) => { wasm = exports; });
