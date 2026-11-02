/** @typedef {import('es-module-lexer/bindings').ImportBinding} ImportBinding */
/** @typedef {import('es-module-lexer/bindings').StaticImport} ImportRecord */

const assert = require('node:assert/strict');

let parse;
let plainParse;

suite('Import bindings', () => {
  suiteSetup(async function () {
    if (!process.env.BINDINGS) this.skip();
    const specifier = process.env.ASM ? 'es-module-lexer/bindings/js' : 'es-module-lexer/bindings';
    const lexer = process.env.CJS ? require(specifier) : await import(specifier);
    await lexer.init();
    parse = lexer.parse;
    const plain = await import(process.env.ASM ? 'es-module-lexer/js' : 'es-module-lexer');
    await plain.init();
    plainParse = plain.parse;
  });

  test('named imports retain both names and the clause range through comments', () => {
    const source = "import/*\nlong comment\n*/{\n a,\n b as/* rename */c\n}from/*\nlong comment\n*/'file'";
    const [[record]] = parse(source);
    assert.equal(source.slice(record.clauseStart, record.clauseEnd), '{\n a,\n b as/* rename */c\n}');
    assert.deepEqual(record.bindings, [{
      type: 'named', importName: 'a', localName: 'a',
      importNameStart: source.indexOf(' a,') + 1, importNameEnd: source.indexOf(' a,') + 2,
      localStart: source.indexOf(' a,') + 1, localEnd: source.indexOf(' a,') + 2, typeOnly: false
    }, {
      type: 'named', importName: 'b', localName: 'c',
      importNameStart: source.indexOf(' b as') + 1, importNameEnd: source.indexOf(' b as') + 2,
      localStart: source.indexOf('c\n}'), localEnd: source.indexOf('c\n}') + 1, typeOnly: false
    }]);
  });

  test('default, namespace, and mixed clauses', () => {
    const source = "import main from 'a'; import main2, { a, b as c, } from 'b';" +
      "import * as ns from 'c'; import main3, * as ns2 from 'd';";
    const [imports] = parse(source);
    assert.deepEqual(imports.map(/** @param {ImportRecord} record */ record => source.slice(record.clauseStart, record.clauseEnd)), [
      'main', 'main2, { a, b as c, }', '* as ns', 'main3, * as ns2'
    ]);
    assert.deepEqual(imports.map(/** @param {ImportRecord} record */ record => record.bindings.map(/** @param {ImportBinding} binding */ binding => binding.type)), [
      ['default'], ['default', 'named', 'named'], ['namespace'], ['default', 'namespace']
    ]);
    assert.deepEqual(imports.map(/** @param {ImportRecord} record */ record => record.bindings.map(/** @param {ImportBinding} binding */ binding => binding.importName)), [
      ['default'], ['default', 'a', 'b'], [null], ['default', null]
    ]);
    assert.deepEqual(imports.map(/** @param {ImportRecord} record */ record => record.bindings.map(/** @param {ImportBinding} binding */ binding => binding.localName)), [
      ['main'], ['main2', 'a', 'c'], ['ns'], ['main3', 'ns2']
    ]);
    for (const record of imports) {
      for (const binding of record.bindings) {
        assert.equal(source.slice(binding.localStart, binding.localEnd), binding.localName);
        if (binding.type !== 'named') {
          assert.equal(binding.importNameStart, -1);
          assert.equal(binding.importNameEnd, -1);
        }
      }
    }
  });

  test('record alignment covers both UTF-16 source-length parities', () => {
    for (const prefix of ['', ' ']) {
      const source = prefix + "import { a, b as c } from 'module';";
      const [[record]] = parse(source);
      assert.deepEqual(record.bindings.map(/** @param {ImportBinding} binding */ binding => binding.localName), ['a', 'c']);
      assert.equal(source.slice(record.clauseStart, record.clauseEnd), '{ a, b as c }');
    }
  });

  test('empty clauses, side effects, reexports, dynamic imports, and import.meta', () => {
    const source = "import {} from 'empty'; import 'side'; export * from 'star';" +
      "export { x as y } from 'named'; import('dynamic'); import.meta;";
    const [imports] = parse(source);
    assert.deepEqual(imports[0].bindings, []);
    assert.equal(source.slice(imports[0].clauseStart, imports[0].clauseEnd), '{}');
    for (const record of imports.slice(1, 4)) {
      assert.deepEqual(record.bindings, []);
      assert.equal(record.clauseStart, -1);
      assert.equal(record.clauseEnd, -1);
    }
    for (const record of imports.slice(4)) {
      assert.equal('bindings' in record, false);
      assert.equal('clauseStart' in record, false);
      assert.equal('clauseEnd' in record, false);
    }
  });

  test('quoted names, Unicode escapes, and UTF-16 ranges', () => {
    const source = String.raw`/* 😀 */import { "a\u0062\n" as c\u0064, \u{61} as 𐐀, π } from 'names';`;
    const [[record]] = parse(source);
    assert.deepEqual(record.bindings.map(/** @param {ImportBinding} binding */ binding => binding.importName), ['ab\n', 'a', 'π']);
    assert.deepEqual(record.bindings.map(/** @param {ImportBinding} binding */ binding => binding.localName), ['cd', '𐐀', 'π']);
    assert.deepEqual(record.bindings.map(/** @param {ImportBinding} binding */ binding => source.slice(binding.importNameStart, binding.importNameEnd)), [
      '"a\\u0062\\n"', '\\u{61}', 'π'
    ]);
    assert.deepEqual(record.bindings.map(/** @param {ImportBinding} binding */ binding => source.slice(binding.localStart, binding.localEnd)), [
      'c\\u0064', '𐐀', 'π'
    ]);
  });

  test('comments cannot introduce clause ends or import tokens', () => {
    const source = "import/* } 'from' */main/* , */," +
      "{/* } */ 'x}from' as/* } */local, // }\n other, }/* trivia */from 'm' with { type: 'json' };";
    const [[record]] = parse(source);
    assert.equal(source.slice(record.clauseStart, record.clauseEnd),
      "main/* , */,{/* } */ 'x}from' as/* } */local, // }\n other, }");
    assert.deepEqual(record.bindings.map(/** @param {ImportBinding} binding */ binding => binding.localName), ['main', 'local', 'other']);
    assert.deepEqual(record.attributes, [['type', 'json']]);
  });

  test('Unicode line and paragraph separators remain string contents', () => {
    for (const separator of ['\u2028', '\u2029']) {
      for (const quote of ['"', "'"]) {
        const value = `before${separator}after`;
        const quoted = quote === '"' ? JSON.stringify(value) : `${quote}${value}${quote}`;
        const [, exports] = parse(`export const data = ${quoted};`);
        assert.equal(exports[0].name, 'data');
        const [[sideEffect]] = parse(`import ${quoted};`);
        assert.equal(sideEffect.specifier, value);
        const [[dynamic]] = parse(`import(${quoted});`);
        assert.equal(dynamic.specifier, value);
        const [[attributes]] = parse(`import 'module' with { ${quoted}: ${quoted} };`);
        assert.deepEqual(attributes.attributes, [[value, value]]);
        const [, namedExports] = parse(`const local = 1; export { local as ${quoted} };`);
        assert.equal(namedExports[0].name, value);
        const source = `import { ${quoted} as local } from ${quoted};`;
        const [[record]] = parse(source);
        assert.equal(record.specifier, value);
        assert.deepEqual(record.bindings, [{
          type: 'named', importName: value, localName: 'local',
          importNameStart: 9, importNameEnd: 9 + quoted.length,
          localStart: source.indexOf('local'), localEnd: source.indexOf('local') + 5, typeOnly: false
        }]);
      }
    }
  });

  test('Unicode line terminators end short and long line comments', () => {
    for (const separator of ['\u2027', '\u2028', '\u2029', '\u202a']) {
      const terminates = separator === '\u2028' || separator === '\u2029';
      for (const comment of ['', 'x'.repeat(8), 'x'.repeat(9), 'x'.repeat(16), 'x'.repeat(17),
        'x'.repeat(31), '😀' + 'x'.repeat(7), 'x'.repeat(9) + '\0']) {
        const source = `//${comment}${separator}import { hidden } from 'hidden';\nimport { value } from 'm';`;
        const [imports] = parse(source);
        assert.deepEqual(imports.map(/** @param {ImportRecord} record */ record => record.bindings[0].localName),
          terminates ? ['hidden', 'value'] : ['value']);
      }
    }
  });

  test('quoted imported names preserve escaped line continuations', () => {
    for (const lineBreak of ['\r', '\n', '\r\n', '\u2028', '\u2029']) {
      for (const quote of ['"', "'"]) {
        const quoted = `${quote}before\\${lineBreak}after${quote}`;
        const [[record]] = parse(`import { ${quoted} as local } from ${quoted};`);
        assert.equal(record.specifier, 'beforeafter');
        assert.equal(record.bindings[0].importName, 'beforeafter');
        assert.equal(record.bindings[0].localName, 'local');
      }
    }
  });

  test('raw carriage returns and line feeds remain invalid in quoted strings', () => {
    for (const lineBreak of ['\r', '\n', '\r\n']) {
      for (const quote of ['"', "'"]) {
        const source = `export const data = ${quote}before${lineBreak}after${quote};`;
        assert.throws(() => parse(source), { message: /^Parse error /, idx: 27 });
        const [[record]] = parse("import { valid } from 'm';");
        assert.equal(record.bindings[0].localName, 'valid');
      }
    }
  });

  test('escaped shorthand and aliases decode independently', () => {
    const source = String.raw`import { \u{61}, b\u0062, \u0063 as d\u0064, "\u0065" as f } from 'm';`;
    const [[record]] = parse(source);
    assert.deepEqual(record.bindings.map(/** @param {ImportBinding} binding */ binding =>
      [binding.importName, binding.localName]), [['a', 'a'], ['bb', 'bb'], ['c', 'dd'], ['e', 'f']]);
    for (const binding of record.bindings.slice(0, 2)) {
      assert.equal(binding.importNameStart, binding.localStart);
      assert.equal(binding.importNameEnd, binding.localEnd);
    }
  });

  test('ECMAScript whitespace and line terminators delimit import names', () => {
    for (const code of [
      0x9, 0xa, 0xb, 0xc, 0xd, 0x20, 0xa0, 0x1680,
      0x2000, 0x2001, 0x2002, 0x2003, 0x2004, 0x2005, 0x2006,
      0x2007, 0x2008, 0x2009, 0x200a, 0x2028, 0x2029, 0x202f, 0x205f, 0x3000, 0xfeff
    ]) {
      const whitespace = String.fromCharCode(code);
      const source = `import${whitespace}{${whitespace}a${whitespace}as${whitespace}b,${whitespace}c${whitespace}}` +
        `${whitespace}from${whitespace}'m';`;
      const [[record]] = parse(source);
      assert.deepEqual(record.bindings.map(/** @param {ImportBinding} binding */ binding => binding.importName), ['a', 'c'], code.toString(16));
      assert.deepEqual(record.bindings.map(/** @param {ImportBinding} binding */ binding => binding.localName), ['b', 'c'], code.toString(16));
      assert.equal(source[record.clauseStart], '{');
      assert.equal(source[record.clauseEnd - 1], '}');
    }
    const [[record]] = parse("import { a\u1681, a\u200cb, a\u200db } from 'identifiers';");
    assert.deepEqual(record.bindings.map(/** @param {ImportBinding} binding */ binding => binding.localName), ['a\u1681', 'a\u200cb', 'a\u200db']);
  });

  test('escaped default and namespace names and named default imports', () => {
    const source = String.raw`import d\u0065f from 'd'; import * as n\u0073 from 'n';` +
      String.raw`import type * as types from 't'; import { "\u0064efault" as local } from 's';`;
    const [imports] = parse(source);
    assert.deepEqual(imports.map(/** @param {ImportRecord} record */ record => record.bindings[0].localName), ['def', 'ns', 'types', 'local']);
    assert.deepEqual(imports.map(/** @param {ImportRecord} record */ record => record.bindings[0].type), ['default', 'namespace', 'namespace', 'named']);
    assert.deepEqual(imports.map(/** @param {ImportRecord} record */ record => record.bindings[0].typeOnly), [false, false, true, false]);
    assert.equal(imports[3].bindings[0].importName, 'default');
    assert.equal(source.slice(imports[3].bindings[0].importNameStart, imports[3].bindings[0].importNameEnd),
      '"\\u0064efault"');
  });

  test('type-only statements and individual specifiers', () => {
    const source = "import type { A as B, C } from 'types';" +
      "import { type D, type E as F, type as valueType, x } from 'values';" +
      "import type Only from 'default'; import type from 'value'; import type from from 'type';";
    const [imports] = parse(source);
    assert.deepEqual(imports.map(/** @param {ImportRecord} record */ record => record.bindings.map(/** @param {ImportBinding} binding */ binding => binding.localName)), [
      ['B', 'C'], ['D', 'F', 'valueType', 'x'], ['Only'], ['type'], ['from']
    ]);
    assert.deepEqual(imports.map(/** @param {ImportRecord} record */ record => record.bindings.map(/** @param {ImportBinding} binding */ binding => binding.typeOnly)), [
      [true, true], [true, true, false, false], [true], [false], [true]
    ]);
    assert.equal(source.slice(imports[0].clauseStart, imports[0].clauseEnd), '{ A as B, C }');
    assert.equal(source.slice(imports[2].clauseStart, imports[2].clauseEnd), 'Only');
  });

  test('phase imports and contextual default names', () => {
    const source = "import source wasm from 'wasm'; import defer * as lazy from 'lazy';" +
      "import source from 'source'; import defer from 'defer'; import from from 'from';";
    const [imports] = parse(source);
    assert.deepEqual(imports.map(/** @param {ImportRecord} record */ record => record.bindings[0].type), [
      'source', 'namespace', 'default', 'default', 'default'
    ]);
    assert.deepEqual(imports.map(/** @param {ImportRecord} record */ record => record.bindings[0].importName), [
      null, null, 'default', 'default', 'default'
    ]);
    assert.deepEqual(imports.map(/** @param {ImportRecord} record */ record => source.slice(record.clauseStart, record.clauseEnd)), [
      'wasm', '* as lazy', 'source', 'defer', 'from'
    ]);
  });

  test('CommonJS import-equals clauses are namespace bindings', () => {
    const source = "import legacy = require('legacy'); import type Types = require('types');";
    const [imports] = parse(source);
    assert.deepEqual(imports.map(/** @param {ImportRecord} record */ record => record.bindings[0].type), ['namespace', 'namespace']);
    assert.deepEqual(imports.map(/** @param {ImportRecord} record */ record => record.bindings[0].importName), [null, null]);
    assert.deepEqual(imports.map(/** @param {ImportRecord} record */ record => record.bindings[0].typeOnly), [false, true]);
    assert.deepEqual(imports.map(/** @param {ImportRecord} record */ record => source.slice(record.clauseStart, record.clauseEnd)), ['legacy', 'Types']);
  });

  test('binding capture preserves detached export resolution and the default API', () => {
    for (const source of [
      "export { a, main as default, ns }; import main, { b as a } from 'a'; import * as ns from 'n';",
      "import { b as a } from 'a'; export { a }; import { z } from 'z';",
      "export { local }; const local = 1; import { x } from 'x';",
      "export { local }; const local = 1;",
      "import type { Type } from 't'; export type { Type }; import { value } from 'v';"
    ]) {
      const plain = plainParse(source);
      for (const record of plain[0]) {
        assert.equal('bindings' in record, false);
        assert.equal('clauseStart' in record, false);
        assert.equal('clauseEnd' in record, false);
      }
      const enriched = parse(source);
      assert.deepEqual(enriched.slice(1), plain.slice(1));
      assert.deepEqual(enriched[0].map(/** @param {ImportRecord} record */ ({ bindings, clauseStart, clauseEnd, ...record }) => record), plain[0]);
      for (const record of enriched[0]) assert.ok(record.bindings.length > 0);
    }
  });

  test('arena growth and subsequent calls retain complete independent results', () => {
    const names = Array.from({ length: 30000 },
      /**
       * @param {undefined} _
       * @param {number} index
       */
      (_, index) => `a${index.toString(36)}`);
    const source = `import{${names.join(',')}}from'many';`;
    const [[large]] = parse(source);
    assert.equal(large.bindings.length, names.length);
    assert.deepEqual(large.bindings.map(/** @param {ImportBinding} binding */ binding => binding.localName), names);
    const [[small]] = parse("import { small } from 'small';");
    assert.deepEqual(small.bindings.map(/** @param {ImportBinding} binding */ binding => binding.localName), ['small']);
    assert.equal(large.bindings.length, names.length);
    assert.equal(large.bindings.at(-1).localName, names.at(-1));
    assert.deepEqual(parse('')[0], []);
  });

  test('parse errors leave no bindings in the next call', () => {
    assert.throws(() => parse("import { a } from 'unterminated"), { idx: 31 });
    const [[record]] = parse("import { b } from 'valid';");
    assert.deepEqual(record.bindings.map(/** @param {ImportBinding} binding */ binding => binding.localName), ['b']);
  });
});
