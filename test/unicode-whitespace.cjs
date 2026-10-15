const assert = require('node:assert/strict');
const { init, parse } = require('./_lexer.cjs');

const whitespaces = [
  '\u00A0', '\u1680', '\u2000', '\u2001', '\u2002', '\u2003', '\u2004',
  '\u2005', '\u2006', '\u2007', '\u2008', '\u2009', '\u200A', '\u202F',
  '\u205F', '\u3000', '\uFEFF'
];

suite('Full-build Unicode whitespace', () => {
  setup(async function () {
    if (process.env.MINIMAL) this.skip();
    await init;
  });

  test('Unicode line separators separate attribute clauses and comments', () => {
    for (const separator of ['\u2028', '\u2029']) {
      for (const prefix of ['import ', 'import value from ', 'export * from ']) {
        for (const after of [separator, `// short${separator}`, `// a long comment crossing the SIMD prefix${separator}`]) {
          const source = `${prefix}'pkg' with${after}{type:'json'}; export const next = 1;`;
          const [[imported], exports] = parse(source);
          assert.deepStrictEqual(imported.at, [['type', 'json']], source);
          assert.strictEqual(source.slice(imported.a, imported.se), "{type:'json'}", source);
          assert.strictEqual(exports.at(-1).n, 'next', source);
        }
      }
    }
  });

  test('line separators remain valid inside string literals', () => {
    const [[imported]] = parse("import value from 'p\u2028kg' with {type:'x\u2029y'}");
    assert.strictEqual(imported.n, 'p\u2028kg');
    assert.deepStrictEqual(imported.at, [['type', 'x\u2029y']]);
  });

  test('Unicode whitespace separates attribute tokens', () => {
    for (const whitespace of whitespaces) {
      const source = `import value from 'pkg'${whitespace}with${whitespace}{'type'${whitespace}:${whitespace}'json'};`;
      const [[imported]] = parse(source);
      assert.strictEqual(imported.a, source.indexOf('{'), source);
      assert.deepStrictEqual(imported.at, [['type', 'json']], source);
    }
    for (const character of ['\u0085', '\u167F', '\u180E', '\u200B', '\u202A', '\u202E', '\u2030', '\u205E', '\u2060', '\u3001', '\uFEFE', '\uFF00']) {
      const [[imported]] = parse(`import value from 'pkg'${character}with {type:'json'};`);
      assert.strictEqual(imported.a, -1, character);
    }
  });

  test('Unicode whitespace separates import and export keywords', () => {
    for (const whitespace of whitespaces) {
      for (const prefix of ['', '0;']) {
        const [[imported], [exported], facade] = parse(`${prefix}${whitespace}import 'pkg';${whitespace}export { value };`);
        assert.strictEqual(imported.n, 'pkg');
        assert.strictEqual(exported.n, 'value');
        assert.strictEqual(facade, prefix === '');
      }
    }
  });

  test('Unicode line separators terminate comments before ordinary module syntax', () => {
    for (const separator of ['\u2028', '\u2029']) {
      for (const length of [0, 7, 8, 9, 15, 16, 17, 31, 32, 33]) {
        const [[imported], [exported]] = parse(`//${'x'.repeat(length)}${separator}import 'pkg'; export const value = 1;`);
        assert.strictEqual(imported.n, 'pkg');
        assert.strictEqual(exported.n, 'value');
      }
    }
  });

  test('short and long inputs preserve Unicode token boundaries and offsets', () => {
    for (const length of [63, 64]) {
      const source = "import\u3000'pkg'; // comment\u2028export const value = 1;".padStart(length);
      const [[imported], [exported]] = parse(source);
      assert.strictEqual(imported.n, 'pkg');
      assert.strictEqual(exported.n, 'value');
      assert.strictEqual(source.slice(imported.s, imported.e), 'pkg');
      assert.strictEqual(source.slice(exported.s, exported.e), 'value');
    }
  });

  test('non-terminating characters inside comments do not expose hidden imports', () => {
    for (const code of [0, 1, 8, 9, 11, 12, 14, 0x2027, 0x202A]) {
      for (const length of [7, 8, 9, 15, 16, 31, 40]) {
        const source = `//${'x'.repeat(length)}${String.fromCharCode(code)}import('hidden');\nimport('visible');`;
        const [imports] = parse(source);
        assert.strictEqual(imports.length, 1, source);
        assert.strictEqual(imports[0].n, 'visible', source);
      }
    }
  });

  test('unterminated comments retain embedded NUL characters', () => {
    const [imports] = parse(`//${'x'.repeat(40)}\0import('hidden');`);
    assert.strictEqual(imports.length, 0);
  });

  test('Unicode whitespace after break and continue labels keeps regex opaque', () => {
    for (const keyword of ['break', 'continue']) {
      for (const whitespace of whitespaces) {
        const source = `label: while (true) { ${keyword}${whitespace}label\n` +
          '/import("hidden")/.test(""); }\nimport("visible");';
        const [imports] = parse(source);
        assert.strictEqual(imports.length, 1, source);
        assert.strictEqual(imports[0].n, 'visible', source);
      }
    }
  });
});
