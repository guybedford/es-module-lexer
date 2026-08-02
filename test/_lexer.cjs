let lexerParse;

const minimal = !!process.env.MINIMAL;

async function loadLexer() {
  if (lexerParse) return;
  if (process.env.ASM) {
    ({ parse: lexerParse } = await import(
      minimal ? '../dist/lexer.minimal.asm.js' : '../dist/lexer.asm.js'
    ));
  }
  else {
    const lexer = await import(minimal ? '../dist/lexer.minimal.js' : '../dist/lexer.js');
    await lexer.init;
    lexerParse = lexer.parse;
  }
}

// The shared test suites are written against the terse minimal record shape.
// The full builds report the string-discriminated API, so records are strictly
// mapped back to the terse fields here rather than forking every assertion;
// test/full-api.cjs asserts the full API shape directly.
function terseImport (record) {
  switch (record.type) {
    case 'import-meta':
      return { n: undefined, t: 3, s: record.start, e: record.end, ss: record.importStart, se: record.importEnd, d: -2, a: -1, at: null, tp: false };
    case 'dynamic':
      return { n: record.specifier, t: record.phase === 'source' ? 5 : record.phase === 'defer' ? 7 : 2, s: record.start, e: record.end, ss: record.importStart, se: record.importEnd, d: record.dynamicStart, a: record.attributesStart, at: record.attributes, tp: false };
    case 'static':
    case 'reexport-star':
      return { n: record.specifier, t: record.type === 'reexport-star' ? 8 : record.phase === 'source' ? 4 : record.phase === 'defer' ? 6 : 1, s: record.start, e: record.end, ss: record.importStart, se: record.importEnd, d: -1, a: record.attributesStart, at: record.attributes, tp: record.typeOnly };
    default:
      throw new Error(`Unexpected full-build import record type ${record.type}`);
  }
}

function terseExport (record) {
  switch (record.type) {
    case 'direct':
      return { t: 1, n: record.name, ln: record.localName, s: record.start, e: record.end, ls: record.localStart, le: record.localEnd, ss: record.exportStart, tp: record.typeOnly };
    case 'reexport':
      return { t: 2, n: record.name, im: record.importName, ims: record.importNameStart, ime: record.importNameEnd, f: record.from, fi: record.importIndex, s: record.start, e: record.end, ss: record.exportStart, tp: record.typeOnly };
    case 'reexport-all':
      return { t: 3, f: record.from, fi: record.importIndex, s: record.start, e: record.end, ss: record.exportStart, tp: record.typeOnly };
    default:
      throw new Error(`Unexpected full-build export record type ${record.type}`);
  }
}

/**
 * @param {string | Uint8Array} source
 * @param {string} [name]
 */
function parse(source, name) {
  const result = lexerParse(source, name);
  if (minimal) return result;
  const [imports, exports, ...rest] = result;
  return [imports.map(terseImport), exports.map(terseExport), ...rest];
}

module.exports = {
  init: loadLexer(),
  parse,
};
