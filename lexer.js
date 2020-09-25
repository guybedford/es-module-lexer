let source, pos, end;
let openTokenDepth,
  templateDepth,
  lastTokenPos,
  lastSlashWasDivision,
  templateStack,
  templateStackDepth,
  openTokenPosStack,
  openClassPosStack,
  nextBraceIsClass,
  starExportMap,
  lastStarExportSpecifier,
  _exports,
  reexports;

function resetState () {
  openTokenDepth = 0;
  templateDepth = -1;
  lastTokenPos = -1;
  lastSlashWasDivision = false;
  templateStack = new Array(1024);
  templateStackDepth = 0;
  openTokenPosStack = new Array(1024);
  openClassPosStack = new Array(1024);
  nextBraceIsClass = false;
  starExportMap = Object.create(null);
  lastStarExportSpecifier = null;

  _exports = new Set();
  reexports = new Set();
}

const strictReserved = new Set(['implements', 'interface', 'let', 'package', 'private', 'protected', 'public', 'static', 'yield', 'enum']);

module.exports = function parseCJS (source, name = '@') {
  resetState();
  try {
    parseSource(source);
  }
  catch (e) {
    e.message += `\n  at ${name}:${source.slice(0, pos).split('\n').length}:${pos - source.lastIndexOf('\n', pos - 1)}`;
    e.loc = pos;
    throw e;
  }
  const result = { exports: [..._exports], reexports: [...reexports] };
  resetState();
  return result;
}

function addExport (name) {
  if (!strictReserved.has(name))
    _exports.add(name);
}

function parseSource (cjsSource) {
  source = cjsSource;
  pos = -1;
  end = source.length - 1;
  let ch = 0;

  // Handle #!
  if (source.charCodeAt(0) === 35/*#*/ && source.charCodeAt(1) === 33/*!*/) {
    if (source.length === 2)
      return true;
    pos += 2;
    while (pos++ < end) {
      ch = source.charCodeAt(pos);
      if (ch === 10/*\n*/ || ch === 13/*\r*/)
        break;
    }
  }

  while (pos++ < end) {
    ch = source.charCodeAt(pos);

    if (ch === 32 || ch < 14 && ch > 8)
      continue;

    switch (ch) {
      case 101/*e*/:
        if (source.slice(pos + 1, pos + 6) === 'xport' && keywordStart(pos)) {
          if (source.charCodeAt(pos + 6) === 115/*s*/)
            tryParseExportsDotAssign(false);
          else if (openTokenDepth === 0)
            throwIfExportStatement();
        }
        break;
      case 105/*i*/:
        if (source.slice(pos + 1, pos + 6) === 'mport' && keywordStart(pos))
          throwIfImportStatement();
        break;
      case 99/*c*/:
        if (keywordStart(pos) && source.slice(pos + 1, pos + 5) === 'lass' && isBrOrWs(source.charCodeAt(pos + 5)))
          nextBraceIsClass = true;
        break;
      case 109/*m*/:
        if (source.slice(pos + 1, pos + 6) === 'odule' && keywordStart(pos))
          tryParseModuleExportsDotAssign();
        break;
      case 79/*O*/:
        if (source.slice(pos + 1, pos + 6) === 'bject' && keywordStart(pos))
          tryParseObjectDefineOrKeys();
        break;
      case 114/*r*/: {
        const startPos = pos;
        if (openTokenDepth === 0 && tryParseRequire(false) && keywordStart(startPos))
          tryBacktrackAddStarExportBinding(startPos - 1);
        break;
      }
      case 95/*_*/:
        if (openTokenDepth === 0 && source.slice(pos + 1, pos + 8) === '_export' && (keywordStart(pos) || source.charCodeAt(pos - 1) === 46/*.*/)) {
          pos += 8;
          if (source.slice(pos, pos + 4) === 'Star')
            pos += 4;
          if (source.charCodeAt(pos) === 40/*(*/) {
            openTokenPosStack[openTokenDepth++] = lastTokenPos;
            if (source.charCodeAt(++pos) === 114/*r*/)
              tryParseRequire(true);
          }
        }
        break;
      case 40/*(*/:
        openTokenPosStack[openTokenDepth++] = lastTokenPos;
        break;
      case 41/*)*/:
        if (openTokenDepth === 0)
          throw new Error('Unexpected closing bracket.');
        openTokenDepth--;
        break;
      case 123/*{*/:
        openClassPosStack[openTokenDepth] = nextBraceIsClass;
        nextBraceIsClass = false;
        openTokenPosStack[openTokenDepth++] = lastTokenPos;
        break;
      case 125/*}*/:
        if (openTokenDepth === 0)
          throw new Error('Unexpected closing brace.');
        if (openTokenDepth-- === templateDepth) {
          templateDepth = templateStack[--templateStackDepth];
          templateString();
        }
        else {
          if (templateDepth !== -1 && openTokenDepth < templateDepth)
            throw new Error('Unexpected closing brace.');
        }
        break;
      case 60/*>*/:
        // TODO: <!-- XML comment support
        break;
      case 39/*'*/:
        singleQuoteString();
        break;
      case 34/*"*/:
        doubleQuoteString();
        break;
      case 47/*/*/: {
        const next_ch = source.charCodeAt(pos + 1);
        if (next_ch === 47/*/*/) {
          lineComment();
          // dont update lastToken
          continue;
        }
        else if (next_ch === 42/***/) {
          blockComment();
          // dont update lastToken
          continue;
        }
        else {
          // Division / regex ambiguity handling based on checking backtrack analysis of:
          // - what token came previously (lastToken)
          // - if a closing brace or paren, what token came before the corresponding
          //   opening brace or paren (lastOpenTokenIndex)
          const lastToken = source.charCodeAt(lastTokenPos);
          if (isExpressionPunctuator(lastToken) &&
              !(lastToken === 46/*.*/ && (source.charCodeAt(lastTokenPos - 1) >= 48/*0*/ && source.charCodeAt(lastTokenPos - 1) <= 57/*9*/)) &&
              !(lastToken === 43/*+*/ && source.charCodeAt(lastTokenPos - 1) === 43/*+*/) && !(lastToken === 45/*-*/ && source.charCodeAt(lastTokenPos - 1) === 45/*-*/) ||
              lastToken === 41/*)*/ && isParenKeyword(openTokenPosStack[openTokenDepth]) ||
              lastToken === 125/*}*/ && (isExpressionTerminator(openTokenPosStack[openTokenDepth]) || openClassPosStack[openTokenDepth]) ||
              lastToken === 47/*/*/ && lastSlashWasDivision ||
              isExpressionKeyword(lastTokenPos) ||
              !lastToken) {
            regularExpression();
            lastSlashWasDivision = false;
          }
          else {
            lastSlashWasDivision = true;
          }
        }
        break;
      }
      case 96/*`*/:
        templateString();
        break;
    }
    lastTokenPos = pos;
  }

  if (templateDepth !== -1)
    throw new Error('Unterminated template.');

  if (openTokenDepth)
    throw new Error('Unterminated braces.');
}

function tryBacktrackAddStarExportBinding (bPos) {
  while (source.charCodeAt(bPos) === 32/* */ && bPos >= 0)
    bPos--;
  if (source.charCodeAt(bPos) === 61/*=*/) {
    bPos--;
    while (source.charCodeAt(bPos) === 32/* */ && bPos >= 0)
      bPos--;
    let codePoint;
    const id_end = bPos;
    let identifierStart = false;
    while ((codePoint = codePointAtLast(bPos)) && bPos >= 0) {
      if (codePoint === 92/*\*/)
        return;
      if (!isIdentifierChar(String.fromCodePoint(codePoint)))
        break;
      identifierStart = isIdentifierStart(String.fromCodePoint(codePoint));
      bPos -= codePointLen(codePoint);
    }
    if (identifierStart && source.charCodeAt(bPos) === 32/* */) {
      const starExportId = source.slice(bPos + 1, id_end + 1);
      while (source.charCodeAt(bPos) === 32/* */ && bPos >= 0)
        bPos--;
      switch (source.charCodeAt(bPos)) {
        case 114/*r*/:
          if (source.slice(bPos - 2, bPos) !== 'va')
            return;
          break;
        case 116/*t*/:
          if (source.slice(bPos - 2, bPos) !== 'le' && source.slice(bPos - 4, bPos) !== 'cons')
            return;
          break;
        default: return;
      }
      starExportMap[starExportId] = lastStarExportSpecifier;
    }
  }
}

function tryParseObjectDefineOrKeys () {
  pos += 6;
  let revertPos = pos - 1;
  let ch = commentWhitespace();
  if (ch === 46/*.*/) {
    pos++;
    ch = commentWhitespace();
    if (ch === 100/*d*/ && source.slice(pos + 1, pos + 14) === 'efineProperty') {
      pos += 14;
      revertPos = pos - 1;
      ch = commentWhitespace();
      if (ch !== 40/*(*/) {
        pos = revertPos;
        return;
      }
      pos++;
      ch = commentWhitespace();
      if (readExportsOrModuleDotExports(ch)) {
        ch = commentWhitespace();
        if (ch === 44/*,*/) {
          pos++;
          ch = commentWhitespace();
          if (ch === 39/*'*/ || ch === 34/*"*/) {
            const exportPos = ++pos;
            if (identifier() && source.charCodeAt(pos) === ch) {
              // revert for "("
              addExport(source.slice(exportPos, pos));
            }
          }
        }
      }
    }
    else if (ch === 107/*k*/ && source.slice(pos + 1, pos + 4) === 'eys') {
      while (true) {
        pos += 4;
        revertPos = pos - 1;
        ch = commentWhitespace();
        if (ch !== 40/*(*/) break;
        pos++;
        ch = commentWhitespace();
        const id_start = pos;
        if (!identifier()) break;
        const id = source.slice(id_start, pos);
        ch = commentWhitespace();
        if (ch !== 41/*)*/) break;

        revertPos = pos++;
        ch = commentWhitespace();
        if (ch !== 46/*.*/) break;
        pos++;
        ch = commentWhitespace();
        if (ch !== 102/*f*/ || source.slice(pos + 1, pos + 7) !== 'orEach') break;
        pos += 7;
        ch = commentWhitespace();
        revertPos = pos - 1;
        if (ch !== 40/*(*/) break;
        pos++;
        ch = commentWhitespace();
        if (ch !== 102/*f*/ || source.slice(pos + 1, pos + 8) !== 'unction') break;
        pos += 8;
        ch = commentWhitespace();
        if (ch !== 40/*(*/) break;
        pos++;
        ch = commentWhitespace();
        const it_id_start = pos;
        if (!identifier()) break;
        const it_id = source.slice(it_id_start, pos);
        ch = commentWhitespace();
        if (ch !== 41/*)*/) break;
        pos++;
        ch = commentWhitespace();
        if (ch !== 123/*{*/) break;
        pos++;
        ch = commentWhitespace();
        if (ch !== 105/*i*/ || source.slice(pos + 1, pos + 3) !== 'f ') break;
        pos += 3;
        ch = commentWhitespace();
        if (ch !== 40/*(*/) break;
        pos++;
        ch = commentWhitespace();
        if (it_id !== source.slice(pos, pos + it_id.length)) break;
        pos += it_id.length;
        ch = commentWhitespace();
        // `if (` IDENTIFIER$2 `===` ( `'default'` | `"default"` ) `||` IDENTIFIER$2 `===` ( '__esModule' | `"__esModule"` ) `) return` `;`? |
        if (ch === 61/*=*/) {
          if (source.slice(pos + 1, pos + 3) !== '==') break;
          pos += 3;
          ch = commentWhitespace();
          if (ch !== 34/*"*/ && ch !== 39/*'*/) break;
          let quot = ch;
          if (source.slice(pos + 1, pos + 8) !== 'default') break;
          pos += 8;
          ch = commentWhitespace();
          if (ch !== quot) break;
          pos += 1;
          ch = commentWhitespace();
          if (ch !== 124/*|*/ || source.charCodeAt(pos + 1) !== 124/*|*/) break;
          pos += 2;
          ch = commentWhitespace();
          if (source.slice(pos, pos + it_id.length) !== it_id) break;
          pos += it_id.length;
          ch = commentWhitespace();
          if (ch !== 61/*=*/ || source.slice(pos + 1, pos + 3) !== '==') break;
          pos += 3;
          ch = commentWhitespace();
          if (ch !== 34/*"*/ && ch !== 39/*'*/) break;
          quot = ch;
          if (source.slice(pos + 1, pos + 11) !== '__esModule') break;
          pos += 11;
          ch = commentWhitespace();
          if (ch !== quot) break;
          pos += 1;
          ch = commentWhitespace();
          if (ch !== 41/*)*/) break;
          pos += 1;
          ch = commentWhitespace();
          if (ch !== 114/*r*/ || source.slice(pos + 1, pos + 6) !== 'eturn') break;
          pos += 6;
          ch = commentWhitespace();
          if (ch === 59/*;*/)
            pos++;
          ch = commentWhitespace();
        }
        // `if (` IDENTIFIER$2 `!==` ( `'default'` | `"default"` ) `)`
        else if (ch === 33/*!*/) {
          if (source.slice(pos + 1, pos + 3) !== '==') break;
          pos += 3;
          ch = commentWhitespace();
          if (ch !== 34/*"*/ && ch !== 39/*'*/) break;
          const quot = ch;
          if (source.slice(pos + 1, pos + 8) !== 'default') break;
          pos += 8;
          ch = commentWhitespace();
          if (ch !== quot) break;
          pos += 1;
          ch = commentWhitespace();
          if (ch !== 41/*)*/) break;
          pos += 1;
          ch = commentWhitespace();
        }
        else break;

        // EXPORTS_IDENTIFIER `[` IDENTIFIER$2 `] =` IDENTIFIER$1 `[` IDENTIFIER$2 `]`
        if (readExportsOrModuleDotExports(ch)) {
          ch = commentWhitespace();
          if (ch !== 91/*[*/) break;
          pos++;
          ch = commentWhitespace();
          if (source.slice(pos, pos + it_id.length) !== it_id) break;
          pos += it_id.length;
          ch = commentWhitespace();
          if (ch !== 93/*]*/) break;
          pos++;
          ch = commentWhitespace();
          if (ch !== 61/*=*/) break;
          pos++;
          ch = commentWhitespace();
          if (source.slice(pos, pos + id.length) !== id) break;
          pos += id.length;
          ch = commentWhitespace();
          if (ch !== 91/*[*/) break;
          pos++;
          ch = commentWhitespace();
          if (source.slice(pos, pos + it_id.length) !== it_id) break;
          pos += it_id.length;
          ch = commentWhitespace();
          if (ch !== 93/*]*/) break;
          pos++;
          ch = commentWhitespace();
          if (ch === 59/*;*/) {
            pos++;
            ch = commentWhitespace();
          }
        }
        // `Object.defineProperty(` EXPORTS_IDENTIFIER `, ` IDENTIFIER$2 `, { enumerable: true, get: function () { return ` IDENTIFIER$1 `[` IDENTIFIER$2 `]; } })`
        else if (ch === 79/*O*/) {
          if (source.slice(pos + 1, pos + 6) !== 'bject') break;
          pos += 6;
          ch = commentWhitespace();
          if (ch !== 46/*.*/) break;
          pos++;
          ch = commentWhitespace();
          if (ch !== 100/*d*/ || source.slice(pos + 1, pos + 14) !== 'efineProperty') break;
          pos += 14;
          ch = commentWhitespace();
          if (ch !== 40/*(*/) break;
          pos++;
          ch = commentWhitespace();
          if (!readExportsOrModuleDotExports(ch)) break;
          ch = commentWhitespace();
          if (ch !== 44/*,*/) break;
          pos++;
          ch = commentWhitespace();
          if (source.slice(pos, pos + it_id.length) !== it_id) break;
          pos += it_id.length;
          ch = commentWhitespace();
          if (ch !== 44/*,*/) break;
          pos++;
          ch = commentWhitespace();
          if (ch !== 123/*{*/) break;
          pos++;
          ch = commentWhitespace();
          if (ch !== 101/*e*/ || source.slice(pos + 1, pos + 10) !== 'numerable') break;
          pos += 10;
          ch = commentWhitespace();
          if (ch !== 58/*:*/) break;
          pos++;
          ch = commentWhitespace();
          if (ch !== 116/*t*/ && source.slice(pos + 1, pos + 4) !== 'rue') break;
          pos += 4;
          ch = commentWhitespace();
          if (ch !== 44/*,*/) break;
          pos++;
          ch = commentWhitespace();
          if (ch !== 103/*g*/ || source.slice(pos + 1, pos + 3) !== 'et') break;
          pos += 3;
          ch = commentWhitespace();
          if (ch !== 58/*:*/) break;
          pos++;
          ch = commentWhitespace();
          if (ch !== 102/*f*/ || source.slice(pos + 1, pos + 8) !== 'unction') break;
          pos += 8;
          ch = commentWhitespace();
          if (ch !== 40/*(*/) break;
          pos++;
          ch = commentWhitespace();
          if (ch !== 41/*)*/) break;
          pos++;
          ch = commentWhitespace();
          if (ch !== 123/*{*/) break;
          pos++;
          ch = commentWhitespace();
          if (ch !== 114/*r*/ || source.slice(pos + 1, pos + 6) !== 'eturn') break;
          pos += 6;
          ch = commentWhitespace();
          if (source.slice(pos, pos + id.length) !== id) break;
          pos += id.length;
          ch = commentWhitespace();
          if (ch !== 91/*[*/) break;
          pos++;
          ch = commentWhitespace();
          if (source.slice(pos, pos + it_id.length) !== it_id) break;
          pos += it_id.length;
          ch = commentWhitespace();
          if (ch !== 93/*]*/) break;
          pos++;
          ch = commentWhitespace();
          if (ch === 59/*;*/) {
            pos++;
            ch = commentWhitespace();
          }
          if (ch !== 125/*}*/) break;
          pos++;
          ch = commentWhitespace();
          if (ch !== 125/*}*/) break;
          pos++;
          ch = commentWhitespace();
          if (ch !== 41/*)*/) break;
          pos++;
          ch = commentWhitespace();
          if (ch === 59/*;*/) {
            pos++;
            ch = commentWhitespace();
          }
        }
        else break;

        if (ch !== 125/*}*/) break;
        pos++;
        ch = commentWhitespace();
        if (ch !== 41/*)*/) break;

        const starExportSpecifier = starExportMap[id];
        if (starExportSpecifier) {
          reexports.add(starExportSpecifier);
          pos = revertPos;
          return;
        }
        return;
      }
    }
  }
  pos = revertPos;
}

function readExportsOrModuleDotExports (ch) {
  const revertPos = pos;
  if (ch === 109/*m*/ && source.slice(pos + 1, pos + 6) === 'odule') {
    pos += 6;
    ch = commentWhitespace();
    if (ch !== 46/*.*/) {
      pos = revertPos;
      return false;
    }
    pos++;
    ch = commentWhitespace();
  }
  if (ch === 101/*e*/ && source.slice(pos + 1, pos + 7) === 'xports') {
    pos += 7;
    return true;
  }
  else {
    pos = revertPos;
    return false;
  }
}

function tryParseModuleExportsDotAssign () {
  pos += 6;
  const revertPos = pos - 1;
  let ch = commentWhitespace();
  if (ch === 46/*.*/) {
    pos++;
    ch = commentWhitespace();
    if (ch === 101/*e*/ && source.slice(pos + 1, pos + 7) === 'xports') {
      tryParseExportsDotAssign(true);
      return;
    }
  }
  pos = revertPos;
}

function tryParseExportsDotAssign (assign) {
  pos += 7;
  const revertPos = pos - 1;
  let ch = commentWhitespace();
  switch (ch) {
    // exports.asdf
    case 46/*.*/: {
      pos++;
      ch = commentWhitespace();
      const startPos = pos;
      if (identifier()) {
        const endPos = pos;
        ch = commentWhitespace();
        if (ch === 61/*=*/) {
          addExport(source.slice(startPos, endPos));
          return;
        }
      }
      break;
    }
    // exports['asdf']
    case 91/*[*/: {
      pos++;
      ch = commentWhitespace();
      if (ch === 39/*'*/ || ch === 34/*"*/) {
        pos++;
        const startPos = pos;
        if (identifier() && source.charCodeAt(pos) === ch) {
          const endPos = pos++;
          ch = commentWhitespace();
          if (ch !== 93/*]*/)
            break;
          pos++;
          ch = commentWhitespace();
          if (ch !== 61/*=*/)
            break;
          addExport(source.slice(startPos, endPos));
        }
      }
      break;
    }
    // module.exports =
    case 61/*=*/: {
      if (assign) {
        pos++;
        ch = commentWhitespace();
        // { ... }
        if (ch === 123/*{*/) {
          tryParseLiteralExports();
          return;
        }

        // require('...')
        if (ch === 114/*r*/)
          tryParseRequire(true);
      }
    }
  }
  pos = revertPos;
}

function tryParseRequire (directStarExport) {
  // require('...')
  if (source.slice(pos + 1, pos + 7) === 'equire') {
    pos += 7;
    const revertPos = pos - 1;
    let ch = commentWhitespace();
    if (ch === 40/*(*/) {
      pos++;
      ch = commentWhitespace();
      const reexportStart = pos + 1;
      if (ch === 39/*'*/) {
        singleQuoteString();
        const reexportEnd = pos++;
        ch = commentWhitespace();
        if (ch === 41/*)*/) {
          if (directStarExport) {
            reexports.add(source.slice(reexportStart, reexportEnd));
          }
          else {
            lastStarExportSpecifier = source.slice(reexportStart, reexportEnd);
          }
          return true;
        }
      }
      else if (ch === 34/*"*/) {
        doubleQuoteString();
        const reexportEnd = pos++;
        ch = commentWhitespace();
        if (ch === 41/*)*/) {
          if (directStarExport) {
            reexports.add(source.slice(reexportStart, reexportEnd));
          }
          else {
            lastStarExportSpecifier = source.slice(reexportStart, reexportEnd);
          }
          return true;
        }
      }
    }
    pos = revertPos;
  }
  return false;
}

function tryParseLiteralExports () {
  const revertPos = pos - 1;
  while (pos++ < end) {
    let ch = commentWhitespace();
    const startPos = pos;
    if (identifier()) {
      const endPos = pos;
      ch = commentWhitespace();
      if (ch === 58/*:*/) {
        pos++;
        ch = commentWhitespace();
        // nothing more complex than identifier expressions for now
        if (!identifier()) {
          pos = revertPos;
          return;
        }
        ch = source.charCodeAt(pos);
      }
      addExport(source.slice(startPos, endPos));
    }
    else if (ch === 39/*'*/ || ch === 34/*"*/) {
      const startPos = ++pos;
      if (identifier() && source.charCodeAt(pos) === ch) {
        const endPos = pos++;
        ch = commentWhitespace();
        if (ch === 58/*:*/) {
          pos++;
          ch = commentWhitespace();
          // nothing more complex than identifier expressions for now
          if (!identifier()) {
            pos = revertPos;
            return;
          }
          ch = source.charCodeAt(pos);
          addExport(source.slice(startPos, endPos));
        }
      }
    }
    else {
      pos = revertPos;
      return;
    }

    if (ch === 125/*}*/)
      return;

    if (ch !== 44/*,*/) {
      pos = revertPos;
      return;
    }
  }
}

const identifierStartRegEx = /\p{ID_Start}|[$_]/uy;
function isIdentifierStart (str) {
  identifierStartRegEx.lastIndex = 0;
  return identifierStartRegEx.test(str);
}

const identifierCharRegEx = /\p{ID_Continue}|[$_]/uy;
function isIdentifierChar (str) {
  identifierCharRegEx.lastIndex = 0;
  return identifierCharRegEx.test(str);
}

const validIdentifierRegEx = /(?:\p{ID_Start}|[$_])(?:\p{ID_Continue}|[$_])*/uyg;
function identifier () {
  validIdentifierRegEx.lastIndex = pos;
  validIdentifierRegEx.test(source);
  if (validIdentifierRegEx.lastIndex === 0)
    return false;
  pos = validIdentifierRegEx.lastIndex;
  return true;
}

function codePointLen (ch) {
  if (ch < 0x10000) return 1;
  return 2;
}

function codePointAtLast (bPos) {
  // Gives the UTF char for backtracking surrogates
  const ch = source.charCodeAt(bPos);
  if ((ch & 0xFC00) === 0xDC00)
    return (((source.charCodeAt(bPos - 1) & 0x3FF) << 10) | (ch & 0x3FF)) + 0x10000;
  return ch;
}

function throwIfImportStatement () {
  const startPos = pos;
  pos += 6;
  const ch = commentWhitespace();
  switch (ch) {
    // dynamic import
    case 40/*(*/:
      openTokenPosStack[openTokenDepth++] = startPos;
      return;
    // import.meta
    case 46/*.*/:
      throw new Error('Unexpected import.meta in CJS module.');
      return;
    
    default:
      // no space after "import" -> not an import keyword
      if (pos === startPos + 6)
        break;
    case 34/*"*/:
    case 39/*'*/:
    case 123/*{*/:
    case 42/***/:
      // import statement only permitted at base-level
      if (openTokenDepth !== 0) {
        pos--;
        return;
      }
      // import statements are a syntax error in CommonJS
      throw new Error('Unexpected import statement in CJS module.');
  }
}

function throwIfExportStatement () {
  pos += 6;
  const curPos = pos;
  const ch = commentWhitespace();
  if (pos === curPos && !isPunctuator(ch))
    return;
  throw new Error('Unexpected export statement in CJS module.');
}

function commentWhitespace () {
  let ch;
  do {
    ch = source.charCodeAt(pos);
    if (ch === 47/*/*/) {
      const next_ch = source.charCodeAt(pos + 1);
      if (next_ch === 47/*/*/)
        lineComment();
      else if (next_ch === 42/***/)
        blockComment();
      else
        return ch;
    }
    else if (!isBrOrWs(ch)) {
      return ch;
    }
  } while (pos++ < end);
  return ch;
}

function templateString () {
  while (pos++ < end) {
    const ch = source.charCodeAt(pos);
    if (ch === 36/*$*/ && source.charCodeAt(pos + 1) === 123/*{*/) {
      pos++;
      templateStack[templateStackDepth++] = templateDepth;
      templateDepth = ++openTokenDepth;
      return;
    }
    if (ch === 96/*`*/)
      return;
    if (ch === 92/*\*/)
      pos++;
  }
  syntaxError();
}

function blockComment () {
  pos++;
  while (pos++ < end) {
    const ch = source.charCodeAt(pos);
    if (ch === 42/***/ && source.charCodeAt(pos + 1) === 47/*/*/) {
      pos++;
      return;
    }
  }
}

function lineComment () {
  while (pos++ < end) {
    const ch = source.charCodeAt(pos);
    if (ch === 10/*\n*/ || ch === 13/*\r*/)
      return;
  }
}

function singleQuoteString () {
  while (pos++ < end) {
    let ch = source.charCodeAt(pos);
    if (ch === 39/*'*/)
      return;
    if (ch === 92/*\*/) {
      ch = source.charCodeAt(++pos);
      if (ch === 13/*\r*/ && source.charCodeAt(pos + 1) === 10/*\n*/)
        pos++;
    }
    else if (isBr(ch))
      break;
  }
  throw new Error('Unterminated string.');
}

function doubleQuoteString () {
  while (pos++ < end) {
    let ch = source.charCodeAt(pos);
    if (ch === 34/*"*/)
      return;
    if (ch === 92/*\*/) {
      ch = source.charCodeAt(++pos);
      if (ch === 13/*\r*/ && source.charCodeAt(pos + 1) === 10/*\n*/)
        pos++;
    }
    else if (isBr(ch))
      break;
  }
  throw new Error('Unterminated string.');
}

function regexCharacterClass () {
  while (pos++ < end) {
    let ch = source.charCodeAt(pos);
    if (ch === 93/*]*/)
      return ch;
    if (ch === 92/*\*/)
      pos++;
    else if (ch === 10/*\n*/ || ch === 13/*\r*/)
      break;
  }
  throw new Error('Syntax error reading regular expression class.');
}

function regularExpression () {
  while (pos++ < end) {
    let ch = source.charCodeAt(pos);
    if (ch === 47/*/*/)
      return;
    if (ch === 91/*[*/)
      ch = regexCharacterClass();
    else if (ch === 92/*\*/)
      pos++;
    else if (ch === 10/*\n*/ || ch === 13/*\r*/)
      break;
  }
  throw new Error('Syntax error reading regular expression.');
}

// Note: non-asii BR and whitespace checks omitted for perf / footprint
// if there is a significant user need this can be reconsidered
function isBr (c) {
  return c === 13/*\r*/ || c === 10/*\n*/;
}

function isBrOrWs (c) {
  return c > 8 && c < 14 || c === 32 || c === 160;
}

function isBrOrWsOrPunctuatorNotDot (c) {
  return c > 8 && c < 14 || c === 32 || c === 160 || isPunctuator(c) && c !== 46/*.*/;
}

function keywordStart (pos) {
  return pos === 0 || isBrOrWsOrPunctuatorNotDot(source.charCodeAt(pos - 1));
}

function readPrecedingKeyword (pos, match) {
  if (pos < match.length - 1)
    return false;
  return source.slice(pos - match.length + 1, pos + 1) === match && (pos === 0 || isBrOrWsOrPunctuatorNotDot(source.charCodeAt(pos - match.length)));
}

function readPrecedingKeyword1 (pos, ch) {
  return source.charCodeAt(pos) === ch && (pos === 0 || isBrOrWsOrPunctuatorNotDot(source.charCodeAt(pos - 1)));  
}

// Detects one of case, debugger, delete, do, else, in, instanceof, new,
//   return, throw, typeof, void, yield ,await
function isExpressionKeyword (pos) {
  switch (source.charCodeAt(pos)) {
    case 100/*d*/:
      switch (source.charCodeAt(pos - 1)) {
        case 105/*i*/:
          // void
          return readPrecedingKeyword(pos - 2, 'vo');
        case 108/*l*/:
          // yield
          return readPrecedingKeyword(pos - 2, 'yie');
        default:
          return false;
      }
    case 101/*e*/:
      switch (source.charCodeAt(pos - 1)) {
        case 115/*s*/:
          switch (source.charCodeAt(pos - 2)) {
            case 108/*l*/:
              // else
              return readPrecedingKeyword1(pos - 3, 101/*e*/);
            case 97/*a*/:
              // case
              return readPrecedingKeyword1(pos - 3, 99/*c*/);
            default:
              return false;
          }
        case 116/*t*/:
          // delete
          return readPrecedingKeyword(pos - 2, 'dele');
        default:
          return false;
      }
    case 102/*f*/:
      if (source.charCodeAt(pos - 1) !== 111/*o*/ || source.charCodeAt(pos - 2) !== 101/*e*/)
        return false;
      switch (source.charCodeAt(pos - 3)) {
        case 99/*c*/:
          // instanceof
          return readPrecedingKeyword(pos - 4, 'instan');
        case 112/*p*/:
          // typeof
          return readPrecedingKeyword(pos - 4, 'ty');
        default:
          return false;
      }
    case 110/*n*/:
      // in, return
      return readPrecedingKeyword1(pos - 1, 105/*i*/) || readPrecedingKeyword(pos - 1, 'retur');
    case 111/*o*/:
      // do
      return readPrecedingKeyword1(pos - 1, 100/*d*/);
    case 114/*r*/:
      // debugger
      return readPrecedingKeyword(pos - 1, 'debugge');
    case 116/*t*/:
      // await
      return readPrecedingKeyword(pos - 1, 'awai');
    case 119/*w*/:
      switch (source.charCodeAt(pos - 1)) {
        case 101/*e*/:
          // new
          return readPrecedingKeyword1(pos - 2, 110/*n*/);
        case 111/*o*/:
          // throw
          return readPrecedingKeyword(pos - 2, 'thr');
        default:
          return false; 
      }
  }
  return false;
}

function isParenKeyword (curPos) {
  return source.charCodeAt(curPos) === 101/*e*/ && source.slice(curPos - 4, curPos) === 'whil' ||
      source.charCodeAt(curPos) === 114/*r*/ && source.slice(curPos - 2, curPos) === 'fo' ||
      source.charCodeAt(curPos - 1) === 105/*i*/ && source.charCodeAt(curPos) === 102/*f*/;
}

function isPunctuator (ch) {
  // 23 possible punctuator endings: !%&()*+,-./:;<=>?[]^{}|~
  return ch === 33/*!*/ || ch === 37/*%*/ || ch === 38/*&*/ ||
    ch > 39 && ch < 48 || ch > 57 && ch < 64 ||
    ch === 91/*[*/ || ch === 93/*]*/ || ch === 94/*^*/ ||
    ch > 122 && ch < 127;
}

function isExpressionPunctuator (ch) {
  // 20 possible expression endings: !%&(*+,-.:;<=>?[^{|~
  return ch === 33/*!*/ || ch === 37/*%*/ || ch === 38/*&*/ ||
    ch > 39 && ch < 47 && ch !== 41 || ch > 57 && ch < 64 ||
    ch === 91/*[*/ || ch === 94/*^*/ || ch > 122 && ch < 127 && ch !== 125/*}*/;
}

function isExpressionTerminator (curPos) {
  // detects:
  // > ; ) -1 finally catch
  // as all of these followed by a { will indicate a statement brace
  switch (source.charCodeAt(curPos)) {
    case 62/*>*/:
      return source.charCodeAt(curPos - 1) === 61/*=*/;
    case 59/*;*/:
    case 41/*)*/:
      return true;
    case 104/*h*/:
      return source.slice(curPos - 4, curPos) === 'catc';
    case 121/*y*/:
      return source.slice(curPos - 6, curPos) === 'finall';
    case 101/*e*/:
      return source.slice(curPos - 3, curPos) === 'els';
  }
  return false;
}
