export { initPromise as init }

export default function analyze (source) {
  if (!parse)
    return initPromise.then(() => analyze(source));

  const buffer = new TextEncoder().encode(source);

  const extraMem = buffer.byteLength - (memory.buffer.byteLength - __heap_base.value);
  if (extraMem > 0)
    memory.grow(Math.ceil(extraMem / 1024 / 64));

  copyToWasm(buffer, memory, salloc(buffer.byteLength));
  if (!parse()) {
    const idx = e(), err = new Error(`Parse error at ${idx}.`);
    err.loc = idx;
    throw err;
  }

  const imports = [], exports = [];

  while (ri()) imports.push({ s: is(), e: ie(), d: id() });
  while (re()) exports.push(source.slice(es(), ee()));

  return [imports, exports];
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

let memory, __heap_base, salloc, parse, e, ri, re, is, ie, id, es, ee;
const initPromise = WebAssembly.compile(wasmBuffer)
.then(WebAssembly.instantiate)
.then(({ exports }) => ({ memory, __heap_base, salloc, parse, e, ri, re, is, ie, id, es, ee } = exports));

function copyToWasm (buffer, memory, pointer) {
  const byteLen = buffer.byteLength;
  const len32 = byteLen >> 2;
  const outBuf = new Uint32Array(memory.buffer, pointer, len32);
  const inBuf = new Uint32Array(buffer.buffer, 0, len32);
  for (let i = 0; i < len32; i++)
    outBuf[i] = inBuf[i];
  // handle remainder
  let doneLen = len32 << 2;
  const outBuf8 = new Uint8Array(memory.buffer);
  if (doneLen !== byteLen) {
    const inBuf8 = new Uint8Array(buffer.buffer);
    while (doneLen !== byteLen) {
      outBuf8[pointer + doneLen] = inBuf8[doneLen];
      doneLen++;
    }
  }
  // add null terminator
  outBuf8[pointer + byteLen] = 0;
}
