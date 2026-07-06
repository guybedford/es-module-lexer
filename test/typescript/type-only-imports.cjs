const assert = require('assert');
const { init, parse } = require('./_harness.cjs');

suite('TS type-only imports', () => {
  setup(async () => await init);

  test('import type { A } from is type-only', () => {
    const [imports] = parse(`import type { A } from 'm';`);
    assert.strictEqual(imports.length, 1);
    assert.strictEqual(imports[0].n, 'm');
    assert.strictEqual(imports[0].tp, true);
  });

  test('import type Default from is type-only', () => {
    const [imports] = parse(`import type A from 'm';`);
    assert.strictEqual(imports.length, 1);
    assert.strictEqual(imports[0].n, 'm');
    assert.strictEqual(imports[0].tp, true);
  });

  test('import type * as ns from is type-only', () => {
    const [imports] = parse(`import type * as ns from 'm';`);
    assert.strictEqual(imports.length, 1);
    assert.strictEqual(imports[0].n, 'm');
    assert.strictEqual(imports[0].tp, true);
  });

  test('import type from is a value import of the default binding named type', () => {
    // `type` is the default binding, `from` the keyword. Node keeps it verbatim,
    // so it is a runtime import that must stay a JS-superset value import.
    const [imports] = parse(`import type from 'm';`);
    assert.strictEqual(imports.length, 1);
    assert.strictEqual(imports[0].n, 'm');
    assert.strictEqual(imports[0].tp, false);
  });

  test('import type from from is type-only (default binding named from)', () => {
    const [imports] = parse(`import type from from 'm';`);
    assert.strictEqual(imports.length, 1);
    assert.strictEqual(imports[0].n, 'm');
    assert.strictEqual(imports[0].tp, true);
  });

  test('import type/*c*/{ A } from is type-only', () => {
    const [imports] = parse(`import type/*c*/{ A } from 'm';`);
    assert.strictEqual(imports[0].n, 'm');
    assert.strictEqual(imports[0].tp, true);
  });

  test('import type* as ns from is type-only', () => {
    const [imports] = parse(`import type* as ns from 'm';`);
    assert.strictEqual(imports[0].n, 'm');
    assert.strictEqual(imports[0].tp, true);
  });

  test('value import alongside a type-only import', () => {
    const [imports] = parse(`import type { A } from 'm';\nimport { v } from 'm2';`);
    assert.deepStrictEqual(imports.map(i => i.n), ['m', 'm2']);
    assert.deepStrictEqual(imports.map(i => i.tp), [true, false]);
  });

  test('inline type specifier keeps the statement a value import', () => {
    // `b` is a real value import, so the statement is not type-only.
    const [imports] = parse(`import { type A, b } from 'm';`);
    assert.strictEqual(imports.length, 1);
    assert.strictEqual(imports[0].n, 'm');
    assert.strictEqual(imports[0].tp, false);
  });

  test('import type, { A } is a value import of a binding named type', () => {
    // The comma right after `type` makes `type` the default binding name.
    const [imports] = parse(`import type, { A } from 'm';`);
    assert.strictEqual(imports.length, 1);
    assert.strictEqual(imports[0].n, 'm');
    assert.strictEqual(imports[0].tp, false);
  });

  test('side-effect import is never type-only', () => {
    const [imports] = parse(`import 'm';`);
    assert.strictEqual(imports.length, 1);
    assert.strictEqual(imports[0].tp, false);
  });

  test('typeof is not the type keyword', () => {
    // `typeof` must not be mistaken for the `type` modifier.
    const [imports] = parse(`const x = typeof import('m');`);
    assert.deepStrictEqual(imports.map(i => i.n), ['m']);
    assert.strictEqual(imports[0].tp, false);
  });
});
