/** @typedef {import('@babel/types').ImportDeclaration} ImportDeclaration */
/** @typedef {import('@babel/parser').Token | import('@babel/types').Comment} Token */
/** @typedef {typeof import('es-module-lexer/bindings')} Lexer */

import assert from 'node:assert/strict';

import { parseSync } from '@babel/core';

const iterations = Number(process.argv[2] ?? 2000);
const initialSeed = Number(process.argv[3] ?? 0x163b1ad) >>> 0;
let seed = initialSeed;
let localIndex = 0;

function random() {
  seed ^= seed << 13;
  seed ^= seed >>> 17;
  seed ^= seed << 5;
  return (seed >>> 0) / 0x100000000;
}

/**
 * @template Value
 * @param {Value[]} values
 */
function pick(values) {
  return values[Math.floor(random() * values.length)];
}

function whitespace() {
  return pick([' ', '\n', '\t', '/* from } as */', '// }\n', '\u00a0', '\u2000', '\u2028', '\ufeff']);
}

function localName() {
  return pick(['local', 'λ', '𐐀', 'l\\u0061']) + localIndex++;
}

function declaration() {
  const typeOnly = random() < 0.25;
  const kind = pick(typeOnly ? ['default', 'namespace', 'named'] : ['side-effect', 'default', 'namespace', 'named', 'mixed']);
  const prefix = 'import' + whitespace() + (typeOnly ? 'type' + whitespace() : '');
  if (kind === 'side-effect') return prefix + "'module';";
  let clause;
  if (kind === 'default') {
    clause = localName();
  }
  else if (kind === 'namespace') {
    clause = '*' + whitespace() + 'as' + whitespace() + localName();
  }
  else {
    const specifiers = [];
    const count = Math.floor(random() * 5);
    for (let index = 0; index < count; index++) {
      const imported = pick(['a', 'default', 'as', 'type', '\\u0062', 'π', '"line\\u002dbreak"']);
      const modifier = !typeOnly && imported[0] !== '"' && random() < 0.3 ? 'type' + whitespace() : '';
      specifiers.push(modifier + imported + whitespace() + 'as' + whitespace() + localName());
    }
    clause = '{' + whitespace() + specifiers.join(',' + whitespace()) +
      (count && random() < 0.5 ? ',' : '') + whitespace() + '}';
    if (kind === 'mixed') clause = localName() + whitespace() + ',' + whitespace() + clause;
  }
  return prefix + clause + whitespace() + 'from' + whitespace() + "'module';";
}

/** @param {string} source */
function expectedImports(source) {
  const ast = parseSync(source, {
    sourceType: 'module', configFile: false, babelrc: false,
    parserOpts: { plugins: ['typescript'], tokens: true }
  });
  return ast.program.body.map(/** @param {ImportDeclaration} declaration */ declaration => {
    const bindings = declaration.specifiers.map(/** @param {ImportDeclaration['specifiers'][number]} specifier */ specifier => {
      const type = specifier.type === 'ImportSpecifier' ? 'named' :
        specifier.type === 'ImportDefaultSpecifier' ? 'default' : 'namespace';
      return {
        type,
        importName: type === 'named' ? specifier.imported.name ?? specifier.imported.value :
          type === 'default' ? 'default' : null,
        localName: specifier.local.name,
        importNameStart: type === 'named' ? specifier.imported.start : -1,
        importNameEnd: type === 'named' ? specifier.imported.end : -1,
        localStart: specifier.local.start,
        localEnd: specifier.local.end,
        typeOnly: declaration.importKind === 'type' || specifier.importKind === 'type'
      };
    });
    const tokens = ast.tokens.filter(/** @param {Token} token */ token => typeof token.type === 'object' &&
      token.start >= declaration.start && token.end <= declaration.source.start);
    const clauseStartIndex = declaration.importKind === 'type' ? 2 : 1;
    const hasClause = tokens.length > clauseStartIndex;
    return { bindings, clauseStart: hasClause ? tokens[clauseStartIndex].start : -1,
      clauseEnd: hasClause ? tokens[tokens.length - 2].end : -1 };
  });
}

const lexers = await Promise.all([
  import('es-module-lexer/bindings'), import('es-module-lexer/bindings/js')
]);
await Promise.all(lexers.map(/** @param {Lexer} lexer */ lexer => lexer.init()));

for (let iteration = 0; iteration < iterations; iteration++) {
  localIndex = 0;
  const source = '/* 😀 */' + Array.from({ length: 1 + Math.floor(random() * 4) }, declaration).join('\n');
  try {
    const expected = expectedImports(source);
    for (const lexer of lexers) {
      const [imports] = lexer.parse(source);
      assert.equal(imports.length, expected.length);
      for (let index = 0; index < imports.length; index++) {
        assert.deepEqual(imports[index].bindings, expected[index].bindings);
        assert.equal(imports[index].clauseStart, expected[index].clauseStart);
        assert.equal(imports[index].clauseEnd, expected[index].clauseEnd);
      }
    }
  }
  catch (error) {
    console.error(JSON.stringify({ seed: initialSeed, iteration, source }));
    throw error;
  }
}

console.log(`PASS ${iterations} cases per engine, seed ${initialSeed}`);
