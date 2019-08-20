// State
let i, str, charCode,
  lastTokenIndex,
  lastOpenTokenIndex,
  openTokenIndexStack,
  braceDepth,
  templateDepth,
  templateStack,
  oImports,
  oExports;

export default function analyzeModuleSyntax (_str) {
  str = _str;
  charCode = NaN;
  lastTokenIndex = lastOpenTokenIndex = -1;
  oImports = [];
  oExports = [];
  braceDepth = 0;
  templateDepth = -1;
  templateStack = [];
  openTokenIndexStack = [];
  i = -1;

  // (Check ordering based on source histograms)
  while (++i < str.length) {
    charCode = str.charCodeAt(i);

    switch (charCode) {
      /* */
      case 32:
        // dont update lastTokenIndex
        continue;
      case 101/*e*/:
        if (openTokenIndexStack.length === 0)
          tryParseExportStatement();
        lastTokenIndex = i;
        continue;
      case 105/*i*/:
        tryParseImportStatement();
        lastTokenIndex = i;
        continue;
    }

    if (charCode > 8 && charCode < 14)
      continue;

    switch (charCode) {
      case 40/*(*/:
        openTokenIndexStack.push(lastTokenIndex);
        break;
      case 41/*)*/:
        if (openTokenIndexStack.length === 0)
          syntaxError();
        lastOpenTokenIndex = openTokenIndexStack.pop();
        if (oImports.length && oImports[oImports.length - 1].d === lastOpenTokenIndex)
          oImports[oImports.length - 1].e = i;
        break;
      case 123/*{*/:
        // dynamic import followed by { is not a dynamic import (so remove)
        // this is a sneaky way to get around { import () {} } v { import () }
        // block / object ambiguity without a parser (assuming source is valid)
        if (oImports.length && oImports[oImports.length - 1].e === lastTokenIndex)
          oImports.pop();
        braceDepth++;
        openTokenIndexStack.push(lastTokenIndex);
        break;
      case 125/*}*/:
        if (braceDepth-- === templateDepth) {
          templateDepth = templateStack.pop();
          templateString();
        }
        else {
          if (braceDepth < templateDepth || openTokenIndexStack.length === 0)
            syntaxError();
          lastOpenTokenIndex = openTokenIndexStack.pop();
        }
        break;
      case 39/*'*/:
        singleQuoteString();
        break;
      case 34/*"*/:
        doubleQuoteString();
        break;
      case 47/*/*/:
        const nextCharCode = str.charCodeAt(i + 1);
        if (nextCharCode === 47/*/*/) {
          lineComment();
          // dont update lastTokenIndex
          continue;
        }
        else if (nextCharCode === 42/***/) {
          blockComment();
          // dont update lastTokenIndex
          continue;
        }
        else {
          /*
           * Division / regex ambiguity handling based on checking backtrack analysis of:
           * - what token came previously (lastToken)
           * - if a closing brace or paren, what token came before the corresponding
           *   opening brace or paren (lastOpenTokenIndex)
           */
          const lastToken = str.charCodeAt(lastTokenIndex);
          if (!lastToken || isExpressionKeyword(lastTokenIndex) ||
              isExpressionPunctuator(lastToken) ||
              lastToken === 41/*)*/ && isParenKeyword(lastOpenTokenIndex) ||
              lastToken === 125/*}*/ && isExpressionTerminator(lastOpenTokenIndex)) {
            regularExpression();
          }
        }
        break;
      case 96/*`*/:
        templateString();
        break;
    }
    lastTokenIndex = i;
  }
  if (templateDepth !== -1 || openTokenIndexStack.length)
    syntaxError();

  return [oImports, oExports];
}

function tryParseImportStatement () {
  if (readPrecedingKeyword(i + 5) !== 'import') return;
  const start = i;
  charCode = str.charCodeAt(i += 6)
  if (readToWsOrPunctuator(i) !== '' && charCode !== 46/*.*/ && charCode !== 34/*"*/ && charCode !== 39/*'*/)
    return;
  commentWhitespace();
  switch (charCode) {
    // dynamic import
    case 40/*(*/:
      openTokenIndexStack.push(start);
      if (str.charCodeAt(lastTokenIndex) === 46/*.*/)
        return;
      // dynamic import indicated by positive d
      oImports.push({ s: i + 1, e: undefined, d: start });
      return;
    // import.meta
    case 46/*.*/:
      charCode = str.charCodeAt(++i);
      commentWhitespace();
      // import.meta indicated by d === -2
      if (readToWsOrPunctuator(i) === 'meta' && str.charCodeAt(lastTokenIndex) !== 46/*.*/)
        oImports.push({ s: start, e: i + 4, d: -2 });
      return;
  }
  // import statement (only permitted at base-level)
  if (openTokenIndexStack.length === 0) {
    readSourceString();
    return;
  }
}

function tryParseExportStatement () {
  if (readPrecedingKeyword(i + 5) !== 'export' || readToWsOrPunctuator(i + 6) !== '')
    return;

  let name;
  charCode = str.charCodeAt(i += 6);
  commentWhitespace();
  switch (charCode) {
    // export default ...
    case 100/*d*/:
      oExports.push('default');
      return;

    // export async? function*? name () {
    case 97/*a*/:
      charCode = str.charCodeAt(i += 5);
      commentWhitespace();
    // fallthrough
    case 102/*f*/:
      charCode = str.charCodeAt(i += 8);
      commentWhitespace();
      if (charCode === 42/***/) {
        charCode = str.charCodeAt(++i);
        commentWhitespace();
      }
      oExports.push(readToWsOrPunctuator(i));
      return;

    case 99/*c*/:
      if (readToWsOrPunctuator(i + 1) === 'lass') {
        charCode = str.charCodeAt(i += 5);
        commentWhitespace();
        oExports.push(readToWsOrPunctuator(i));
        return;
      }
      i += 2;
    // fallthrough

    // export var/let/const name = ...(, name = ...)+
    case 118/*v*/:
    case 108/*l*/:
      /*
        * destructured initializations not currently supported (skipped for { or [)
        * also, lexing names after variable equals is skipped (export var p = function () { ... }, q = 5 skips "q")
        */
      do {
        charCode = str.charCodeAt(i += 3);
        commentWhitespace();
        name = readToWsOrPunctuator(i);
        // stops on [ { destructurings
        if (!name.length)
          return;
        oExports.push(name);
        charCode = str.charCodeAt(i += name.length);
        commentWhitespace();
      } while (charCode === 44/*,*/);
      return;

    // export {...}
    case 123/*{*/:
      charCode = str.charCodeAt(++i);
      commentWhitespace();
      do {
        name = readToWsOrPunctuator(i);
        charCode = str.charCodeAt(i += name.length);
        commentWhitespace();
        // as
        if (charCode === 97/*a*/) {
          charCode = str.charCodeAt(i += 2);
          commentWhitespace();
          name = readToWsOrPunctuator(i);
          charCode = str.charCodeAt(i += name.length);
          commentWhitespace();
        }
        // ,
        if (charCode === 44) {
          charCode = str.charCodeAt(++i);
          commentWhitespace();
        }
        oExports.push(name);
        if (!charCode)
          syntaxError();
      } while (charCode !== 125/*}*/);
    // fallthrough

    // export *
    case 42/***/:
      charCode = str.charCodeAt(++i);
      commentWhitespace();
      if (charCode === 102 && str.slice(i + 1, i + 4) === 'rom') {
        charCode = str.charCodeAt(i += 4);
        readSourceString();
      }
  }
}

function commentWhitespace () {
  do {
    if (!isBrOrWs(charCode)) {
      return;
    }
    else if (charCode === 47/*/*/) {
      const nextCharCode = str.charCodeAt(i + 1);
      if (nextCharCode === 47/*/*/)
        lineComment();
      else if (nextCharCode === 42/***/)
        blockComment();
      else
        return;
    }
  } while (charCode = str.charCodeAt(++i));
}

function templateString () {
  while (charCode = str.charCodeAt(++i)) {
    if (charCode === 36/*$*/ && str.charCodeAt(i + 1) === 123/*{*/) {
      charCode = str.charCodeAt(i += 2);
      templateStack.push(templateDepth);
      templateDepth = ++braceDepth;
      return;
    }
    else if (charCode === 96/*`*/) {
      return;
    }
    else if (charCode === 92/*\*/) {
      charCode = str.charCodeAt(++i);
    }
  }
  syntaxError();
}

function readSourceString () {
  let start;
  do {
    if (charCode === 39/*'*/) {
      start = i + 1;
      singleQuoteString();
      oImports.push({ s: start, e: i, d: -1 });
      return;
    }
    if (charCode === 34/*"*/) {
      start = i + 1;
      doubleQuoteString();
      oImports.push({ s: start, e: i, d: -1 });
      return;
    }
  } while (charCode = str.charCodeAt(++i))
  syntaxError();
}

function isBrOrWs (charCode) {
  return charCode > 8 && charCode < 14 || charCode === 32;
}

function blockComment () {
  charCode = str.charCodeAt(i += 2);
  while (charCode) {
    if (charCode === 42/***/) {
      charCode = str.charCodeAt(++i);
      if (charCode === 47/*/*/)
        return;
      continue;
    }
    charCode = str.charCodeAt(++i);
  }
}

function lineComment () {
  i++;
  while (charCode = str.charCodeAt(++i)) {
    if (charCode === 10/*\n*/ || charCode === 13/*\r*/)
      return;
  }
}

function singleQuoteString () {
  while (charCode = str.charCodeAt(++i)) {
    if (charCode === 39/*'*/)
      return;
    if (charCode === 92/*\*/)
      i++;
    else if (charCode === 10/*\n*/ || charCode === 13/*\r*/)
      break;
  }
  syntaxError();
}

function doubleQuoteString () {
  while (charCode = str.charCodeAt(++i)) {
    if (charCode === 34/*"*/)
      return;
    if (charCode === 92/*\*/)
      i++;
    else if (charCode === 10/*\n*/ || charCode === 13/*\r*/)
      break;
  }
  syntaxError();
}

function regexCharacterClass () {
  while (charCode = str.charCodeAt(++i)) {
    if (charCode === 93/*]*/)
      return;
    if (charCode === 92/*\*/)
      i++;
    else if (charCode === 10/*\n*/ || charCode === 13/*\r*/)
      break;
  }
  syntaxError();
}

function regularExpression () {
  while (charCode = str.charCodeAt(++i)) {
    if (charCode === 47/*/*/)
      return;
    if (charCode === 91/*[*/)
      regexCharacterClass();
    else if (charCode === 92/*\*/)
      i++;
    else if (charCode === 10/*\n*/ || charCode === 13/*\r*/)
      break;
  }
  syntaxError();
}

function readPrecedingKeyword (endIndex) {
  let startIndex = endIndex;
  let nextChar = str.charCodeAt(startIndex);
  while (nextChar && nextChar > 96/*a*/ && nextChar < 123/*z*/)
    nextChar = str.charCodeAt(--startIndex);
  // must be preceded by punctuator or whitespace
  if (nextChar && !isBrOrWs(nextChar) && !isPunctuator(nextChar) || nextChar === 46/*.*/)
    return '';
  return str.slice(startIndex + 1, endIndex + 1);
}

function readToWsOrPunctuator (startIndex) {
  let endIndex = startIndex;
  let nextChar = str.charCodeAt(endIndex);
  while (nextChar && !isBrOrWs(nextChar) && !isPunctuator(nextChar))
    nextChar = str.charCodeAt(++endIndex);
  return str.slice(startIndex, endIndex);
}

const expressionKeywords = {
  case: 1,
  debugger: 1,
  delete: 1,
  do: 1,
  else: 1,
  in: 1,
  instanceof: 1,
  new: 1,
  return: 1,
  throw: 1,
  typeof: 1,
  void: 1,
  yield: 1,
  await: 1
};
function isExpressionKeyword (lastTokenIndex) {
  return expressionKeywords[readPrecedingKeyword(lastTokenIndex)];
}
function isParenKeyword  (lastTokenIndex) {
  const precedingKeyword = readPrecedingKeyword(lastTokenIndex);
  return precedingKeyword === 'while' || precedingKeyword === 'for' || precedingKeyword === 'if';
}
function isPunctuator (charCode) {
  // 23 possible punctuator endings: !%&()*+,-./:;<=>?[]^{}|~
  return charCode === 33 || charCode === 37 || charCode === 38 ||
    charCode > 39 && charCode < 48 || charCode > 57 && charCode < 64 ||
    charCode === 91 || charCode === 93 || charCode === 94 ||
    charCode > 122 && charCode < 127;
}
function isExpressionPunctuator (charCode) {
  // 20 possible expression endings: !%&(*+,-.:;<=>?[^{|~
  return charCode === 33 || charCode === 37 || charCode === 38 || charCode === 40 ||
    charCode > 41 && charCode < 47 || charCode > 57 && charCode < 64 || charCode === 91 ||
    charCode === 94 || charCode === 123 || charCode === 124 || charCode === 126;
}
function isExpressionTerminator (lastTokenIndex) {
  // detects:
  // ; ) -1 finally
  // as all of these followed by a { will indicate a statement brace
  // in future we will need: "catch" (optional catch parameters)
  //                         "do" (do expressions)
  switch (str.charCodeAt(lastTokenIndex)) {
    case 59/*;*/:
    case 41/*)*/:
    case NaN:
      return true;
    case 121/*y*/:
      return readPrecedingKeyword(lastTokenIndex) === 'finally';
  }
  return false;
}

function syntaxError () {
  console.log(i);
  // we just need the stack
  // this isn't shown to users, only for diagnostics
  throw new Error();
}
