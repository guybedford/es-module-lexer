const assert = require('assert');
const { init, parse } = require('./_harness.cjs');

// Type-only markers must compose with the import features the lexer already
// supports: attributes, source/defer phases, dynamic import and re-exports.
suite('TS type-only permutations', () => {
  setup(async () => await init);

  test('type-only import does not carry runtime attributes', () => {
    // `import type` cannot take an attributes clause; a following value import
    // with attributes must still parse correctly.
    const [imports] = parse(`import type { A } from 'a';\nimport b from 'b' with { type: 'json' };`);
    assert.deepStrictEqual(imports.map(i => i.n), ['a', 'b']);
    assert.deepStrictEqual(imports.map(i => i.tp), [true, false]);
    assert.deepStrictEqual(imports[1].at, [['type', 'json']]);
  });

  test('value import with attributes after inline type specifier', () => {
    const [imports] = parse(`import { type A, b } from 'a' with { type: 'json' };`);
    assert.strictEqual(imports[0].tp, false);
    assert.deepStrictEqual(imports[0].at, [['type', 'json']]);
  });

  test('source phase import is not type-only', () => {
    const [imports] = parse(`import source x from './m.wasm';`);
    assert.strictEqual(imports[0].tp, false);
  });

  test('dynamic import is not type-only', () => {
    const [imports] = parse(`const m = import('m');`);
    assert.strictEqual(imports[0].tp, false);
  });

  test('mix of type-only and value across many statements', () => {
    const source = [
      `import type { A } from 'a';`,
      `import { b } from 'b';`,
      `import type C from 'c';`,
      `export type { D } from 'd';`,
      `export { e } from 'e';`,
    ].join('\n');
    const [imports, exports] = parse(source);
    assert.deepStrictEqual(imports.map(i => i.n), ['a', 'b', 'c', 'd', 'e']);
    assert.deepStrictEqual(imports.map(i => i.tp), [true, false, true, true, false]);
    assert.deepStrictEqual(exports.map(e => e.tp), [true, false]);
  });
});
