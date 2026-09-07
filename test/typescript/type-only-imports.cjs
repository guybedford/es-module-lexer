const assert = require('assert');
const { init, parse } = require('../_lexer.cjs');

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

  test('import type from without whitespace before the specifier is a value import', () => {
    for (const src of [`import type from'm';`, `import type from/*c*/'m';`]) {
      const [imports] = parse(src);
      assert.strictEqual(imports.length, 1, src);
      assert.strictEqual(imports[0].n, 'm', src);
      assert.strictEqual(imports[0].tp, false, src);
    }
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

  test('typeof import is classified type-only', () => {
    // `typeof import('m')` is a namespace type in TS and dead code on a
    // promise in JS, so the best-effort classifier marks it.
    const [imports] = parse(`const x = typeof import('m');`);
    assert.deepStrictEqual(imports.map(i => i.n), ['m']);
    assert.strictEqual(imports[0].tp, true);
  });

  test('bracketed promise member access stays a runtime import', () => {
    for (const src of [
      `import('m')['then'](f);`,
      `import('m')["catch"](f);`,
      `import('m')[ 'finally' ](f);`
    ]) {
      const [imports] = parse(src);
      assert.strictEqual(imports[0].tp, false, src);
    }
  });

  test('bracketed non-promise member access is classified type-only', () => {
    const [imports] = parse(`const x: import('m')['x'] = v;`);
    assert.deepStrictEqual(imports.map(i => [i.n, i.tp]), [['m', true]]);
  });

  test('computed and escaped promise member access stays runtime', () => {
    for (const src of [
      `import('m')[key](f);`,
      `import('m')[getKey()](f);`,
      `import('m')['th' + 'en'](f);`,
      `import('m')['value' + key](f);`,
      `import('m').th\\u0065n(f);`,
      `import('m').ca\\u0074ch(f);`,
      `import('m')['th\\u0065n'](f);`,
      `import('m')['fina\\u006cly'](f);`
    ]) {
      const [imports] = parse(src);
      assert.strictEqual(imports[0].tp, false, src);
    }
  });

  test('trivia before an exact bracketed member preserves type-only classification', () => {
    const [imports] = parse(`import('m')['Type' /* c */];`);
    assert.strictEqual(imports[0].tp, true);
  });

  test('awaited member access stays runtime', () => {
    for (const src of [
      `await import('m').Type;`,
      `await/* c */ import('m')['Type'];`
    ]) {
      const [imports] = parse(src);
      assert.strictEqual(imports[0].tp, false, src);
    }
  });

  test('comments before a member access do not defeat classification', () => {
    const [imports] = parse(`const p = import('m') /* c */ .Foo;`);
    assert.strictEqual(imports[0].tp, true);

    const [imports2] = parse(`const p = import('m') /* c */ .then(f);`);
    assert.strictEqual(imports2[0].tp, false);
  });

  test('import equals require keeps a runtime edge', () => {
    const [imports] = parse(`import A = require('m');\nimport { x } from 'y';`);
    assert.deepStrictEqual(imports.map(i => [i.n, i.tp]), [['m', false], ['y', false]]);
  });

  test('import type equals require is type-only', () => {
    const [imports] = parse(`import type A = require('m');\nimport { x } from 'y';`);
    assert.deepStrictEqual(imports.map(i => [i.n, i.tp]), [['m', true], ['y', false]]);
  });

  test('import equals namespace alias is erased', () => {
    const [imports] = parse(`import A = N.M;\nimport { x } from 'y';`);
    assert.deepStrictEqual(imports.map(i => i.n), ['y']);
  });

  test('import type = require binds the value type', () => {
    // `type` here is the imported binding name, so this is the runtime form.
    const [imports] = parse(`import type = require('m');`);
    assert.deepStrictEqual(imports.map(i => [i.n, i.tp]), [['m', false]]);
  });
});
