// Build-time variant flag. The minimal build (dist/lexer.minimal.js) rewrites
// this to `true`; terser then folds away the full-only getter reads (ip/ess/f/
// ms/attributes/export analysis), matching the stripped LEXER_MIN wasm
// exports. `as boolean` keeps both branches type-checked rather than narrowed
// to the false literal.
const MINIMAL = false as boolean;

/**
 * Numeric import type reported by the minimal build (`ImportSpecifier.t`).
 * The full build reports string `type` / `phase` discriminants instead.
 */
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

/**
 * Import phase modifier: `import source` / `import.source(...)` report
 * `'source'`, `import defer` / `import.defer(...)` report `'defer'`, all
 * other imports report `null`.
 */
export type ImportPhase = 'source' | 'defer' | null;

interface ImportBase {
  /**
   * Start of module specifier
   *
   * @example
   * const source = `import { a } from 'asdf'`;
   * const [imports, exports] = parse(source);
   * source.substring(imports[0].start, imports[0].end);
   * // Returns "asdf"
   */
  readonly start: number;
  /**
   * End of module specifier
   */
  readonly end: number;

  /**
   * Start of the import
   *
   * @example
   * const source = `import { a } from 'asdf'`;
   * const [imports, exports] = parse(source);
   * source.substring(imports[0].importStart, imports[0].importEnd);
   * // Returns "import { a } from 'asdf'"
   */
  readonly importStart: number;
  /**
   * End of the import
   */
  readonly importEnd: number;
}

export interface StaticImport extends ImportBase {
  /**
   * `'reexport-star'` is the module request record of an
   * `export * from 'module'` statement; every other static form is
   * `'static'`.
   */
  readonly type: 'static' | 'reexport-star';
  /**
   * Decoded module specifier with escape sequences processed. A specifier
   * that does not decode as a JS string (invalid escape sequences) is a
   * parse error.
   */
  readonly specifier: string;
  readonly phase: ImportPhase;
  /**
   * Parsed import attributes as an array of [key, value] tuples.
   * If this import has no attributes, this is `null`.
   *
   * @example
   * const source = `import foo from 'bar' with { type: "json" }`;
   * const [imports] = parse(source);
   * imports[0].attributes;
   * // Returns [['type', 'json']]
   */
  readonly attributes: ReadonlyArray<readonly [string, string]> | null;
  /**
   * Start of the import attributes (`with { ... }`), or -1 if none.
   */
  readonly attributesStart: number;
}

export interface DynamicImport extends ImportBase {
  readonly type: 'dynamic';
  /**
   * Decoded module specifier when statically analyzable, else `undefined`.
   *
   * A dynamic import whose entire argument is a single template literal is
   * reported as a glob: each `${...}` substitution is collapsed to a single
   * `*`. Other expressions (including a template concatenated with anything
   * else) remain `undefined`.
   *
   * @example
   * const [imports1] = parse(`import("./ab.js")`);
   * imports1[0].specifier;
   * // Returns "./ab.js"
   *
   * const [imports2] = parse(`import("./" + "ab.js")`);
   * imports2[0].specifier;
   * // Returns undefined
   *
   * const [imports3] = parse('import(`./locales/${locale}.js`)');
   * imports3[0].specifier;
   * // Returns "./locales/*.js"
   */
  readonly specifier: string | undefined;
  readonly phase: ImportPhase;
  /**
   * Start of the dynamic import expression argument.
   */
  readonly dynamicStart: number;
  /**
   * Parsed import attributes as an array of [key, value] tuples, or `null`.
   */
  readonly attributes: ReadonlyArray<readonly [string, string]> | null;
  /**
   * Start of the import attributes option, or -1 if none.
   */
  readonly attributesStart: number;
}

/**
 * An `import.meta` reference; `start` / `end` span the `import.meta`
 * expression itself.
 */
export interface ImportMetaRef extends ImportBase {
  readonly type: 'import-meta';
}

export type Import = StaticImport | DynamicImport | ImportMetaRef;

// Internal wire values of the export ABI type tag; the public API reports the
// string discriminants.
enum ExportType {
  Direct = 1,
  Reexport = 2,
  ReexportAll = 3,
}

export interface DirectExport {
  readonly type: 'direct';
  /**
   * Exported name
   *
   * @example
   * const source = `export default []`;
   * const [imports, exports] = parse(source);
   * exports[0].name;
   * // Returns "default"
   */
  readonly name: string;
  /**
   * Start of exported name
   *
   * @example
   * const source = `export { 42 as asdf }`;
   * const [imports, exports] = parse(source);
   * source.substring(exports[0].start, exports[0].end);
   * // Returns "asdf"
   */
  readonly start: number;
  /**
   * End of exported name
   */
  readonly end: number;
  /**
   * Local name, or undefined for anonymous default exports.
   */
  readonly localName: string | undefined;
  /**
   * Start of local name, or -1.
   */
  readonly localStart: number;
  /**
   * End of local name, or -1.
   */
  readonly localEnd: number;
  /**
   * Start of the export statement.
   *
   * Only the start is provided; the statement end is not tracked
   * (see https://github.com/guybedford/es-module-lexer/issues/112). Every
   * specifier of a statement reports the same start, so `export { a, b }`
   * returns the same `exportStart` for both `a` and `b`.
   */
  readonly exportStart: number;
}

export interface Reexport {
  readonly type: 'reexport';
  /**
   * Exported name
   */
  readonly name: string;
  /**
   * Start of exported name
   */
  readonly start: number;
  /**
   * End of exported name
   */
  readonly end: number;
  /**
   * Imported name, or null for namespace and source phase imports.
   */
  readonly importName: string | null;
  /**
   * Start of imported name, or -1 when `importName` is null or `"default"`
   * from a default import.
   */
  readonly importNameStart: number;
  /**
   * End of imported name, or -1 when `importNameStart` is -1.
   */
  readonly importNameEnd: number;
  /**
   * Module specifier reexported from.
   */
  readonly from: string;
  /**
   * Index of the originating import in the imports array.
   */
  readonly importIndex: number;
  /**
   * Start of the export statement.
   */
  readonly exportStart: number;
}

export interface ReexportAll {
  readonly type: 'reexport-all';
  /**
   * Module specifier reexported from.
   */
  readonly from: string;
  /**
   * Index of the originating import in the imports array.
   */
  readonly importIndex: number;
  /**
   * Start of the `*`.
   */
  readonly start: number;
  /**
   * End of the `*`.
   */
  readonly end: number;
  /**
   * Start of the export statement.
   */
  readonly exportStart: number;
}

export type Export = DirectExport | Reexport | ReexportAll;

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
  imports: ReadonlyArray<Import>,
  exports: ReadonlyArray<Export>,
  facade: boolean,
  hasModuleSyntax: boolean
] {
  if (!wasm)
    // synchronous compile is restricted on browser main threads — await init
    // there before calling parse
    initSync();

  const len = source.length + 1;

  // need 2 bytes per code point plus analysis space so we double again
  // + 16 so SIMD scans may overread one vector past the source sentinel
  const extraMem = (wasm.__heap_base.value || wasm.__heap_base) as number + len * 4 + 16 - wasm.memory.buffer.byteLength;
  if (extraMem > 0)
    wasm.memory.grow(Math.ceil(extraMem / 65536));

  const addr = wasm.sa(len - 1);
  // Node's Buffer blits UTF-16 straight into Wasm memory ~10x faster than the
  // charCodeAt fallback, in explicit LE matching Wasm regardless of host.
  if (typeof Buffer !== 'undefined')
    Buffer.from(wasm.memory.buffer, addr, (len - 1) * 2).write(source, 'utf16le');
  else
    (isLE ? copyLE : copyBE)(source, new Uint16Array(wasm.memory.buffer, addr, len));

  if (!wasm.parse())
    throw Object.assign(new Error(`Parse error ${name}:${source.slice(0, wasm.e()).split('\n').length}:${wasm.e() - source.lastIndexOf('\n', wasm.e() - 1)}`), { idx: wasm.e() });

  const imports: Import[] = [], exports: Export[] = [];
  while (wasm.ri()) {
    const s = wasm.is(), e = wasm.ie(), t = wasm.it(), a = wasm.ai(), d = wasm.id(), ss = wasm.ss(), se = wasm.se();
    let n;
    if (wasm.ip())
      n = decode(source.slice(d === -1 ? s - 1 : s, d === -1 ? e + 1 : e), s);
    else if (!MINIMAL && d !== -1 && source[s] === '`')
      n = decodeTemplate(s, e);
    let at: Array<[string, string]> | null = null;
    // minimal build drops the parsed attribute list; es-module-shims reads the
    // assertion via source.slice(a, se - 1) instead
    if (!MINIMAL) {
      at = [];
      wasm.rsa();
      while (wasm.ra()) {
        const aks = wasm.aks(), ake = wasm.ake(), avs = wasm.avs(), ave = wasm.ave();
        at.push([decodeIfQuoted(source.slice(aks, ake), aks), decodeIfQuoted(source.slice(avs, ave), avs)]);
      }
      if (at.length === 0) at = null;
    }
    if (MINIMAL) {
      imports.push({ n, t, s, e, ss, se, d, a, at } as unknown as Import);
    }
    else if (t === ImportType.ImportMeta) {
      imports.push({ type: 'import-meta', start: s, end: e, importStart: ss, importEnd: se });
    }
    else if (d !== -1) {
      const phase: ImportPhase = t === ImportType.DynamicSourcePhase ? 'source' : t === ImportType.DynamicDeferPhase ? 'defer' : null;
      imports.push({ type: 'dynamic', specifier: n, phase, start: s, end: e, importStart: ss, importEnd: se, dynamicStart: d, attributes: at, attributesStart: a });
    }
    else {
      const phase: ImportPhase = t === ImportType.StaticSourcePhase ? 'source' : t === ImportType.StaticDeferPhase ? 'defer' : null;
      imports.push({ type: t === ImportType.StaticReexportStar ? 'reexport-star' : 'static', specifier: n!, phase, start: s, end: e, importStart: ss, importEnd: se, attributes: at, attributesStart: a });
    }
  }
  let exportPtr = wasm.re();
  const memoryView = MINIMAL || exportPtr === 0 ? undefined : new DataView(wasm.memory.buffer);
  while (exportPtr !== 0) {
    if (MINIMAL) {
      const s = wasm.es(), e = wasm.ee(), ls = wasm.els(), le = wasm.ele();
      const ln = ls < 0 ? undefined : decodeIfQuoted(source.slice(ls, le), ls);
      const n = decodeIfQuoted(source.slice(s, e), s);
      exports.push({ s, e, ls, le, n, ln } as unknown as Export);
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
      exports.push({ type: 'reexport-all', from: (imports[fi] as StaticImport).specifier, importIndex: fi, start: s, end: e, exportStart: ss });
    }
    else {
      const n = decodeIfQuoted(source.slice(s, e), s);
      if (t === ExportType.Direct) {
        const ln = ls < 0 ? undefined : decodeIfQuoted(source.slice(ls, le), ls);
        exports.push({ type: 'direct', name: n, localName: ln, start: s, end: e, localStart: ls, localEnd: le, exportStart: ss });
      }
      else {
        const importNameType = memoryView!.getUint8(exportPtr + 25);
        const im = importNameType === 0
          ? decodeIfQuoted(source.slice(ls, le), ls)
          : importNameType === 1 ? 'default' : null;
        exports.push({
          type: 'reexport',
          name: n,
          importName: im,
          importNameStart: importNameType === 0 ? ls : -1,
          importNameEnd: importNameType === 0 ? le : -1,
          from: (imports[fi] as StaticImport).specifier,
          importIndex: fi,
          start: s,
          end: e,
          exportStart: ss
        });
      }
    }
    exportPtr = wasm.re();
  }

  // strict mode matches the asm build's eval-free decoder in rejecting
  // legacy octal escapes
  function decode (str: string, idx: number): string {
    try {
      return (0, eval)('"use strict";' + str)
    }
    catch (e) {
      throw Object.assign(new Error(`Parse error ${name}:${source.slice(0, idx).split('\n').length}:${idx - source.lastIndexOf('\n', idx - 1)}`), { idx });
    }
  }

  function decodeIfQuoted (str: string, idx: number): string {
    const firstChar = str[0];
    if (firstChar === '"' || firstChar === "'")
      return decode(str, idx);
    return str;
  }

  // Glob for a lone interpolated-template specifier starting at `s`. The parser
  // commits a ${...} span list only for that shape (see lexer.c), so a first
  // rt() of false means "not a glob" (a concatenation such as `a${x}` + b, or a
  // nested template) and yields undefined. Walking from the opening backtick,
  // each top-level ${...} becomes a single "*" and is skipped via its recorded
  // end. A literal unescaped "*" in a static run is emitted as "\*" so the glob
  // stays invertible: "*" is always a wildcard, "\*" always a literal star
  // (a source-escaped star is already copied through as "\*"). The walk ends at
  // the specifier's unescaped closing backtick.
  function decodeTemplate (s: number, e: number) {
    wasm.rts();
    if (!wasm.rt())
      return;
    let out = '', chunkStart = s + 1, index = s + 1, spanEnd = wasm.te();
    // `e` bounds the walk defensively; the parser guarantees an unescaped
    // closing backtick within it for a committed glob.
    while (index < e) {
      const ch = source.charCodeAt(index);
      if (ch === 96/*`*/)
        break;
      if (ch === 92/*\*/) {
        index += 2;
        continue;
      }
      if (ch === 42/***/) {
        out += source.slice(chunkStart, index) + '\\*';
        chunkStart = ++index;
        continue;
      }
      if (ch === 36/*$*/ && source.charCodeAt(index + 1) === 123/*{*/ && index + 2 <= spanEnd) {
        out += source.slice(chunkStart, index) + '*';
        index = chunkStart = spanEnd;
        spanEnd = wasm.rt() ? wasm.te() : -1;
        continue;
      }
      index++;
    }
    return out + source.slice(chunkStart, index);
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
  // The export getters are only exported by the minimal wasm build; the full
  // build reads Export records straight out of memory via the re() pointer.
  /** getExportEnd */
  ee(): number;
  /** getExportLocalEnd */
  ele(): number;
  /** getExportLocalStart */
  els(): number;
  /** getExportStart */
  es(): number;
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
  /** readTemplateSpan */
  rt(): boolean;
  /** getTemplateSpanEnd */
  te(): number;
  /** resetTemplateSpans */
  rts(): void;
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
