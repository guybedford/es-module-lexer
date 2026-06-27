const assert = require('assert');
const { init, parse } = require('./_harness.cjs');

// Increment 1 adds the type-only keyword machinery but no type-annotation
// skipping yet. These cases pin that the shared regex/division disambiguation
// is not perturbed by the new code paths.
suite('TS regex / division (type-only increment)', () => {
  setup(async () => await init);

  test('regex after type-only import still parses', () => {
    const [imports] = parse(`import type { A } from 'm';\nconst re = /,/g;\nimport { b } from 'm2';`);
    assert.deepStrictEqual(imports.map(i => i.n), ['m', 'm2']);
  });

  test('division after an identifier named like a keyword prefix', () => {
    // `typed` / `types` start with "type" but are ordinary identifiers.
    const [, exports] = parse(`export const typed = a / 2, types = b / 3;`);
    assert.deepStrictEqual(exports.map(e => e.n), ['typed', 'types']);
  });

  test('regex inside an exported initializer after a type-only sibling import', () => {
    const [imports, exports] = parse(`import type { T } from 't';\nexport const re = () => /x/g, n = 1;`);
    assert.deepStrictEqual(imports.map(i => i.n), ['t']);
    assert.deepStrictEqual(exports.map(e => e.n), ['re', 'n']);
  });

  test('division vs regex unaffected for value imports with inline type', () => {
    const [imports, exports] = parse(`import { type A, b } from 'm';\nexport const d = b / 2, e = 3;`);
    assert.strictEqual(imports[0].tp, false);
    assert.deepStrictEqual(exports.map(e => e.n), ['d', 'e']);
  });
});
