const assert = require('assert');

let parse;
const init = (async () => {
  let init;
  ({ parse, init } = await import('../dist/lexer.js'));
  await init;
})();

suite('Lexer', () => {
  beforeEach(async () => await init);

  test('module.exports', () => {
    const { exports } = parse(`
      module.exports.asdf = 'asdf';
    `);
    assert.equal(exports.length, 1);
    assert.equal(exports[0], 'asdf');
  });

  test('defineProperty', () => {
    const { exports } = parse(`
      Object.defineProperty(exports, 'namedExport', { value: true });
      Object.defineProperty(module.exports, 'thing', { value: true });
      Object.defineProperty(exports, "__esModule", { value: true });
    `);
    assert.equal(exports.length, 3);
    assert.equal(exports[0], 'namedExport');
    assert.equal(exports[1], 'thing');
    assert.equal(exports[2], '__esModule');
  });

  test('module assign', () => {
    const { exports, reexports } = parse(`
      module.exports.asdf = 'asdf';
      exports = 'asdf';
      module.exports = require('./asdf');
      if (maybe)
        module.exports = require("./another");
    `);
    console.log(exports);
    console.log(reexports);
    assert.equal(exports.length, 1);
    assert.equal(exports[0], 'asdf');
    assert.equal(reexports.length, 2);
    assert.equal(reexports[0], './asdf');
    assert.equal(reexports[1], './another');
  });

  test('Single parse cases', () => {
    parse(`'asdf'`);
    parse(`/asdf/`);
    parse(`\`asdf\``);
    parse(`/**/`);
    parse(`//`);
  });

  test('Simple export with unicode conversions', () => {
    const source = `export var p𓀀s,q`;
    assert.throws(() => {
      parse(source);
    });
  });

  test('Simple import', () => {
    const source = `
      import test from "test";
      console.log(test);
    `;
    assert.throws(() => {
      parse(source);
    });
  });

  test('Exported function', () => {
    const source = `
      export function a𓀀 () {

      }
      export class Q{

      }
    `;
    assert.throws(() => {
      parse(source);
    });
  });

  test('Export destructuring', () => {
    const source = `
      export const { a, b } = foo;

      export { ok };
    `;
    assert.throws(() => {
      parse(source);
    });
  });

  test('Minified import syntax', () => {
    const source = `import{TemplateResult as t}from"lit-html";import{a as e}from"./chunk-4be41b30.js";export{j as SVGTemplateResult,i as TemplateResult,g as html,h as svg}from"./chunk-4be41b30.js";window.JSCompiler_renameProperty='asdf';`;
    assert.throws(() => {
      parse(source);
    });
  });

  test('return bracket division', () => {
    const source = `function variance(){return s/(a-1)}`;
    assert.ok(parse(source));
  });

  test('import.meta', () => {
    const source = `
      export var hello = 'world';
      console.log(import.meta.url);
    `;
    assert.throws(() => {
      parse(source);
    });
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
    assert.throws(() => {
      parse(source);
    });
  });

  test('dynamic import method', async () => {
    await init;
    const source = `
      class A {
        import() {
        }
      }
    `;
    assert.ok(parse(source));
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
    assert.throws(() => {
      parse(source);
    });
  });

  test('Bracket matching', () => {
    assert.ok(parse(`
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
    `));
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
    `;
    assert.ok(parse(source));
  });

  test('Template string expression ambiguity', () => {
    const source = `
      \`$\`
      import('a');
      \`\`
      exports.a = 'a';
      \`a$b\`
      exports['b'] = 'b';
      \`{$}\`
    `;
    const { exports } = parse(source);
    console.log(exports);
    assert.ok(exports[0] === 'a');
    assert.ok(exports[1] === 'b');
  });
});
