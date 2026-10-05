const assert = require('node:assert/strict');
const { init, parse } = require('./_lexer.cjs');
const min = !!process.env.MINIMAL;

suite('Static import attributes', () => {
  setup(async () => { await init; });

  const forms = [
    ['named import', 'import value from ', 1],
    ['side-effect import', 'import ', 1],
    ['namespace import', 'import * as value from ', 1],
    ['named re-export', 'export { value } from ', 1],
    ['namespace re-export', 'export * as value from ', 1],
    ['bare star re-export', 'export * from ', min ? 1 : 8],
    ['source phase', 'import source value from ', 4],
    ['defer phase', 'import defer * as value from ', 6]
  ];
  const bags = [
    ['{}', null],
    ["{type:'json'}", [['type', 'json']]],
    ["{type:'json',kind:'test'}", [['type', 'json'], ['kind', 'test']]],
    ["{type:'json',kind:'test',}", [['type', 'json'], ['kind', 'test']]],
    ['{type:\'json\',"kind":\'test\'}', [['type', 'json'], ['kind', 'test']]],
    ["{type:'json','\\u006bind':'te\\u0073t',}", [['type', 'json'], ['kind', 'test']]],
    ['{"ty\\u0070e" /* key */ : "j\\u0073on",}', [['type', 'json']]]
  ];
  for (const [name, prefix, type] of forms) {
    for (const keyword of ['with', 'assert']) {
      test(`${name} with ${keyword}`, () => {
        for (const [before, after] of [
          [' ', ' '], [' /* comment */ ', '\n'],
          [' ', ' /* comment\n */ '], [' ', '// short\u2028'],
          [' ', '// a long comment crossing the SIMD prefix\u2029'],
          ...(keyword === 'with' ? [['\n', ' '], ['\u2028', ' '], ['/*\n*/', ' ']] : [])
        ]) {
          for (const [bag, attributes] of bags) {
            const source = `${prefix}'pkg'${before}${keyword}${after}${bag}; export const next = 1;`;
            const [[imported], exports] = parse(source);
            assert.strictEqual(imported.n, 'pkg', source);
            assert.strictEqual(imported.t, type, source);
            assert.strictEqual(imported.a, source.indexOf(bag), source);
            assert.strictEqual(source.slice(imported.a, imported.se), bag, source);
            if (!min) assert.deepStrictEqual(imported.at, attributes, source);
            assert.strictEqual(exports.at(-1).n, 'next', source);
          }
        }
      });
    }
  }

  test('assert identifiers after a line terminator are not attributes', () => {
    for (const trivia of ['\n', '\r', '\r\n', '\u2028', '\u2029', '/*\n*/', '// short\u2028']) {
      const source = `import value from 'pkg'${trivia}assert\n{type:'json'}\nexport const next = 1;`;
      const [[imported], exports] = parse(source);
      assert.strictEqual(imported.a, -1, source);
      if (!min) assert.strictEqual(imported.at, null, source);
      assert.strictEqual(exports.at(-1).n, 'next', source);
    }
  });

  test('line separators remain valid inside string literals', () => {
    const [[imported]] = parse("import value from 'p\u2028kg' with {type:'x\u2029y'}");
    assert.strictEqual(imported.n, 'p\u2028kg');
    if (!min) assert.deepStrictEqual(imported.at, [['type', 'x\u2029y']]);
  });

  test('Unicode whitespace separates attribute tokens', () => {
    for (const whitespace of ['\u1680', '\u2000', '\u200A', '\u202F', '\u205F', '\u3000', '\uFEFF']) {
      const source = `import value from 'pkg'${whitespace}with${whitespace}{type${whitespace}:${whitespace}'json'};`;
      const [[imported]] = parse(source);
      assert.strictEqual(imported.a, source.indexOf('{'), source);
      if (!min) assert.deepStrictEqual(imported.at, [['type', 'json']], source);
    }
    for (const character of ['\u167F', '\u180E', '\u200B', '\u202A', '\u202E', '\u2030', '\u205E', '\u2060']) {
      const [[imported]] = parse(`import value from 'pkg'${character}with {type:'json'};`);
      assert.strictEqual(imported.a, -1, character);
    }
  });

  test('Unicode whitespace separates import and export keywords', () => {
    for (const whitespace of ['\u1680', '\u2000', '\u200A', '\u202F', '\u205F', '\u3000', '\uFEFF']) {
      const [[imported], [exported]] = parse(`0;${whitespace}import 'pkg';${whitespace}export const value = 1;`);
      assert.strictEqual(imported.n, 'pkg');
      assert.strictEqual(exported.n, 'value');
    }
  });

  test('Unicode line separators terminate comments before ordinary module syntax', () => {
    for (const separator of ['\u2028', '\u2029']) {
      for (const length of [0, 7, 8, 9, 16, 31]) {
        const [[imported], [exported]] = parse(`//${'x'.repeat(length)}${separator}import 'pkg'; export const value = 1;`);
        assert.strictEqual(imported.n, 'pkg');
        assert.strictEqual(exported.n, 'value');
      }
    }
  });

  test('non-terminating characters inside comments do not expose hidden imports', () => {
    for (const code of [0, 1, 8, 9, 11, 12, 14, 0x2027, 0x202A]) {
      const source = `//${'x'.repeat(40)}${String.fromCharCode(code)}import('hidden');\nimport('visible');`;
      const [imports] = parse(source);
      assert.strictEqual(imports.length, 1, source);
      assert.strictEqual(imports[0].n, 'visible', source);
    }
  });
});
