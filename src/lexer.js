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
  const extraMem = (wasm.__heap_base.value || wasm.__heap_base) + source.length * 4 +  - wasm.memory.buffer.byteLength;
  if (extraMem > 0)
    wasm.memory.grow(MathCeil(extraMem / 65536));
    
  copy(source, new _Uint16Array(wasm.memory.buffer, wasm.sa(source.length), source.length + 1));

  if (!wasm.parse())
    throw ObjectAssign(new _Error(`Parse error ${name}:${StringSplit(StringSlice(source, 0, wasm.e()), '\n').length}:${wasm.e() - StringLastIndexOf(source, '\n', wasm.e() - 1)}`), { idx: wasm.e() });

  let exports = new _Set(), reexports = new _Set();
  while (wasm.re()) {
    let expt = StringSlice(source, wasm.es(), wasm.ee());
    // zero length export used as an indicator for
    // the switch to webpack exports
    if (expt.length === 0) {
      exports = new _Set(['__esModule']);
      reexports = new _Set();
      continue;
    }
    let exportStr;
    // These work as we don't support identifier / string escapes
    if (expt[0] === '\'' || expt[0] === '"')
      exportStr = StringSlice(expt, 1, -1);
    else
      exportStr = expt;
    if (!SetHas(strictReserved, exportStr))
      SetAdd(exports, exportStr);
  }
  while (wasm.rre())
    SetAdd(reexports, JSONParse('"' + StringSlice(source, wasm.res() + 1, wasm.ree() - 1) + '"'));

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
