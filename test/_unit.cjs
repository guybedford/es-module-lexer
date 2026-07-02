const assert = require('assert');

let js = false;
// The minimal builds (MINIMAL=1) drop the fields es-module-shims never reads:
// the parsed attribute list `at`, export `ss`, and the facade/hasModuleSyntax
// flags. Tests asserting on those are gated behind `!min`.
const min = !!process.env.MINIMAL;
let parse;
const init = (async () => {
  if (parse) return;
  if (process.env.WASM) {
    const m = await import(min ? '../dist/lexer.minimal.js' : '../dist/lexer.js');
    await m.init;
    parse = m.parse;
  }
  else if (process.env.ASM) {
    ({ parse } = await import(min ? '../dist/lexer.minimal.asm.js' : '../dist/lexer.asm.js'));
  }
  else {
    js = true;
    ({ parse } = await import('../lexer.js'));
  }
})();

function assertExportIs(source, actual, expected) {
  if (source[actual.s] === '"' || source[actual.s] === "'") {
    assert.strictEqual(source[actual.s], source[actual.e - 1], `export.s, export.e: ${source[actual.s]} != ${source[actual.e - 1]}`);
  } else {
    assert.strictEqual(source.substring(actual.s, actual.e), expected.n, `export.s, export.e: ${source.substring(actual.s, actual.e)} != ${expected.n}`);
  }
  if (expected.ln === undefined) {
    assert.strictEqual(actual.ls, -1, `export.ls: ${actual.ls} != -1`);
    assert.strictEqual(actual.le, -1, `export.le: ${actual.le} != -1`);
  } else if (source[actual.ls] === '"' || source[actual.ls] === "'") {
    assert.strictEqual(source[actual.ls], source[actual.le - 1], `export.ls, export.le: ${source[actual.ls]} != ${source[actual.le - 1]}`);
  } else {
    assert.strictEqual(source.substring(actual.ls, actual.le), expected.ln, `export.ls, export.le: ${source.substring(actual.ls, actual.le)} != ${expected.ln}`);
  }
  assert.strictEqual(actual.n, expected.n, `export.n: ${actual.n} != ${expected.n}`);
  assert.strictEqual(actual.ln, expected.ln, `export.ln: ${actual.ln} != ${expected.ln}`);
}

suite('Lexer', () => {
  setup(async () => await init);

  test('Division of `of` identifier in for statement', () => {
    // `of` as identifier on the LHS of a binary expression with `/`,
    // inside a C-style for header. The lexer must not treat `/` as the
    // start of a regex (which would happen if `of` were the for-of keyword).
    const sources = [
      'for (i = of / 2;;) break',
      'for (; of / 2;) break',
      'for (;; of / 2) break',
      'for (i + of / 2;;) break',
      'for (i - of / 2;;) break',
      'for (i * of / 2;;) break',
      'for (i, of / 2;;) break',
      'for (i < of / 2;;) break',
      'for (i | of / 2;;) break',
      'for (i & of / 2;;) break',
      'for (i ? of / 2 : 0;;) break',
      'for ((of) / 2;;) break',
    ];
    for (const source of sources) {
      parse(source);
    }
  });

  test('for-of with regex iterable retains regex parsing', () => {
    // Disambiguation must still let `/regex/` parse as a regex when `of` is
    // the contextual for-of keyword. Includes the no-whitespace and
    // multi-whitespace variants.
    const sources = [
      'for (i of /regex/) break',
      'for (let x of /regex/) break',
      'for (const x of /regex/) break',
      'for (var x of /regex/) break',
      'for ([a] of /regex/) break',
      'for ({a} of /regex/) break',
      'for ((x) of /regex/) break',
      'for(let t of/[0-9]+/g.exec(e)){}',
      'for ([x]of /regex/) break',
      'for ({x}of /regex/) break',
      'for ((x)of /regex/) break',
      'for (i  of /regex/) break',
      'for (i\tof /regex/) break',
      'for (i\nof /regex/) break',
    ];
    for (const source of sources) {
      parse(source);
    }
  });

  test(`Defer phase imports`, () => {
    const source = `
      import defer
        * as foo from 'specifier'
      
      import defer * as blah from './x.js' with { type: 'css' }

      import defer from 'x'

      import.defer('blah');
    
    `;
    try {
      const [impts] = parse(source);
      assert.strictEqual(impts.length, 4);

      assert.strictEqual(impts[0].t, 6);
      assert.strictEqual(source.slice(impts[0].ss, impts[0].se), source.slice(7, 53));
      assert.strictEqual(source.slice(impts[0].s, impts[0].e), 'specifier');
      assert.strictEqual(impts[0].d, -1);
      assert.strictEqual(impts[0].a, -1);
      assert.strictEqual(impts[0].at, null);

      assert.strictEqual(impts[1].t, 6);
      assert.strictEqual(source.slice(impts[1].ss, impts[1].se), `import defer * as blah from './x.js' with { type: 'css' }`);
      assert.strictEqual(source.slice(impts[1].s, impts[1].e), './x.js');
      assert.strictEqual(impts[1].d, -1);
      assert.strictEqual(source.slice(impts[1].a, impts[1].se), `{ type: 'css' }`);
      if (!min) assert.deepStrictEqual(impts[1].at, [['type', 'css']]);

      assert.strictEqual(impts[2].t, 1);
      assert.strictEqual(source.slice(impts[2].ss, impts[2].se), `import defer from 'x'`);
      assert.strictEqual(source.slice(impts[2].s, impts[2].e), "x");

      assert.strictEqual(impts[3].t, 7);
      assert.strictEqual(source.slice(impts[3].ss, impts[3].se), `import.defer('blah')`);
      assert.strictEqual(source.slice(impts[3].s, impts[3].e), "'blah'");
      assert.strictEqual(source.slice(impts[3].d, impts[3].se), `('blah')`);
      assert.strictEqual(impts[3].a, -1);
    }
    catch (e) {
      throw e;
    }
  });
 
  test(`Import attributes parsing`, () => {
    if (min) return; // minimal build drops these fields
    const source = `
      import foo from 'module' with { type: "json" }
      import bar from 'module2' with { type: 'css', integrity: "sha384-abc" }
      import { baz } from 'module3' with { "custom-key": "value" }
      import * as ns from 'module4' with { type: "json" }
      import 'module5' with { type: "json" }
      import noAttrs from 'module6'
    `;
    const [impts] = parse(source);
    assert.strictEqual(impts.length, 6);

    // Single attribute
    assert.deepStrictEqual(impts[0].at, [['type', 'json']]);
    assert.strictEqual(source.slice(impts[0].s, impts[0].e), 'module');

    // Multiple attributes
    assert.deepStrictEqual(impts[1].at, [['type', 'css'], ['integrity', 'sha384-abc']]);
    assert.strictEqual(source.slice(impts[1].s, impts[1].e), 'module2');

    // Quoted key
    assert.deepStrictEqual(impts[2].at, [['custom-key', 'value']]);
    assert.strictEqual(source.slice(impts[2].s, impts[2].e), 'module3');

    // Namespace import with attribute
    assert.deepStrictEqual(impts[3].at, [['type', 'json']]);
    assert.strictEqual(source.slice(impts[3].s, impts[3].e), 'module4');

    // Bare import with attribute
    assert.deepStrictEqual(impts[4].at, [['type', 'json']]);
    assert.strictEqual(source.slice(impts[4].s, impts[4].e), 'module5');

    // No attributes
    assert.strictEqual(impts[5].at, null);
    assert.strictEqual(source.slice(impts[5].s, impts[5].e), 'module6');
  });

  test(`Import attributes with quoted keys and escape sequences`, () => {
    if (min) return; // minimal build drops these fields
    const source = `
      import a from 'a' with { "quoted-key": "value" }
      import b from 'b' with { 'single-quoted': "value" }
      import c from 'c' with { "key-with-\\"quote\\"": "value-with-\\"quote\\"" }
      import d from 'd' with { "key\\nwith\\nnewlines": "value\\twith\\ttabs" }
      import e from 'e' with { "unicode\\u0041": "test\\u0042" }
      import f from 'f' with { type: "val\\\\backslash" }
    `;
    const [impts] = parse(source);
    assert.strictEqual(impts.length, 6);

    // Double-quoted key
    assert.deepStrictEqual(impts[0].at, [['quoted-key', 'value']]);

    // Single-quoted key
    assert.deepStrictEqual(impts[1].at, [['single-quoted', 'value']]);

    // Escaped quotes in both key and value
    assert.deepStrictEqual(impts[2].at, [['key-with-"quote"', 'value-with-"quote"']]);

    // Escaped newlines and tabs
    assert.deepStrictEqual(impts[3].at, [['key\nwith\nnewlines', 'value\twith\ttabs']]);

    // Unicode escapes
    assert.deepStrictEqual(impts[4].at, [['unicodeA', 'testB']]);

    // Backslash escape
    assert.deepStrictEqual(impts[5].at, [['type', 'val\\backslash']]);
  });

  test('keyword case again', () => {
    parse('if (of / 2) {}');
  });

  test(`Regex case`, () => {
    const source = `for(let t of/[0-9]+/g.exec(e)){}`
    parse(source);
  });

  test('keyword case', () => {
    parse('const of=1;console.log(1+of/1)');
  });

  test('import types', () => {
    const input = `
      // dynamic
      const { a } = await import('a');
      const { b } = await import.source('b');
      // static
      import b from 'b';
      import { c } from 'c';
      import source z from 'z';
      // meta
      import.meta.url
    `;

    const [imports] = parse(input);
    assert.strictEqual(imports[0].t, 2);
    assert.strictEqual(imports[1].t, 5);
    assert.strictEqual(imports[2].t, 1);
    assert.strictEqual(imports[3].t, 1);
    assert.strictEqual(imports[4].t, 4);
    assert.strictEqual(imports[5].t, 3);
  });

  test(`Source phase imports`, () => {
    const source = `
      import source
        source from 'specifier'
      
      import source blah from './x.js' with { type: 'css' }

      import source from 'x'

      import.source('blah');
    
    `;
    try {
      const [impts] = parse(source);
      assert.strictEqual(impts.length, 4);

      assert.strictEqual(impts[0].t, 4);
      assert.strictEqual(source.slice(impts[0].ss, impts[0].se), source.slice(7, 52));
      assert.strictEqual(source.slice(impts[0].s, impts[0].e), 'specifier');
      assert.strictEqual(impts[0].d, -1);
      assert.strictEqual(impts[0].a, -1);

      assert.strictEqual(impts[1].t, 4);
      assert.strictEqual(source.slice(impts[1].ss, impts[1].se), `import source blah from './x.js' with { type: 'css' }`);
      assert.strictEqual(source.slice(impts[1].s, impts[1].e), './x.js');
      assert.strictEqual(impts[1].d, -1);
      assert.strictEqual(source.slice(impts[1].a, impts[1].se), `{ type: 'css' }`);

      assert.strictEqual(impts[2].t, 1);
      assert.strictEqual(source.slice(impts[2].ss, impts[2].se), `import source from 'x'`);
      assert.strictEqual(source.slice(impts[2].s, impts[2].e), "x");

      assert.strictEqual(impts[3].t, 5);
      assert.strictEqual(source.slice(impts[3].ss, impts[3].se), `import.source('blah')`);
      assert.strictEqual(source.slice(impts[3].s, impts[3].e), "'blah'");
      assert.strictEqual(source.slice(impts[3].d, impts[3].se), `('blah')`);
      assert.strictEqual(impts[3].a, -1);
    }
    catch (e) {
      throw e;
    }
  });

  test(`Dynamic import expression range`, () => {
    const source = `import(("asdf"))  aaaa`;
    const [[impt]] = parse(source);
    assert.strictEqual(source.slice(impt.ss, impt.se), 'import(("asdf"))');
    assert.strictEqual(source.slice(impt.s, impt.e), '("asdf")');
  });

  test(`Dynamic import expression range 2`, () => {
    const source = 'import(/* comment */ `asdf` /* comment */)';
    const [[impt]] = parse(source);
    assert.strictEqual(source.slice(impt.ss, impt.se), 'import(/* comment */ `asdf` /* comment */)');
    assert.strictEqual(source.slice(impt.s, impt.e), '`asdf`');
  });

  test(`Dynamic import expression range 3`, () => {
    const source = 'import(`asdf` // comment\n)';
    const [[impt]] = parse(source);
    assert.strictEqual(source.slice(impt.ss, impt.se), 'import(`asdf` // comment\n)');
    assert.strictEqual(source.slice(impt.s, impt.e), '`asdf`');
  });

  test(`Dynamic import expression range 4`, () => {
    const source = 'import("foo" + /* comment */ "bar")';
    const [[impt]] = parse(source);
    assert.strictEqual(source.slice(impt.ss, impt.se), 'import("foo" + /* comment */ "bar")');
    assert.strictEqual(source.slice(impt.s, impt.e), '"foo" + /* comment */ "bar"');
  });

  test(`Dynamic import expression range 5`, () => {
    const source = 'import((() => { return "foo" })() /* comment */)';
    const [[impt]] = parse(source);
    assert.strictEqual(source.slice(impt.ss, impt.se), 'import((() => { return "foo" })() /* comment */)');
    assert.strictEqual(source.slice(impt.s, impt.e), '(() => { return "foo" })()');
  });

  test(`Dynamic import expression range 6`, () => {
    const source = 'import(/* comment */ `asdf` /* comment */ /* comment 2 */)';
    const [[impt]] = parse(source);
    assert.strictEqual(source.slice(impt.ss, impt.se), 'import(/* comment */ `asdf` /* comment */ /* comment 2 */)');
    assert.strictEqual(source.slice(impt.s, impt.e), '`asdf`');
  });

  test(`Dynamic import expression range 7`, () => {
    const source = 'import((() => { return "foo" })(x, y), attributes)';
    const [[impt]] = parse(source);
    assert.strictEqual(source.slice(impt.ss, impt.se), 'import((() => { return "foo" })(x, y), attributes)');
    assert.strictEqual(source.slice(impt.s, impt.e), '(() => { return "foo" })(x, y)');
    assert.strictEqual(source.slice(impt.a, impt.se), 'attributes)');
  });

  test(`Dynamic import expression range 8`, () => {
    const source = 'import({ x, y }, attributes)';
    const [[impt]] = parse(source);
    assert.strictEqual(source.slice(impt.ss, impt.se), 'import({ x, y }, attributes)');
    assert.strictEqual(source.slice(impt.s, impt.e), '{ x, y }');
    assert.strictEqual(source.slice(impt.a, impt.se), 'attributes)');
  });

  test(`Dynamic import expression range 9`, () => {
    const source = 'import([ x, y ], attributes)';
    const [[impt]] = parse(source);
    assert.strictEqual(source.slice(impt.ss, impt.se), 'import([ x, y ], attributes)');
    assert.strictEqual(source.slice(impt.s, impt.e), '[ x, y ]');
    assert.strictEqual(source.slice(impt.a, impt.se), 'attributes)');
  });

  test(`Dynamic import expression range 10`, () => {
    const source = `import(foo, { type: 'json' })`;
    const [[impt]] = parse(source);
    assert.strictEqual(source.slice(impt.ss, impt.se), `import(foo, { type: 'json' })`);
    assert.strictEqual(source.slice(impt.s, impt.e), 'foo');
    assert.strictEqual(source.slice(impt.a, impt.se), `{ type: 'json' })`);
  });

  test(`Dynamic import expression range 11`, () => {
    const source = `import(foo, /*c*/ { type: 'json' })`;
    const [[impt]] = parse(source);
    assert.strictEqual(source.slice(impt.ss, impt.se), `import(foo, /*c*/ { type: 'json' })`);
    assert.strictEqual(source.slice(impt.s, impt.e), 'foo');
    assert.strictEqual(source.slice(impt.a, impt.se), `{ type: 'json' })`);
  });

  test(`Dynamic import expression range 12`, () => {
    const source = 'import(foo, [1, 2])';
    const [[impt]] = parse(source);
    assert.strictEqual(source.slice(impt.ss, impt.se), 'import(foo, [1, 2])');
    assert.strictEqual(source.slice(impt.s, impt.e), 'foo');
    assert.strictEqual(source.slice(impt.a, impt.se), '[1, 2])');
  });

  test(`Dynamic import expression range 13`, () => {
    const source = 'import(x, "y")';
    const [[impt]] = parse(source);
    assert.strictEqual(source.slice(impt.ss, impt.se), 'import(x, "y")');
    assert.strictEqual(source.slice(impt.s, impt.e), 'x');
    assert.strictEqual(source.slice(impt.a, impt.se), '"y")');
  });

  test(`Dynamic import expression range 14`, () => {
    const source = 'import(x, (y))';
    const [[impt]] = parse(source);
    assert.strictEqual(source.slice(impt.ss, impt.se), 'import(x, (y))');
    assert.strictEqual(source.slice(impt.s, impt.e), 'x');
    assert.strictEqual(source.slice(impt.a, impt.se), '(y))');
  });

  test(`Dynamic import expression range 15`, () => {
    const source = 'import(x, `tmpl`)';
    const [[impt]] = parse(source);
    assert.strictEqual(source.slice(impt.ss, impt.se), 'import(x, `tmpl`)');
    assert.strictEqual(source.slice(impt.s, impt.e), 'x');
    assert.strictEqual(source.slice(impt.a, impt.se), '`tmpl`)');
  });

  test(`Dynamic import expression range 16`, () => {
    const source = 'import((a, b))';
    const [[impt]] = parse(source);
    assert.strictEqual(source.slice(impt.ss, impt.se), 'import((a, b))');
    assert.strictEqual(source.slice(impt.s, impt.e), '(a, b)');
    assert.strictEqual(impt.a, -1);
  });

  test(`Dynamic import expression range 17`, () => {
    const source = 'import((a, b), attrs)';
    const [[impt]] = parse(source);
    assert.strictEqual(source.slice(impt.ss, impt.se), 'import((a, b), attrs)');
    assert.strictEqual(source.slice(impt.s, impt.e), '(a, b)');
    assert.strictEqual(source.slice(impt.a, impt.se), 'attrs)');
  });

  test(`Dynamic import no-substitution template specifier`, () => {
    // A no-substitution template literal is a constant string, so n is set the
    // same as for the quoted forms; an interpolated template has no constant
    // value, so n stays undefined.
    assert.strictEqual(parse('import("./x.js")')[0][0].n, './x.js');
    assert.strictEqual(parse("import('./x.js')")[0][0].n, './x.js');
    assert.strictEqual(parse('import(`./x.js`)')[0][0].n, './x.js');
    assert.strictEqual(parse('import(`./a${x}.js`)')[0][0].n, undefined);
  });

  test(`Dynamic import template specifier with escapes and attributes`, () => {
    // \\${ is an escaped dollar, not a substitution, so the literal is constant.
    assert.strictEqual(parse('import(`./a\\${x}.js`)')[0][0].n, './a${x}.js');
    // Quotes inside the template are ordinary characters.
    assert.strictEqual(parse("import(`./'q\".js`)")[0][0].n, `./'q".js`);
    // A constant template specifier is still detected when an import attribute
    // argument follows it.
    const [[impt]] = parse("import(`./x.js`, { with: { type: 'json' } })");
    assert.strictEqual(impt.n, './x.js');
    assert.notStrictEqual(impt.a, -1);
  });

  test(`Dynamic import multi-line no-substitution template specifier`, () => {
    // Template literals permit raw line breaks; the constant value keeps them.
    assert.strictEqual(parse('import(`./a\nb.js`)')[0][0].n, './a\nb.js');
  });

  test(`Method named import is not a dynamic import`, () => {
    // A class/object method or shorthand named `import` with 2+ params was
    // misreported as a dynamic import: the `)`-then-`{` guard used the wrong
    // offset once a comma moved the recorded end.
    const methodSources = [
      'class C { import(a, b) {} }',
      'class C { async import(keys, values) {} }',
      'class C { static import(a, b) {} }',
      'class C { import(a, b, c) {} }',
      'class C { *import(a, b) {} }',
      'class C { async *import(a, b) {} }',
      'const o = { import(a, b) {} };',
      'const o = { async import(a, b) {} };',
      // shapes that already lexed correctly and must stay non-imports
      'class C { import(a) {} }',
      'class C { import() {} }',
      'class C { get import() {} }',
      'class C { set import(v) {} }',
    ];
    for (const source of methodSources) {
      const [imports] = parse(source);
      assert.strictEqual(imports.length, 0, `expected no imports for: ${source}`);
    }
  });

  test(`Real dynamic import with options still detected`, () => {
    // Regression guard for the method-name fix: genuine dynamic imports,
    // including the two-argument import(specifier, options) form, must remain.
    const dynamicSources = [
      "import('x')",
      'import(x)',
      "import(x, { with: { type: 'json' } })",
      "import('x', { with: { type: 'json' } })",
      `import(foo, { type: 'json' })`,
    ];
    for (const source of dynamicSources) {
      const [imports] = parse(source);
      assert.strictEqual(imports.length, 1, `expected one import for: ${source}`);
      assert.ok(imports[0].d >= 0, `expected dynamic import for: ${source}`);
    }
  });

  test(`Simple export destructuring`, () => {
    const source = `
      export const{URI,Utils,...Another}=LIB
      export var p, { z } = {};

      export var { aa, qq: { z } } = { qq: {} }, pp = {};
    `;
    const [, exports] = parse(source);
    // Every bound name is reported: the rest element (Another), nested
    // destructured names (both z's) and trailing declarators (pp). qq is a
    // property key, not a binding, so it is not an export.
    assert.deepStrictEqual(exports.map(e => e.n), ['URI', 'Utils', 'Another', 'p', 'z', 'aa', 'z', 'pp']);
  });

  test(`Export declaration multiple declarators`, () => {
    const source = `
      export var a = 'asdf', q = z;
      export const obj = { x: 1, y: 2 }, arr = [1, 2], call = fn(a, b);
      export let str = "a,b", re = /,/g, tpl = \`a\${x},\${y}\`, last = 1;
    `;
    const [, exports] = parse(source);
    assert.deepStrictEqual(exports.map(e => e.n),
      ['a', 'q', 'obj', 'arr', 'call', 'str', 're', 'tpl', 'last']);
  });

  test(`Export destructuring aliases, defaults, nesting and rest`, () => {
    const source = `
      export const { a: x, b = 1, c: { d }, ...rest } = obj;
      export const [ e, , f, [ g ], ...tail ] = arr;
      export const { ['computed']: h, "str": i } = o, j = 1;
    `;
    const [, exports] = parse(source);
    assert.deepStrictEqual(exports.map(e => e.n),
      ['x', 'b', 'd', 'rest', 'e', 'f', 'g', 'tail', 'h', 'i', 'j']);
  });

  test(`Export declaration stops at ASI without reading next statement`, () => {
    const source = `
      export const k = 1
      foo, bar;
      export const m = 2
      const n = 3, o = 4
    `;
    const [, exports] = parse(source);
    assert.deepStrictEqual(exports.map(e => e.n), ['k', 'm']);
  });

  test(`Export initializer disambiguates regex, division and comments`, () => {
    const source = `
      export const re = () => /x/g, a = 1;
      export const div = (b) / c, d = 2;
      export const nw = new Foo(x, y), e = 3;
      export const cm = /* , */ 4 /* , */, f = 5;
    `;
    const [, exports] = parse(source);
    // '/' after '=>' opens a regex; '/' after ')' is division; commas inside
    // block comments never split the declarator list.
    assert.deepStrictEqual(exports.map(e => e.n), ['re', 'a', 'div', 'd', 'nw', 'e', 'cm', 'f']);
  });

  test(`Export initializer treats non-ASCII identifiers as values`, () => {
    const source = `
      export const a = π / 2, b = 3;
      export const café = x / 2, d = 4;
    `;
    const [, exports] = parse(source);
    // A '/' after a Unicode identifier is division, not a regex, so the comma
    // and the trailing declarator are still seen.
    assert.deepStrictEqual(exports.map(e => e.n), ['a', 'b', 'café', 'd']);
  });

  test(`Export initializer skips nested templates and arrow bodies`, () => {
    const source = `
      export const t = \`a\${ \`b\${ c }d\` }e\`, u = 1;
      export const o = \`\${ { a: 1, b: 2 } }\`, v = 2;
      export const fn = (a) => a, w = 3;
      export const opt = a?.b?.c, x = 4;
    `;
    const [, exports] = parse(source);
    assert.deepStrictEqual(exports.map(e => e.n), ['t', 'u', 'o', 'v', 'fn', 'w', 'opt', 'x']);
  });

  test(`Export destructuring computed keys, holes and nested rest`, () => {
    const source = `
      export const { [a[0]]: y, [\`k\`]: z } = o, p = 1;
      export const [ , q, , , r ] = arr;
      export const [ ...[ s, t ] ] = arr2;
      export const { u: [ v, { w } ] } = obj;
    `;
    const [, exports] = parse(source);
    assert.deepStrictEqual(exports.map(e => e.n), ['y', 'z', 'p', 'q', 'r', 's', 't', 'v', 'w']);
  });

  test(`Export declaration does not read past a truncated binding list`, () => {
    // Regression: a binding list reaching EOF must stop at the source
    // terminator instead of scanning into the analysis heap and reporting a
    // phantom export.
    assert.deepStrictEqual(parse(`export const`)[1].map(e => e.n), []);
    assert.deepStrictEqual(parse(`export let a,`)[1].map(e => e.n), ['a']);
    assert.deepStrictEqual(parse(`export const = 1`)[1].map(e => e.n), []);
  });

  test(`Export initializer: '/' after a value keyword is a regex`, () => {
    // Regression: skipExpression shares the main tokenizer, so a value keyword
    // (return/typeof/yield/void) before '/' opens a regex - the comma inside it
    // must not split the declarator list.
    const source = `
      export const f = () => { return /,/g }, b = 2;
      export const h = typeof /,/g, c = 3;
      export const g = function*(){ yield /,/g }, d = 4;
      export const v = void /,/g, e = 5;
    `;
    const [, exports] = parse(source);
    assert.deepStrictEqual(exports.map(e => e.n), ['f', 'b', 'h', 'c', 'g', 'd', 'v', 'e']);
  });

  test(`Export initializer: regex in statement position inside a nested body`, () => {
    // A '}' that closes a block (not an object) leaves the next '/' in statement
    // position, so it is a regex; the shared tokenizer tracks the brace kinds.
    const source = `
      export const fn = () => { if (x) {} /,/.test(y); return 1 }, a = 2;
      export const cl = class { m() { switch (x) {} /,/.exec(y) } }, b = 3;
    `;
    const [, exports] = parse(source);
    assert.deepStrictEqual(exports.map(e => e.n), ['fn', 'a', 'cl', 'b']);
  });

  test(`Export initializer: dynamic import is detected`, () => {
    // Regression: skipExpression must still surface import() found inside an
    // initializer or a destructuring default.
    const source = `
      export const x = import("a"), y = 2;
      export const z = (async () => await import("b"))(), w = 3;
      export const { p = import("c") } = o;
    `;
    const [imports, exports] = parse(source);
    assert.deepStrictEqual(exports.map(e => e.n), ['x', 'y', 'z', 'w', 'p']);
    assert.deepStrictEqual(imports.map(i => i.n).filter(Boolean), ['a', 'b', 'c']);
  });

  test(`Export destructuring numeric and BigInt property keys`, () => {
    // Regression: a numeric/BigInt key must be consumed whole; a partial read
    // stopped at the '.' of 0.5 and mis-parsed the rest of the pattern.
    const source = `
      export const { 0: a, 0.5: b, 1e3: c, 1n: d, 0xff: e } = o, f = 1;
    `;
    const [, exports] = parse(source);
    assert.deepStrictEqual(exports.map(e => e.n), ['a', 'b', 'c', 'd', 'e', 'f']);
  });

  test(`Export default cases`, () => {
    const source = `
      export default "export default a"
      export default "export default 'a'"
      export default "export function foo() {}"
      export default "export function foo() {return bar}"
    `;
    const [, exports] = parse(source);
    assert.deepStrictEqual(exports.map(expt => expt.n), ['default', 'default', 'default', 'default']);
  });

  test(`import.meta spread`, () => {
    const source = `console.log(...import.meta.obj);`;
    const [impts] = parse(source);
    assert.strictEqual(impts.length, 1);
    assert.strictEqual(source.substring(impts[0].s, impts[0].e), 'import.meta');
  });

  test(`Template string default bracket`, () => {
    const source = `export default{};`;
    const [, [expt]] = parse(source);
    assert.strictEqual(source.slice(expt.s, expt.e), 'default');
    assert.strictEqual(source.slice(expt.ls, expt.le), '');
    assert.strictEqual(expt.n, 'default');
    assert.strictEqual(expt.ln, undefined);
  });

  test(`Template string default`, () => {
    const source = `const css = String.raw;
        export default css\`:host { solid 1px black }\`;`;
    const [, [expt]] = parse(source);
    assert.strictEqual(source.slice(expt.s, expt.e), 'default');
    assert.strictEqual(source.slice(expt.ls, expt.le), '');
    assert.strictEqual(expt.n, 'default');
    assert.strictEqual(expt.ln, undefined);
  });

  test('Class fn ASI', () => {
    parse(`class a{friendlyName;import}n();`);
  });

  test('Division const after class parse case', () => {
    const source = `class a{}const Ti=a/yi;`;
    parse(source);
  });

  if (!js)
  test('Multiline dynamic import on windows', () => {
    const source = `import(\n"./statehash\\u1011.js"\r)`;
    const [imports] = parse(source);
    assert.strictEqual(imports.length, 1);
    assert.strictEqual(imports[0].n, './statehashထ.js');
    assert.strictEqual(source.slice(imports[0].s, imports[0].e), '"./statehash\\u1011.js"');
  });

  if (!js)
  test('Basic nested dynamic import support', () => {
    const source = `await import (await import  ('foo'))`;
    const [imports] = parse(source);
    assert.strictEqual(imports.length, 2);
    assert.strictEqual(source.slice(imports[0].ss, imports[0].d), 'import ');
    assert.strictEqual(source.slice(imports[0].ss, imports[0].se), 'import (await import  (\'foo\'))');
    assert.strictEqual(source.slice(imports[0].s, imports[0].e), 'await import  (\'foo\')');
    assert.strictEqual(source.slice(imports[1].ss, imports[1].d), 'import  ');
    assert.strictEqual(source.slice(imports[1].ss, imports[1].se), 'import  (\'foo\')');
    assert.strictEqual(source.slice(imports[1].s, imports[1].e), '\'foo\'');
  });

  if (!js)
  test('Import attributes', () => {
    const source = `
      import json from "./foo.json" with { type: "json" };
      import("foo.json" , { with: { type: "json" } });

      import test from './asdf'
      with { not: 'an assertion!' }
      export var p = 5;
    `
    const [imports, exports] = parse(source);
    assert.strictEqual(imports.length, 3);
    assert.strictEqual(imports[0].n, './foo.json');
    assert.strictEqual(source.substring(imports[0].s, imports[0].e), './foo.json');
    assert.strictEqual(source.substring(imports[0].a, imports[0].se), '{ type: "json" }');
    assert.strictEqual(source.substring(imports[1].a, imports[1].se), '{ with: { type: "json" } })');
    assert.strictEqual(source.substring(imports[1].s, imports[1].e), '"foo.json"');
    assert.strictEqual(imports[1].n, 'foo.json');
    assert.strictEqual(imports[2].n, './asdf');
    assert.strictEqual(imports[2].a, -1);
    assert.strictEqual(exports.length, 1);
    assertExportIs(source, exports[0], {n: 'p', ln: 'p', a: false});
  });

  if (!js)
  test('Import attributes', () => {
    const source = `
      import json from "./foo.json" with { type: "json" };
      import("foo.json" , { with: { type: "json" } });

      import test from './asdf'
      with { not: 'an assertion!' }
      export var p = 5;
    `
    const [imports, exports] = parse(source);
    assert.strictEqual(imports.length, 3);
    assert.strictEqual(imports[0].n, './foo.json');
    assert.strictEqual(source.substring(imports[0].s, imports[0].e), './foo.json');
    assert.strictEqual(source.substring(imports[0].a, imports[0].se), '{ type: "json" }');
    assert.strictEqual(source.substring(imports[1].a, imports[1].se), '{ with: { type: "json" } })');
    assert.strictEqual(source.substring(imports[1].s, imports[1].e), '"foo.json"');
    assert.strictEqual(imports[1].n, 'foo.json');
    assert.strictEqual(imports[2].n, './asdf');
    assert.strictEqual(imports[2].a, -1);
    assert.strictEqual(exports.length, 1);
    assertExportIs(source, exports[0], {n: 'p', ln: 'p', a: false});
  });

  test('Import meta inside dynamic import', () => {
    const source = `import(import.meta.url)`;
    const [imports] = parse(source);

    assert.strictEqual(imports.length, 2);
    assert.strictEqual(source.substring(imports[0].s, imports[0].e), 'import.meta.url');
  });

  test('Export', () => {
    const source = `export var p=5`;
    const [, exports] = parse(source);
    assertExportIs(source, exports[0], { n: 'p', ln: 'p' });
  });

  test('String encoding', () => {
    const [imports,] = parse(`
      import './\\x61\\x62\\x63.js';
      import './\\u{20204}.js';
      import('./\\u{20204}.js');
      import('./\\u{20204}.js' + dyn);
      import('./\\u{20204}.js' );
      import('./\\u{20204}.js' ());
    `);
    assert.strictEqual(imports.length, 6);
    assert.strictEqual(imports[0].n, './abc.js');
    assert.strictEqual(imports[1].n, './𠈄.js');
    assert.strictEqual(imports[2].n, './𠈄.js');
    assert.strictEqual(imports[3].n, undefined);
    assert.strictEqual(imports[4].n, './𠈄.js');
    assert.strictEqual(imports[5].n, undefined);
  })

  test('Regexp case', () => {
    parse(`
      class Number {

      }

      /("|')(?<value>(\\\\(\\1)|[^\\1])*)?(\\1)/.exec(\`'\\\\"\\\\'aa'\`);

      const x = \`"\${label.replace(/"/g, "\\\\\\"")}"\`
    `);
  });

  test('Regexp default export', () => {
    const source = `
      export default /[\`]/
      export default 1/2
      export default /* asdf */ 1/2
      export default /* asdf */ /regex/
      export default
      // line comment
      /regex/
      export default
      // line comment
      1 / 2
    `;
    const [, exports] = parse(source);
    assert.deepStrictEqual(exports.map(expt => expt.n), ['default', 'default', 'default', 'default', 'default', 'default']);
  });

  if (!js)
  test('Regexp keyword prefixes', () => {
    const [imports] = parse(`
      x: while (true) {
        if (foo) break
        /import("a")/.test(bar) || baz()
        if (foo) continue
        /import("b")/.test(bar) || baz()
        if (foo) break x
        /import("c")/.test(bar) || baz()
        if (foo) continue x
        /import("d")/.test(bar) || baz()
      }
    `);
    assert.strictEqual(imports.length, 0);
  });

  test('Regexp division', () => {
    parse(`\nconst x = num / /'/.exec(l)[0].slice(1, -1)//'"`);
  });

  test('Multiline string escapes', () => {
    parse("const str = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAB4AAAAeCAYAAAA7MK6iAAAABmJLR0QA/wAAAAAzJ3zzAAAGTElEQV\\\r\n\t\tRIx+VXe1BU1xn/zjn7ugvL4sIuQnll5U0ELAQxig7WiQYz6NRHa6O206qdSXXSxs60dTK200zNY9q0dcRpMs1jkrRNWmaijCVoaU';\r\n");
  });

  test('Dotted number', () => {
    parse(`
       const x = 5. / 10;
    `);
  });

  test('Division operator case', () => {
    parse(`
      function log(r){
        if(g>=0){u[g++]=m;g>=n.logSz&&(g=0)}else{u.push(m);u.length>=n.logSz&&(g=0)}/^(DBG|TICK): /.test(r)||t.Ticker.tick(454,o.slice(0,200));
      }

      (function(n){
      })();
    `);
  });

  test('Single parse cases', () => {
    parse(`export { x }`);
    parse(`'asdf'`);
    parse(`/asdf/`);
    parse(`\`asdf\``);
    parse(`/**/`);
    parse(`//`);
  });

  test('Simple export with unicode conversions', () => {
    const source = `export var p𓀀s,q`;
    const [imports, exports] = parse(source);
    assert.strictEqual(imports.length, 0);
    assert.strictEqual(exports.length, 2);
    assertExportIs(source, exports[0], {n: 'p𓀀s', ln: 'p𓀀s' });
    assertExportIs(source, exports[1], {n: 'q', ln: 'q' });
  });

  test('Simple import', () => {
    const source = `
      import test from "test";
      console.log(test);
    `;
    const [imports, exports] = parse(source);
    assert.strictEqual(imports.length, 1);
    const { s, e, ss, se, d, n } = imports[0];
    assert.strictEqual(d, -1);
    assert.strictEqual(n, 'test');
    assert.strictEqual(source.slice(ss, se), 'import test from "test"');
    assert.strictEqual(exports.length, 0);
  });

  test('Empty single quote string import', () => {
    const source = `import ''`;
    const [imports, exports] = parse(source);
    assert.strictEqual(imports.length, 1);
    const { s, e, ss, se, d } = imports[0];
    assert.strictEqual(d, -1);
    assert.strictEqual(source.slice(s, e), '');
    assert.strictEqual(source.slice(ss, se), `import ''`);
    assert.strictEqual(exports.length, 0);
  });

  test('Empty double quote string import', () => {
    const source = `import ""`;
    const [imports, exports] = parse(source);
    assert.strictEqual(imports.length, 1);
    const { s, e, ss, se, d } = imports[0];
    assert.strictEqual(d, -1);
    assert.strictEqual(source.slice(s, e), '');
    assert.strictEqual(source.slice(ss, se), 'import ""');
    assert.strictEqual(exports.length, 0);
  });

  test('Import/Export with comments', () => {
    const source = `

      import/* 'x' */ 'a';

      import /* 'x' */ 'b';

      export var z  /*  */
      export {
        a,
        // b,
        /* c */ d
      };
    `;
    const [imports, exports] = parse(source);
    assert.strictEqual(imports.length, 2);
    assert.strictEqual(source.slice(imports[0].s, imports[0].e), 'a');
    assert.strictEqual(source.slice(imports[0].ss, imports[0].se), `import/* 'x' */ 'a'`);
    assert.strictEqual(source.slice(imports[1].s, imports[1].e), 'b');
    assert.strictEqual(source.slice(imports[1].ss, imports[1].se), `import /* 'x' */ 'b'`);
    assert.strictEqual(exports.length, 3);
    assertExportIs(source, exports[0], { n: 'z', ln: 'z' });
    assertExportIs(source, exports[1], { n: 'a', ln: 'a' });
    assertExportIs(source, exports[2], { n: 'd', ln: 'd' });
  });

  test('Exported function and class', () => {
    const source = `
      export function a𓀀 () {

      }
      export class Q{

      }
    `;
    const [, exports] = parse(source);
    assert.strictEqual(exports.length, 2);
    assertExportIs(source, exports[0], {n: 'a𓀀', ln: 'a𓀀' });
    assertExportIs(source, exports[1], {n: 'Q', ln: 'Q' });
  });

  test('Export destructuring', () => {
    const source = `
      export const { a, b } = foo;

      export { ok };
    `;
    const [, exports] = parse(source);
    assert.strictEqual(exports.length, 3);
    assertExportIs(source, exports[0], { n: 'a', ln: 'a' });
  });

  test('Minified import syntax', () => {
    const source = `import{TemplateResult as t}from"lit-html";import{a as e}from"./chunk-4be41b30.js";export{j as SVGTemplateResult,i as TemplateResult,g as html,h as svg}from"./chunk-4be41b30.js";window.JSCompiler_renameProperty='asdf';`;
    const [imports, exports] = parse(source);
    assert.strictEqual(imports.length, 3);
    assert.strictEqual(imports[0].s, 32);
    assert.strictEqual(imports[0].e, 40);
    assert.strictEqual(imports[0].ss, 0);
    assert.strictEqual(imports[0].se, 41);
    assert.strictEqual(imports[1].s, 61);
    assert.strictEqual(imports[1].e, 80);
    assert.strictEqual(imports[1].ss, 42);
    assert.strictEqual(imports[1].se, 81);
    assert.strictEqual(imports[2].s, 156);
    assert.strictEqual(imports[2].e, 175);
    assert.strictEqual(imports[2].ss, 82);
    assert.strictEqual(imports[2].se, 176);
  });

  test('More minified imports', () => {
    const source = `import"some/import.js";`
    const [imports, exports] = parse(source);
    assert.strictEqual(imports.length, 1);
    assert.strictEqual(imports[0].s, 7);
    assert.strictEqual(imports[0].e, 21);
    assert.strictEqual(imports[0].ss, 0);
    assert.strictEqual(imports[0].se, 22);
  });

  test('plus plus division', () => {
    parse(`
      tick++/fetti;f=(1)+")";
    `);
  });

  test('return bracket division', () => {
    const source = `function variance(){return s/(a-1)}`;
    const [imports, exports] = parse(source);
  });

  test('Simple reexport', () => {
    const source = `
      export { hello as default } from "test-dep";
    `;
    const [imports, exports] = parse(source);
    assert.strictEqual(imports.length, 1);
    const { s, e, ss, se, d } = imports[0];
    assert.strictEqual(d, -1);
    assert.strictEqual(source.slice(s, e), 'test-dep');
    assert.strictEqual(source.slice(ss, se), 'export { hello as default } from "test-dep"');

    assert.strictEqual(exports.length, 1);
    assertExportIs(source, exports[0], { n: 'default', ln: undefined });
  });

  test('import.meta', () => {
    const source = `
      export var hello = 'world';
      console.log(import.meta.url);
    `;
    const [imports, exports] = parse(source);
    assert.strictEqual(imports.length, 1);
    const { s, e, ss, se, d } = imports[0];
    assert.strictEqual(d, -2);
    assert.strictEqual(ss, 53);
    assert.strictEqual(se, 64);
    assert.strictEqual(source.slice(s, e), 'import.meta');
  });

  test('import meta edge cases', () => {
    const source = `
      // Import meta
      import.
       meta
      // Not import meta
      a.
      import.
        meta
    `;
    const [imports, exports] = parse(source);
    assert.strictEqual(imports.length, 1);
    const { s, e, ss, se, d } = imports[0];
    assert.strictEqual(d, -2);
    assert.strictEqual(ss, 28);
    assert.strictEqual(se, 47);
    assert.strictEqual(source.slice(s, e), 'import.\n       meta');
  });

  test('dynamic import method', async () => {
    await init;
    const source = `
      class A {
        import() {
        }
      }
    `;
    const [imports] = parse(source);
    assert.strictEqual(imports.length, 0);
  });

  if (!js)
  test('dynamic import edge cases', () => {
    const source = `
      ({
        // not a dynamic import!
        import(not1) {}
      });
      {
        // is a dynamic import!
        import(is1);
      }
      a.
      // not a dynamic import!
      import(not2);
      a.
      b()
      // is a dynamic import!
      import(is2);

      const myObject = {
        import: ()=> import(some_url)
      }
    `;
    const [imports, exports] = parse(source);
    assert.strictEqual(imports.length, 3);
    var { s, e, ss, se, d } = imports[0];
    assert.strictEqual(ss + 6, d);
    assert.strictEqual(se, e + 1);
    assert.strictEqual(source.slice(d, se), '(is1)');
    assert.strictEqual(source.slice(s, e), 'is1');

    var { s, e, ss, se, d } = imports[1];
    assert.strictEqual(ss + 6, d);
    assert.strictEqual(se, e + 1);
    assert.strictEqual(source.slice(s, e), 'is2');

    var { s, e, ss, se, d } = imports[2];
    assert.strictEqual(ss + 6, d);
    assert.strictEqual(se, e + 1);
    assert.strictEqual(source.slice(s, e), 'some_url');
  });

  test('import after code', () => {
    const source = `
      export function f () {
        g();
      }

      import { g } from './test-circular2.js';
    `;
    const [imports, exports] = parse(source);
    assert.strictEqual(imports.length, 1);
    const { s, e, ss, se, d } = imports[0];
    assert.strictEqual(d, -1);
    assert.strictEqual(source.slice(s, e), './test-circular2.js');
    assert.strictEqual(source.slice(ss, se), `import { g } from './test-circular2.js'`);
    assert.strictEqual(exports.length, 1);
    assertExportIs(source, exports[0], { n: 'f', ln: 'f' });
  });

  test('Comments', () => {
    const source = `/*
    VERSION
  */import util from 'util';

//
function x() {
}

      /**/
      // '
      /* / */
      /*

         * export { b }
      \\*/export { a }

      function () {
        /***/
      }
    `
    const [imports, exports] = parse(source);
    assert.strictEqual(imports.length, 1);
    assert.strictEqual(source.slice(imports[0].s, imports[0].e), 'util');
    assert.strictEqual(source.slice(imports[0].ss, imports[0].se), `import util from 'util'`);
    assert.strictEqual(exports.length, 1);
    assertExportIs(source, exports[0], { n: 'a', ln: 'a' });
  });

  if (!js)
  test('Strings', () => {
    const source = `
      "";
      \`
        \${
          import(\`test/\${ import(b)}\`); /*
              \`  }
          */
        }
      \`
      export { a }
    `;
    const [imports, exports] = parse(source);
    assert.strictEqual(imports.length, 2);
    assert.notEqual(imports[0].d, -1);
    assert.strictEqual(imports[0].ss + 6, imports[0].d);
    assert.strictEqual(imports[0].se, imports[0].e + 1);
    assert.strictEqual(source.slice(imports[0].ss, imports[0].s), 'import(');
    assert.notEqual(imports[1].d, -1);
    assert.strictEqual(imports[1].ss + 6, imports[1].d);
    assert.strictEqual(imports[1].se, imports[1].e + 1);
    assert.strictEqual(source.slice(imports[1].ss, imports[1].d), 'import');
    assert.strictEqual(exports.length, 1);
    assertExportIs(source, exports[0], { n: 'a', ln: 'a' });
  });

  test('Bracket matching', () => {
    parse(`
      instance.extend('parseExprAtom', function (nextMethod) {
        return function () {
          function parseExprAtom(refDestructuringErrors) {
            if (this.type === tt._import) {
              return parseDynamicImport.call(this);
            }
            return c(refDestructuringErrors);
          }
        }();
      });
      export { a }
    `);
  });

  test('Division / Regex ambiguity', () => {
    const source = `
      /as)df/; x();
      a / 2; '  /  '
      while (true)
        /test'/
      x-/a'/g
      try {}
      finally{}/a'/g
      (x);{f()}/d'export { b }/g
      ;{}/e'/g;
      {}/f'/g
      a / 'b' / c;
      /a'/ - /b'/;
      +{} /g -'/g'
      ('a')/h -'/g'
      if //x
      ('a')/i'/g;
      /asdf/ / /as'df/; // '
      p = \`\${/test/ + 5}\`;
      /regex/ / x;
      function m() {
        return /*asdf8*// 5/;
      }
      export { a };
    `;
    const [imports, exports] = parse(source);
    assert.strictEqual(imports.length, 0);
    assert.strictEqual(exports.length, 1);
    assertExportIs(source, exports[0], { n: 'a', ln: 'a' });
  });

  test('Template string expression ambiguity', () => {
    const source = `
      \`$\`
      import 'a';
      \`\`
      export { b };
      \`a$b\`
      import(\`$\`);
      \`{$}\`
    `;
    const [imports, exports] = parse(source);
    assert.strictEqual(imports.length, 2);
    assert.strictEqual(exports.length, 1);
    assertExportIs(source, exports[0], { n: 'b', ln: 'b' });
  });

  test('many exports', () => {
    parse(`
      export { _iconsCache as fas, prefix, faAbacus, faAcorn, faAd, faAddressBook, faAddressCard, faAdjust, faAirFreshener, faAlarmClock, faAlarmExclamation, faAlarmPlus, faAlarmSnooze, faAlicorn, faAlignCenter, faAlignJustify, faAlignLeft, faAlignRight, faAlignSlash, faAllergies, faAmbulance, faAmericanSignLanguageInterpreting, faAnalytics, faAnchor, faAngel, faAngleDoubleDown, faAngleDoubleLeft, faAngleDoubleRight, faAngleDoubleUp, faAngleDown, faAngleLeft, faAngleRight, faAngleUp, faAngry, faAnkh, faAppleAlt, faAppleCrate, faArchive, faArchway, faArrowAltCircleDown, faArrowAltCircleLeft, faArrowAltCircleRight, faArrowAltCircleUp, faArrowAltDown, faArrowAltFromBottom, faArrowAltFromLeft, faArrowAltFromRight, faArrowAltFromTop, faArrowAltLeft, faArrowAltRight, faArrowAltSquareDown, faArrowAltSquareLeft, faArrowAltSquareRight, faArrowAltSquareUp, faArrowAltToBottom, faArrowAltToLeft, faArrowAltToRight, faArrowAltToTop, faArrowAltUp, faArrowCircleDown, faArrowCircleLeft, faArrowCircleRight, faArrowCircleUp, faArrowDown, faArrowFromBottom, faArrowFromLeft, faArrowFromRight, faArrowFromTop, faArrowLeft, faArrowRight, faArrowSquareDown, faArrowSquareLeft, faArrowSquareRight, faArrowSquareUp, faArrowToBottom, faArrowToLeft, faArrowToRight, faArrowToTop, faArrowUp, faArrows, faArrowsAlt, faArrowsAltH, faArrowsAltV, faArrowsH, faArrowsV, faAssistiveListeningSystems, faAsterisk, faAt, faAtlas, faAtom, faAtomAlt, faAudioDescription, faAward, faAxe, faAxeBattle, faBaby, faBabyCarriage, faBackpack, faBackspace, faBackward, faBacon, faBadge, faBadgeCheck, faBadgeDollar, faBadgePercent, faBadgerHoney, faBagsShopping, faBalanceScale, faBalanceScaleLeft, faBalanceScaleRight, faBallPile, faBallot, faBallotCheck, faBan, faBandAid, faBarcode, faBarcodeAlt, faBarcodeRead, faBarcodeScan, faBars, faBaseball, faBaseballBall, faBasketballBall, faBasketballHoop, faBat, faBath, faBatteryBolt, faBatteryEmpty, faBatteryFull, faBatteryHalf, faBatteryQuarter, faBatterySlash, faBatteryThreeQuarters, faBed, faBeer, faBell, faBellExclamation, faBellPlus, faBellSchool, faBellSchoolSlash, faBellSlash, faBells, faBezierCurve, faBible, faBicycle, faBiking, faBikingMountain, faBinoculars, faBiohazard, faBirthdayCake, faBlanket, faBlender, faBlenderPhone, faBlind, faBlog, faBold, faBolt, faBomb, faBone, faBoneBreak, faBong, faBook, faBookAlt, faBookDead, faBookHeart, faBookMedical, faBookOpen, faBookReader, faBookSpells, faBookUser, faBookmark, faBooks, faBooksMedical, faBoot, faBoothCurtain, faBorderAll, faBorderBottom, faBorderCenterH, faBorderCenterV, faBorderInner, faBorderLeft, faBorderNone, faBorderOuter, faBorderRight, faBorderStyle, faBorderStyleAlt, faBorderTop, faBowArrow, faBowlingBall, faBowlingPins, faBox, faBoxAlt, faBoxBallot, faBoxCheck, faBoxFragile, faBoxFull, faBoxHeart, faBoxOpen, faBoxUp, faBoxUsd, faBoxes, faBoxesAlt, faBoxingGlove, faBrackets, faBracketsCurly, faBraille, faBrain, faBreadLoaf, faBreadSlice, faBriefcase, faBriefcaseMedical, faBringForward, faBringFront, faBroadcastTower, faBroom, faBrowser, faBrush, faBug, faBuilding, faBullhorn, faBullseye, faBullseyeArrow, faBullseyePointer, faBurgerSoda, faBurn, faBurrito, faBus, faBusAlt, faBusSchool, faBusinessTime, faCabinetFiling, faCalculator, faCalculatorAlt, faCalendar, faCalendarAlt, faCalendarCheck, faCalendarDay, faCalendarEdit, faCalendarExclamation, faCalendarMinus, faCalendarPlus, faCalendarStar, faCalendarTimes, faCalendarWeek, faCamera, faCameraAlt, faCameraRetro, faCampfire, faCampground, faCandleHolder, faCandyCane, faCandyCorn, faCannabis, faCapsules, faCar, faCarAlt, faCarBattery, faCarBuilding, faCarBump, faCarBus, faCarCrash, faCarGarage, faCarMechanic, faCarSide, faCarTilt, faCarWash, faCaretCircleDown, faCaretCircleLeft, faCaretCircleRight, faCaretCircleUp, faCaretDown, faCaretLeft, faCaretRight, faCaretSquareDown, faCaretSquareLeft, faCaretSquareRight, faCaretSquareUp, faCaretUp, faCarrot, faCars, faCartArrowDown, faCartPlus, faCashRegister, faCat, faCauldron, faCertificate, faChair, faChairOffice, faChalkboard, faChalkboardTeacher, faChargingStation, faChartArea, faChartBar, faChartLine, faChartLineDown, faChartNetwork, faChartPie, faChartPieAlt, faChartScatter, faCheck, faCheckCircle, faCheckDouble, faCheckSquare, faCheese, faCheeseSwiss, faCheeseburger, faChess, faChessBishop, faChessBishopAlt, faChessBoard, faChessClock, faChessClockAlt, faChessKing, faChessKingAlt, faChessKnight, faChessKnightAlt, faChessPawn, faChessPawnAlt, faChessQueen, faChessQueenAlt, faChessRook, faChessRookAlt, faChevronCircleDown, faChevronCircleLeft, faChevronCircleRight, faChevronCircleUp, faChevronDoubleDown, faChevronDoubleLeft, faChevronDoubleRight, faChevronDoubleUp, faChevronDown, faChevronLeft, faChevronRight, faChevronSquareDown, faChevronSquareLeft, faChevronSquareRight, faChevronSquareUp, faChevronUp, faChild, faChimney, faChurch, faCircle, faCircleNotch, faCity, faClawMarks, faClinicMedical, faClipboard, faClipboardCheck, faClipboardList, faClipboardListCheck, faClipboardPrescription, faClipboardUser, faClock, faClone, faClosedCaptioning, faCloud, faCloudDownload, faCloudDownloadAlt, faCloudDrizzle, faCloudHail, faCloudHailMixed, faCloudMeatball, faCloudMoon, faCloudMoonRain, faCloudRain, faCloudRainbow, faCloudShowers, faCloudShowersHeavy, faCloudSleet, faCloudSnow, faCloudSun, faCloudSunRain, faCloudUpload, faCloudUploadAlt, faClouds, faCloudsMoon, faCloudsSun, faClub, faCocktail, faCode, faCodeBranch, faCodeCommit, faCodeMerge, faCoffee, faCoffeeTogo, faCoffin, faCog, faCogs, faCoin, faCoins, faColumns, faComment, faCommentAlt, faCommentAltCheck, faCommentAltDollar, faCommentAltDots, faCommentAltEdit, faCommentAltExclamation, faCommentAltLines, faCommentAltMedical, faCommentAltMinus, faCommentAltPlus, faCommentAltSlash, faCommentAltSmile, faCommentAltTimes, faCommentCheck, faCommentDollar, faCommentDots, faCommentEdit, faCommentExclamation, faCommentLines, faCommentMedical, faCommentMinus, faCommentPlus, faCommentSlash, faCommentSmile, faCommentTimes, faComments, faCommentsAlt, faCommentsAltDollar, faCommentsDollar, faCompactDisc, faCompass, faCompassSlash, faCompress, faCompressAlt, faCompressArrowsAlt, faCompressWide, faConciergeBell, faConstruction, faContainerStorage, faConveyorBelt, faConveyorBeltAlt, faCookie, faCookieBite, faCopy, faCopyright, faCorn, faCouch, faCow, faCreditCard, faCreditCardBlank, faCreditCardFront, faCricket, faCroissant, faCrop, faCropAlt, faCross, faCrosshairs, faCrow, faCrown, faCrutch, faCrutches, faCube, faCubes, faCurling, faCut, faDagger, faDatabase, faDeaf, faDebug, faDeer, faDeerRudolph, faDemocrat, faDesktop, faDesktopAlt, faDewpoint, faDharmachakra, faDiagnoses, faDiamond, faDice, faDiceD10, faDiceD12, faDiceD20, faDiceD4, faDiceD6, faDiceD8, faDiceFive, faDiceFour, faDiceOne, faDiceSix, faDiceThree, faDiceTwo, faDigging, faDigitalTachograph, faDiploma, faDirections, faDisease, faDivide, faDizzy, faDna, faDoNotEnter, faDog, faDogLeashed, faDollarSign, faDolly, faDollyEmpty, faDollyFlatbed, faDollyFlatbedAlt, faDollyFlatbedEmpty, faDonate, faDoorClosed, faDoorOpen, faDotCircle, faDove, faDownload, faDraftingCompass, faDragon, faDrawCircle, faDrawPolygon, faDrawSquare, faDreidel, faDrone, faDroneAlt, faDrum, faDrumSteelpan, faDrumstick, faDrumstickBite, faDryer, faDryerAlt, faDuck, faDumbbell, faDumpster, faDumpsterFire, faDungeon, faEar, faEarMuffs, faEclipse, faEclipseAlt, faEdit, faEgg, faEggFried, faEject, faElephant, faEllipsisH, faEllipsisHAlt, faEllipsisV, faEllipsisVAlt, faEmptySet, faEngineWarning, faEnvelope, faEnvelopeOpen, faEnvelopeOpenDollar, faEnvelopeOpenText, faEnvelopeSquare, faEquals, faEraser, faEthernet, faEuroSign, faExchange, faExchangeAlt, faExclamation, faExclamationCircle, faExclamationSquare, faExclamationTriangle, faExpand, faExpandAlt, faExpandArrows, faExpandArrowsAlt, faExpandWide, faExternalLink, faExternalLinkAlt, faExternalLinkSquare, faExternalLinkSquareAlt, faEye, faEyeDropper, faEyeEvil, faEyeSlash, faFan, faFarm, faFastBackward, faFastForward, faFax, faFeather, faFeatherAlt, faFemale, faFieldHockey, faFighterJet, faFile, faFileAlt, faFileArchive, faFileAudio, faFileCertificate, faFileChartLine, faFileChartPie, faFileCheck, faFileCode, faFileContract, faFileCsv, faFileDownload, faFileEdit, faFileExcel, faFileExclamation, faFileExport, faFileImage, faFileImport, faFileInvoice, faFileInvoiceDollar, faFileMedical, faFileMedicalAlt, faFileMinus, faFilePdf, faFilePlus, faFilePowerpoint, faFilePrescription, faFileSearch, faFileSignature, faFileSpreadsheet, faFileTimes, faFileUpload, faFileUser, faFileVideo, faFileWord, faFilesMedical, faFill, faFillDrip, faFilm, faFilmAlt, faFilter, faFingerprint, faFire, faFireAlt, faFireExtinguisher, faFireSmoke, faFireplace, faFirstAid, faFish, faFishCooked, faFistRaised, faFlag, faFlagAlt, faFlagCheckered, faFlagUsa, faFlame, faFlask, faFlaskPoison, faFlaskPotion, faFlower, faFlowerDaffodil, faFlowerTulip, faFlushed, faFog, faFolder, faFolderMinus, faFolderOpen, faFolderPlus, faFolderTimes, faFolderTree, faFolders, faFont, faFontAwesomeLogoFull, faFontCase, faFootballBall, faFootballHelmet, faForklift, faForward, faFragile, faFrenchFries, faFrog, faFrostyHead, faFrown, faFrownOpen, faFunction, faFunnelDollar, faFutbol, faGameBoard, faGameBoardAlt, faGamepad, faGasPump, faGasPumpSlash, faGavel, faGem, faGenderless, faGhost, faGift, faGiftCard, faGifts, faGingerbreadMan, faGlass, faGlassChampagne, faGlassCheers, faGlassCitrus, faGlassMartini, faGlassMartiniAlt, faGlassWhiskey, faGlassWhiskeyRocks, faGlasses, faGlassesAlt, faGlobe, faGlobeAfrica, faGlobeAmericas, faGlobeAsia, faGlobeEurope, faGlobeSnow, faGlobeStand, faGolfBall, faGolfClub, faGopuram, faGraduationCap, faGreaterThan, faGreaterThanEqual, faGrimace, faGrin, faGrinAlt, faGrinBeam, faGrinBeamSweat, faGrinHearts, faGrinSquint, faGrinSquintTears, faGrinStars, faGrinTears, faGrinTongue, faGrinTongueSquint, faGrinTongueWink, faGrinWink, faGripHorizontal, faGripLines, faGripLinesVertical, faGripVertical, faGuitar, faHSquare, faH1, faH2, faH3, faH4, faHamburger, faHammer, faHammerWar, faHamsa, faHandHeart, faHandHolding, faHandHoldingBox, faHandHoldingHeart, faHandHoldingMagic, faHandHoldingSeedling, faHandHoldingUsd, faHandHoldingWater, faHandLizard, faHandMiddleFinger, faHandPaper, faHandPeace, faHandPointDown, faHandPointLeft, faHandPointRight, faHandPointUp, faHandPointer, faHandReceiving, faHandRock, faHandScissors, faHandSpock, faHands, faHandsHeart, faHandsHelping, faHandsUsd, faHandshake, faHandshakeAlt, faHanukiah, faHardHat, faHashtag, faHatChef, faHatSanta, faHatWinter, faHatWitch, faHatWizard, faHaykal, faHdd, faHeadSide, faHeadSideBrain, faHeadSideMedical, faHeadVr, faHeading, faHeadphones, faHeadphonesAlt, faHeadset, faHeart, faHeartBroken, faHeartCircle, faHeartRate, faHeartSquare, faHeartbeat, faHelicopter, faHelmetBattle, faHexagon, faHighlighter, faHiking, faHippo, faHistory, faHockeyMask, faHockeyPuck, faHockeySticks, faHollyBerry, faHome, faHomeAlt, faHomeHeart, faHomeLg, faHomeLgAlt, faHoodCloak, faHorizontalRule, faHorse, faHorseHead, faHospital, faHospitalAlt, faHospitalSymbol, faHospitalUser, faHospitals, faHotTub, faHotdog, faHotel, faHourglass, faHourglassEnd, faHourglassHalf, faHourglassStart, faHouseDamage, faHouseFlood, faHryvnia, faHumidity, faHurricane, faICursor, faIceCream, faIceSkate, faIcicles, faIcons, faIconsAlt, faIdBadge, faIdCard, faIdCardAlt, faIgloo, faImage, faImages, faInbox, faInboxIn, faInboxOut, faIndent, faIndustry, faIndustryAlt, faInfinity, faInfo, faInfoCircle, faInfoSquare, faInhaler, faIntegral, faIntersection, faInventory, faIslandTropical, faItalic, faJackOLantern, faJedi, faJoint, faJournalWhills, faKaaba, faKerning, faKey, faKeySkeleton, faKeyboard, faKeynote, faKhanda, faKidneys, faKiss, faKissBeam, faKissWinkHeart, faKite, faKiwiBird, faKnifeKitchen, faLambda, faLamp, faLandmark, faLandmarkAlt, faLanguage, faLaptop, faLaptopCode, faLaptopMedical, faLaugh, faLaughBeam, faLaughSquint, faLaughWink, faLayerGroup, faLayerMinus, faLayerPlus, faLeaf, faLeafHeart, faLeafMaple, faLeafOak, faLemon, faLessThan, faLessThanEqual, faLevelDown, faLevelDownAlt, faLevelUp, faLevelUpAlt, faLifeRing, faLightbulb, faLightbulbDollar, faLightbulbExclamation, faLightbulbOn, faLightbulbSlash, faLightsHoliday, faLineColumns, faLineHeight, faLink, faLips, faLiraSign, faList, faListAlt, faListOl, faListUl, faLocation, faLocationArrow, faLocationCircle, faLocationSlash, faLock, faLockAlt, faLockOpen, faLockOpenAlt, faLongArrowAltDown, faLongArrowAltLeft, faLongArrowAltRight, faLongArrowAltUp, faLongArrowDown, faLongArrowLeft, faLongArrowRight, faLongArrowUp, faLoveseat, faLowVision, faLuchador, faLuggageCart, faLungs, faMace, faMagic, faMagnet, faMailBulk, faMailbox, faMale, faMandolin, faMap, faMapMarked, faMapMarkedAlt, faMapMarker, faMapMarkerAlt, faMapMarkerAltSlash, faMapMarkerCheck, faMapMarkerEdit, faMapMarkerExclamation, faMapMarkerMinus, faMapMarkerPlus, faMapMarkerQuestion, faMapMarkerSlash, faMapMarkerSmile, faMapMarkerTimes, faMapPin, faMapSigns, faMarker, faMars, faMarsDouble, faMarsStroke, faMarsStrokeH, faMarsStrokeV, faMask, faMeat, faMedal, faMedkit, faMegaphone, faMeh, faMehBlank, faMehRollingEyes, faMemory, faMenorah, faMercury, faMeteor, faMicrochip, faMicrophone, faMicrophoneAlt, faMicrophoneAltSlash, faMicrophoneSlash, faMicroscope, faMindShare, faMinus, faMinusCircle, faMinusHexagon, faMinusOctagon, faMinusSquare, faMistletoe, faMitten, faMobile, faMobileAlt, faMobileAndroid, faMobileAndroidAlt, faMoneyBill, faMoneyBillAlt, faMoneyBillWave, faMoneyBillWaveAlt, faMoneyCheck, faMoneyCheckAlt, faMoneyCheckEdit, faMoneyCheckEditAlt, faMonitorHeartRate, faMonkey, faMonument, faMoon, faMoonCloud, faMoonStars, faMortarPestle, faMosque, faMotorcycle, faMountain, faMountains, faMousePointer, faMug, faMugHot, faMugMarshmallows, faMugTea, faMusic, faNarwhal, faNetworkWired, faNeuter, faNewspaper, faNotEqual, faNotesMedical, faObjectGroup, faObjectUngroup, faOctagon, faOilCan, faOilTemp, faOm, faOmega, faOrnament, faOtter, faOutdent, faOverline, faPageBreak, faPager, faPaintBrush, faPaintBrushAlt, faPaintRoller, faPalette, faPallet, faPalletAlt, faPaperPlane, faPaperclip, faParachuteBox, faParagraph, faParagraphRtl, faParking, faParkingCircle, faParkingCircleSlash, faParkingSlash, faPassport, faPastafarianism, faPaste, faPause, faPauseCircle, faPaw, faPawAlt, faPawClaws, faPeace, faPegasus, faPen, faPenAlt, faPenFancy, faPenNib, faPenSquare, faPencil, faPencilAlt, faPencilPaintbrush, faPencilRuler, faPennant, faPeopleCarry, faPepperHot, faPercent, faPercentage, faPersonBooth, faPersonCarry, faPersonDolly, faPersonDollyEmpty, faPersonSign, faPhone, faPhoneAlt, faPhoneLaptop, faPhoneOffice, faPhonePlus, faPhoneSlash, faPhoneSquare, faPhoneSquareAlt, faPhoneVolume, faPhotoVideo, faPi, faPie, faPig, faPiggyBank, faPills, faPizza, faPizzaSlice, faPlaceOfWorship, faPlane, faPlaneAlt, faPlaneArrival, faPlaneDeparture, faPlay, faPlayCircle, faPlug, faPlus, faPlusCircle, faPlusHexagon, faPlusOctagon, faPlusSquare, faPodcast, faPodium, faPodiumStar, faPoll, faPollH, faPollPeople, faPoo, faPooStorm, faPoop, faPopcorn, faPortrait, faPoundSign, faPowerOff, faPray, faPrayingHands, faPrescription, faPrescriptionBottle, faPrescriptionBottleAlt, faPresentation, faPrint, faPrintSearch, faPrintSlash, faProcedures, faProjectDiagram, faPumpkin, faPuzzlePiece, faQrcode, faQuestion, faQuestionCircle, faQuestionSquare, faQuidditch, faQuoteLeft, faQuoteRight, faQuran, faRabbit, faRabbitFast, faRacquet, faRadiation, faRadiationAlt, faRainbow, faRaindrops, faRam, faRampLoading, faRandom, faReceipt, faRectangleLandscape, faRectanglePortrait, faRectangleWide, faRecycle, faRedo, faRedoAlt, faRegistered, faRemoveFormat, faRepeat, faRepeat1, faRepeat1Alt, faRepeatAlt, faReply, faReplyAll, faRepublican, faRestroom, faRetweet, faRetweetAlt, faRibbon, faRing, faRingsWedding, faRoad, faRobot, faRocket, faRoute, faRouteHighway, faRouteInterstate, faRss, faRssSquare, faRubleSign, faRuler, faRulerCombined, faRulerHorizontal, faRulerTriangle, faRulerVertical, faRunning, faRupeeSign, faRv, faSack, faSackDollar, faSadCry, faSadTear, faSalad, faSandwich, faSatellite, faSatelliteDish, faSausage, faSave, faScalpel, faScalpelPath, faScanner, faScannerKeyboard, faScannerTouchscreen, faScarecrow, faScarf, faSchool, faScrewdriver, faScroll, faScrollOld, faScrubber, faScythe, faSdCard, faSearch, faSearchDollar, faSearchLocation, faSearchMinus, faSearchPlus, faSeedling, faSendBack, faSendBackward, faServer, faShapes, faShare, faShareAll, faShareAlt, faShareAltSquare, faShareSquare, faSheep, faShekelSign, faShield, faShieldAlt, faShieldCheck, faShieldCross, faShip, faShippingFast, faShippingTimed, faShishKebab, faShoePrints, faShoppingBag, faShoppingBasket, faShoppingCart, faShovel, faShovelSnow, faShower, faShredder, faShuttleVan, faShuttlecock, faSickle, faSigma, faSign, faSignIn, faSignInAlt, faSignLanguage, faSignOut, faSignOutAlt, faSignal, faSignal1, faSignal2, faSignal3, faSignal4, faSignalAlt, faSignalAlt1, faSignalAlt2, faSignalAlt3, faSignalAltSlash, faSignalSlash, faSignature, faSimCard, faSitemap, faSkating, faSkeleton, faSkiJump, faSkiLift, faSkiing, faSkiingNordic, faSkull, faSkullCrossbones, faSlash, faSledding, faSleigh, faSlidersH, faSlidersHSquare, faSlidersV, faSlidersVSquare, faSmile, faSmileBeam, faSmilePlus, faSmileWink, faSmog, faSmoke, faSmoking, faSmokingBan, faSms, faSnake, faSnooze, faSnowBlowing, faSnowboarding, faSnowflake, faSnowflakes, faSnowman, faSnowmobile, faSnowplow, faSocks, faSolarPanel, faSort, faSortAlphaDown, faSortAlphaDownAlt, faSortAlphaUp, faSortAlphaUpAlt, faSortAlt, faSortAmountDown, faSortAmountDownAlt, faSortAmountUp, faSortAmountUpAlt, faSortDown, faSortNumericDown, faSortNumericDownAlt, faSortNumericUp, faSortNumericUpAlt, faSortShapesDown, faSortShapesDownAlt, faSortShapesUp, faSortShapesUpAlt, faSortSizeDown, faSortSizeDownAlt, faSortSizeUp, faSortSizeUpAlt, faSortUp, faSoup, faSpa, faSpaceShuttle, faSpade, faSparkles, faSpellCheck, faSpider, faSpiderBlackWidow, faSpiderWeb, faSpinner, faSpinnerThird, faSplotch, faSprayCan, faSquare, faSquareFull, faSquareRoot, faSquareRootAlt, faSquirrel, faStaff, faStamp, faStar, faStarAndCrescent, faStarChristmas, faStarExclamation, faStarHalf, faStarHalfAlt, faStarOfDavid, faStarOfLife, faStars, faSteak, faSteeringWheel, faStepBackward, faStepForward, faStethoscope, faStickyNote, faStocking, faStomach, faStop, faStopCircle, faStopwatch, faStore, faStoreAlt, faStream, faStreetView, faStretcher, faStrikethrough, faStroopwafel, faSubscript, faSubway, faSuitcase, faSuitcaseRolling, faSun, faSunCloud, faSunDust, faSunHaze, faSunglasses, faSunrise, faSunset, faSuperscript, faSurprise, faSwatchbook, faSwimmer, faSwimmingPool, faSword, faSwords, faSynagogue, faSync, faSyncAlt, faSyringe, faTable, faTableTennis, faTablet, faTabletAlt, faTabletAndroid, faTabletAndroidAlt, faTabletRugged, faTablets, faTachometer, faTachometerAlt, faTachometerAltAverage, faTachometerAltFast, faTachometerAltFastest, faTachometerAltSlow, faTachometerAltSlowest, faTachometerAverage, faTachometerFast, faTachometerFastest, faTachometerSlow, faTachometerSlowest, faTaco, faTag, faTags, faTally, faTanakh, faTape, faTasks, faTasksAlt, faTaxi, faTeeth, faTeethOpen, faTemperatureFrigid, faTemperatureHigh, faTemperatureHot, faTemperatureLow, faTenge, faTennisBall, faTerminal, faText, faTextHeight, faTextSize, faTextWidth, faTh, faThLarge, faThList, faTheaterMasks, faThermometer, faThermometerEmpty, faThermometerFull, faThermometerHalf, faThermometerQuarter, faThermometerThreeQuarters, faTheta, faThumbsDown, faThumbsUp, faThumbtack, faThunderstorm, faThunderstormMoon, faThunderstormSun, faTicket, faTicketAlt, faTilde, faTimes, faTimesCircle, faTimesHexagon, faTimesOctagon, faTimesSquare, faTint, faTintSlash, faTire, faTireFlat, faTirePressureWarning, faTireRugged, faTired, faToggleOff, faToggleOn, faToilet, faToiletPaper, faToiletPaperAlt, faTombstone, faTombstoneAlt, faToolbox, faTools, faTooth, faToothbrush, faTorah, faToriiGate, faTornado, faTractor, faTrademark, faTrafficCone, faTrafficLight, faTrafficLightGo, faTrafficLightSlow, faTrafficLightStop, faTrain, faTram, faTransgender, faTransgenderAlt, faTrash, faTrashAlt, faTrashRestore, faTrashRestoreAlt, faTrashUndo, faTrashUndoAlt, faTreasureChest, faTree, faTreeAlt, faTreeChristmas, faTreeDecorated, faTreeLarge, faTreePalm, faTrees, faTriangle, faTrophy, faTrophyAlt, faTruck, faTruckContainer, faTruckCouch, faTruckLoading, faTruckMonster, faTruckMoving, faTruckPickup, faTruckPlow, faTruckRamp, faTshirt, faTty, faTurkey, faTurtle, faTv, faTvRetro, faUmbrella, faUmbrellaBeach, faUnderline, faUndo, faUndoAlt, faUnicorn, faUnion, faUniversalAccess, faUniversity, faUnlink, faUnlock, faUnlockAlt, faUpload, faUsdCircle, faUsdSquare, faUser, faUserAlt, faUserAltSlash, faUserAstronaut, faUserChart, faUserCheck, faUserCircle, faUserClock, faUserCog, faUserCrown, faUserEdit, faUserFriends, faUserGraduate, faUserHardHat, faUserHeadset, faUserInjured, faUserLock, faUserMd, faUserMdChat, faUserMinus, faUserNinja, faUserNurse, faUserPlus, faUserSecret, faUserShield, faUserSlash, faUserTag, faUserTie, faUserTimes, faUsers, faUsersClass, faUsersCog, faUsersCrown, faUsersMedical, faUtensilFork, faUtensilKnife, faUtensilSpoon, faUtensils, faUtensilsAlt, faValueAbsolute, faVectorSquare, faVenus, faVenusDouble, faVenusMars, faVial, faVials, faVideo, faVideoPlus, faVideoSlash, faVihara, faVoicemail, faVolcano, faVolleyballBall, faVolume, faVolumeDown, faVolumeMute, faVolumeOff, faVolumeSlash, faVolumeUp, faVoteNay, faVoteYea, faVrCardboard, faWalker, faWalking, faWallet, faWand, faWandMagic, faWarehouse, faWarehouseAlt, faWasher, faWatch, faWatchFitness, faWater, faWaterLower, faWaterRise, faWaveSine, faWaveSquare, faWaveTriangle, faWebcam, faWebcamSlash, faWeight, faWeightHanging, faWhale, faWheat, faWheelchair, faWhistle, faWifi, faWifi1, faWifi2, faWifiSlash, faWind, faWindTurbine, faWindWarning, faWindow, faWindowAlt, faWindowClose, faWindowMaximize, faWindowMinimize, faWindowRestore, faWindsock, faWineBottle, faWineGlass, faWineGlassAlt, faWonSign, faWreath, faWrench, faXRay, faYenSign, faYinYang };
    `);
  });

  test('Empty export', () => {
    const source = `
      export {};
    `;
    const [imports, exports] = parse(source);
    assert.strictEqual(imports.length, 0);
    assert.strictEqual(exports.length, 0);
  });

  test('Export * as', () => {
    const source = `
      export * as X from './asdf';
      export *  as  yy from './g';
    `;
    const [imports, exports] = parse(source);
    assert.strictEqual(imports.length, 2);
    assert.strictEqual(exports.length, 2);
    assertExportIs(source, exports[0], { n: 'X', ln: undefined });
    assertExportIs(source, exports[1], { n: 'yy', ln: undefined });
  });

  test('Export statement start', () => {
    if (min) return; // minimal build drops these fields
    const source = [
      `export const x = 1;`,
      `export function fn () {}`,
      `export class C {}`,
      `export default 42;`,
      `export { c, d };`,
      `export * as ns from './mod';`,
      `export { e, f as g } from './re';`
    ].join('\n');
    const [, exports] = parse(source);
    assert.strictEqual(exports.length, 9);

    for (const expt of exports)
      assert.strictEqual(source.slice(expt.ss, expt.ss + 6), 'export');

    // Each specifier reports its statement's start, so the `{ c, d }` names and
    // the re-exported `e` / `g` each share one `ss`.
    assert.strictEqual(exports[0].ss, 0);
    assert.strictEqual(exports[4].ss, exports[5].ss);
    assert.strictEqual(exports[4].ss, source.indexOf('export { c, d }'));
    assert.strictEqual(exports[7].ss, exports[8].ss);
    assert.strictEqual(exports[7].ss, source.indexOf('export { e, f as g }'));

    // Distinct statements resolve to their own offset, not a shared constant.
    assert.strictEqual(exports[1].ss, source.indexOf('export function'));
    assert.strictEqual(exports[2].ss, source.indexOf('export class'));
    assert.strictEqual(exports[3].ss, source.indexOf('export default'));
    assert.strictEqual(exports[6].ss, source.indexOf('export * as'));
  });

  suite('Import From', () => {
    if (!js)
    test('non-identifier-string as (doubleQuote)', () => {
      const source = `
        import { "~123" as foo0 } from './mod0.js';
        import { "ab cd" as foo1 } from './mod1.js';
        import { "not identifier" as foo2 } from './mod2.js';
        import { "-notidentifier" as foo3 } from './mod3.js';
        import { "%notidentifier" as foo4 } from './mod4.js';
        import { "@notidentifier" as foo5 } from './mod5.js';
        import { " notidentifier" as foo6 } from './mod6.js';
        import { "notidentifier " as foo7 } from './mod7.js';
        import { " notidentifier " as foo8 } from './mod8.js';
        import { /** @type{HTMLElement} */ LionCombobox } from './src/LionCombobox.js';
        `;
      const [imports, exports] = parse(source);
      assert.strictEqual(exports.length, 0);
      assert.strictEqual(imports.length, 10);

      assert.strictEqual(imports[0].n, './mod0.js');
      assert.strictEqual(imports[1].n, './mod1.js');
      assert.strictEqual(imports[2].n, './mod2.js');
      assert.strictEqual(imports[3].n, './mod3.js');
      assert.strictEqual(imports[4].n, './mod4.js');
      assert.strictEqual(imports[5].n, './mod5.js');
      assert.strictEqual(imports[6].n, './mod6.js');
      assert.strictEqual(imports[7].n, './mod7.js');
      assert.strictEqual(imports[8].n, './mod8.js');
    });

    if (!js)
    test('non-identifier-string as (singleQuote)', () => {
      const source = `
        import { '~123' as foo0 } from './mod0.js';
        import { 'ab cd' as foo1 } from './mod1.js';
        import { 'not identifier' as foo2 } from './mod2.js';
        import { '-notidentifier' as foo3 } from './mod3.js';
        import { '%notidentifier' as foo4 } from './mod4.js';
        import { '@notidentifier' as foo5 } from './mod5.js';
        import { ' notidentifier' as foo6 } from './mod6.js';
        import { 'notidentifier ' as foo7 } from './mod7.js';
        import { ' notidentifier ' as foo8 } from './mod8.js';`;
      const [imports, exports] = parse(source);
      assert.strictEqual(exports.length, 0);
      assert.strictEqual(imports.length, 9);

      assert.strictEqual(imports[0].n, './mod0.js');
      assert.strictEqual(imports[1].n, './mod1.js');
      assert.strictEqual(imports[2].n, './mod2.js');
      assert.strictEqual(imports[3].n, './mod3.js');
      assert.strictEqual(imports[4].n, './mod4.js');
      assert.strictEqual(imports[5].n, './mod5.js');
      assert.strictEqual(imports[6].n, './mod6.js');
      assert.strictEqual(imports[7].n, './mod7.js');
      assert.strictEqual(imports[8].n, './mod8.js');
    });

    if (!js)
    test('with-backslash-keywords as (doubleQuote)', () => {
      const source = String.raw`
      import { " slash\\ " as foo0 } from './mod0.js';
      import { " quote\" " as foo1 } from './mod1.js'
      import { " quote\\\" " as foo2 } from './mod2.js';
      import { " quote' " as foo3 } from './mod3.js';`;
      const [imports, exports] = parse(source);
      assert.strictEqual(exports.length, 0);
      assert.strictEqual(imports.length, 4);

      assert.strictEqual(imports[0].n, './mod0.js');
      assert.strictEqual(imports[1].n, './mod1.js');
      assert.strictEqual(imports[2].n, './mod2.js');
      assert.strictEqual(imports[3].n, './mod3.js');
    });

    if (!js)
    test('with-backslash-keywords as (singleQuote)', () => {
      const source = String.raw`
      import { ' slash\\ ' as foo0 } from './mod0.js';
      import { ' quote\' ' as foo1 } from './mod1.js'
      import { ' quote\\\' ' as foo2 } from './mod2.js';
      import { ' quote\' ' as foo3 } from './mod3.js';`;
      const [imports, exports] = parse(source);
      assert.strictEqual(exports.length, 0);
      assert.strictEqual(imports.length, 4);

      assert.strictEqual(imports[0].n, './mod0.js');
      assert.strictEqual(imports[1].n, './mod1.js');
      assert.strictEqual(imports[2].n, './mod2.js');
      assert.strictEqual(imports[3].n, './mod3.js');
    });

    if (!js)
    test('with-emoji as', () => {
      const source = `
        import { "hm🤔" as foo0 } from './mod0.js';
        import { " 🚀rocket space " as foo1 } from './mod1.js';`;
      const [imports, exports] = parse(source);
      assert.strictEqual(exports.length, 0);
      assert.strictEqual(imports.length, 2);

      assert.strictEqual(imports[0].n, './mod0.js');
      assert.strictEqual(imports[1].n, './mod1.js');
    });

    if (!js)
    test('double-quotes-and-curly-bracket', () => {
      const source = `
        import { asdf as "b} from 'wrong'" } from 'mod0';`;
      const [imports, exports] = parse(source);
      assert.strictEqual(exports.length, 0);
      assert.strictEqual(imports.length, 1);

      assert.strictEqual(imports[0].n, 'mod0');
    });

    if (!js)
    test('single-quotes-and-curly-bracket', () => {
      const source = `
        import { asdf as 'b} from "wrong"' } from 'mod0';`;
      const [imports, exports] = parse(source);
      assert.strictEqual(exports.length, 0);
      assert.strictEqual(imports.length, 1);

      assert.strictEqual(imports[0].n, 'mod0');
    });
  });

  suite('Export From', () => {
    test('Identifier only', () => {
      const source = `
        export { x } from './asdf';
        export { x1, x2 } from './g';
        export { foo, x2 as bar, zoo } from './g2';
        export { /** @type{HTMLElement} */ LionCombobox } from './src/LionCombobox.js';
      `;
      const [imports, exports] = parse(source);
      assert.strictEqual(imports.length, 4);
      assert.strictEqual(exports.length, 7);
      assertExportIs(source, exports[0], { n: 'x', ln: undefined });
      assertExportIs(source, exports[1], { n: 'x1', ln: undefined });
      assertExportIs(source, exports[2], { n: 'x2', ln: undefined });
      assertExportIs(source, exports[3], { n: 'foo', ln: undefined });
      assertExportIs(source, exports[4], { n: 'bar', ln: undefined });
      assertExportIs(source, exports[5], { n: 'zoo', ln: undefined });
      assertExportIs(source, exports[6], { n: 'LionCombobox', ln: undefined });
    });

    if (!js)
    test('non-identifier-string as variable (doubleQuote)', () => {
      const source = `
        export { "~123" as foo0 } from './mod0.js';
        export { "ab cd" as foo1 } from './mod1.js';
        export { "not identifier" as foo2 } from './mod2.js';
        export { "-notidentifier" as foo3 } from './mod3.js';
        export { "%notidentifier" as foo4 } from './mod4.js';
        export { "@notidentifier" as foo5 } from './mod5.js';
        export { " notidentifier" as foo6 } from './mod6.js';
        export { "notidentifier " as foo7 } from './mod7.js';
        export { " notidentifier " as foo8 } from './mod8.js';`;
      const [imports, exports] = parse(source);
      assert.strictEqual(imports.length, 9);

      assert.strictEqual(exports.length, 9);
      assertExportIs(source, exports[0], { n: 'foo0', ln: undefined });
      assertExportIs(source, exports[1], { n: 'foo1', ln: undefined });
      assertExportIs(source, exports[2], { n: 'foo2', ln: undefined });
      assertExportIs(source, exports[3], { n: 'foo3', ln: undefined });
      assertExportIs(source, exports[4], { n: 'foo4', ln: undefined });
      assertExportIs(source, exports[5], { n: 'foo5', ln: undefined });
      assertExportIs(source, exports[6], { n: 'foo6', ln: undefined });
      assertExportIs(source, exports[7], { n: 'foo7', ln: undefined });
      assertExportIs(source, exports[8], { n: 'foo8', ln: undefined });
    });

    if (!js)
    test('non-identifier-string as variable (singleQuote)', () => {
      const source = `
        export { '~123' as foo0 } from './mod0.js';
        export { 'ab cd' as foo1 } from './mod1.js';
        export { 'not identifier' as foo2 } from './mod2.js';
        export { '-notidentifier' as foo3 } from './mod3.js';
        export { '%notidentifier' as foo4 } from './mod4.js';
        export { '@notidentifier' as foo5 } from './mod5.js';
        export { ' notidentifier' as foo6 } from './mod6.js';
        export { 'notidentifier ' as foo7 } from './mod7.js';
        export { ' notidentifier ' as foo8 } from './mod8.js';`;
      const [imports, exports] = parse(source);
      assert.strictEqual(imports.length, 9);

      assert.strictEqual(exports.length, 9);
      assertExportIs(source, exports[0], { n: 'foo0', ln: undefined });
      assertExportIs(source, exports[1], { n: 'foo1', ln: undefined });
      assertExportIs(source, exports[2], { n: 'foo2', ln: undefined });
      assertExportIs(source, exports[3], { n: 'foo3', ln: undefined });
      assertExportIs(source, exports[4], { n: 'foo4', ln: undefined });
      assertExportIs(source, exports[5], { n: 'foo5', ln: undefined });
      assertExportIs(source, exports[6], { n: 'foo6', ln: undefined });
      assertExportIs(source, exports[7], { n: 'foo7', ln: undefined });
      assertExportIs(source, exports[8], { n: 'foo8', ln: undefined });
    });

    if (!js)
    test('with-backslash-keywords as variable (doubleQuote)', () => {
      const source = String.raw`
        export { " slash\\ " as foo0 } from './mod0.js';
        export { " quote\" " as foo1 } from './mod1.js'
        export { " quote\\\" " as foo2 } from './mod2.js';
        export { " quote' " as foo3 } from './mod3.js';`;
      const [imports, exports] = parse(source);
      assert.strictEqual(imports.length, 4);

      assert.strictEqual(exports.length, 4);
      assertExportIs(source, exports[0], { n: 'foo0', ln: undefined });
      assertExportIs(source, exports[1], { n: 'foo1', ln: undefined });
      assertExportIs(source, exports[2], { n: 'foo2', ln: undefined });
      assertExportIs(source, exports[3], { n: 'foo3', ln: undefined });
    });

    if (!js)
    test('with-backslash-keywords as variable (singleQuote)', () => {
      const source = String.raw`
        export { ' slash\\ ' as foo0 } from './mod0.js';
        export { ' quote\' ' as foo1 } from './mod1.js'
        export { ' quote\\\' ' as foo2 } from './mod2.js';
        export { ' quote\' ' as foo3 } from './mod3.js';`;
      const [imports, exports] = parse(source);
      assert.strictEqual(imports.length, 4);

      assert.strictEqual(exports.length, 4);
      assertExportIs(source, exports[0], { n: 'foo0', ln: undefined });
      assertExportIs(source, exports[1], { n: 'foo1', ln: undefined });
      assertExportIs(source, exports[2], { n: 'foo2', ln: undefined });
      assertExportIs(source, exports[3], { n: 'foo3', ln: undefined });
    });

    if (!js)
    test('with-emoji as', () => {
      const source = `
        export { "hm🤔" as foo0 } from './mod0.js';
        export { " 🚀rocket space " as foo1 } from './mod1.js';`;
      const [imports, exports] = parse(source);
      assert.strictEqual(imports.length, 2);

      assert.strictEqual(exports.length, 2);
      assertExportIs(source, exports[0], { n: 'foo0', ln: undefined });
      assertExportIs(source, exports[1], { n: 'foo1', ln: undefined });
    });

    if (!js)
    test('non-identifier-string (doubleQuote)', () => {
      const source = `
        export { "~123" } from './mod0.js';
        export { "ab cd" } from './mod1.js';
        export { "not identifier" } from './mod2.js';
        export { "-notidentifier" } from './mod3.js';
        export { "%notidentifier" } from './mod4.js';
        export { "@notidentifier" } from './mod5.js';
        export { " notidentifier" } from './mod6.js';
        export { "notidentifier " } from './mod7.js';
        export { " notidentifier " } from './mod8.js';`;
      const [imports, exports] = parse(source);
      assert.strictEqual(imports.length, 9);

      assert.strictEqual(exports.length, 9);
      assertExportIs(source, exports[0], { n: '~123', ln: undefined });
      assertExportIs(source, exports[1], { n: 'ab cd', ln: undefined });
      assertExportIs(source, exports[2], { n: 'not identifier', ln: undefined });
      assertExportIs(source, exports[3], { n: '-notidentifier', ln: undefined });
      assertExportIs(source, exports[4], { n: '%notidentifier', ln: undefined });
      assertExportIs(source, exports[5], { n: '@notidentifier', ln: undefined });
      assertExportIs(source, exports[6], { n: ' notidentifier', ln: undefined });
      assertExportIs(source, exports[7], { n: 'notidentifier ', ln: undefined });
      assertExportIs(source, exports[8], { n: ' notidentifier ', ln: undefined });
    });

    if (!js)
    test('non-identifier-string (singleQuote)', () => {
      const source = `
        export { '~123' } from './mod0.js';
        export { 'ab cd' } from './mod1.js';
        export { 'not identifier' } from './mod2.js';
        export { '-notidentifier' } from './mod3.js';
        export { '%notidentifier' } from './mod4.js';
        export { '@notidentifier' } from './mod5.js';
        export { ' notidentifier' } from './mod6.js';
        export { 'notidentifier ' } from './mod7.js';
        export { ' notidentifier ' } from './mod8.js';`;
      const [imports, exports] = parse(source);
      assert.strictEqual(imports.length, 9);

      assert.strictEqual(exports.length, 9);
      assertExportIs(source, exports[0], { n: '~123', ln: undefined });
      assertExportIs(source, exports[1], { n: 'ab cd', ln: undefined });
      assertExportIs(source, exports[2], { n: 'not identifier', ln: undefined });
      assertExportIs(source, exports[3], { n: '-notidentifier', ln: undefined });
      assertExportIs(source, exports[4], { n: '%notidentifier', ln: undefined });
      assertExportIs(source, exports[5], { n: '@notidentifier', ln: undefined });
      assertExportIs(source, exports[6], { n: ' notidentifier', ln: undefined });
      assertExportIs(source, exports[7], { n: 'notidentifier ', ln: undefined });
      assertExportIs(source, exports[8], { n: ' notidentifier ', ln: undefined });
    });

    if (!js)
    test('with-backslash-keywords (doubleQuote)', () => {
      const source = String.raw`
        export { " slash\\ " } from './mod0.js';
        export { " quote\" " } from './mod1.js'
        export { " quote\\\" " } from './mod2.js';
        export { " quote' " } from './mod3.js';`;
      const [imports, exports] = parse(source);
      assert.strictEqual(imports.length, 4);

      assert.strictEqual(exports.length, 4);
      assertExportIs(source, exports[0], { n: String.raw` slash\ `, ln: undefined });
      assertExportIs(source, exports[1], { n: String.raw` quote" `, ln: undefined });
      assertExportIs(source, exports[2], { n: String.raw` quote\" `, ln: undefined });
      assertExportIs(source, exports[3], { n: String.raw` quote' `, ln: undefined });
    });

    if (!js)
    test('with-backslash-keywords (singleQuote)', () => {
      const source = String.raw`
        export { ' slash\\ ' } from './mod0.js';
        export { ' quote\' ' } from './mod1.js'
        export { ' quote\\\' ' } from './mod2.js';
        export { ' quote\' ' } from './mod3.js';`;
      const [imports, exports] = parse(source);
      assert.strictEqual(imports.length, 4);

      assert.strictEqual(exports.length, 4);
      assertExportIs(source, exports[0], { n: String.raw` slash\ `, ln: undefined });
      assertExportIs(source, exports[1], { n: String.raw` quote' `, ln: undefined });
      assertExportIs(source, exports[2], { n: String.raw` quote\' `, ln: undefined });
      assertExportIs(source, exports[3], { n: String.raw` quote' `, ln: undefined });
    });

    if (!js)
    test('variable as non-identifier-string (doubleQuote)', () => {
      const source = `
        export { foo0 as "~123" } from './mod0.js';
        export { foo1 as "ab cd" } from './mod1.js';
        export { foo2 as "not identifier" } from './mod2.js';
        export { foo3 as "-notidentifier" } from './mod3.js';
        export { foo4 as "%notidentifier" } from './mod4.js';
        export { foo5 as "@notidentifier" } from './mod5.js';
        export { foo6 as " notidentifier" } from './mod6.js';
        export { foo7 as "notidentifier " } from './mod7.js';
        export { foo8 as " notidentifier " } from './mod8.js';`;
      const [imports, exports] = parse(source);
      assert.strictEqual(imports.length, 9);

      assert.strictEqual(exports.length, 9);
      assertExportIs(source, exports[0], { n: '~123', ln: undefined });
      assertExportIs(source, exports[1], { n: 'ab cd', ln: undefined });
      assertExportIs(source, exports[2], { n: 'not identifier', ln: undefined });
      assertExportIs(source, exports[3], { n: '-notidentifier', ln: undefined });
      assertExportIs(source, exports[4], { n: '%notidentifier', ln: undefined });
      assertExportIs(source, exports[5], { n: '@notidentifier', ln: undefined });
      assertExportIs(source, exports[6], { n: ' notidentifier', ln: undefined });
      assertExportIs(source, exports[7], { n: 'notidentifier ', ln: undefined });
      assertExportIs(source, exports[8], { n: ' notidentifier ', ln: undefined });
    });

    if (!js)
    test('variable as non-identifier-string (singleQuote)', () => {
      const source = `
        export { foo0 as '~123' } from './mod0.js';
        export { foo1 as 'ab cd' } from './mod1.js';
        export { foo2 as 'not identifier' } from './mod2.js';
        export { foo3 as '-notidentifier' } from './mod3.js';
        export { foo4 as '%notidentifier' } from './mod4.js';
        export { foo5 as '@notidentifier' } from './mod5.js';
        export { foo6 as ' notidentifier' } from './mod6.js';
        export { foo7 as 'notidentifier ' } from './mod7.js';
        export { foo8 as ' notidentifier ' } from './mod8.js';`;
      const [imports, exports] = parse(source);
      assert.strictEqual(imports.length, 9);

      assert.strictEqual(exports.length, 9);
      assertExportIs(source, exports[0], { n: '~123', ln: undefined });
      assertExportIs(source, exports[1], { n: 'ab cd', ln: undefined });
      assertExportIs(source, exports[2], { n: 'not identifier', ln: undefined });
      assertExportIs(source, exports[3], { n: '-notidentifier', ln: undefined });
      assertExportIs(source, exports[4], { n: '%notidentifier', ln: undefined });
      assertExportIs(source, exports[5], { n: '@notidentifier', ln: undefined });
      assertExportIs(source, exports[6], { n: ' notidentifier', ln: undefined });
      assertExportIs(source, exports[7], { n: 'notidentifier ', ln: undefined });
      assertExportIs(source, exports[8], { n: ' notidentifier ', ln: undefined });
    });

    if (!js)
    test('variable as with-backslash-keywords (doubleQuote)', () => {
      const source = String.raw`
      export { foo0 as " slash\\ " } from './mod0.js';
      export { foo1 as " quote\" " } from './mod1.js'
      export { foo2 as " quote\\\" " } from './mod2.js';
      export { foo3 as " quote' " } from './mod3.js';`;
      const [imports, exports] = parse(source);
      assert.strictEqual(imports.length, 4);

      assert.strictEqual(exports.length, 4);
      assertExportIs(source, exports[0], { n: String.raw` slash\ `, ln: undefined });
      assertExportIs(source, exports[1], { n: String.raw` quote" `, ln: undefined });
      assertExportIs(source, exports[2], { n: String.raw` quote\" `, ln: undefined });
      assertExportIs(source, exports[3], { n: String.raw` quote' `, ln: undefined });
    });

    if (!js)
    test('variable as with-backslash-keywords (singleQuote)', () => {
      const source = String.raw`
      export { foo0 as ' slash\\ ' } from './mod0.js';
      export { foo1 as ' quote\' ' } from './mod1.js'
      export { foo2 as ' quote\\\' ' } from './mod2.js';
      export { foo3 as ' quote\' ' } from './mod3.js';`;
      const [imports, exports] = parse(source);
      assert.strictEqual(imports.length, 4);

      assert.strictEqual(exports.length, 4);
      assertExportIs(source, exports[0], { n: String.raw` slash\ `, ln: undefined });
      assertExportIs(source, exports[1], { n: String.raw` quote' `, ln: undefined });
      assertExportIs(source, exports[2], { n: String.raw` quote\' `, ln: undefined });
      assertExportIs(source, exports[3], { n: String.raw` quote' `, ln: undefined });
    });

    if (!js)
    test('non-identifier-string as non-identifier-string (doubleQuote)', () => {
      const source = `
        export { "~123" as "~123" } from './mod0.js';
        export { "ab cd" as "ab cd" } from './mod1.js';
        export { "not identifier" as "not identifier" } from './mod2.js';
        export { "-notidentifier" as "-notidentifier" } from './mod3.js';
        export { "%notidentifier" as "%notidentifier" } from './mod4.js';
        export { "@notidentifier" as "@notidentifier" } from './mod5.js';
        export { " notidentifier" as " notidentifier" } from './mod6.js';
        export { "notidentifier " as "notidentifier " } from './mod7.js';
        export { " notidentifier " as " notidentifier " } from './mod8.js';`;
      const [imports, exports] = parse(source);
      assert.strictEqual(imports.length, 9);

      assert.strictEqual(exports.length, 9);
      assertExportIs(source, exports[0], { n: '~123', ln: undefined });
      assertExportIs(source, exports[1], { n: 'ab cd', ln: undefined });
      assertExportIs(source, exports[2], { n: 'not identifier', ln: undefined });
      assertExportIs(source, exports[3], { n: '-notidentifier', ln: undefined });
      assertExportIs(source, exports[4], { n: '%notidentifier', ln: undefined });
      assertExportIs(source, exports[5], { n: '@notidentifier', ln: undefined });
      assertExportIs(source, exports[6], { n: ' notidentifier', ln: undefined });
      assertExportIs(source, exports[7], { n: 'notidentifier ', ln: undefined });
      assertExportIs(source, exports[8], { n: ' notidentifier ', ln: undefined });
    });

    if (!js)
    test('non-identifier-string as non-identifier-string (singleQuote)', () => {
      const source = `
        export { '~123' as '~123' } from './mod0.js';
        export { 'ab cd' as 'ab cd' } from './mod1.js';
        export { 'not identifier' as 'not identifier' } from './mod2.js';
        export { '-notidentifier' as '-notidentifier' } from './mod3.js';
        export { '%notidentifier' as '%notidentifier' } from './mod4.js';
        export { '@notidentifier' as '@notidentifier' } from './mod5.js';
        export { ' notidentifier' as ' notidentifier' } from './mod6.js';
        export { 'notidentifier ' as 'notidentifier ' } from './mod7.js';
        export { ' notidentifier ' as ' notidentifier ' } from './mod8.js';`;
      const [imports, exports] = parse(source);
      assert.strictEqual(imports.length, 9);

      assert.strictEqual(exports.length, 9);
      assertExportIs(source, exports[0], { n: '~123', ln: undefined });
      assertExportIs(source, exports[1], { n: 'ab cd', ln: undefined });
      assertExportIs(source, exports[2], { n: 'not identifier', ln: undefined });
      assertExportIs(source, exports[3], { n: '-notidentifier', ln: undefined });
      assertExportIs(source, exports[4], { n: '%notidentifier', ln: undefined });
      assertExportIs(source, exports[5], { n: '@notidentifier', ln: undefined });
      assertExportIs(source, exports[6], { n: ' notidentifier', ln: undefined });
      assertExportIs(source, exports[7], { n: 'notidentifier ', ln: undefined });
      assertExportIs(source, exports[8], { n: ' notidentifier ', ln: undefined });
    });

    if (!js)
    test('with-backslash-keywords as with-backslash-keywords (doubleQuote)', () => {
      const source = String.raw`
      export { " slash\\ " as " slash\\ " } from './mod0.js';
      export { " quote\"" as " quote\" " } from './mod1.js'
      export { " quote\\\" " as " quote\\\" " } from './mod2.js';
      export { " quote' " as " quote' " } from './mod3.js';`;
      const [imports, exports] = parse(source);
      assert.strictEqual(imports.length, 4);

      assert.strictEqual(exports.length, 4);
      assertExportIs(source, exports[0], { n: String.raw` slash\ `, ln: undefined, a: true});
      assertExportIs(source, exports[1], { n: String.raw` quote" `, ln: undefined, a: true});
      assertExportIs(source, exports[2], { n: String.raw` quote\" `, ln: undefined, a: true});
      assertExportIs(source, exports[3], { n: String.raw` quote' `, ln: undefined, a: true});
    });

    if (!js)
    test('with-backslash-keywords as with-backslash-keywords (singleQuote)', () => {
      const source = String.raw`
      export { ' slash\\ ' as ' slash\\ ' } from './mod0.js';
      export { ' quote\'' as ' quote\' ' } from './mod1.js'
      export { ' quote\\\' ' as ' quote\\\' ' } from './mod2.js';
      export { ' quote\' ' as ' quote\' ' } from './mod3.js';`;
      const [imports, exports] = parse(source);
      assert.strictEqual(imports.length, 4);

      assert.strictEqual(exports.length, 4);
      assertExportIs(source, exports[0], { n: String.raw` slash\ `, ln: undefined });
      assertExportIs(source, exports[1], { n: String.raw` quote' `, ln: undefined });
      assertExportIs(source, exports[2], { n: String.raw` quote\' `, ln: undefined });
      assertExportIs(source, exports[3], { n: String.raw` quote' `, ln: undefined });
    });

    if (!js)
    test('curly-brace (doubleQuote)', () => {
      const source = `
        export { " right-curlybrace} " } from './mod0.js';
        export { " {left-curlybrace " } from './mod1.js';
        export { " {curlybrackets} " } from './mod2.js';
        export { ' right-curlybrace} ' } from './mod0.js';
        export { ' {left-curlybrace ' } from './mod1.js';
        export { ' {curlybrackets} ' } from './mod2.js';`;
      const [imports, exports] = parse(source);
      assert.strictEqual(imports.length, 6);

      assert.strictEqual(exports.length, 6);
      assertExportIs(source, exports[0], { n: ' right-curlybrace} ', ln: undefined });
      assertExportIs(source, exports[1], { n: ' {left-curlybrace ', ln: undefined });
      assertExportIs(source, exports[2], { n: ' {curlybrackets} ', ln: undefined });
      assertExportIs(source, exports[3], { n: ' right-curlybrace} ', ln: undefined });
      assertExportIs(source, exports[4], { n: ' {left-curlybrace ', ln: undefined });
      assertExportIs(source, exports[5], { n: ' {curlybrackets} ', ln: undefined });
    });

    if (!js)
    test('* as curly-brace (doubleQuote)', () => {
      const source = `
        export { foo as " right-curlybrace} " } from './mod0.js';
        export { foo as " {left-curlybrace " } from './mod1.js';
        export { foo as " {curlybrackets} " } from './mod2.js';
        export { foo as ' right-curlybrace} ' } from './mod0.js';
        export { foo as ' {left-curlybrace ' } from './mod1.js';
        export { foo as ' {curlybrackets} ' } from './mod2.js';`;
      const [imports, exports] = parse(source);
      assert.strictEqual(imports.length, 6);

      assert.strictEqual(exports.length, 6);
      assertExportIs(source, exports[0], { n: ' right-curlybrace} ', ln: undefined });
      assertExportIs(source, exports[1], { n: ' {left-curlybrace ', ln: undefined });
      assertExportIs(source, exports[2], { n: ' {curlybrackets} ', ln: undefined });
      assertExportIs(source, exports[3], { n: ' right-curlybrace} ', ln: undefined });
      assertExportIs(source, exports[4], { n: ' {left-curlybrace ', ln: undefined });
      assertExportIs(source, exports[5], { n: ' {curlybrackets} ', ln: undefined });
    });

    if (!js)
    test('curly-brace as curly-brace (doubleQuote)', () => {
      const source = `
        export { " right-curlybrace} " as " right-curlybrace} " } from './mod0.js';
        export { " {left-curlybrace " as " {left-curlybrace " } from './mod1.js';
        export { " {curlybrackets} " as " {curlybrackets} " } from './mod2.js';
        export { ' right-curlybrace} ' as ' right-curlybrace} ' } from './mod0.js';
        export { ' {left-curlybrace ' as ' {left-curlybrace ' } from './mod1.js';
        export { ' {curlybrackets} ' as ' {curlybrackets} ' } from './mod2.js';`;
      const [imports, exports] = parse(source);
      assert.strictEqual(imports.length, 6);

      assert.strictEqual(exports.length, 6);
      assertExportIs(source, exports[0], { n: ' right-curlybrace} ', ln: undefined });
      assertExportIs(source, exports[1], { n: ' {left-curlybrace ', ln: undefined });
      assertExportIs(source, exports[2], { n: ' {curlybrackets} ', ln: undefined });
      assertExportIs(source, exports[3], { n: ' right-curlybrace} ', ln: undefined });
      assertExportIs(source, exports[4], { n: ' {left-curlybrace ', ln: undefined });
      assertExportIs(source, exports[5], { n: ' {curlybrackets} ', ln: undefined });
    });

    if (!js)
    test('complex & edge cases', () => {
      const source = `
        export {
          foo,
          foo1 as foo2,
          " {left-curlybrace ",
          " {curly-brackets}" as "@notidentifier",
          "?" as "identifier",
        } from './mod0.js';
        export { "p as 'z' from 'asdf'" as "z'" } from 'asdf';
        export { "z'" as "p as 'z' from 'asdf'" } from 'asdf';`;
      const [imports, exports] = parse(source);
      assert.strictEqual(imports.length, 3);

      assert.strictEqual(exports.length, 7);
      assertExportIs(source, exports[0], { n: 'foo', ln: undefined });
      assertExportIs(source, exports[1], { n: 'foo2', ln: undefined });
      assertExportIs(source, exports[2], { n: ' {left-curlybrace ', ln: undefined });
      assertExportIs(source, exports[3], { n: '@notidentifier', ln: undefined });
      assertExportIs(source, exports[4], { n: 'identifier', ln: undefined });
      assertExportIs(source, exports[5], { n: "z'", ln: undefined });
      assertExportIs(source, exports[6], { n: "p as 'z' from 'asdf'", ln: undefined });
    });
  });

  test('Facade', () => {
    if (min) return; // facade/hasModuleSyntax not emitted in minimal build
    const [,, facade] = parse(`
      export * from 'external';
      import * as ns from 'external2';
      export { a as b } from 'external3';
      export { ns };
    `);
    assert.strictEqual(facade, true);
  });

  test('Facade default', () => {
    if (min) return; // facade/hasModuleSyntax not emitted in minimal build
    const [,, facade] = parse(`
      import * as ns from 'external';
      export default ns;
    `);
    assert.strictEqual(facade, false);
  });

  test('Facade declaration1', () => {
    if (min) return; // facade/hasModuleSyntax not emitted in minimal build
    const [,, facade] = parse(`export function p () {}`);
    assert.strictEqual(facade, false);
  });

  test('Facade declaration2', () => {
    if (min) return; // facade/hasModuleSyntax not emitted in minimal build
    const [,, facade] = parse(`export var p`);
    assert.strictEqual(facade, false);
  });

  test('Facade declaration3', () => {
    if (min) return; // facade/hasModuleSyntax not emitted in minimal build
    const [,, facade] = parse(`export {}l`);
    assert.strictEqual(facade, false);
  });

  test('Facade declaration4', () => {
    if (min) return; // facade/hasModuleSyntax not emitted in minimal build
    const [,, facade] = parse(`export class Q{}`);
    assert.strictEqual(facade, false);
  });

  test('Facade side effect', () => {
    if (min) return; // facade/hasModuleSyntax not emitted in minimal build
    const [,, facade] = parse(`console.log('any non esm syntax')`);
    assert.strictEqual(facade, false);
  });

  test('Export default', () => {
    const source = `
    export default async function example   () {};
    export const a = '1';
    export default a;
    export default function example1() {};
    export default function() {};
    export default class className {/* ... */};
    export default class {}
    export default function* generatorFunctionName(){/* ... */};
    export default function* ()  {};
    const async = 1
    export default async

    function x() {}

    const asyncVar = 1
    export default asyncVar

    function functionName = {};
    export default functionName;
  `;
    const [imports, exports] = parse(source);
    assert.strictEqual(imports.length, 0);
    assert.strictEqual(exports.length, 12);
    assertExportIs(source, exports[0], { n: 'default', ln: 'example'});
    assertExportIs(source, exports[1], { n: 'a', ln: 'a' });
    assertExportIs(source, exports[2], { n: 'default', ln: undefined });
    assertExportIs(source, exports[3], { n: 'default', ln: 'example1'});
    assertExportIs(source, exports[4], { n: 'default' });
    assertExportIs(source, exports[5], { n: 'default', ln: 'className'});
    assertExportIs(source, exports[6], { n: 'default' });
    assertExportIs(source, exports[7], { n: 'default', ln: 'generatorFunctionName'});
    assertExportIs(source, exports[8], { n: 'default' });
    assertExportIs(source, exports[9], { n: 'default', ln: undefined });
    assertExportIs(source, exports[10], { n: 'default', ln: undefined });
    assertExportIs(source, exports[11], { n: 'default', ln: undefined });
  });

  test('hasModuleSyntax import1', () => {
    if (min) return; // facade/hasModuleSyntax not emitted in minimal build
    const [,,, hasModuleSyntax] = parse('import foo from "./foo"')
    assert.strictEqual(hasModuleSyntax, true)
  })
  test('hasModuleSyntax import2', () => {
    if (min) return; // facade/hasModuleSyntax not emitted in minimal build
    const [,,, hasModuleSyntax] = parse('const foo = "import"')
    assert.strictEqual(hasModuleSyntax, false)
  })
  test('hasModuleSyntax import3', () => {
    if (min) return; // facade/hasModuleSyntax not emitted in minimal build
    const [,,, hasModuleSyntax] = parse('import("./foo")')
    // dynamic imports can be used in non-ESM files as well
    assert.strictEqual(hasModuleSyntax, false)
  })
  test('hasModuleSyntax import4', () => {
    if (min) return; // facade/hasModuleSyntax not emitted in minimal build
    const [,,, hasModuleSyntax] = parse('import.meta.url')
    assert.strictEqual(hasModuleSyntax, true)
  })
  test('hasModuleSyntax export1', () => {
    if (min) return; // facade/hasModuleSyntax not emitted in minimal build
    const [,,, hasModuleSyntax] = parse('export const foo = "foo"')
    assert.strictEqual(hasModuleSyntax, true)
  })
  test('hasModuleSyntax export2', () => {
    if (min) return; // facade/hasModuleSyntax not emitted in minimal build
    const [,,, hasModuleSyntax] = parse('export {}')
    assert.strictEqual(hasModuleSyntax, true)
  })
  test('hasModuleSyntax export3', () => {
    if (min) return; // facade/hasModuleSyntax not emitted in minimal build
    const [,,, hasModuleSyntax] = parse('export * from "./foo"')
    assert.strictEqual(hasModuleSyntax, true)
  })
});

suite('Invalid syntax', () => {
  setup(async () => await init);

  test('Unterminated object', () => {
    const source = `
      const foo = };
      const bar = {};
    `;
    try {
      parse(source);
    }
    catch (err) {
      assert.strictEqual(err.message, 'Parse error @:2:19');
    }
  });

  test('Invalid string', () => {
    const source = `import './export.js';

import d from './export.js';

import { s as p } from './reexport1.js';

import { z, q as r } from './reexport2.js';

   '

import * as q from './reexport1.js';

export { d as a, p as b, z as c, r as d, q }`;
    try {
      parse(source);
    }
    catch (err) {
      assert.strictEqual(err.message, 'Parse error @:9:5');
    }
  });

  test('Invalid export', () => {
    try {
      const source = `export { a = };`;
      parse(source);
      assert(false, 'Should error');
    }
    catch (err) {
      assert.strictEqual(err.idx, 11);
    }
  });

  test('Large source', () => {
    const source = `import 'a';\nconst x = "${'a'.repeat(5 * 1024 * 1024)}";\nexport { x }`;
    const [imports, exports] = parse(source);
    assert.strictEqual(imports.length, 1);
    assert.strictEqual(imports[0].n, 'a');
    assert.strictEqual(exports.length, 1);
    assert.strictEqual(exports[0].n, 'x');
  });
});
