// Build-time variant flag. The minimal build (dist/lexer.minimal.js) rewrites
// this to `true`; terser then folds away the full-only getter reads (ip/ess/f/
// ms/attributes/export analysis), matching the stripped LEXER_MIN wasm
// exports. `as boolean` keeps both branches type-checked rather than narrowed
// to the false literal.
const MINIMAL = false as boolean;
const EXPORT_CAPTURE_THRESHOLD = 4096;

export enum ImportType {
  /**
   * A normal static using any syntax variations
   *   import .. from 'module'
   */
  Static = 1,
  /**
   * A dynamic import expression `import(specifier)`
   * or `import(specifier, opts)`
   */
  Dynamic = 2,
  /**
   * An import.meta expression
   */
  ImportMeta = 3,
  /**
   * A source phase import
   *   import source x from 'module'
   */
  StaticSourcePhase = 4,
  /**
   * A dynamic source phase import
   *   import.source('module')
   */
  DynamicSourcePhase = 5,
  /**
   * A defer phase import
   *   import defer * as x from 'module'
   */
  StaticDeferPhase = 6,
  /**
   * A dynamic defer phase import
   *   import.defer('module')
   */
  DynamicDeferPhase = 7,
  /**
   * The module specifier of an `export * from 'module'` statement.
   */
  StaticReexportStar = 8,
}

export interface ImportSpecifier {
  /**
   * Module name
   *
   * To handle escape sequences in specifier strings, the .n field of imported specifiers will be provided where possible.
   *
   * For dynamic import expressions, this field will be empty if not a valid JS string.
   * For static import expressions, this field will always be populated.
   *
   * @example
   * const [imports1, exports1] = parse(String.raw`import './\u0061\u0062.js'`);
   * imports1[0].n;
   * // Returns "./ab.js"
   *
   * const [imports2, exports2] = parse(`import("./ab.js")`);
   * imports2[0].n;
   * // Returns "./ab.js"
   *
   * const [imports3, exports3] = parse(`import("./" + "ab.js")`);
   * imports3[0].n;
   * // Returns undefined
   */
  readonly n: string | undefined;
  /**
   * Type of import statement
   */
  readonly t: ImportType;
  /**
   * Start of module specifier
   *
   * @example
   * const source = `import { a } from 'asdf'`;
   * const [imports, exports] = parse(source);
   * source.substring(imports[0].s, imports[0].e);
   * // Returns "asdf"
   */
  readonly s: number;
  /**
   * End of module specifier
   */
  readonly e: number;

  /**
   * Start of import statement
   *
   * @example
   * const source = `import { a } from 'asdf'`;
   * const [imports, exports] = parse(source);
   * source.substring(imports[0].ss, imports[0].se);
   * // Returns "import { a } from 'asdf';"
   */
  readonly ss: number;
  /**
   * End of import statement
   */
  readonly se: number;

  /**
   * If this import keyword is a dynamic import, this is the start value.
   * If this import keyword is a static import, this is -1.
   * If this import keyword is an import.meta expresion, this is -2.
   */
  readonly d: number;

  /**
   * If this import has an import attribute, this is the start value.
   * Otherwise this is `-1`.
   */
  readonly a: number;
  /**
   * Parsed import attributes as an array of [key, value] tuples.
   * If this import has no attributes, this is `null`.
   *
   * @example
   * const source = `import foo from 'bar' with { type: "json" }`;
   * const [imports] = parse(source);
   * imports[0].at;
   * // Returns [['type', 'json']]
   *
   * @example
   * const source = `import foo from 'bar' with { type: "json", integrity: "sha384-..." }`;
   * const [imports] = parse(source);
   * imports[0].at;
   * // Returns [['type', 'json'], ['integrity', 'sha384-...']]
   */
  readonly at: ReadonlyArray<readonly [string, string]> | null;
}

export enum ExportType {
  Direct = 1,
  Reexport = 2,
  ReexportAll = 3,
}

interface ExportBase {
  /**
   * Exported name
   *
   * @example
   * const source = `export default []`;
   * const [imports, exports] = parse(source);
   * exports[0].n;
   * // Returns "default"
   *
   * @example
   * const source = `export const asdf = 42`;
   * const [imports, exports] = parse(source);
   * exports[0].n;
   * // Returns "asdf"
   */
  readonly n: string;

  /**
   * Start of exported name
   *
   * @example
   * const source = `export default []`;
   * const [imports, exports] = parse(source);
   * source.substring(exports[0].s, exports[0].e);
   * // Returns "default"
   *
   * @example
   * const source = `export { 42 as asdf }`;
   * const [imports, exports] = parse(source);
   * source.substring(exports[0].s, exports[0].e);
   * // Returns "asdf"
   */
  readonly s: number;
  /**
   * End of exported name
   */
  readonly e: number;

  /**
   * Start of the export statement.
   *
   * Only the statement start is provided; the statement end is not tracked
   * (see https://github.com/guybedford/es-module-lexer/issues/112). Every
   * specifier of a statement reports the same start, so `export { a, b }`
   * returns the same `ss` for both `a` and `b`.
   *
   * @example
   * const source = `export { a, b } from 'mod'`;
   * const [imports, exports] = parse(source);
   * source.slice(exports[0].ss, exports[0].ss + 6);
   * // Returns "export"
   */
  readonly ss: number;
}

export interface DirectExport extends ExportBase {
  readonly t: ExportType.Direct;
  /**
   * Local name, or undefined for anonymous default exports.
   */
  readonly ln: string | undefined;
  /**
   * Start of local name, or -1.
   */
  readonly ls: number;
  /**
   * End of local name, or -1.
   */
  readonly le: number;
}

export interface Reexport extends ExportBase {
  readonly t: ExportType.Reexport;
  /**
   * Imported name, or null for namespace and source phase imports.
   */
  readonly im: string | null;
  /**
   * Start of imported name, or -1 when `im` is null or `"default"` from a
   * default import.
   */
  readonly ims: number;
  /**
   * End of imported name, or -1 when `ims` is -1.
   */
  readonly ime: number;
  /**
   * Module specifier.
   */
  readonly f: string;
  /**
   * Index of the originating import in the imports array.
   */
  readonly fi: number;
}

export interface ReexportAll {
  readonly t: ExportType.ReexportAll;
  /**
   * Module specifier.
   */
  readonly f: string;
  /**
   * Index of the originating import in the imports array.
   */
  readonly fi: number;
  /**
   * Start of the `*`.
   */
  readonly s: number;
  /**
   * End of the `*`.
   */
  readonly e: number;
  /**
   * Start of the export statement.
   */
  readonly ss: number;
}

export type ExportSpecifier = DirectExport | Reexport | ReexportAll;

export interface ParseError extends Error {
  idx: number
}

const isLE = new Uint8Array(new Uint16Array([1]).buffer)[0] === 1;

/**
 * Outputs the list of exports and locations of import specifiers,
 * including dynamic import and import meta handling.
 *
 * @param source Source code to parser
 * @param name Optional sourcename
 * @returns Tuple contaning imports list and exports list.
 */
export function parse (source: string, name = '@'): readonly [
  imports: ReadonlyArray<ImportSpecifier>,
  exports: ReadonlyArray<ExportSpecifier>,
  facade: boolean,
  hasModuleSyntax: boolean
] {
  if (!wasm)
    // actually returns a promise if init hasn't resolved (not type safe).
    // casting to avoid a breaking type change.
    return init.then(() => parse(source)) as unknown as ReturnType<typeof parse>;

  const len = source.length + 1;

  // need 2 bytes per code point plus analysis space so we double again
  const extraMem = (wasm.__heap_base.value || wasm.__heap_base) as number + len * 4 - wasm.memory.buffer.byteLength;
  if (extraMem > 0)
    wasm.memory.grow(Math.ceil(extraMem / 65536));

  const addr = wasm.sa(len - 1);
  if (!MINIMAL)
    wasm.eac(mayHaveExportClause(source));
  // Node's Buffer blits UTF-16 straight into Wasm memory ~10x faster than the
  // charCodeAt fallback, in explicit LE matching Wasm regardless of host.
  if (typeof Buffer !== 'undefined')
    Buffer.from(wasm.memory.buffer, addr, (len - 1) * 2).write(source, 'utf16le');
  else
    (isLE ? copyLE : copyBE)(source, new Uint16Array(wasm.memory.buffer, addr, len));

  if (!wasm.parse())
    throw Object.assign(new Error(`Parse error ${name}:${source.slice(0, wasm.e()).split('\n').length}:${wasm.e() - source.lastIndexOf('\n', wasm.e() - 1)}`), { idx: wasm.e() });

  const imports: ImportSpecifier[] = [], exports: ExportSpecifier[] = [];
  while (wasm.ri()) {
    const s = wasm.is(), e = wasm.ie(), t = wasm.it(), a = wasm.ai(), d = wasm.id(), ss = wasm.ss(), se = wasm.se();
    let n;
    if (wasm.ip())
      n = decode(source.slice(d === -1 ? s - 1 : s, d === -1 ? e + 1 : e));
    let at: Array<[string, string]> | null = null;
    // minimal build drops the parsed attribute list; es-module-shims reads the
    // assertion via source.slice(a, se - 1) instead
    if (!MINIMAL) {
      at = [];
      wasm.rsa();
      while (wasm.ra()) {
        const aks = wasm.aks(), ake = wasm.ake(), avs = wasm.avs(), ave = wasm.ave();
        at.push([decodeIfQuoted(source.slice(aks, ake)), decodeIfQuoted(source.slice(avs, ave))]);
      }
      if (at.length === 0) at = null;
    }
    imports.push({ n, t, s, e, ss, se, d, a, at });
  }
  let exportPtr = wasm.re();
  const memoryView = MINIMAL || exportPtr === 0 ? undefined : new DataView(wasm.memory.buffer);
  while (exportPtr !== 0) {
    if (MINIMAL) {
      const s = wasm.es(), e = wasm.ee(), ls = wasm.els(), le = wasm.ele();
      const ln = ls < 0 ? undefined : decodeIfQuoted(source.slice(ls, le));
      const n = decodeIfQuoted(source.slice(s, e));
      exports.push({ s, e, ls, le, n, ln } as unknown as ExportSpecifier);
      exportPtr = wasm.re();
      continue;
    }

    // Full-build Export ABI: six 32-bit fields followed by two byte tags.
    const s = (memoryView!.getUint32(exportPtr, true) - addr) >>> 1;
    const e = (memoryView!.getUint32(exportPtr + 4, true) - addr) >>> 1;
    const localStart = memoryView!.getUint32(exportPtr + 8, true);
    const ls = localStart === 0 ? -1 : (localStart - addr) >>> 1;
    const localEnd = memoryView!.getUint32(exportPtr + 12, true);
    const le = localEnd === 0 ? -1 : (localEnd - addr) >>> 1;
    const ss = (memoryView!.getUint32(exportPtr + 16, true) - addr) >>> 1;
    const fi = memoryView!.getUint32(exportPtr + 20, true);
    const t = memoryView!.getUint8(exportPtr + 24) as ExportType;
    if (t === ExportType.ReexportAll) {
      exports.push({ t, f: imports[fi].n as string, fi, s, e, ss });
    }
    else {
      const n = decodeIfQuoted(source.slice(s, e));
      if (t === ExportType.Direct) {
        const ln = ls < 0 ? undefined : decodeIfQuoted(source.slice(ls, le));
        exports.push({ t, n, ln, s, e, ls, le, ss });
      }
      else {
        const importNameType = memoryView!.getUint8(exportPtr + 25);
        const im = importNameType === 0
          ? decodeIfQuoted(source.slice(ls, le))
          : importNameType === 1 ? 'default' : null;
        exports.push({
          t,
          n,
          im,
          ims: importNameType === 0 ? ls : -1,
          ime: importNameType === 0 ? le : -1,
          f: imports[fi].n as string,
          fi,
          s,
          e,
          ss
        });
      }
    }
    exportPtr = wasm.re();
  }

  function decode (str: string) {
    try {
      return (0, eval)(str)
    }
    catch (e) {}
  }

  function decodeIfQuoted (str: string): string {
    if (!str) return str;
    const firstChar = str[0];
    if (firstChar === '"' || firstChar === "'")
      return decode(str) || str;
    return str;
  }

  return (MINIMAL ? [imports, exports] : [imports, exports, !!wasm.f(), !!wasm.ms()]) as ReturnType<typeof parse>;
}

function copyBE (src: string, outBuf16: Uint16Array) {
  const len = src.length;
  let i = 0;
  while (i < len) {
    const ch = src.charCodeAt(i);
    outBuf16[i++] = (ch & 0xff) << 8 | ch >>> 8;
  }
}

function copyLE (src: string, outBuf16: Uint16Array) {
  const len = src.length;
  let i = 0;
  while (i < len)
    outBuf16[i] = src.charCodeAt(i++);
}

/**
 * @param source Module source
 * @returns Whether the source may contain a detached export clause
 */
function mayHaveExportClause (source: string): boolean {
  return source.length >= EXPORT_CAPTURE_THRESHOLD &&
    (source.indexOf('export {') !== -1 || source.indexOf('export{') !== -1);
}

let wasm: {
  __heap_base: {value: number} | number & {value: undefined};
  memory: WebAssembly.Memory;
  parse(): boolean;
  /** importType */
  it(): number;
  /** getAttributeIndex */
  ai(): number;
  /** getErr */
  e(): number;
  /** enable import binding collection */
  eac(enabled: boolean): void;
  /** getExportEnd */
  ee(): number;
  /** getExportImportIndex */
  eii(): number;
  /** getExportImportNameType */
  eit(): number;
  /** getExportLocalEnd */
  ele(): number;
  /** getExportLocalStart */
  els(): number;
  /** getExportStart */
  es(): number;
  /** getExportStatementStart */
  ess(): number;
  /** getExportType */
  et(): number;
  /** facade */
  f(): boolean;
  /** hasModuleSyntax */
  ms(): boolean;
  /** getImportDynamic */
  id(): number;
  /** getImportEnd */
  ie(): number;
  /** getImportSafeString */
  ip(): number;
  /** getImportStart */
  is(): number;
  /** readExport */
  re(): number;
  /** readImport */
  ri(): boolean;
  /** allocateSource */
  sa(utf16Len: number): number;
  /** getImportStatementEnd */
  se(): number;
  /** getImportStatementStart */
  ss(): number;
  /** readAttribute */
  ra(): boolean;
  /** resetAttributes */
  rsa(): void;
  /** getAttributeKeyStart */
  aks(): number;
  /** getAttributeKeyEnd */
  ake(): number;
  /** getAttributeValueStart */
  avs(): number;
  /** getAttributeValueEnd */
  ave(): number;
};

const getWasmBytes = () => (
  binary => typeof Buffer !== 'undefined'
    ? Buffer.from(binary, 'base64')
    : Uint8Array.from(atob(binary), x => x.charCodeAt(0))
)('WASM_BINARY');

/**
 * Wait for init to resolve before calling `parse`.
 */
export const init = WebAssembly.compile(getWasmBytes())
.then(WebAssembly.instantiate)
.then(({ exports }) => { wasm = exports as typeof wasm; });

export const initSync = () => {
  if (wasm) {
    return;
  }
  const compiled = new WebAssembly.Module(getWasmBytes());
  wasm = new WebAssembly.Instance(compiled).exports as typeof wasm;
  return;
};
