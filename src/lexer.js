// builtins are bound on startup for safety
const WebAssemblyCompile = WebAssembly.compile;
const WebAssemblyInstantiate = WebAssembly.instantiate;
const Uint8ArrayFrom = Uint8Array.from;
const BufferFrom = typeof Buffer !== 'undefined' && Buffer.from;
const StringCharCodeAt = Function.prototype.call.bind(String.prototype.charCodeAt);
const StringSlice = Function.prototype.call.bind(String.prototype.slice);
const StringSplit = Function.prototype.call.bind(String.prototype.split);
const StringLastIndexOf = Function.prototype.call.bind(String.prototype.lastIndexOf);
const ObjectAssign = Object.assign;
const JSONParse = JSON.parse;
const MathCeil = Math.ceil;
const _Uint16Array = Uint16Array;
const _Error = Error;
const _Set = Set;
const SetHas = Function.prototype.call.bind(Set.prototype.has);
const SetAdd = Function.prototype.call.bind(Set.prototype.add);

const strictReserved = new Set(['implements', 'interface', 'let', 'package', 'private', 'protected', 'public', 'static', 'yield', 'enum']);

let wasm;

export function parse (source, name = '@') {
  if (!wasm)
    throw new Error('Not initialized');

  // need 2 bytes per code point plus analysis space so we double again
  const extraMem = (wasm.__heap_base.value || wasm.__heap_base) + source.length * 4 - wasm.memory.buffer.byteLength;
  if (extraMem > 0)
    wasm.memory.grow(MathCeil(extraMem / 65536));
    
  const addr = wasm.sa(source.length);
  copy(source, new _Uint16Array(wasm.memory.buffer, addr, source.length + 1));

  if (!wasm.parseCJS(addr, source.length, 0, 0))
    throw ObjectAssign(new _Error(`Parse error ${name}${wasm.e()}:${StringSplit(StringSlice(source, 0, wasm.e()), '\n').length}:${wasm.e() - StringLastIndexOf(source, '\n', wasm.e() - 1)}`), { idx: wasm.e() });

  let exports = new _Set(), reexports = new _Set();
  while (wasm.rre())
    SetAdd(reexports, StringSlice(source, wasm.res(), wasm.ree()));
  while (wasm.re()) {
    let exptStr = StringSlice(source, wasm.es(), wasm.ee());
    if (!SetHas(strictReserved, exptStr))
      SetAdd(exports, exptStr);
  }

  return { exports: [...exports], reexports: [...reexports] };
}

function copy (src, outBuf16) {
  const len = src.length;
  let i = 0;
  while (i < len)
    outBuf16[i] = StringCharCodeAt(src, i++);
}

let initPromise;
export function init () {
  if (initPromise)
    return initPromise;
  return initPromise = (async () => {
    const compiled = await WebAssemblyCompile(
      (binary => typeof atob === 'function' ? Uint8ArrayFrom(atob(binary), x => StringCharCodeAt(x, 0)) : BufferFrom(binary, 'base64'))
      ('WASM_BINARY')
    )
    const { exports } = await WebAssemblyInstantiate(compiled);
    wasm = exports;
  })();
}
