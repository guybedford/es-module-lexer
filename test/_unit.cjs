const assert = require('assert');

let parse;
const init = (async () => {
  let init;
  ({ parse, init } = await import('../dist/lexer.mjs'));
  await init();
})();

suite('Lexer', () => {
  beforeEach(async () => await init);

  test('Regexp case', () => {
    parse(`
      class Number {

      }
      
      /("|')(?<value>(\\\\(\\1)|[^\\1])*)?(\\1)/.exec(\`'\\\\"\\\\'aa'\`);
      
      const x = \`"\${label.replace(/"/g, "\\\\\\"")}"\`
    `);
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
    parse(`'asdf'`);
    parse(`/asdf/`);
    parse(`\`asdf\``);
    parse(`/**/`);
    parse(`//`);
  });

  test('shebang', () => {
    var { exports } = parse(`#!`);
    assert.equal(exports.length, 0);
    
    var { exports } = parse(`#! (  {
      exports.asdf = 'asdf';
    `);
    assert.equal(exports.length, 1);
    assert.equal(exports[0], 'asdf');
  });

  test('module.exports', () => {
    const { exports } = parse(`
      module.exports.asdf = 'asdf';
    `);
    assert.equal(exports.length, 1);
    assert.equal(exports[0], 'asdf');
  });

  test('identifiers', () => {
    const { exports } = parse(`
      exports['not identifier'] = 'asdf';
      exports['@notidentifier'] = 'asdf';
      Object.defineProperty(exports, "%notidentifier");
      Object.defineProperty(exports, 'hm🤔');
      exports['⨉'] = 45;
      exports['α'] = 54;
      exports.package = 'RESERVED!';
    `);
    assert.equal(exports.length, 1);
    assert.equal(exports[0], 'α');
  });

  test('Literal exports', () => {
    const { exports } = parse(`
      module.exports = { a, b: c, d, 'e': f };
    `);
    assert.equal(exports.length, 4);
    assert.equal(exports[0], 'a');
    assert.equal(exports[1], 'b');
    assert.equal(exports[2], 'd');
    assert.equal(exports[3], 'e');
  });

  test('Literal exports unsupported', () => {
    const { exports } = parse(`
      module.exports = { a = 5, b };
    `);
    assert.equal(exports.length, 1);
    assert.equal(exports[0], 'a');
  });

  test('Literal exports example', () => {
    const { exports } = parse(`
      module.exports = {
        // These WILL be detected as exports
        a: a,
        b: b,
        
        // This WILL be detected as an export
        e: require('d'),
      
        // These WONT be detected as exports
        // because the object parser stops on the non-identifier
        // expression "require('d')"
        f: 'f'
      }
    `);
    assert.equal(exports.length, 3);
    assert.equal(exports[2], 'e');
  });

  test('Literal exports complex', () => {
    const { exports } = parse(`    
      function defineProp(name, value) {
        delete module.exports[name];
        module.exports[name] = value;
        return value;
      }
    
      module.exports = {
        Parser: Parser,
        Tokenizer: require("./Tokenizer.js"),
        ElementType: require("domelementtype"),
        DomHandler: DomHandler,
        get FeedHandler() {
            return defineProp("FeedHandler", require("./FeedHandler.js"));
        },
        get Stream() {
            return defineProp("Stream", require("./Stream.js"));
        },
        get WritableStream() {
            return defineProp("WritableStream", require("./WritableStream.js"));
        },
        get ProxyHandler() {
            return defineProp("ProxyHandler", require("./ProxyHandler.js"));
        },
        get DomUtils() {
            return defineProp("DomUtils", require("domutils"));
        },
        get CollectingHandler() {
            return defineProp(
                "CollectingHandler",
                require("./CollectingHandler.js")
            );
        },
        // For legacy support
        DefaultHandler: DomHandler,
        get RssHandler() {
            return defineProp("RssHandler", this.FeedHandler);
        },
        //helper methods
        parseDOM: function(data, options) {
            var handler = new DomHandler(options);
            new Parser(handler, options).end(data);
            return handler.dom;
        },
        parseFeed: function(feed, options) {
            var handler = new module.exports.FeedHandler(options);
            new Parser(handler, options).end(feed);
            return handler.dom;
        },
        createDomStream: function(cb, options, elementCb) {
            var handler = new DomHandler(cb, options, elementCb);
            return new Parser(handler, options);
        },
        // List of all events that the parser emits
        EVENTS: {
            /* Format: eventname: number of arguments */
            attribute: 2,
            cdatastart: 0,
            cdataend: 0,
            text: 1,
            processinginstruction: 2,
            comment: 1,
            commentend: 0,
            closetag: 1,
            opentag: 2,
            opentagname: 1,
            error: 1,
            end: 0
        }
      };
    `);
    assert.equal(exports.length, 2);
    assert.equal(exports[0], 'Parser');
    assert.equal(exports[1], 'Tokenizer');
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

  test('plus plus division', () => {
    parse(`
      tick++/fetti;f=(1)+")";
    `);
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
      exports['b'].b;
    `;
    const { exports } = parse(source);
    assert.ok(exports[0] === 'a');
    assert.ok(exports[1] === 'b');
  });
});
