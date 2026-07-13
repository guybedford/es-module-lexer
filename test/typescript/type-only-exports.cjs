const assert = require('assert');
const { init, parse } = require('./_harness.cjs');

suite('TS type-only exports', () => {
  setup(async () => await init);

  test('export type { A } marks the export type-only', () => {
    const [, exports] = parse(`const A = 1;\nexport type { A };`);
    assert.deepStrictEqual(exports.map(e => e.n), ['A']);
    assert.strictEqual(exports[0].tp, true);
  });

  test('export type { A } from re-export (issue #72)', () => {
    const [imports, exports] = parse(`export type { A } from './t';`);
    assert.deepStrictEqual(exports.map(e => e.n), ['A']);
    assert.strictEqual(exports[0].tp, true);
    // The generated module import is itself type-only.
    assert.deepStrictEqual(imports.map(i => i.n), ['./t']);
    assert.strictEqual(imports[0].tp, true);
  });

  test('export type { A, B } marks every specifier', () => {
    const [, exports] = parse(`const A = 1, B = 2;\nexport type { A, B };`);
    assert.deepStrictEqual(exports.map(e => e.n), ['A', 'B']);
    assert.deepStrictEqual(exports.map(e => e.tp), [true, true]);
  });

  test('inline type modifier marks only that specifier', () => {
    const [, exports] = parse(`const A = 1, b = 2;\nexport { type A, b };`);
    assert.deepStrictEqual(exports.map(e => e.n), ['A', 'b']);
    assert.deepStrictEqual(exports.map(e => e.tp), [true, false]);
  });

  test('inline type modifier with alias', () => {
    const [, exports] = parse(`const A = 1;\nexport { type A as B };`);
    assert.deepStrictEqual(exports.map(e => e.n), ['B']);
    assert.strictEqual(exports[0].tp, true);
  });

  test('export { type } exports a value named type', () => {
    // No identifier follows `type`, so it is the exported name, not a modifier.
    const [, exports] = parse(`const type = 1;\nexport { type };`);
    assert.deepStrictEqual(exports.map(e => e.n), ['type']);
    assert.strictEqual(exports[0].tp, false);
  });

  test('export { type as T } exports the value named type aliased to T', () => {
    const [, exports] = parse(`const type = 1;\nexport { type as T };`);
    assert.deepStrictEqual(exports.map(e => e.n), ['T']);
    assert.strictEqual(exports[0].tp, false);
  });

  test('export { type as/*c*/T } exports the value named type aliased to T', () => {
    const [, exports] = parse(`const type = 1;\nexport { type as/*c*/T };`);
    assert.deepStrictEqual(exports.map(e => e.n), ['T']);
    assert.strictEqual(exports[0].tp, false);
  });

  test('export { type as as X } is a type-only export of the value named as', () => {
    const [, exports] = parse(`const as = 1;\nexport { type as as X };`);
    assert.deepStrictEqual(exports.map(e => e.n), ['X']);
    assert.strictEqual(exports[0].tp, true);
  });

  test('export type * as ns from is type-only', () => {
    const [imports, exports] = parse(`export type * as ns from './t';`);
    assert.deepStrictEqual(exports.map(e => e.n), ['ns']);
    assert.strictEqual(exports[0].tp, true);
    assert.strictEqual(imports[0].tp, true);
  });

  test('plain value re-export is not type-only', () => {
    const [imports, exports] = parse(`export { a, b } from './t';`);
    assert.deepStrictEqual(exports.map(e => e.tp), [false, false]);
    assert.strictEqual(imports[0].tp, false);
  });

  test('mixed: value export then type-only export', () => {
    const [, exports] = parse(`export const v = 1;\nconst A = 2;\nexport type { A };`);
    assert.deepStrictEqual(exports.map(e => e.n), ['v', 'A']);
    assert.deepStrictEqual(exports.map(e => e.tp), [false, true]);
  });
});
