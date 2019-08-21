export function parse (source) {
  if (!wasm)
    return init.then(() => parse(source));

  const buffer = encode(source);

  const extraMem = buffer.byteLength - (wasm.memory.buffer.byteLength - wasm.__heap_base.value);
  if (extraMem > 0)
    wasm.memory.grow(Math.ceil(extraMem / 1024 / 64));

  copyToWasm(buffer, wasm.memory.buffer, wasm.salloc(buffer.byteLength));
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

const wasmBinary = 'WASM_BINARY';

let wasmBuffer;
let encode = typeof TextEncoder !== 'undefined' ? str => new TextEncoder().encode(str) : Buffer.from;
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
export const init = WebAssembly.compile(wasmBuffer)
.then(WebAssembly.instantiate)
.then(({ exports }) => { wasm = exports; });

function copyToWasm (inBuf8, wasmBuffer, pointer) {
  const len32 = inBuf8.byteLength >> 2;
  const outBuf32 = new Uint32Array(wasmBuffer, pointer, len32);
  const inBuf32 = new Uint32Array(inBuf8.buffer, inBuf8.byteOffset, len32);
  for (let i = 0; i < len32; i++)
    outBuf32[i] = inBuf32[i];
  // handle remainder
  let doneLen = len32 << 2;
  const outBuf8 = new Uint8Array(wasmBuffer);
  while (doneLen !== inBuf8.byteLength)
    outBuf8[pointer + doneLen] = inBuf8[doneLen++];
  // add null terminator
  outBuf8[pointer + inBuf8.byteLength] = 0;
}
