# CJS Module Lexer

[![Build Status][travis-image]][travis-url]

A [very fast](#benchmarks) JS CommonJS module syntax lexer used to detect the most likely list of named exports of a CommonJS module.

Outputs the list of named exports (`exports.name = ...`), whether the `__esModule` interop flag is used, and possible module reexports (`module.exports = require('...')`).

For an example of the performance, Angular 1 (720KiB) is fully parsed in 5ms, in comparison to the fastest JS parser, Acorn which takes over 100ms.

_Comprehensively handles the JS language grammar while remaining small and fast. - ~10ms per MB of JS cold and ~5ms per MB of JS warm, [see benchmarks](#benchmarks) for more info._

### Usage

```
npm install cjs-module-lexer
```

For use in CommonJS:

```js
const { init, parse } = require('cjs-module-lexer');

(async () => {
  // either await init, or call parse asynchronously
  // this is necessary for the Web Assembly boot
  await init;

  const { exports, reexports, esModule } = parse(`
    // named exports detection
    module.exports.a = 'a';
    (function () {
      exports.b = 'b';
    })();
    Object.defineProperty(exports, 'c', { value: 'c' });
    /* exports.d = 'not detected'; */

    // reexports detection
    if (maybe) module.exports = require('./dep1.js');
    if (another) module.exports = require('./dep2.js');

    // __esModule detection
    Object.defineProperty(module.exports, '__esModule', { value: true })
  `);

  // exports === ['a', 'b', 'c', '__esModule']
  // reexports === ['./dep1.js', './dep2.js']
})();
```

An ES module version is also available from `dist/lexer.js`, automatically enabled via `"exports`":

### Supported

1. All `exports.a` or `module.exports.a` usages
2. All `Object.defineProperty(module.exports, 'name'` or `Object.defineProperty(exports, 'name'` assignments
3. All `module.exports = require('string')` assignments

### Not Supported

1. No scope analysis:

```js
(function (exports) {
  // "a" WILL be detected as an export
  exports.a = 'a'; 
})(notExports);
```

2. No object parsing:

```js
// These WONT be detected as exports
Object.defineProperties(exports, {
  a: { value: 'a' },
  b: { value: 'b' }
});

// These WONT be detected as exports
module.exports = {
  c: 'c',
  d: 'd'
}
```

### Environment Support

Node.js 10+, and [all browsers with Web Assembly support](https://caniuse.com/#feat=wasm).

### Grammar Support

* Token state parses all line comments, block comments, strings, template strings, blocks, parens and punctuators.
* Division operator / regex token ambiguity is handled via backtracking checks against punctuator prefixes, including closing brace or paren backtracking.
* Always correctly parses valid JS source, but may parse invalid JS source without errors.

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

### Benchmarks

Benchmarks can be run with `npm run bench`.

Current results:

```
Cold Run, All Samples
test/samples/*.js (3057 KiB)
> 24ms

Warm Runs (average of 25 runs)
test/samples/angular.js (719 KiB)
> 5.12ms
test/samples/angular.min.js (188 KiB)
> 3.04ms
test/samples/d3.js (491 KiB)
> 4.08ms
test/samples/d3.min.js (274 KiB)
> 2.04ms
test/samples/magic-string.js (34 KiB)
> 0ms
test/samples/magic-string.min.js (20 KiB)
> 0ms
test/samples/rollup.js (902 KiB)
> 5.92ms
test/samples/rollup.min.js (429 KiB)
> 3.08ms

Warm Runs, All Samples (average of 25 runs)
test/samples/*.js (3057 KiB)
> 17.4ms
```

### Building

To build download the WASI SDK from https://github.com/CraneStation/wasi-sdk/releases.

The Makefile assumes that the `clang` in PATH corresponds to LLVM 8 (provided by WASI SDK as well, or a standard clang 8 install can be used as well), and that `../wasi-sdk-6` contains the SDK as extracted above, which is important to locate the WASI sysroot.

The build through the Makefile is then run via `make lib/lexer.wasm`, which can also be triggered via `npm run build-wasm` to create `dist/lexer.js`.

On Windows it may be preferable to use the Linux subsystem.

After the Web Assembly build, the CJS build can be triggered via `npm run build`.

Optimization passes are run with [Binaryen](https://github.com/WebAssembly/binaryen) prior to publish to reduce the Web Assembly footprint.

### License

MIT

[travis-url]: https://travis-ci.org/guybedford/es-module-lexer
[travis-image]: https://travis-ci.org/guybedford/es-module-lexer.svg?branch=master
