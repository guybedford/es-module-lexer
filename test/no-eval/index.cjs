const assert = require('node:assert/strict');

let parse;
const commonjs = !!process.env.CJS;
const minimal = !!process.env.MINIMAL;

suite('No string code generation', () => {
  suiteSetup(async () => {
    const lexer = commonjs
      ? require(minimal ? '../../dist/lexer.minimal.cjs' : '../../dist/lexer.cjs')
      : await import(minimal ? '../../dist/lexer.minimal.js' : '../../dist/lexer.js');
    await lexer.init;
    parse = lexer.parse;
  });

  test('decodes module strings', () => {
    const cases = [
      [`import 'plain-specifier'`, 'plain-specifier'],
      [String.raw`import 'escaped\u002dspecifier'`, 'escaped-specifier'],
      [String.raw`import 'escaped\x2dspecifier'`, 'escaped-specifier'],
      [String.raw`import 'unicode\u{20204}'`, 'unicode𠈄'],
      ["import 'line\\\ncontinuation'", 'linecontinuation'],
      [String.raw`import 'nul\0character'`, 'nul\0character'],
      [String.raw`import 'quote\''`, "quote'"],
      ["import(`raw\rreturn`)", 'raw\nreturn'],
      ["import(`raw\r\nreturn`)", 'raw\nreturn'],
      ["import(`raw\rreturn\\tvalue`)", 'raw\nreturn\tvalue'],
      ["import(`raw\rreturn`, { with: { type: 'json' } })", 'raw\nreturn'],
      ["import(`escaped\\rreturn`)", 'escaped\rreturn'],
    ];

    for (const [source, expected] of cases) {
      const [imports] = parse(source);
      assert.strictEqual(minimal ? imports[0].n : imports[0].specifier, expected);
    }
  });

  test('decodes export names', () => {
    const source = String.raw`export { "escaped\u002dimport" as "escaped\u002dname" } from 'plain-specifier'`;
    const [, exports] = parse(source);
    const exported = exports[0];

    assert.strictEqual(minimal ? exported.n : exported.name, 'escaped-name');
    if (!minimal) {
      assert.strictEqual(exported.importName, 'escaped-import');
    }
  });

  test('normalizes template line endings after SIMD warmup', () => {
    for (let index = 0; index < 20; index++) {
      parse(`import(\`specifier-${index}\`)`);
    }

    const [imports] = parse("import(`raw\rreturn`)");
    assert.strictEqual(minimal ? imports[0].n : imports[0].specifier, 'raw\nreturn');

    const [unsafeImports] = parse("import(`raw\rreturn` + suffix)");
    assert.strictEqual(minimal ? unsafeImports[0].n : unsafeImports[0].specifier, undefined);
  });

  test('rejects invalid module strings', () => {
    for (const source of [
      String.raw`import 'invalid\uZZ'`,
      String.raw`import 'invalid\u{}'`,
      String.raw`import 'invalid\u{110000}'`,
      String.raw`import 'invalid\01'`,
      String.raw`import 'invalid\8'`,
    ]) {
      assert.throws(() => parse(source), { message: /^Parse error / });
    }
  });
});
