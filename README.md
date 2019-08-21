# ES Module Lexer

A JS module syntax lexer used in [es-module-shims](https://github.com/guybedford/es-module-shims).

A very small single JS file (4KiB gzipped) that includes inlined Web Assembly to [very fast](#benchmarks) source analysis for ES modules only.

Outputs the list of exports and locations of import specifiers, including dynamic import and import meta handling.

_Comprehensively handles the JS language grammar while remaining small and fast - can parse 2MB of JavaScript in under 30ms from a completely cold start, and in just 20ms after a few runs, [see benchmarks](#benchmarks) for more info._

### Environment Support

Node.js 10+, and [all browsers with Web Assembly support](https://caniuse.com/#search=web%20assembly).

### Usage

```
npm install es-module-lexer
```

```js
import { init, parse } from 'es-module-lexer';

// Wait for WebAssembly to load. Alternatively use parse asynchronously.
await init();

// Note: Parsing error messages thrown are not user friendly
//       and only provide stack information in the lexer itself.
//       It is recommended to always catch and fall back to an alternative
//       parser for proper error output.

const source = `
  import { a } from 'asdf';
  export var p = 5;
  export function q () {

  };

  // Comments provided to demonstrate edge cases
  import /*comment!*/ ('asdf');
  import /*comment!*/.meta.asdf;
`;

try {
  var [imports, exports] = parse(source);  
}
catch (e) {
  console.log('Parsing failure');
}

// Returns "asdf"
source.substring(imports[0].s, imports[0].e);

// Returns "p,q"
exports.toString();

// Dynamic imports are indicated by imports[1].d > -1
// In this case the "d" index is the start of the dynamic import
// Returns true
imports[1].d > -1;

// Returns "'asdf'"
source.substring(imports[1].s, imports[1].e);
// Returns "import /*comment!*/ ("
source.substring(imports[1].d, imports[1].s);

// import.meta is indicated by imports[2].d === -2
// Returns true
imports[2].d === -2;
// Returns "import /*comment!*/.meta"
source.substring(imports[2].s, imports[2].e);
```

### Benchmarks

Benchmarks can be run with `npm run bench`.

Current results:

```
Module load time
> 6ms
Cold Run, All Samples
test/samples/*.js (2150 KiB)
> 22ms

Warm Runs (average of 25 runs)
test/samples/d3.js (491 KiB)
> 4.2ms
test/samples/d3.min.js (274 KiB)
> 2.16ms
test/samples/magic-string.js (34 KiB)
> 0.04ms
test/samples/magic-string.min.js (20 KiB)
> 0ms
test/samples/rollup.js (902 KiB)
> 6.2ms
test/samples/rollup.min.js (429 KiB)
> 3.2ms

Warm Runs, All Samples (average of 25 runs)
test/samples/*.js (2150 KiB)
> 14.08ms
```

### Building

To build download the WASI SDK from https://github.com/CraneStation/wasi-sdk/releases.

The Makefile assumes that the `clang` in PATH corresponds to LLVM 8 (provided by WASI SDK as well, or a standard clang 8 install can be used as well), and that `../wasi-sdk-6` contains the SDK as extracted above, which is important to locate the WASI sysroot.

The build through the Makefile is then run via `make lib/lexer.wasm`, which can also be triggered via `npm run build-wasm` to create `dist/lexer.js`.

On Windows it may be preferable to use the Linux subsystem.

After the Web Assembly build, the CJS build can be triggered via `npm run build`.

### Limitations

The lexing approach is designed to deal with the full language grammar including RegEx / division operator ambiguity through backtracking and paren / brace tracking.

The only limitation to the reduced parser is that the "exports" list may not correctly gather all export identifiers in the following edge cases:

```js
// Only "a" is detected as an export, "q" isn't
export var a = 'asdf', q = z;

// "b" is not detected as an export
export var { a: b } = asdf;
```

The above cases are handled gracefully in that the lexer will keep going fine, it will just not properly detect the export names above.

### License

MIT
