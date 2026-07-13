const assert = require('assert');
const { init, parse } = require('./_harness.cjs');

// Directly-exported type declarations (`export type Foo = ...`,
// `export interface Foo {}`) are erased by Node type stripping, so they are
// reported as type-only exports. Only the directly-exported declaration form is
// marked: Node does no cross-binding analysis, so a bare declaration later named
// in a value `export { Foo }` stays a runtime export.
suite('TS type declarations', () => {
  setup(async () => await init);

  test('export type alias is type-only', () => {
    const [, exports] = parse(`export type Foo = Bar;`);
    assert.deepStrictEqual(exports.map(e => e.n), ['Foo']);
    assert.strictEqual(exports[0].tp, true);
  });

  test('export interface is type-only', () => {
    const [, exports] = parse(`export interface Foo {}`);
    assert.deepStrictEqual(exports.map(e => e.n), ['Foo']);
    assert.strictEqual(exports[0].tp, true);
  });

  test('interface name may follow a comment', () => {
    const [imports, exports] = parse(`export interface/*c*/Foo { m(): import('m').T }`);
    assert.deepStrictEqual(imports.map(i => i.n), []);
    assert.deepStrictEqual(exports.map(e => e.n), ['Foo']);
    assert.strictEqual(exports[0].tp, true);
  });

  test('export type alias with default type parameter', () => {
    const [, exports] = parse(`export type Foo<T = string> = T;`);
    assert.deepStrictEqual(exports.map(e => e.n), ['Foo']);
    assert.strictEqual(exports[0].tp, true);
  });

  test('unbalanced speculative type parameters stop at EOF', () => {
    assert.throws(() => parse('type a<\n'.repeat(20_000)), /Parse error/);
  });

  test('export interface with generic extends clause', () => {
    const [, exports] = parse(`export interface Foo<T> extends Bar<T> {}`);
    assert.deepStrictEqual(exports.map(e => e.n), ['Foo']);
    assert.strictEqual(exports[0].tp, true);
  });

  test('export type alias to a function type does not close the angle region early', () => {
    const [, exports] = parse(`export type Fn<T = () => void> = T;`);
    assert.deepStrictEqual(exports.map(e => e.n), ['Fn']);
    assert.strictEqual(exports[0].tp, true);
  });

  test('interface body import() records no runtime import edge', () => {
    const [imports, exports] = parse(`export interface Foo {\n  load(): import('m').T;\n}`);
    assert.deepStrictEqual(imports.map(i => i.n), []);
    assert.deepStrictEqual(exports.map(e => e.n), ['Foo']);
    assert.strictEqual(exports[0].tp, true);
  });

  test('type alias RHS import() records no runtime import edge', () => {
    const [imports, exports] = parse(`export type X = import('m').T;`);
    assert.deepStrictEqual(imports.map(i => i.n), []);
    assert.deepStrictEqual(exports.map(e => e.n), ['X']);
    assert.strictEqual(exports[0].tp, true);
  });

  test('type alias object-type RHS import() records no runtime import edge', () => {
    const [imports, exports] = parse(`export type X = { load(): import('m').T };\nexport const y = 1;`);
    assert.deepStrictEqual(imports.map(i => i.n), []);
    assert.deepStrictEqual(exports.map(e => e.n), ['X', 'y']);
    assert.deepStrictEqual(exports.map(e => e.tp), [true, false]);
  });

  test('template-literal-type RHS import() records no runtime import edge', () => {
    const [imports, exports] = parse('export type S = `pre${import(\'m\').T}post`;\nexport const y = 1;');
    assert.deepStrictEqual(imports.map(i => i.n), []);
    assert.deepStrictEqual(exports.map(e => e.n), ['S', 'y']);
    assert.deepStrictEqual(exports.map(e => e.tp), [true, false]);
  });

  test('template-literal type ending in a substitution does not swallow the next statement', () => {
    // The `${...}` skipper left pos after the `}`; without a step back the loop
    // skipped the closing backtick and ran into the following statement, so the
    // trailing runtime edge went missing (fuzzer-found).
    const cases = [
      { src: 'export type S = `${import(\'m\').T}`;\nexport const y = 1;', names: ['S', 'y'], tp: [true, false] },
      { src: 'export type S = `pre${import(\'m\').T}`;\nexport const y = 1;', names: ['S', 'y'], tp: [true, false] },
      { src: 'export interface Foo { x: `${import(\'m\').T}` }\nexport const y = 1;', names: ['Foo', 'y'], tp: [true, false] },
      { src: 'export type S = `${import(\'m\').T}${import(\'n\').U}`;\nexport const y = 1;', names: ['S', 'y'], tp: [true, false] },
    ];
    for (const { src, names, tp } of cases) {
      const [imports, exports] = parse(src);
      assert.deepStrictEqual(imports.map(i => i.n), [], src);
      assert.deepStrictEqual(exports.map(e => e.n), names, src);
      assert.deepStrictEqual(exports.map(e => e.tp), tp, src);
    }
  });

  test('bare template-literal type ending in a substitution keeps the following runtime import', () => {
    const [imports, exports] = parse('type S = `${import(\'t\').T}`;\nimport { v } from \'runtime\';');
    assert.deepStrictEqual(imports.map(i => i.n), ['runtime']);
    assert.strictEqual(imports[0].tp, false);
    assert.deepStrictEqual(exports.map(e => e.n), []);
  });

  test('multi-substitution template type followed by an object type does not throw', () => {
    // Two substitutions then a balanced `{...}` type used to desync the scanner
    // and throw a parse error on input Node strips cleanly (fuzzer-found).
    const [imports, exports] = parse('export type A = `pre${[A, string]}mid${typeof x}` & { a: string };\nimport { A } from \'runtime\';');
    assert.deepStrictEqual(imports.map(i => i.n), ['runtime']);
    assert.strictEqual(imports[0].tp, false);
    assert.deepStrictEqual(exports.map(e => e.n), ['A']);
    assert.strictEqual(exports[0].tp, true);
  });

  test('interface extends type-argument brace is not the body', () => {
    // The `{` inside `Bar<{ ... }>` must not end the heritage scan early; the
    // real body follows and its import() member stays erased.
    const [imports, exports] = parse(`export interface Foo extends Bar<{ x: import('arg').T }> {\n  load(): import('body').T;\n}`);
    assert.deepStrictEqual(imports.map(i => i.n), []);
    assert.deepStrictEqual(exports.map(e => e.n), ['Foo']);
    assert.strictEqual(exports[0].tp, true);
  });

  test('comment braces inside an interface body do not close it early', () => {
    for (const src of [
      `export interface Foo { /* } */ load(): import('m').T }`,
      `export interface Foo { // }\n load(): import('m').T\n}`,
      `export interface Foo { a: '{'; load(): import('m').T }`
    ]) {
      const [imports, exports] = parse(src);
      assert.deepStrictEqual(imports.map(i => i.n), [], src);
      assert.deepStrictEqual(exports.map(e => e.n), ['Foo'], src);
      assert.strictEqual(exports[0].tp, true, src);
    }
  });

  test('type alias RHS qualified name needs no special handling', () => {
    const [, exports] = parse(`export type Bar = Foo.Baz;`);
    assert.deepStrictEqual(exports.map(e => e.n), ['Bar']);
    assert.strictEqual(exports[0].tp, true);
  });

  test('line break after a prefix type keyword does not leak the RHS import()', () => {
    // `keyof` / `typeof` / `readonly` / `unique` / `infer` / `new` / `abstract`
    // / `import` still need an operand, so the erased alias continues across the
    // newline; a later `import('m')` type must not become a runtime edge.
    for (const op of ['keyof', 'typeof', 'readonly', 'unique', 'infer', 'new', 'abstract', 'import']) {
      const src = `export type T = ${op}\n import('m').X\nexport const y = 1;`;
      const [imports, exports] = parse(src);
      assert.deepStrictEqual(imports.map(i => i.n), [], src);
      assert.deepStrictEqual(exports.map(e => e.n), ['T', 'y'], src);
      assert.deepStrictEqual(exports.map(e => e.tp), [true, false], src);
    }
  });

  test('union / intersection on the next line continues the erased alias', () => {
    // A leading `|` / `&` after a newline continues the type, so a later
    // `import('m')` type stays erased (fuzzer-found).
    for (const op of ['|', '&']) {
      for (const gap of ['\n', '\n\n', '\n/*c*/']) {
        const src = `export type T = A${gap}${op} import('m').X\nexport const y = 1;`;
        const [imports, exports] = parse(src);
        assert.deepStrictEqual(imports.map(i => i.n), [], src);
        assert.deepStrictEqual(exports.map(e => e.tp), [true, false], src);
      }
    }
  });

  test('conditional and generic-default RHS import() stay erased', () => {
    // Both the extends-conditional RHS and a generic parameter default can bury
    // an import() type; neither may become a runtime edge (fuzzer-found).
    for (const src of [
      `export type A = string extends X ? import('m').T : Y;`,
      `export type A<Foo = keyof import('m').T> = Foo;`,
      `export interface A extends Bar<X extends import('m').T ? A : A> { m(): number }`
    ]) {
      const [imports, exports] = parse(src);
      assert.deepStrictEqual(imports.map(i => i.n), [], src);
      assert.strictEqual(exports[0].tp, true, src);
    }
  });

  // Bare (non-exported) `type` / `interface` declarations are skipped opaquely:
  // they record no export (there is none), but a buried `import(...)` type must
  // not leak as a runtime edge.
  test('bare type / interface declarations do not leak an import edge', () => {
    for (const src of [
      `type X = import('m').T;`,
      `interface A { m(): import('m').T }`,
      `type X = import('m').T\n| import('n').U;`,
      `interface A extends Bar<import('m').T> { x: import('n').U }`,
      `type X<T = import('m').T> = T;`
    ]) {
      const [imports, exports] = parse(src);
      assert.deepStrictEqual(imports.map(i => i.n), [], src);
      assert.deepStrictEqual(exports.map(e => e.n), [], src);
    }
  });

  test('nested type / interface declarations do not leak an import edge', () => {
    for (const { src, expected } of [
      { src: `function f() { type X = import('m').T; }`, expected: [] },
      { src: `if (true) { interface A { m(): import('m').T } }`, expected: [] },
      {
        src: `{ type X = import('m').T; interface A { m(): import('n').T } }\nimport 'runtime';`,
        expected: ['runtime']
      }
    ]) {
      const [imports] = parse(src);
      assert.deepStrictEqual(imports.map(i => i.n), expected, src);
    }
  });

  test('bare type alias stops before the enclosing block closer', () => {
    for (const src of [
      `function f() { type X = A }\nimport { v } from 'runtime';`,
      `switch (x) { case 0: type X = A }\nimport { v } from 'runtime';`,
      `const object = { method() { type X = A } };\nimport { v } from 'runtime';`
    ]) {
      const [imports] = parse(src);
      assert.deepStrictEqual(imports.map(i => i.n), ['runtime'], src);
    }
  });

  test('regex after an erased declaration stays regex', () => {
    for (const src of [
      `interface A {}\n/import('m')/.test(x);`,
      `type X = { a: 1 }\n/import('m')/.test(x);`,
      `type X = A\n/import('m')/;`,
      `export interface A {}\n/import('m')/.test(x);`,
      `export type X = { a: 1 }\n/import('m')/.test(x);`,
      `interface A {}\n{}\n/import('m')/.test(x);`,
      `type X = A\n{}\n/import('m')/.test(x);`,
      `export type X = A\n{}\n/import('m')/.test(x);`
    ]) {
      const [imports] = parse(src);
      assert.deepStrictEqual(imports.map(i => i.n), [], src);
    }
  });

  test('a value import alongside a bare type declaration is preserved', () => {
    const [imports] = parse(`type X = import('t').T;\nimport { v } from 'runtime';`);
    assert.deepStrictEqual(imports.map(i => i.n), ['runtime']);
    assert.strictEqual(imports[0].tp, false);
  });

  // JS-superset guards: `type` / `interface` as ordinary identifiers must not be
  // mistaken for a declaration.
  test('type / interface as value identifiers stay plain JS', () => {
    assert.deepStrictEqual(parse(`const type = 5;\ntype;`)[1].map(e => e.n), []);
    // Bare `type` then ASI: `x = import('m')` is a real runtime import.
    assert.deepStrictEqual(parse(`type\nx = import('m');`)[0].map(i => i.n), ['m']);
    assert.deepStrictEqual(parse(`let interface = 1;`)[1].map(e => e.n), []);
    // Property access, not a declaration.
    assert.deepStrictEqual(parse(`foo.type = import('m');`)[0].map(i => i.n), ['m']);
    // The same ASI and property guards apply inside a block.
    assert.deepStrictEqual(parse(`function f() { type\nx = import('m'); }`)[0].map(i => i.n), ['m']);
    assert.deepStrictEqual(parse(`function f() { foo.type = import('m'); }`)[0].map(i => i.n), ['m']);
  });

  test('ASI still ends the alias after a complete type on the next line', () => {
    // A plain identifier completes the type, so the newline ends the alias and
    // the following statement is parsed on its own.
    const [imports, exports] = parse(`export type T = A\nexport const y = 1;`);
    assert.deepStrictEqual(imports.map(i => i.n), []);
    assert.deepStrictEqual(exports.map(e => e.n), ['T', 'y']);
    assert.deepStrictEqual(exports.map(e => e.tp), [true, false]);
  });

  test('word ending in a prefix keyword is not treated as one', () => {
    // `imports` / `newish` are ordinary names: the alias ends at the newline,
    // so this only checks no crash / no leak from the length-exact match.
    const [imports, exports] = parse(`export type T = imports\nexport const y = 1;`);
    assert.deepStrictEqual(imports.map(i => i.n), []);
    assert.deepStrictEqual(exports.map(e => e.n), ['T', 'y']);
    assert.deepStrictEqual(exports.map(e => e.tp), [true, false]);
  });

  test('export type * from re-export marks the import edge type-only', () => {
    const [imports, exports] = parse(`export type * from 'x';`);
    assert.deepStrictEqual(imports.map(i => i.n), ['x']);
    assert.strictEqual(imports[0].tp, true);
    assert.deepStrictEqual(exports.map(e => e.tp), []);
  });

  // JS-superset guards: none of these are type declarations.
  test('type as a plain variable is not a declaration', () => {
    const [, exports] = parse(`export const type = 5;`);
    assert.deepStrictEqual(exports.map(e => e.n), ['type']);
    assert.strictEqual(exports[0].tp, false);
  });

  test('declaration name may follow a line break after the keyword', () => {
    // TS does not apply ASI between `type` / `interface` and the name, so Node
    // strips both of these as a single type-only declaration.
    const alias = parse(`export type\nX = 5;`)[1];
    assert.deepStrictEqual(alias.map(e => e.n), ['X']);
    assert.strictEqual(alias[0].tp, true);

    const iface = parse(`export interface\nFoo { a: number }`)[1];
    assert.deepStrictEqual(iface.map(e => e.n), ['Foo']);
    assert.strictEqual(iface[0].tp, true);
  });

  test('bare interface later named in a value export stays runtime', () => {
    const [, exports] = parse(`interface Foo {}\nexport { Foo };`);
    assert.deepStrictEqual(exports.map(e => e.n), ['Foo']);
    assert.strictEqual(exports[0].tp, false);
  });

  test('bare type alias later named in a value export stays runtime', () => {
    const [, exports] = parse(`type X = 5;\nexport { X };`);
    assert.deepStrictEqual(exports.map(e => e.n), ['X']);
    assert.strictEqual(exports[0].tp, false);
  });
});
