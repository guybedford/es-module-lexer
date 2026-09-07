# ES Module Lexer

[![Build Status][actions-image]][actions-url]

A JS/TS module syntax lexer used in [es-module-shims](https://github.com/guybedford/es-module-shims).

Outputs the list and locations of exports and import specifiers, including dynamic import and import meta expressions.

Supports new syntax features including import attributes, deferred evaluation, and source phase imports, as well as [lexing type-only TypeScript imports and exports](#typescript) in the full build.

A very small single JS file (~7KiB gzipped for the [minimal build](#minimal-build)) that includes inlined WebAssembly for very fast source analysis of ECMAScript module syntax only.

For an example of the performance, Angular 1 (720KiB) is fully parsed in 1ms, in comparison to the fastest JS parser, Acorn which takes over 100ms.

_Comprehensively handles the JS language grammar while remaining small and fast. - ~5ms per MB of JS cold and ~3ms per MB of JS warm, [see benchmarks](#benchmarks) for more info._

> [Built with](https://github.com/guybedford/es-module-lexer/blob/main/chompfile.toml) [Chomp](https://chompbuild.com/)

## Package Exports

| Export | Build | Footprint (Brotli) |
| --- | --- | --- |
| `es-module-lexer` | [Full build](#full-build), Wasm, JS & [TypeScript](#typescript) | 11.8KiB |
| `es-module-lexer/js` | [Full build](#full-build), [CSP asm.js](#csp-asmjs-build), JS & [TypeScript](#typescript) | 10.8KiB |
| `es-module-lexer/minimal` | [Minimal build](#minimal-build) (v2-like API), Wasm, JS only | 6.8KiB |
| `es-module-lexer/minimal/js` | [Minimal build](#minimal-build) (v2-like API), [CSP asm.js](#csp-asmjs-build), JS only | 6.5KiB |

See [Environment Support](#environment-support) for the engine requirements of each build.

## Full Build

The full build lexes both JavaScript and erasable [type-only TypeScript](#typescript) syntax, reporting type-only imports and exports with a `typeOnly` flag.

### Usage

```
npm install es-module-lexer
```

See [src/lexer.ts](src/lexer.ts) for the type definitions.

For use in CommonJS:

```js
const { init, parse } = require('es-module-lexer');

(async () => {
  // in browsers, await init first for the WebAssembly boot
  await init;

  const source = 'export var p = 5';
  const [imports, exports] = parse(source);

  // Returns "p"
  source.slice(exports[0].start, exports[0].end);
})();
```

`parse` initializes the WebAssembly automatically on first use, compiling it
synchronously if the `init` promise has not been awaited. Browser main threads
restrict synchronous WebAssembly compilation, so awaiting `init` remains
required there, while in Node.js and other environments it is optional.

An ES module version is also available:

```js
import { init, parse } from 'es-module-lexer';
```

The full build reports each import and export as a tagged union discriminated
by `type` (see [src/lexer.ts](src/lexer.ts) for the authoritative
declarations):

```ts
type Import = StaticImport | DynamicImport | ImportMetaRef;

interface StaticImport {
  // 'reexport-star' is the module request of `export * from 'mod'`
  type: 'static' | 'reexport-star';
  // decoded specifier with escape sequences processed (invalid escape
  // sequences are a parse error)
  specifier: string;
  phase: 'source' | 'defer' | null;
  // module specifier range
  start: number;
  end: number;
  // import statement range (importEnd excludes a trailing semicolon)
  importStart: number;
  importEnd: number;
  // parsed attribute [key, value] pairs and the `with { ... }` start,
  // or null / -1 for no attributes
  attributes: [string, string][] | null;
  attributesStart: number;
  // true for a TypeScript type-only import
  typeOnly: boolean;
}

interface DynamicImport {
  type: 'dynamic';
  // decoded specifier when statically analyzable; a lone template literal
  // argument reports a glob with each ${...} collapsed to "*"; else undefined
  specifier: string | undefined;
  phase: 'source' | 'defer' | null;
  // argument range and the `(` position
  start: number;
  end: number;
  dynamicStart: number;
  importStart: number;
  importEnd: number;
  attributes: [string, string][] | null;
  attributesStart: number;
}

interface ImportMetaRef {
  type: 'import-meta';
  // the `import.meta` expression range
  start: number;
  end: number;
  importStart: number;
  importEnd: number;
}

type Export = DirectExport | Reexport | ReexportAll;

interface DirectExport {
  type: 'direct';
  name: string;
  // undefined for anonymous default exports
  localName: string | undefined;
  // exported name and local name ranges (local -1 when absent)
  start: number;
  end: number;
  localStart: number;
  localEnd: number;
  // only the start of the export statement is tracked
  exportStart: number;
  // true for a TypeScript type-only export
  typeOnly: boolean;
}

interface Reexport {
  type: 'reexport';
  name: string;
  // imported name, null for namespace and source phase reexports
  importName: string | null;
  importNameStart: number;
  importNameEnd: number;
  // module specifier and index of the originating entry in imports
  from: string;
  importIndex: number;
  start: number;
  end: number;
  exportStart: number;
  typeOnly: boolean;
}

interface ReexportAll {
  type: 'reexport-all';
  from: string;
  importIndex: number;
  // the `*` range
  start: number;
  end: number;
  exportStart: number;
  typeOnly: boolean;
}
```

For example:

```js
import { init, parse } from 'es-module-lexer';

await init;

const source = `
  import { name } from 'mod';
  import json from './json.json' with { type: 'json' };
  export var p = 5;
  export { x as 'external name' } from 'external';
  import ('asdf');
  import.meta.url;
  import source mod from './mod.wasm';
`;

const [imports, exports] = parse(source, 'optional-sourcename');

// { type: 'static', specifier: 'mod', phase: null, ... }
imports[0];
// Returns "import { name } from 'mod'"
source.slice(imports[0].importStart, imports[0].importEnd);

// Returns [['type', 'json']]
imports[1].attributes;
// Returns "{ type: 'json' }"
source.slice(imports[1].attributesStart, imports[1].importEnd);

// { type: 'static', specifier: 'external', ... } from the reexport
imports[2];
// { type: 'dynamic', specifier: 'asdf', dynamicStart, ... }
imports[3];
// { type: 'import-meta', ... } spanning "import.meta"
imports[4];
// { type: 'static', phase: 'source', specifier: './mod.wasm', ... }
imports[5];

// { type: 'direct', name: 'p', localName: 'p', ... }
exports[0];
// { type: 'reexport', name: 'external name', importName: 'x',
//   from: 'external', importIndex: 2, ... }
exports[1];
```

### Export Analysis

Detached exports are resolved after the complete module is lexed. An imported
binding is therefore classified as a reexport regardless of whether its import
appears before or after the export:

```js
const source = `
  export { value as publicValue };
  import { original as value } from 'dep';
`;
const [imports, exports] = parse(source);

exports[0].type === 'reexport';
exports[0].name === 'publicValue';
exports[0].importName === 'original';
exports[0].from === 'dep';
exports[0].importIndex === 0;
imports[0].specifier === 'dep';
```

When migrating a full-build consumer from v2, switch on `type` before reading
kind-specific fields: the terse v2 field names and numeric type tags are
replaced by the descriptive names above, reexports no longer expose
placeholder local-name properties, and bare star reexports now appear in the
exports array with their origins available through `importName` and
`imports[importIndex]` without rescanning source statements.

### TypeScript

The default `parse` lexes the type-only import and export syntax that [Node.js type stripping](https://nodejs.org/api/typescript.html#type-stripping) erases, so the same lexer that handles your JavaScript also handles those TypeScript edges without a separate transform step:

```js
const [imports, exports] = parse(`
  import type { Foo } from './foo';
  import { bar } from './bar';
  export type { Baz } from './baz';
`);
```

Type-only imports and exports are reported rather than elided, marked with the `typeOnly` field:

```js
// import type { Foo } from './foo'  ->  { type: 'static', specifier: './foo', typeOnly: true, ... }
// import { bar } from './bar'       ->  { type: 'static', specifier: './bar', typeOnly: false, ... }
imports[0].typeOnly; // true
imports[1].typeOnly; // false
```

`typeOnly` is present on every static import and every export record. Inline modifiers are tracked per specifier, so `export { type A, b }` marks only `A`, and directly-exported `export type Foo = ...` / `export interface Foo {}` declarations are marked too. Plain JavaScript always reports `typeOnly: false`: every type-only form is a syntax error in JavaScript except `import type from 'x'`, which is a value import of the default binding named `type` and keeps its runtime edge, so nothing changes for JavaScript consumers.

Both the Wasm and asm.js / CSP builds (`es-module-lexer/js`) lex TypeScript. The minimal build (`es-module-lexer/minimal`) lexes JavaScript only and omits `typeOnly`.

`type` and `interface` declarations are skipped whether exported or not, so an `import(...)` type buried in an alias right-hand side or an interface body (`type T = import('x').Y`, `interface I { load(): import('x').Y }`) is not reported as a runtime import.

Default-exported interfaces and declarations with escaped names are erased but not reported as exports. At a line break after a complete alias right-hand side, a line-leading token that can only continue a type (`|`, `&`, `?`, `:`, `.`, `=>`, `extends`) keeps the erased region open, so multi-line conditional and union types stay erased.

#### Caveats

All type-only imports and exports and `type` / `interface` declarations are grammar-certain and reported exactly via `typeOnly`. The one heuristic case is dynamic `import()` types: es-module-lexer is a lexer, not a full parser, so an `import()` type in an annotation position (annotations, generic arguments, `as` / `satisfies`) is classified best-effort by how its result is used, reported as `probablyTypeOnly` on the dynamic import record:

* `typeof import('m')` and exact unescaped non-promise members report
  `probablyTypeOnly: true`. Examples include `import('m').T` and
  `import('m')['x']`. Promise members (`then`, `catch`, `finally`), computed
  names, and escaped names stay runtime.
* `await import('m')` and promise member access always remain runtime imports.
* A bare unqualified `import('m')` annotation type is indistinguishable from a value use and reports `probablyTypeOnly: false`: runtime module graphs over-report rather than under-report.

`export declare` ambient declarations are erased with their names reported as type-only exports, and TS import-equals is lexed: `import A = require('m')` keeps a runtime import edge (type-only under `import type`), while a namespace alias right-hand side (`import A = N.M`) is erased.

Non-erasable TypeScript (`enum`, runtime `namespace`, parameter properties, legacy decorators) is out of scope, matching Node.js type stripping — though `export enum E` and `export namespace N` do report their declared value name as a runtime export.

### Import Attributes

The `attributesStart` field provides the index of the start of the `{`
attributes bracket, or -1 for no attributes.

The list of attribute key and value pairs is provided on the `attributes`
field:

```js
const [imports] = parse(`
  import json from './foo.json' with { type: 'json' };
  import './foo.css' with { type: 'css' };
  import pkg from 'pkg' with { type: 'json', integrity: 'sha384-...' };
`);

// Returns [['type', 'json']]
imports[0].attributes;

// Returns [['type', 'css']]
imports[1].attributes;

// Multiple attributes
// Returns [['type', 'json'], ['integrity', 'sha384-...']]
imports[2].attributes;
```

The `attributes` field is an array of `[key, value]` tuples, or `null` if
there are no attributes.

Both keys and values support escape sequences:

```js
const [imports] = parse(`
  import foo from './foo.js' with { "custom-key": "value" };
`);

// Quoted keys are unquoted, escape sequences are processed
// Returns [['custom-key', 'value']]
imports[0].attributes;
```

### Escape Sequences

Escape sequences in specifier strings are decoded into the `specifier` field.
A specifier that does not decode as a JS string (an invalid escape sequence)
throws a parse error, just like the source would in a JS engine.

When the entire dynamic import argument is a single template literal,
`specifier` is reported as a glob: each `${...}` substitution is collapsed to
a single `*` (for example `` import(`./locales/${locale}.js`) `` yields
`./locales/*.js`). A template concatenated with anything else, or any other
expression, resolves to `undefined`. Substitutions are matched by the parser
itself, so a `/` inside one is correctly disambiguated as regex or division
and does not affect the glob.

The static parts are the raw specifier source: escape sequences are not
cooked, and a literal `*` in the specifier is emitted as-is, so a consumer
treating the glob `specifier` as a pattern has to apply its own escaping.

### Star Re-exports

`export * from 'module'` is both a dependency on `module` and a re-export of
its names. It is reported on both sides:

```js
const source = `export * from './core'`;
const [imports, exports] = parse(source);

// Returns "reexport-all"
exports[0].type;
// Returns "./core"
exports[0].from;

// The specifier is an import record typed 'reexport-star' so it is not
// confused with a side-effect `import './core'` (which is 'static').
imports[0].type === 'reexport-star';
imports[0].specifier;
// Returns "./core"

// The two halves share the same statement range.
source.slice(imports[0].importStart, imports[0].importEnd);
// Returns "export * from './core'"
```

`export * as ns from 'module'` is unchanged: it already reports the namespace
name `ns` as a `'reexport'`, with the specifier as a normal static import.

### Facade Detection

Facade modules that only use import / export syntax can be detected via the third return value (full build only):

```js
const [,, facade] = parse(`
  export * from 'external';
  import * as ns from 'external2';
  export { a as b } from 'external3';
  export { ns };
`);
facade === true;
```

### ESM Detection

Modules that uses ESM syntaxes can be detected via the fourth return value (full build only):

```js
const [,,, hasModuleSyntax] = parse(`
  export {}
`);
hasModuleSyntax === true;
```

Dynamic imports are ignored since they can be used in Non-ESM files.

```js
const [,,, hasModuleSyntax] = parse(`
  import('./foo.js')
`);
hasModuleSyntax === false;
```

## Minimal Build

For size-sensitive embedders, the `es-module-lexer/minimal` build drops
certain features to reduce the binary size. This is used for example by
[es-module-shims](https://github.com/guybedford/es-module-shims):

```js
import { parse } from 'es-module-lexer/minimal';
```

The minimal build keeps the terse v2 record shapes rather than the full
build's discriminated unions, and `parse` returns a two-element
`[imports, exports]` tuple only (the facade and `hasModuleSyntax` booleans
are dropped):

```js
import { parse } from 'es-module-lexer/minimal';

const source = `
  import { name } from 'mod';
  import json from './json.json' with { type: 'json' };
  export var p = 5;
  import ('asdf');
  import.meta.url;
`;

const [imports, exports] = parse(source);

// Returns "mod"
imports[0].n
// Returns "mod"
source.slice(imports[0].s, imports[0].e);
// "s" = start
// "e" = end

// Returns "import { name } from 'mod'"
source.slice(imports[0].ss, imports[0].se);
// "ss" = statement start
// "se" = statement end

// Import type is provided by the numeric `t` value
// (see the ImportType enum; 8 is the `export * from 'mod'` module request)
// Returns true
imports[0].t === 1;

// Returns "{ type: 'json' }"
source.slice(imports[1].a, imports[1].se);
// "a" = attribute start, -1 for no import attributes
// (the parsed attribute list `at` is always null in the minimal build)

// Dynamic imports have "d" as the start of the expression argument,
// with -1 for static imports and -2 for import.meta
// Returns "asdf" (only for string literal dynamic imports)
imports[2].n
// Returns "('asdf')"
source.slice(imports[2].d, imports[2].se);

// import.meta is indicated by d === -2
// Returns true
imports[3].d === -2;

// Exports keep the v2 flat { n, ln, s, e, ls, le } shape with no export
// classification, origins, statement starts, or `export *` records
// Returns "p"
source.slice(exports[0].s, exports[0].e);
// Returns "p"
source.slice(exports[0].ls, exports[0].le);
```

Interpolated template specifiers are not globbed in the minimal build (`n` is
`undefined` for them), and escape sequences in specifiers are decoded into
`n` just as in the full build, including the parse error on invalid escape
sequences.

## CSP asm.js Build

The default builds use Wasm without generating code from strings. They work when JavaScript eval is disabled,
including Node.js with `--disallow-code-generation-from-strings`, if the environment permits WebAssembly compilation.

For CSP policies that also disable WebAssembly compilation, use the `es-module-lexer/js` and
`es-module-lexer/minimal/js` builds:

```js
import { parse } from 'es-module-lexer/js';
```

Instead of WebAssembly, these use an asm.js build which is almost as fast as the Wasm version ([see benchmarks below](#benchmarks)).

### Environment Support

The full build requires Node.js 18+ and engines with [WebAssembly SIMD support](https://webassembly.org/features/) (Chrome 91+, Firefox 89+, Safari 16.4+).

The minimal build (`es-module-lexer/minimal`) carries no SIMD requirement, running in all browsers with baseline [ES modules support](https://caniuse.com/es6-module-dynamic-import) (Chrome 63+, Firefox 67+, Safari 11.1+ — the [es-module-shims](https://github.com/guybedford/es-module-shims) support matrix), with the asm.js builds covering those without WebAssembly.

### Grammar Support

* Token state parses all line comments, block comments, strings, template strings, blocks, parens and punctuators.
* Division operator / regex token ambiguity is handled via backtracking checks against punctuator prefixes, including closing brace or paren backtracking.
* Always correctly parses valid JS source, but may parse invalid JS source without errors.

### Limitations

The lexing approach is designed to deal with the full language grammar including RegEx / division operator ambiguity through backtracking and paren / brace tracking.

Because it lexes rather than fully parses, the analysis is not a validation pass: valid JS source is always analyzed correctly, but some invalid source is accepted without an error rather than rejected. For example `export const = 1` lexes to an empty exports list instead of throwing. Callers that need to reject invalid source should run a validating parser separately.

Multiple exports per declaration (`export var a = 'asdf', q = z`) and renamed destructured exports (`export var { a: b } = asdf`) are detected correctly; earlier versions missed `q` and `b` in these forms.

### Benchmarks

Benchmarks can be run with `npm run bench`.

Current results on a standard desktop machine:

#### Wasm Build

```
Module load time
> 5ms
Cold Run, All Samples
test/samples/*.js (3057 KiB)
> 14ms

Warm Runs (average of 25 runs)
test/samples/angular.js (719 KiB)
> 1ms
test/samples/angular.min.js (188 KiB)
> 1ms
test/samples/d3.js (491 KiB)
> 2ms
test/samples/d3.min.js (274 KiB)
> 1ms
test/samples/magic-string.js (34 KiB)
> 0ms
test/samples/magic-string.min.js (20 KiB)
> 0ms
test/samples/rollup.js (902 KiB)
> 2.08ms
test/samples/rollup.min.js (429 KiB)
> 2ms

Warm Runs, All Samples (average of 25 runs)
test/samples/*.js (3057 KiB)
> 8.92ms
```

### JS Build (asm.js)

```
Module load time
> 2ms
Cold Run, All Samples
test/samples/*.js (3057 KiB)
> 35ms

Warm Runs (average of 25 runs)
test/samples/angular.js (719 KiB)
> 2ms
test/samples/angular.min.js (188 KiB)
> 1ms
test/samples/d3.js (491 KiB)
> 3ms
test/samples/d3.min.js (274 KiB)
> 2ms
test/samples/magic-string.js (34 KiB)
> 0ms
test/samples/magic-string.min.js (20 KiB)
> 0ms
test/samples/rollup.js (902 KiB)
> 5.04ms
test/samples/rollup.min.js (429 KiB)
> 3ms

Warm Runs, All Samples (average of 25 runs)
test/samples/*.js (3057 KiB)
> 16.04ms
```

### Building

This project uses [Chomp](https://chompbuild.com) for building.

With Chomp installed, download the WASI SDK 12.0 from https://github.com/WebAssembly/wasi-sdk/releases/tag/wasi-sdk-12.

- [Linux](https://github.com/WebAssembly/wasi-sdk/releases/download/wasi-sdk-12/wasi-sdk-12.0-linux.tar.gz)
- [Windows (MinGW)](https://github.com/WebAssembly/wasi-sdk/releases/download/wasi-sdk-12/wasi-sdk-12.0-mingw.tar.gz)
- [macOS](https://github.com/WebAssembly/wasi-sdk/releases/download/wasi-sdk-12/wasi-sdk-12.0-macos.tar.gz)

Locate the WASI-SDK as a sibling folder, or customize the path via the `WASI_PATH` environment variable.

Emscripten emsdk is also assumed to be a sibling folder or via the `EMSDK_PATH` environment variable.

Example setup:

```
git clone https://github.com:guybedford/es-module-lexer
git clone https://github.com/emscripten-core/emsdk
cd emsdk
git checkout 1.40.1-fastcomp
./emsdk install 1.40.1-fastcomp
cd ..
wget https://github.com/WebAssembly/wasi-sdk/releases/download/wasi-sdk-12/wasi-sdk-12.0-linux.tar.gz
gunzip wasi-sdk-12.0-linux.tar.gz
tar -xf wasi-sdk-12.0-linux.tar
mv wasi-sdk-12.0-linux.tar wasi-sdk-12.0
cargo install chompbuild
cd es-module-lexer
chomp test
```

For the `asm.js` build, git clone `emsdk` from  is assumed to be a sibling folder as well.

### License

MIT

[actions-image]: https://github.com/guybedford/es-module-lexer/actions/workflows/build.yml/badge.svg
[actions-url]: https://github.com/guybedford/es-module-lexer/actions/workflows/build.yml
