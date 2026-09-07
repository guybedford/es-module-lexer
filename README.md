# ES Module Lexer

[![Build Status][actions-image]][actions-url]

A JS/TS module syntax lexer used in [es-module-shims](https://github.com/guybedford/es-module-shims).

Outputs the list and locations of exports and import specifiers, including dynamic import and import meta expressions.

Supports modern syntax features including import attributes, deferred evaluation, and source phase imports, as well as [lexing type-only TypeScript imports and exports](#typescript) in the full build.

A very small single JS file (~7KiB Brotli-compressed for the [minimal build](#minimal-build)) that includes inlined WebAssembly for very fast source analysis of ECMAScript module syntax only.

For an example of the performance, Angular 1 (720KiB) is fully parsed in 1ms, in comparison to the fastest JS parser, Acorn which takes over 100ms.

_Comprehensively handles the JS language grammar while remaining small and fast. - ~5ms per MB of JS cold and ~3ms per MB of JS warm._

> [Built with](https://github.com/guybedford/es-module-lexer/blob/main/chompfile.toml) [Chomp](https://chompbuild.com/)

## Package Exports

| Export | Build | Footprint | Parsing Speed (cold) | Parsing Speed (warm) |
| --- | --- | ---: | ---: | ---: |
| `es-module-lexer` | [Full build](#full-build), Wasm, JS & [TypeScript](#typescript) | 14.8KiB | 4.7ms/MB | 3.2ms/MB |
| `es-module-lexer/js` | [Full build](#full-build), [CSP asm.js](#csp-asmjs-build), JS & [TypeScript](#typescript) | 13.1KiB | 14.9ms/MB | 6.3ms/MB |
| `es-module-lexer/minimal` | [Minimal build](#minimal-build) (v2-like API), Wasm, JS only | 7.3KiB | 4.5ms/MB | 3.1ms/MB |
| `es-module-lexer/minimal/js` | [Minimal build](#minimal-build) (v2-like API), [CSP asm.js](#csp-asmjs-build), JS only | 6.5KiB | 10.8ms/MB | 5.7ms/MB |

* Footprint is the Brotli-compressed size.
* Parse times are per MB of source, measured on the 3.1 MB `test/samples` set on a standard desktop machine (Node.js 26; warm averages 25 parses), via `chomp bench`.

### Environment Support

The full build requires Node.js 18+ and engines with [WebAssembly SIMD support](https://webassembly.org/features/) (Chrome 91+, Firefox 89+, Safari 16.4+).

The minimal build (`es-module-lexer/minimal`) carries no SIMD requirement, running in all browsers with baseline [ES modules support](https://caniuse.com/es6-module-dynamic-import) (Chrome 63+, Firefox 67+, Safari 11.1+ — the [es-module-shims](https://github.com/guybedford/es-module-shims) support matrix), with the asm.js builds covering those without WebAssembly.

### CSP asm.js Build

The Wasm builds generate no code from strings, so they work with JavaScript eval disabled, including Node.js with `--disallow-code-generation-from-strings`, as long as the environment permits WebAssembly compilation.

For environments or CSP policies that disable WebAssembly compilation (`script-src` without `wasm-unsafe-eval`), use the `es-module-lexer/js` and
`es-module-lexer/minimal/js` builds:

```js
import { parse } from 'es-module-lexer/js';
```

## Usage

```
npm install es-module-lexer
```

See [src/lexer.ts](src/lexer.ts) for the type definitions.

With the full build:

```js
import { init, parse } from 'es-module-lexer';

await init();

const source = `import { a } from './dep.js';\nexport var p = 5;`;
const [imports, exports] = parse(source);

imports[0].specifier; // "./dep.js"
source.slice(imports[0].importStart, imports[0].importEnd); // "import { a } from './dep.js'"
exports[0].name; // "p"
```

Or with the minimal (v2-like) build:

```js
import { init, parse } from 'es-module-lexer/minimal';

await init();

const source = `import { a } from './dep.js';\nexport var p = 5;`;
const [imports, exports] = parse(source);

imports[0].n; // "./dep.js"
source.slice(imports[0].ss, imports[0].se); // "import { a } from './dep.js'"
exports[0].n; // "p"
```

While awaiting `init()` is always recommended since browser main threads restrict synchronous WebAssembly compilation,
in Node.js and other environments it may be optional, since `parse` will rely on synchronous compilation otherwise.
Calling `parse` before a pending `init()` has resolved will also fall back to synchronous compilation, so avoid mixing the two.

## Minimal Build

> See [types/lexer.minimal.d.ts](types/lexer.minimal.d.ts) for the full interface definitions.

For size-sensitive embedders, the `es-module-lexer/minimal` build drops
certain features to reduce the binary size. This is used for example by
[es-module-shims](https://github.com/guybedford/es-module-shims).

The minimal build keeps the terse v2-style record shapes rather than the full
build's discriminated unions.

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

// Import type is provided by the numeric `t` value (see the ImportType type)
// Returns true
imports[0].t === 1;

// Returns "{ type: 'json' }"
source.slice(imports[1].a, imports[1].se);
// "a" = attribute start, -1 for no import attributes

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

### Upgrading from v2

The minimal build is a new entry point holding the v2-shaped API, with the
following differences from v2:

* `init` is a function returning a promise rather than a promise itself:
  `await init` becomes `await init()`. Calls are idempotent and share one
  compilation.
* `parse` returns `[imports, exports]` only; `facade` / `hasModuleSyntax`
  are dropped.
* `at` is dropped from import records; read attributes via
  `source.slice(a, se - 1)`.
* `ImportType` is a type-only union of the numeric literals (`StaticImportType = 1`, `DynamicImportType = 2`, ...) with no runtime export.
* Template-literal dynamic imports stay `n: undefined`; no TypeScript lexing;
  no export classification or `export *` records.

Interpolated template specifiers are not globbed in the minimal build (`n` is
`undefined` for them), and escape sequences in specifiers are decoded into
`n` just as in the full build, including the parse error on invalid escape
sequences.

## Full Build

> See [types/lexer.d.ts](types/lexer.d.ts) for the full interface definitions.

The full build lexes both JavaScript and erasable [type-only TypeScript](#typescript) syntax, reporting type-only imports and exports with a `typeOnly` flag.

The full build reports each import and export as a tagged union discriminated by `type`.

For example:

```js
import { init, parse } from 'es-module-lexer';

await init();

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

When migrating a full-build consumer from v2, `await init` becomes
`await init()` as in the minimal build, then switch on `type` before reading
kind-specific fields: the terse v2 field names and numeric type tags are
replaced by the descriptive names above, reexports no longer expose
placeholder local-name properties, and bare star reexports now appear in the
exports array with their origins available through `importName` and
`imports[importIndex]` without rescanning source statements. A dynamic
import whose argument is a template literal now reports a glob `specifier`
(`./locales/*.js`) where v2 reported `undefined`, so a v2 `if (specifier)`
check now admits globs; test `glob` to tell them apart (a literal
`import('a*b')` and a template `\`a${x}b\`` both report `a*b`).
`import.meta` records carry `specifier: null` and `typeOnly: false` so
dependency loops need not narrow on `type` first.

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

`type` and `interface` declarations are skipped whether exported or not, so an `import(...)` type buried in an alias right-hand side or an interface body (`type T = import('x').Y`, `interface I { load(): import('x').Y }`) is not reported as a runtime import. Ambient `declare` statements (`declare const x: import('x').T;`, `declare module 'm' { ... }`, `declare global { ... }`) are erased the same way.

`export default interface Foo {}` is reported as a type-only `default` export. Declarations with escaped names are erased but not reported as exports. At a line break after a complete alias right-hand side, a line-leading token that can only continue a type (`|`, `&`, `?`, `:`, `.`, `=>`, `extends`) keeps the erased region open, so multi-line conditional and union types stay erased.

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

The `attributesStart` (`a` in the minimal build) field provides the index of the start of the `{`
attributes bracket, or -1 for no attributes.

In the full build, the list of attribute key and value pairs of a static import is provided on the `attributes`
field (dynamic import records report `attributes: null`, with `attributesStart` locating the options argument):

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

Escape sequences in specifier strings are decoded into the `specifier` field (`n` in the minimal build).
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
Glob records report `glob: true`; a literal specifier that happens to contain
`*` reports `glob: false`.

### Star Re-exports

`export * from 'module'` is both a dependency on `module` and a re-export of
its names. The minimal build reports it as an import only (`t === 8`), while the full build reports it on both sides:

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

## Grammar Support

* Token state parses all line comments, block comments, strings, template strings, blocks, parens and punctuators.
* Division operator / regex token ambiguity is handled via backtracking checks against punctuator prefixes, including closing brace or paren backtracking.
* Always correctly parses valid JS source, but may parse invalid JS source without errors.

### Limitations

The lexing approach is designed to deal with the full language grammar including RegEx / division operator ambiguity through backtracking and paren / brace tracking.

Because it lexes rather than fully parses, the analysis is not a validation pass: valid JS source is always analyzed correctly, but some invalid source is accepted without an error rather than rejected. For example `export const = 1` lexes to an empty exports list instead of throwing. Callers that need to reject invalid source should run a validating parser separately.

Multiple exports per declaration (`export var a = 'asdf', q = z`) and renamed destructured exports (`export var { a: b } = asdf`) are detected correctly; earlier versions missed `q` and `b` in these forms.

Nesting is bounded: more than 1024 open brackets or template substitutions, or more than 512 nested dynamic import calls, throws a parse error at the overflowing token.

## Building

This project uses [Chomp](https://chompbuild.com) for building.

With Chomp installed, two Emscripten SDKs are expected as sibling folders (or via the `EMSDK_PATH` and `EMSDK_FASTCOMP_PATH` environment variables): the upstream `emsdk` for the Wasm builds and a second checkout as `emsdk-fastcomp` for the asm.js builds; the build installs and activates the required versions (6.0.0 and 1.40.1-fastcomp) itself.

Example setup:

```
git clone https://github.com/guybedford/es-module-lexer
git clone https://github.com/emscripten-core/emsdk
git clone https://github.com/emscripten-core/emsdk emsdk-fastcomp
cargo install chompbuild
cd es-module-lexer
chomp test
```

## License

MIT

[actions-image]: https://github.com/guybedford/es-module-lexer/actions/workflows/build.yml/badge.svg
[actions-url]: https://github.com/guybedford/es-module-lexer/actions/workflows/build.yml
