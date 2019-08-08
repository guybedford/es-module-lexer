# ES Module Lexer

JS module syntax lexer used in [es-module-shims](https://github.com/guybedford/es-module-shims).

Very small (< 500 lines) and fast ES module lexer.

The output interfaces use minification-friendly names.

### Usage

> Note: this module is exposed as an ES module build only (lexer.js contains `export default analyze(source) { ... }`).

```
npm install es-module-lexer
```

Using `node --experimental-modules` -

```js
import analyze from 'es-module-lexer';

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
  var [imports, exports] = analyze(source);  
}
catch (e) {
  console.log('Parsing failure');
}

// Returns "asdf"
source.substring(imports[0].s, imports[0].e);

// Returns "p,q"
exports.toString();

// Dynamic imports are indicated by imports[1].d !== -1
// In this case the "d" index is the start of the dynamic import
// Returns true
imports[1].d === -1;

// Returns "'asdf'"
source.substring(imports[1].s, imports[1].e);
// Returns "import /*comment!*/ ("
source.substring(imports[1].d, imports[1].s);

// import.meta is indicated by imports[2].d === -2
// Returns true
imports[2].d === -1;
// Returns "import /*comment!*/.meta"
source.substring(imports[2].s, imports[2].e);
```

### Benchmarks

Benchmarks can be run with `npm run bench`.

Current results:

```
bench/samples/d3.js (497K)
> Cold: 55ms
> Warm: 7ms (average of 25 runs)
bench/samples/d3.min.js (268K)
> Cold: 13ms
> Warm: 5ms (average of 25 runs)
bench/samples/magic-string.js (35K)
> Cold: 4ms
> Warm: 0ms (average of 25 runs)
bench/samples/magic-string.min.js (20K)
> Cold: 0ms
> Warm: 0ms (average of 25 runs)
bench/samples/rollup.js (881K)
> Cold: 27ms
> Warm: 13ms (average of 25 runs)
bench/samples/rollup.min.js (420K)
> Cold: 8ms
> Warm: 8ms (average of 25 runs)
```

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