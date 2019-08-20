# ES Module Lexer

JS module syntax lexer used in [es-module-shims](https://github.com/guybedford/es-module-shims).

Very small (< 500 lines) and fast ES module lexer.

The output interfaces use minification-friendly names.

### Usage

```
npm install es-module-lexer
```

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
Cold Run, All Samples
bench/samples/*.js (2195 KiB)
> 179ms

Warm Runs (average of 25 runs)
bench/samples/d3.js (508 KiB)
> 6.84ms
bench/samples/d3.min.js (274 KiB)
> 3.16ms
bench/samples/magic-string.js (35 KiB)
> 0.6ms
bench/samples/magic-string.min.js (20 KiB)
> 0ms
bench/samples/rollup.js (929 KiB)
> 8.64ms
bench/samples/rollup.min.js (429 KiB)
> 5.12ms

Warm Runs, All Samples (average of 25 runs)
bench/samples/*.js (2195 KiB)
> 24.24ms
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