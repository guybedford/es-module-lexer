import assert from 'assert';
import { parse, init } from '../dist/lexer.js';

suite('Lexer', () => {
  test('Simple export with unicode conversions', async () => {
    await init;
    const source = `export var p𓀀s,q`;
    const [imports, exports] = parse(source);
    assert.equal(imports.length, 0);
    assert.equal(exports.length, 2);
    assert.equal(exports[0], 'p𓀀s');
    assert.equal(exports[1], 'q');
  });

  test('Simple import', () => {
    const source = `
      import test from "test";
      console.log(test);
    `;
    const [imports, exports] = parse(source);
    assert.equal(imports.length, 1);
    const { s, e, d } = imports[0];
    assert.equal(d, -1);
    assert.equal(source.slice(s, e), 'test');

    assert.equal(exports.length, 0);
  });

  test('Import/Export with comments', () => {
    const source = `
      import/* 'x' */ 'a';

      import /* 'x' */ 'b';

      export {
        a,
        // b,
        /* c */ d
      };
    `;
    const [imports, exports] = parse(source);
    assert.equal(imports.length, 2);
    assert.equal(source.slice(imports[0].s, imports[0].e), 'a');
    assert.equal(source.slice(imports[1].s, imports[1].e), 'b');
    assert.equal(exports.toString(), 'a,d');
  });

  test('Exported function', () => {
    const source = `
      export function a𓀀 () {

      }
      export class Q{

      }
    `;
    const [, exports] = parse(source);
    assert.equal(exports[0], 'a𓀀');
    assert.equal(exports[1], 'Q');
  });

  test('Export destructuring', () => {
    const source = `
      export const { a, b } = foo;

      export { ok };
    `;
    const [, exports] = parse(source);
    assert.equal(exports[0], 'ok');
  });

  test('Minified import syntax', () => {
    const source = `import{TemplateResult as t}from"lit-html";import{a as e}from"./chunk-4be41b30.js";export{j as SVGTemplateResult,i as TemplateResult,g as html,h as svg}from"./chunk-4be41b30.js";window.JSCompiler_renameProperty='asdf';`;
    const [imports, exports] = parse(source);
    assert.equal(imports.length, 3);
    assert.equal(imports[0].s, 32);
    assert.equal(imports[0].e, 40);
    assert.equal(imports[1].s, 61);
    assert.equal(imports[1].e, 80);
    assert.equal(imports[2].s, 156);
    assert.equal(imports[2].e, 175);
  });

  test('More minified imports', () => {
    const source = `import"some/import.js";`
    const [imports, exports] = parse(source);
    assert.equal(imports.length, 1);
    assert.equal(imports[0].s, 7);
    assert.equal(imports[0].e, 21);
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
    assert.equal(imports.length, 1);
    const { s, e, d } = imports[0];
    assert.equal(d, -1);
    assert.equal(source.slice(s, e), 'test-dep');

    assert.equal(exports.length, 1); 
    assert.equal(exports[0], 'default');
  });

  test('import.meta', () => {
    const source = `
      export var hello = 'world';
      console.log(import.meta.url);
    `;
    const [imports, exports] = parse(source);
    assert.equal(imports.length, 1);
    const { s, e, d } = imports[0];
    assert.equal(d, -2);
    assert.equal(source.slice(s, e), 'import.meta');
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
    assert.equal(imports.length, 1);
    const { s, e, d } = imports[0];
    assert.equal(d, -2);
    assert.equal(source.slice(s, e), 'import.\n       meta');
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
    assert.equal(imports.length, 0);
  });

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
    assert.equal(imports.length, 3);
    var { s, e, d } = imports[0];
    assert.equal(source.substr(d, 6), 'import');
    assert.equal(source.slice(s, e), 'is1');

    var { s, e, d } = imports[1];
    assert.equal(source.slice(s, e), 'is2');

    var { s, e, d } = imports[2];
    assert.equal(source.slice(s, e), 'some_url');
  });

  test('import after code', () => {
    const source = `
      export function f () {
        g();
      }
      
      import { g } from './test-circular2.js';
    `;
    const [imports, exports] = parse(source);
    assert.equal(imports.length, 1);
    const { s, e, d } = imports[0];
    assert.equal(d, -1);
    assert.equal(source.slice(s, e), './test-circular2.js');

    assert.equal(exports.length, 1);
    assert.equal(exports[0], 'f');
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
    assert.equal(imports.length, 1);
    assert.equal(source.slice(imports[0].s, imports[0].e), 'util');
    assert.equal(exports.length, 1);
    assert.equal(exports[0], 'a');
  });

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
    assert.equal(imports.length, 2);
    assert.notEqual(imports[0].d, -1);
    assert.equal(source.slice(imports[0].d, imports[0].s), 'import(');
    assert.notEqual(imports[1].d, -1);
    assert.equal(source.slice(imports[1].d, imports[1].s), 'import(');
    assert.equal(exports.length, 1);
    assert.equal(exports[0], 'a');
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
      finally{}/a'/g
      (){}/d'export { b }/g
      ;{}/e'/g;
      {}/f'/g
      a / 'b' / c;
      /a'/ - /b'/;
      +{} /g -'/g'
      ('a')/h -'/g'
      if //x
      ('a')/i'/g;
      /asdf/ / /as'df/; // '
      \`\${/test/ + 5}\`
      /regex/ / x;
      function () {
        return /*asdf8*// 5/;
      }
      export { a };
    `;
    const [imports, exports] = parse(source);
    assert.equal(imports.length, 0);
    assert.equal(exports.length, 1);
    assert.equal(exports[0], 'a');
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
    assert.equal(imports.length, 2);
    assert.equal(exports.length, 1);
    assert.equal(exports[0], 'b');
  });
});
