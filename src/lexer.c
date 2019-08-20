#include "lexer.h"

#include <stdio.h>

const bool DEBUG = true;

// Note: parsing is based on the _assumption_ that the source is already valid
bool parse () {
  // stack allocations
  // these are done here to avoid data section \0\0\0 repetition bloat
  // (while gzip fixes this, still better to have ~10KiB ungzipped over ~20KiB)
  char templateStack_[STACK_DEPTH];
  uchar_t* openTokenPosStack_[STACK_DEPTH];

  templateStackDepth = 0;
  openTokenPosStackDepth = 0;
  templateDepth = -1;
  braceDepth = 0;
  lastTokenPos = (uchar_t*)EMPTY_CHAR;
  lastOpenTokenPos = (uchar_t*)EMPTY_CHAR;
  parse_error = 0;
  has_error = false;
  templateStack = &templateStack_[0];
  openTokenPosStack = &openTokenPosStack_[0];

  pos = (void*)source - 1;
  jsIndexOffset = (void*)source;
  uchar_t ch = '\0';
  uchar_t* end = pos + SOURCE_LEN;
  while (pos < end) {
    nextChar(ch);
    ch = readChar();
    if (ch == ' ') continue;
    if (ch == 'e') {
      if (braceDepth == 0)
        tryParseExportStatement();
      lastTokenPos = pos;
      continue;
    }
    if (ch == 'i') {
      tryParseImportStatement();
      lastTokenPos = pos;
      continue;
    }

    if (ch > 8 && ch < 14) continue;

    switch (ch) {
      case '(':
        openTokenPosStack[openTokenPosStackDepth++] = lastTokenPos;
      break;
      case ')':
        if (openTokenPosStackDepth == 0)
          return syntaxError(), false;
        lastOpenTokenPos = openTokenPosStack[--openTokenPosStackDepth];
        if (import_write_head != NULL && import_write_head->dynamicPos == lastOpenTokenPos) {
          import_write_head->end = pos - jsIndexOffset;
          import_write_head->endPos = pos;
        }
      break;
      case '{':
        // dynamic import followed by { is not a dynamic import (so remove)
        // this is a sneaky way to get around { import () {} } v { import () }
        // block / object ambiguity without a parser (assuming source is valid)
        if (import_write_head != NULL && import_write_head->endPos == lastTokenPos) {
          import_write_head = import_write_head_last;
          import_write_head->next = NULL;
        }
        braceDepth++;
        openTokenPosStack[openTokenPosStackDepth++] = lastTokenPos;
      break;
      case '}':
        if (braceDepth-- == templateDepth) {
          templateDepth = templateStack[--templateStackDepth];
          templateString();
        }
        else {
          if (braceDepth < templateDepth || openTokenPosStackDepth == 0)
            return syntaxError(), false;
          lastOpenTokenPos = openTokenPosStack[--openTokenPosStackDepth];
        }
      break;
      case '\'':
        singleQuoteString();
      break;
      case '"':
        doubleQuoteString();
      break;
      case '/': {
        uchar_t next_ch = *(pos + 1);
        if (next_ch == '/') {
          lineComment();
          // dont update lastTokenIndex
          continue;
        }
        else if (next_ch == '*') {
          blockComment();
          // dont update lastTokenIndex
          continue;
        }
        else {
          // Division / regex ambiguity handling based on checking backtrack analysis of:
          // - what token came previously (lastToken)
          // - if a closing brace or paren, what token came before the corresponding
          //   opening brace or paren (lastOpenTokenIndex)
          uchar_t lastToken = *lastTokenPos;
          if (!lastToken || isExpressionKeyword(lastTokenPos) ||
              isExpressionPunctuator(lastToken) ||
              lastToken == ')' && isParenKeyword(lastOpenTokenPos) ||
              lastToken == '}' && isExpressionTerminator(lastOpenTokenPos)) {
            regularExpression();
          }
        }
      }
      break;
      case '`':
        templateString();
      break;
    }
    lastTokenPos = pos;
  }

  if (templateDepth != -1 || openTokenPosStackDepth || has_error)
    return false;

  // succeess
  return true;
}

void tryParseImportStatement () {
  if (!readPrecedingKeyword6(pos + 5, 'i', 'm', 'p', 'o', 'r', 't'))
    return;

  uint32_t startIndex = pos - jsIndexOffset;
  uchar_t* startPos = pos;

  pos += 6;

  uchar_t ch = commentWhitespace();
  
  switch (ch) {
    // dynamic import
    case '(':
      openTokenPosStack[openTokenPosStackDepth++] = startPos;
      if (*lastTokenPos == '.')
        return;
      // dynamic import indicated by positive d
      addImport(pos - jsIndexOffset + 1, 0, 0, startIndex, startPos);
      return;
    // import.meta
    case '.':
      nextChar(ch);
      ch = commentWhitespace();
      // import.meta indicated by d == -2
      if (ch == 'm' && str_eq3(pos + 1, 'e', 't', 'a') && *lastTokenPos != '.')
        addImport(startIndex, pos - jsIndexOffset + 4, pos + 4, -2, NULL);
      return;
    
    default:
      // no space after "import" -> not an import keyword
      if (pos == startPos + 6)
        break;
    case '"':
    case '\'':
    case '{':
    case '*':
      // import statement (only permitted at base-level)
      if (openTokenPosStackDepth == 0) {
        readImportString();
      }
      else {
        pos--;
      }
  }
}

void tryParseExportStatement () {
  if (!readPrecedingKeyword6(pos + 5, 'e', 'x', 'p', 'o', 'r', 't'))
    return;

  pos += 6;

  uchar_t* curPos = pos;

  uchar_t ch = commentWhitespace();

  if (pos == curPos && !isPunctuator(ch))
    return;

  switch (ch) {
    // export default ...
    case 'd':
      addExport(pos - jsIndexOffset, pos - jsIndexOffset + 7);
      return;

    // export async? function*? name () {
    case 'a':
      pos += 5;
      commentWhitespace();
    // fallthrough
    case 'f':
      pos += 8;
      ch = commentWhitespace();
      if (ch == '*') {
        pos++;
        ch = commentWhitespace();
      }
      uint32_t startIndex = pos - jsIndexOffset;
      ch = readToWsOrPunctuator(ch);
      addExport(startIndex, pos - jsIndexOffset);
      return;

    case 'c':
      if (str_eq4(pos + 1, 'l', 'a', 's', 's') && isBrOrWsOrPunctuator(*(pos + 5))) {
        pos += 5;
        ch = commentWhitespace();
        uint32_t startIndex = pos - jsIndexOffset;
        ch = readToWsOrPunctuator(ch);
        addExport(startIndex, pos - jsIndexOffset);
        return;
      }
      pos += 2;
    // fallthrough

    // export var/let/const name = ...(, name = ...)+
    case 'v':
    case 'l':
      // destructured initializations not currently supported (skipped for { or [)
      // also, lexing names after variable equals is skipped (export var p = function () { ... }, q = 5 skips "q")
      pos += 3;
      do {
        ch = commentWhitespace();
        uint32_t startIndex = pos - jsIndexOffset;
        ch = readToWsOrPunctuator(ch);
        // stops on [ { destructurings
        if (pos - jsIndexOffset == startIndex)
          return;
        addExport(startIndex, pos - jsIndexOffset);
        pos++;
      } while (ch == ',');
      return;

    // export {...}
    case '{':
      nextChar(ch);
      ch = commentWhitespace();
      do {
        uint32_t startIndex = pos - jsIndexOffset;
        readToWsOrPunctuator(ch);
        uint32_t endIndex = pos - jsIndexOffset;
        ch = commentWhitespace();
        // as
        if (ch == 'a') {
          pos += 2;
          ch = commentWhitespace();
          startIndex = pos - jsIndexOffset;
          readToWsOrPunctuator(ch);
          endIndex = pos - jsIndexOffset;
          ch = commentWhitespace();
        }
        // ,
        if (ch == ',') {
          pos++;
          ch = commentWhitespace();
        }
        addExport(startIndex, endIndex);
        if (!ch)
          return syntaxError();
      } while (ch != '}');
    // fallthrough
    
    // export *
    case '*':
      pos++;
      ch = commentWhitespace();
      if (ch == 'f' && str_eq3(pos + 1, 'r', 'o', 'm')) {
        pos += 4;
        readImportString();
      }
  }
}

void readImportString () {
  uint32_t startIndex;
  uchar_t ch;
  while (ch = readChar()) {
    if (ch == '\'') {
      startIndex = pos - jsIndexOffset + 1;
      nextChar(ch);
      singleQuoteString();
      addImport(startIndex, pos - jsIndexOffset, pos, -1, NULL);
      return;
    }
    if (ch == '"') {
      startIndex = pos - jsIndexOffset + 1;
      nextChar(ch);
      doubleQuoteString();
      addImport(startIndex, pos - jsIndexOffset, pos, -1, NULL);
      return;
    }
    nextChar(ch);
  }
  syntaxError();
}

uchar_t commentWhitespace () {
  uchar_t ch;
  while (ch = readChar()) {
    if (ch == '/') {
      uchar_t next_ch = *(pos + 1);
      if (next_ch == '/')
        lineComment();
      else if (next_ch == '*')
        blockComment();
      else
        return ch;
    }
    else if (!isBrOrWs(ch)) {
      return ch;
    }
    nextChar(ch);
  }
  return ch;
}

void templateString () {
  pos++;
  uchar_t ch;
  while (ch = readChar()) {
    if (ch == '$') {
      pos++;
      ch = readChar();
      if (ch == '{') {
        templateStack[templateStackDepth++] = templateDepth;
        templateDepth = ++braceDepth;
        return;
      }
    }
    if (ch == '`') {
      return;
    }
    else if (ch == '\\') {
      pos++;
      ch = readChar();
    }
    nextChar(ch);
  }
  syntaxError();
}

void blockComment () {
  pos += 2;
  uchar_t ch;
  while (ch = readChar()) {
    if (ch == '*') {
      pos++;
      ch = readChar();
      if (ch == '/')
        return;
      continue;
    }
    nextChar(ch);
  }
}

void lineComment () {
  pos++;
  uchar_t ch;
  while (ch = readChar()) {
    if (ch == '\n' || ch == '\r')
      return;
    nextChar(ch);
  }
}

void singleQuoteString () {
  uchar_t ch;
  pos++;
  while (ch = readChar()) {
    if (ch == '\'')
      return;
    if (ch == '\\')
      pos++, ch = readChar();
    else if (isBr(ch))
      break;
    nextChar(ch);
  }
  syntaxError();
}

void doubleQuoteString () {
  uchar_t ch;
  pos++;
  while (ch = readChar()) {
    if (ch == '"')
      return;
    if (ch == '\\')
      pos++, ch = readChar();
    else if (isBr(ch))
      break;
    nextChar(ch);
  }
  syntaxError();
}

uchar_t regexCharacterClass () {
  uchar_t ch;
  pos++;
  while (ch = readChar()) {
    if (ch == ']')
      return ch;
    if (ch == '\\')
      pos++, ch = readChar();
    else if (ch == '\n' || ch == '\r')
      break;
    nextChar(ch);
  }
  syntaxError();
  return ch;
}

void regularExpression () {
  uchar_t ch;
  pos++;
  while (ch = readChar()) {
    if (ch == '/')
      return;
    if (ch == '[')
      ch = regexCharacterClass();
    else if (ch == '\\')
      pos++, ch = readChar();
    else if (ch == '\n' || ch == '\r')
      break;
    nextChar(ch);
  }
  syntaxError();
}

uchar_t readToWsOrPunctuator (uchar_t ch) {
  do {
    if (isBrOrWs(ch) || isPunctuator(ch))
      return ch;
    nextChar(ch);
  } while (ch = readChar());
  return ch;
}

bool isBr (uchar_t c) {
  return c == '\r' || c == '\n';
}

bool isBrOrWs (uchar_t c) {
  return c > 8 && c < 14 || c == 32;
}

bool isBrOrWsOrPunctuator (uchar_t c) {
  return isBrOrWs(c) || isPunctuator(c);
}

bool isBrOrWsOrPunctuatorNotDot (uchar_t c) {
  return isBrOrWs(c) || isPunctuator(c) && c != '.';
}

bool str_eq2 (uchar_t* pos, uchar_t c1, uchar_t c2) {
  return *pos == c1 && *(pos + 1) == c2;
}

bool str_eq3 (uchar_t* pos, uchar_t c1, uchar_t c2, uchar_t c3) {
  return *pos == c1 && *(pos + 1) == c2 && *(pos + 2) == c3;
}

bool str_eq4 (uchar_t* pos, uchar_t c1, uchar_t c2, uchar_t c3, uchar_t c4) {
  return *pos == c1 && *(pos + 1) == c2 && *(pos + 2) == c3 && *(pos + 3) == c4;
}

bool str_eq5 (uchar_t* pos, uchar_t c1, uchar_t c2, uchar_t c3, uchar_t c4, uchar_t c5) {
  return *pos == c1 && *(pos + 1) == c2 && *(pos + 2) == c3 && *(pos + 3) == c4 && *(pos + 4) == c5;
}

bool str_eq6 (uchar_t* pos, uchar_t c1, uchar_t c2, uchar_t c3, uchar_t c4, uchar_t c5, uchar_t c6) {
  return *pos == c1 && *(pos + 1) == c2 && *(pos + 2) == c3 && *(pos + 3) == c4 && *(pos + 4) == c5 && *(pos + 5) == c6;
}

bool str_eq7 (uchar_t* pos, uchar_t c1, uchar_t c2, uchar_t c3, uchar_t c4, uchar_t c5, uchar_t c6, uchar_t c7) {
  return *pos == c1 && *(pos + 1) == c2 && *(pos + 2) == c3 && *(pos + 3) == c4 && *(pos + 4) == c5 && *(pos + 5) == c6 && *(pos + 6) == c7;
}

bool readPrecedingKeyword1 (uchar_t* pos, uchar_t c1) {
  if (pos < source) return false;
  return *pos == c1 && (pos == source || isBrOrWsOrPunctuatorNotDot(*(pos - 1)));
}
bool readPrecedingKeyword2 (uchar_t* pos, uchar_t c1, uchar_t c2) {
  if (pos - 1 < source) return false;
  return str_eq2(pos - 1, c1, c2) && (pos - 1 == source || isBrOrWsOrPunctuatorNotDot(*(pos - 2)));
}
bool readPrecedingKeyword3 (uchar_t* pos, uchar_t c1, uchar_t c2, uchar_t c3) {
  if (pos - 2 < source) return false;
  return str_eq3(pos - 2, c1, c2, c3) && (pos - 2 == source || isBrOrWsOrPunctuatorNotDot(*(pos - 3)));
}
bool readPrecedingKeyword4 (uchar_t* pos, uchar_t c1, uchar_t c2, uchar_t c3, uchar_t c4) {
  if (pos - 3 < source) return false;
  return str_eq4(pos - 3, c1, c2, c3, c4) && (pos - 3 == source || isBrOrWsOrPunctuatorNotDot(*(pos - 4)));
}
bool readPrecedingKeyword5 (uchar_t* pos, uchar_t c1, uchar_t c2, uchar_t c3, uchar_t c4, uchar_t c5) {
  if (pos - 4 < source) return false;
  return str_eq5(pos - 4, c1, c2, c3, c4, c5) && (pos - 4 == source || isBrOrWsOrPunctuatorNotDot(*(pos - 5)));
}
bool readPrecedingKeyword6 (uchar_t* pos, uchar_t c1, uchar_t c2, uchar_t c3, uchar_t c4, uchar_t c5, uchar_t c6) {
  if (pos - 5 < source) return false;
  return str_eq6(pos - 5, c1, c2, c3, c4, c5, c6) && (pos - 5 == source || isBrOrWsOrPunctuatorNotDot(*(pos - 6)));
}
bool readPrecedingKeyword7 (uchar_t* pos, uchar_t c1, uchar_t c2, uchar_t c3, uchar_t c4, uchar_t c5, uchar_t c6, uchar_t c7) {
  if (pos - 6 < source) return false;
  return str_eq7(pos - 6, c1, c2, c3, c4, c5, c6, c7) && (pos - 6 == source || isBrOrWsOrPunctuatorNotDot(*(pos - 7)));
}

// Detects one of case, debugger, delete, do, else, in, instanceof, new,
//   return, throw, typeof, void, yield ,await
bool isExpressionKeyword (uchar_t* pos) {
  switch (*pos) {
    case 'd':
      switch (*(pos - 1)) {
        case 'i':
          // void
          return readPrecedingKeyword2(pos - 2, 'v', 'o');
        case 'l':
          // yield
          return readPrecedingKeyword3(pos - 2, 'y', 'i', 'e');
        default:
          return false;
      }
    case 'e':
      switch (*(pos - 1)) {
        case 's':
          switch (*(pos - 2)) {
            case 'l':
              // else
              return readPrecedingKeyword1(pos - 3, 'e');
            case 'a':
              // case
              return readPrecedingKeyword1(pos - 3, 'c');
            default:
              return false;
          }
        case 't':
          // delete
          return readPrecedingKeyword4(pos - 2, 'd', 'e', 'l', 'e');
        default:
          return false;
      }
    case 'f':
      if (*(pos - 1) != 'o' || *(pos - 2) != 'e')
        return false;
      switch (*(pos - 3)) {
        case 'c':
          // instanceof
          return readPrecedingKeyword6(pos - 4, 'i', 'n', 's', 't', 'a', 'n');
        case 'p':
          // typeof
          return readPrecedingKeyword2(pos - 4, 't', 'y');
        default:
          return false;
      }
    case 'n':
      // in, return
      return readPrecedingKeyword1(pos - 1, 'i') || readPrecedingKeyword5(pos - 1, 'r', 'e', 't', 'u', 'r');
    case 'o':
      // do
      return readPrecedingKeyword1(pos - 1, 'd');
    case 'r':
      // debugger
      return readPrecedingKeyword7(pos - 1, 'd', 'e', 'b', 'u', 'g', 'g', 'e');
    case 't':
      // await
      return readPrecedingKeyword4(pos - 1, 'a', 'w', 'a', 'i');
    case 'w':
      switch (*(pos - 1)) {
        case 'e':
          // new
          return readPrecedingKeyword1(pos - 2, 'n');
        case 'o':
          // throw
          return readPrecedingKeyword3(pos - 2, 't', 'h', 'r');
        default:
          return false; 
      }
  }
  return false;
}

bool isParenKeyword (uchar_t* curPos) {
  return readPrecedingKeyword5(curPos, 'w', 'h', 'i', 'l', 'e') ||
      readPrecedingKeyword3(curPos, 'f', 'o', 'r') ||
      readPrecedingKeyword2(curPos, 'i', 'f');
}

bool isPunctuator (uchar_t ch) {
  // 23 possible punctuator endings: !%&()*+,-./:;<=>?[]^{}|~
  return ch == '!' || ch == '%' || ch == '&' ||
    ch > 39 && ch < 48 || ch > 57 && ch < 64 ||
    ch == '[' || ch == ']' || ch == '^' ||
    ch > 122 && ch < 127;
}

bool isExpressionPunctuator (uchar_t ch) {
  // 20 possible expression endings: !%&(*+,-.:;<=>?[^{|~
  return ch == '!' || ch == '%' || ch == '&' ||
    ch > 39 && ch < 47 && ch != 41 || ch > 57 && ch < 64 ||
    ch == '[' || ch == '^' || ch > 122 && ch < 127 && ch != '}';
}

bool isExpressionTerminator (uchar_t* curPos) {
  // detects:
  // ; ) -1 finally
  // as all of these followed by a { will indicate a statement brace
  // in future we will need: "catch" (optional catch parameters)
  //                         "do" (do expressions)
  switch (*curPos) {
    case ';':
    case ')':
      return true;
    case 'y':
      return readPrecedingKeyword6(curPos - 1, 'f', 'i', 'n', 'a', 'l', 'l');
  }
  return false;
}

void nextChar (uchar_t ch) {
  // we should always skip over surrogates
  if (ch >= 0x80)
    return nextCharSurrogate(ch);
  pos++;
}

// Proper UTF-16 length counting against UTF-8 representation
// If uchar_t were updaed to char32_t in future, this would become
// a simple greater then 0xFFFF check here.
void nextCharSurrogate (uchar_t ch) {
  if (ch >= 0xC0) {
    if (ch >= 0xE0) {
      if (ch >= 0xF0) {
        jsIndexOffset += 2;
        pos += 4;
      }
      else {
        uchar_t ch2 = *(pos + 2);
        if (ch2 > 0xBF || ch2 == 0xBF && *(pos + 3) >= 0xBF)
          jsIndexOffset++;
        else
          jsIndexOffset += 2;
        pos += 3;
      }
    }
    else {
      jsIndexOffset++;
      pos += 2;
    }
  }
  else {
    syntaxError();
  }
}

uchar_t readChar () {
  uchar_t ch = *pos;
  if (ch < 0x80)
    return ch;
  // For now, exact UTF-8 surrogate handling is disabled
  // since no tokenizing operations depend on it currently
  return ch;
}

void bail (uint32_t error) {
  has_error = true;
  parse_error = error;
  pos = (void*)source + SOURCE_LEN;
}

void syntaxError () {
  has_error = true;
  parse_error = pos - jsIndexOffset;
  pos = (void*)source + SOURCE_LEN;
}
