const assert = require('node:assert/strict');
const { init, parse } = require('./_lexer.cjs');
const min = !!process.env.MINIMAL;

suite('Static import attributes', () => {
  setup(async () => { await init; });

  const forms = [
    ['default import', 'import value from ', 1],
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
    ['{ /* empty */ }', null],
    ["{type /* key */ : 'json'}", [['type', 'json']]],
    ["{type:'json'}", [['type', 'json']]],
    ["{type:'json',kind:'test'}", [['type', 'json'], ['kind', 'test']]],
    ["{type:'json',kind:'test',}", [['type', 'json'], ['kind', 'test']]],
    ['{type:\'json\',"kind":\'test\'}', [['type', 'json'], ['kind', 'test']]],
    ["{type:'json','\\u006bind':'te\\u0073t',}", [['type', 'json'], ['kind', 'test']]],
    ['{"ty\\u0070e" /* key */ : "j\\u0073on",}', [['type', 'json']]]
  ];
  for (const [name, prefix, type] of forms) {
    test(`${name} with attributes`, () => {
      for (const [before, after] of [
        [' ', ' '], [' /* comment */ ', '\n'],
        [' ', ' /* comment\n */ '], [' ', '// short\n'],
        [' ', '// a long comment crossing the SIMD prefix\r\n'],
        ['\n', ' '], ['\r', ' '], ['\r\n', ' '], ['/*\n*/', ' ']
      ]) {
        for (const [bag, attributes] of bags) {
          const source = `${prefix}'pkg'${before}with${after}${bag}; export const next = 1;`;
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

});
