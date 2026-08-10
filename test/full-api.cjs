const assert = require('assert');

// Direct assertions on the full-build string-discriminated record shapes; the
// shared suites in _unit.cjs cover lexing behavior through the terse mapping.
const min = !!process.env.MINIMAL;
let parse;
const init = (async () => {
  if (parse || min) return;
  if (process.env.ASM) {
    ({ parse } = await import('../dist/lexer.asm.js'));
  }
  else {
    const m = await import('../dist/lexer.js');
    await m.init;
    parse = m.parse;
  }
})();

suite('Full build API', () => {
  setup(async function () {
    if (min) this.skip();
    await init;
  });

  test('static import', () => {
    const source = `import a from './a.js';`;
    const [imports, exports] = parse(source);
    assert.deepStrictEqual(imports, [{
      type: 'static',
      specifier: './a.js',
      phase: null,
      start: source.indexOf('./a.js'),
      end: source.indexOf('./a.js') + 6,
      importStart: 0,
      importEnd: source.length - 1,
      attributes: null,
      attributesStart: -1,
      typeOnly: false
    }]);
    assert.deepStrictEqual(exports, []);
  });

  test('static import with attributes', () => {
    const source = `import a from './a.js' with { type: "json" };`;
    const [imports] = parse(source);
    assert.strictEqual(imports[0].type, 'static');
    assert.strictEqual(imports[0].attributesStart, source.indexOf('with') + 5);
    assert.deepStrictEqual(imports[0].attributes, [['type', 'json']]);
  });

  test('phase imports', () => {
    const source = `import source s from './s.js';\nimport defer * as d from './d.js';\nimport.source('./ds.js');\nimport.defer('./dd.js');`;
    const [imports] = parse(source);
    assert.deepStrictEqual(imports.map(({ type, phase, specifier }) => ({ type, phase, specifier })), [
      { type: 'static', phase: 'source', specifier: './s.js' },
      { type: 'static', phase: 'defer', specifier: './d.js' },
      { type: 'dynamic', phase: 'source', specifier: './ds.js' },
      { type: 'dynamic', phase: 'defer', specifier: './dd.js' }
    ]);
  });

  test('dynamic import', () => {
    const source = `const p = import('./x.js');`;
    const [imports] = parse(source);
    assert.deepStrictEqual(imports, [{
      type: 'dynamic',
      specifier: './x.js',
      phase: null,
      start: source.indexOf(`'./x.js'`),
      end: source.indexOf(`'./x.js'`) + 8,
      importStart: source.indexOf('import'),
      importEnd: source.indexOf(')') + 1,
      dynamicStart: source.indexOf('('),
      attributes: null,
      attributesStart: -1,
      probablyTypeOnly: false
    }]);
  });

  test('dynamic import template glob', () => {
    const source = 'import(`./locales/${locale}.js`)';
    const [imports] = parse(source);
    assert.strictEqual(imports[0].type, 'dynamic');
    assert.strictEqual(imports[0].specifier, './locales/*.js');
  });

  test('import.meta', () => {
    const source = `console.log(import.meta.url);`;
    const [imports] = parse(source);
    assert.deepStrictEqual(imports, [{
      type: 'import-meta',
      start: source.indexOf('import.meta'),
      end: source.indexOf('import.meta') + 11,
      importStart: source.indexOf('import.meta'),
      importEnd: source.indexOf('import.meta') + 11
    }]);
  });

  test('direct exports', () => {
    const source = `export const a = 1;\nexport default function () {}\nexport { a as b };`;
    const [, exports] = parse(source);
    assert.deepStrictEqual(exports.map(({ type, name, localName }) => ({ type, name, localName })), [
      { type: 'direct', name: 'a', localName: 'a' },
      { type: 'direct', name: 'default', localName: undefined },
      { type: 'direct', name: 'b', localName: 'a' }
    ]);
    const b = exports[2];
    assert.strictEqual(source.substring(b.start, b.end), 'b');
    assert.strictEqual(source.substring(b.localStart, b.localEnd), 'a');
    assert.strictEqual(b.exportStart, source.indexOf('export {'));
    assert.strictEqual(b.typeOnly, false);
  });

  test('type-only records', () => {
    const source = `import type { T } from './t.js';\nexport type { U } from './u.js';\nexport interface I {}`;
    const [imports, exports] = parse(source);
    assert.strictEqual(imports[0].type, 'static');
    assert.strictEqual(imports[0].typeOnly, true);
    assert.strictEqual(exports[0].type, 'reexport');
    assert.strictEqual(exports[0].typeOnly, true);
    assert.strictEqual(exports[1].type, 'direct');
    assert.strictEqual(exports[1].name, 'I');
    assert.strictEqual(exports[1].typeOnly, true);
  });

  test('reexports', () => {
    const source = `export { x as y } from './m.js';\nexport * as ns from './n.js';\nexport * from './all.js';`;
    const [imports, exports] = parse(source);
    assert.deepStrictEqual(exports.map(({ type, ...rest }) => ({ type, ...rest })), [{
      type: 'reexport',
      name: 'y',
      importName: 'x',
      importNameStart: source.indexOf('x as'),
      importNameEnd: source.indexOf('x as') + 1,
      from: './m.js',
      importIndex: 0,
      start: source.indexOf('y }'),
      end: source.indexOf('y }') + 1,
      exportStart: 0,
      typeOnly: false
    }, {
      type: 'reexport',
      name: 'ns',
      importName: null,
      importNameStart: -1,
      importNameEnd: -1,
      from: './n.js',
      importIndex: 1,
      start: source.indexOf('ns'),
      end: source.indexOf('ns') + 2,
      exportStart: source.indexOf('export * as'),
      typeOnly: false
    }, {
      type: 'reexport-all',
      from: './all.js',
      importIndex: 2,
      start: source.indexOf('* from'),
      end: source.indexOf('* from') + 1,
      exportStart: source.indexOf('export * from'),
      typeOnly: false
    }]);
    assert.strictEqual(imports[2].type, 'reexport-star');
    assert.strictEqual(imports[2].specifier, './all.js');
    assert.strictEqual(imports[exports[0].importIndex].specifier, exports[0].from);
  });

  test('detached reexport of an import binding', () => {
    const source = `import { x } from './m.js';\nexport { x };`;
    const [, exports] = parse(source);
    assert.strictEqual(exports[0].type, 'reexport');
    assert.strictEqual(exports[0].from, './m.js');
    assert.strictEqual(exports[0].importIndex, 0);
  });
});
