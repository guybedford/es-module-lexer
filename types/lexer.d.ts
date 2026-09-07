/** A static import using any syntax variation: `import .. from 'module'`. */
export type StaticImportType = 1;
/** A dynamic import expression `import(specifier)` or `import(specifier, opts)`. */
export type DynamicImportType = 2;
/** An `import.meta` expression. */
export type ImportMetaType = 3;
/** A source phase import: `import source x from 'module'`. */
export type StaticSourcePhaseType = 4;
/** A dynamic source phase import: `import.source('module')`. */
export type DynamicSourcePhaseType = 5;
/** A defer phase import: `import defer * as x from 'module'`. */
export type StaticDeferPhaseType = 6;
/** A dynamic defer phase import: `import.defer('module')`. */
export type DynamicDeferPhaseType = 7;
/** The module request of an `export * from 'module'` statement (full build only). */
export type StaticReexportStarType = 8;
/**
 * Numeric import type reported by the minimal build (`ImportSpecifier.t`).
 * The full build reports string `type` / `phase` discriminants instead.
 * Type-only: there is no runtime value to import.
 */
export type ImportType = StaticImportType | DynamicImportType | ImportMetaType | StaticSourcePhaseType | DynamicSourcePhaseType | StaticDeferPhaseType | DynamicDeferPhaseType | StaticReexportStarType;
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
    /**
     * `true` for a TypeScript type-only import (`import type ... from`), elided
     * from the emitted JavaScript. Both the Wasm and asm.js / CSP builds lex
     * TypeScript; the minimal build (`es-module-lexer/minimal`) omits this field.
     */
    readonly typeOnly: boolean;
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
     * Always `null`: the options argument of a dynamic import is not parsed.
     * `attributesStart` locates it in the source.
     */
    readonly attributes: null;
    /**
     * Start of the dynamic import options argument, or -1 if none.
     */
    readonly attributesStart: number;
    /**
     * Best-effort TypeScript type-position `import()` classification. As a
     * lexer without a full parser, type annotation positions cannot be
     * comprehensively classified, so this is heuristic: `true` when the result
     * is used in a way no runtime promise is (`typeof import('m')`, or a
     * member / indexed access other than `then` / `catch` / `finally`, unless
     * preceded by `await`). Bare type positions (`const x: import('m') = y`)
     * stay `false`.
     */
    readonly probablyTypeOnly: boolean;
}
/**
 * An `import.meta` reference; `start` / `end` span the `import.meta`
 * expression itself.
 */
export interface ImportMetaRef extends ImportBase {
    readonly type: 'import-meta';
}
export type Import = StaticImport | DynamicImport | ImportMetaRef;
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
    /**
     * `true` for a TypeScript type-only export: `export type { ... }`, an inline
     * `export { type X }`, or a directly-exported `export type`/`export interface`
     * declaration. Elided from the emitted JavaScript. Both the Wasm and asm.js /
     * CSP builds lex TypeScript; the minimal build omits this field.
     */
    readonly typeOnly: boolean;
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
    /**
     * `true` for a TypeScript type-only re-export.
     */
    readonly typeOnly: boolean;
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
    /**
     * `true` for a TypeScript type-only star re-export.
     */
    readonly typeOnly: boolean;
}
export type Export = DirectExport | Reexport | ReexportAll;
export interface ParseError extends Error {
    idx: number;
}
/**
 * Outputs the list of exports and locations of import specifiers,
 * including dynamic import and import meta handling.
 *
 * @param source Source code to parser
 * @param name Optional sourcename
 * @returns Tuple contaning imports list and exports list.
 */
export declare function parse(source: string, name?: string): readonly [
    imports: ReadonlyArray<Import>,
    exports: ReadonlyArray<Export>,
    facade: boolean,
    hasModuleSyntax: boolean
];
/**
 * Wait for init to resolve before calling `parse`.
 */
export declare const init: Promise<void>;
export {};
