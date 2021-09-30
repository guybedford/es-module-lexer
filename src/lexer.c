#include "lexer.h"
#include <stdio.h>

const bool DEBUG = true;

// Note: parsing is based on the _assumption_ that the source is already valid
bool parse () {
  // stack allocations
  // these are done here to avoid data section \0\0\0 repetition bloat
  // (while gzip fixes this, still better to have ~10KiB ungzipped over ~20KiB)
  uint16_t templateStack_[STACK_DEPTH];
  char16_t* openTokenPosStack_[STACK_DEPTH];
  bool openClassPosStack[STACK_DEPTH];

  facade = true;
  templateStackDepth = 0;
  openTokenDepth = 0;
  templateDepth = 65535;
  lastTokenPos = (char16_t*)EMPTY_CHAR;
  lastSlashWasDivision = false;
  parse_error = 0;
  has_error = false;
  templateStack = &templateStack_[0];
  openTokenPosStack = &openTokenPosStack_[0];
  nextBraceIsClass = false;

  pos = (char16_t*)(source - 1);
  char16_t ch = '\0';
  end = pos + sourceLen;

  // start with a pure "module-only" parser
  while (pos++ < end) {
    ch = *pos;

    if (ch == 32 || ch < 14 && ch > 8)
      continue;

    switch (ch) {
      case 'e':
        if (openTokenDepth == 0 && keywordStart(pos) && str_eq5(pos + 1, 'x', 'p', 'o', 'r', 't')) {
          tryParseExportStatement();
          // export might have been a non-pure declaration
          if (!facade) {
            lastTokenPos = pos;
            goto mainparse;
          }
        }
        break;
      case 'i':
        if (keywordStart(pos) && str_eq5(pos + 1, 'm', 'p', 'o', 'r', 't'))
          tryParseImportStatement();
        break;
      case ';':
        break;
      case '/': {
        char16_t next_ch = *(pos + 1);
        if (next_ch == '/') {
          lineComment();
          // dont update lastToken
          continue;
        }
        else if (next_ch == '*') {
          blockComment(true);
          // dont update lastToken
          continue;
        }
        // fallthrough
      }
      default:
        // as soon as we hit a non-module token, we go to main parser
        facade = false;
        pos--;
        goto mainparse; // oh yeahhh
    }
    lastTokenPos = pos;
  }

  if (has_error)
    return false;

  mainparse: while (pos++ < end) {
    ch = *pos;

    if (ch == 32 || ch < 14 && ch > 8)
      continue;

    switch (ch) {
      case 'e':
        if (openTokenDepth == 0 && keywordStart(pos) && str_eq5(pos + 1, 'x', 'p', 'o', 'r', 't'))
          tryParseExportStatement();
        break;
      case 'i':
        if (keywordStart(pos) && str_eq5(pos + 1, 'm', 'p', 'o', 'r', 't'))
          tryParseImportStatement();
        break;
      case 'c':
        if (keywordStart(pos) && str_eq4(pos + 1, 'l', 'a', 's', 's') && isBrOrWs(*(pos + 5)))
          nextBraceIsClass = true;
        break;
      case '(':
        openTokenPosStack[openTokenDepth++] = lastTokenPos;
        break;
      case ')':
        if (openTokenDepth == 0)
          return syntaxError(), false;
        openTokenDepth--;
        if (cur_dynamic_import && cur_dynamic_import->dynamic == openTokenPosStack[openTokenDepth]) {
          if (cur_dynamic_import->end == 0)
            cur_dynamic_import->end = pos;
          cur_dynamic_import->statement_end = pos;
          cur_dynamic_import = NULL;
        }
        break;
      case '{':
        // dynamic import followed by { is not a dynamic import (so remove)
        // this is a sneaky way to get around { import () {} } v { import () }
        // block / object ambiguity without a parser (assuming source is valid)
        if (*lastTokenPos == ')' && import_write_head && import_write_head->end == lastTokenPos) {
          import_write_head = import_write_head_last;
          if (import_write_head)
            import_write_head->next = NULL;
          else
            first_import = NULL;
        }
        openClassPosStack[openTokenDepth] = nextBraceIsClass;
        nextBraceIsClass = false;
        openTokenPosStack[openTokenDepth++] = lastTokenPos;
        break;
      case '}':
        if (openTokenDepth == 0)
          return syntaxError(), false;
        if (openTokenDepth-- == templateDepth) {
          templateDepth = templateStack[--templateStackDepth];
          templateString();
        }
        else {
          if (templateDepth != 65535 && openTokenDepth < templateDepth)
            return syntaxError(), false;
        }
        break;
      case '\'':
        stringLiteral(ch);
        break;
      case '"':
        stringLiteral(ch);
        break;
      case '/': {
        char16_t next_ch = *(pos + 1);
        if (next_ch == '/') {
          lineComment();
          // dont update lastToken
          continue;
        }
        else if (next_ch == '*') {
          blockComment(true);
          // dont update lastToken
          continue;
        }
        else {
          // Division / regex ambiguity handling based on checking backtrack analysis of:
          // - what token came previously (lastToken)
          // - if a closing brace or paren, what token came before the corresponding
          //   opening brace or paren (lastOpenTokenIndex)
          char16_t lastToken = *lastTokenPos;
          if (isExpressionPunctuator(lastToken) &&
              !(lastToken == '.' && (*(lastTokenPos - 1) >= '0' && *(lastTokenPos - 1) <= '9')) &&
              !(lastToken == '+' && *(lastTokenPos - 1) == '+') && !(lastToken == '-' && *(lastTokenPos - 1) == '-') ||
              lastToken == ')' && isParenKeyword(openTokenPosStack[openTokenDepth]) ||
              lastToken == '}' && (isExpressionTerminator(openTokenPosStack[openTokenDepth]) || openClassPosStack[openTokenDepth]) ||
              isExpressionKeyword(lastTokenPos) ||
              lastToken == '/' && lastSlashWasDivision ||
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
      case '`':
        templateString();
        break;
    }
    lastTokenPos = pos;
  }

  if (templateDepth != 65535 || openTokenDepth || has_error)
    return false;

  // succeess
  return true;
}

void tryParseImportStatement () {
  char16_t* startPos = pos;

  pos += 6;

  char16_t ch = commentWhitespace(true);

  switch (ch) {
    // dynamic import
    case '(':
      openTokenPosStack[openTokenDepth++] = startPos;
      if (*lastTokenPos == '.')
        return;
      // dynamic import indicated by positive d
      addImport(startPos, pos + 1, 0, startPos);
      cur_dynamic_import = import_write_head;
      // try parse a string, to record a safe dynamic import string
      pos++;
      ch = commentWhitespace(true);
      if (ch == '\'') {
        stringLiteral(ch);
      }
      else if (ch == '"') {
        stringLiteral(ch);
      }
      else {
        pos--;
        return;
      }
      pos++;
      ch = commentWhitespace(true);
      if (ch == ',') {
        import_write_head->end = pos;
        pos++;
        ch = commentWhitespace(true);
        import_write_head->assert_index = pos;
        import_write_head->safe = true;
        pos--;
      }
      else if (ch == ')') {
        openTokenDepth--;
        import_write_head->end = pos;
        import_write_head->statement_end = pos;
        import_write_head->safe = true;
      }
      else {
        pos--;
      }
      return;
    // import.meta
    case '.':
      pos++;
      ch = commentWhitespace(true);
      // import.meta indicated by d == -2
      if (ch == 'm' && str_eq3(pos + 1, 'e', 't', 'a') && *lastTokenPos != '.')
        addImport(startPos, startPos, pos + 4, IMPORT_META);
      return;

    default:
      // no space after "import" -> not an import keyword
      if (pos == startPos + 6)
        break;
    case '"':
    case '\'':
    case '*': {
      // import statement only permitted at base-level
      if (openTokenDepth != 0) {
        pos--;
        return;
      }
      while (pos < end) {
        ch = *pos;
        if (isQuote(ch)) {
          readImportString(startPos, ch);
          return;
        }
        pos++;
      }
      syntaxError();
      break;
    }

    case '{': {
      // import statement only permitted at base-level
      if (openTokenDepth != 0) {
        pos--;
        return;
      }

      while (pos < end) {
        ch = *pos;
        if (isQuote(ch)) {
          stringLiteral(ch);
        } else if (ch == '}') {
          pos++;
          break ;
        }

        pos++;
      }

      ch = commentWhitespace(true);
      if (!str_eq4(pos, 'f', 'r', 'o', 'm')) {
        syntaxError();
        break ;
      }

      pos += 4;
      ch = commentWhitespace(true);

      if (isQuote(ch)) {
        readImportString(startPos, ch);
      }

      break;
    }
  }
}

void tryParseExportStatement () {
  char16_t* sStartPos = pos;

  pos += 6;

  char16_t* curPos = pos;

  char16_t ch = commentWhitespace(true);

  if (pos == curPos && !isPunctuator(ch))
    return;

  switch (ch) {
    // export default ...
    case 'd':
      addExport(pos, pos + 7);
      return;

    // export async? function*? name () {
    case 'a':
      pos += 5;
      commentWhitespace(true);
    // fallthrough
    case 'f':
      pos += 8;
      ch = commentWhitespace(true);
      if (ch == '*') {
        pos++;
        ch = commentWhitespace(true);
      }
      const char16_t* startPos = pos;
      ch = readToWsOrPunctuator(ch);
      addExport(startPos, pos);
      pos--;
      return;

    case 'c':
      if (str_eq4(pos + 1, 'l', 'a', 's', 's') && isBrOrWsOrPunctuatorNotDot(*(pos + 5))) {
        pos += 5;
        ch = commentWhitespace(true);
        const char16_t* startPos = pos;
        ch = readToWsOrPunctuator(ch);
        addExport(startPos, pos);
        pos--;
        return;
      }
      pos += 2;
    // fallthrough

    // export var/let/const name = ...(, name = ...)+
    case 'v':
    case 'l':
      // destructured initializations not currently supported (skipped for { or [)
      // also, lexing names after variable equals is skipped (export var p = function () { ... }, q = 5 skips "q")
      pos += 2;
      facade = false;
      do {
        pos++;
        ch = commentWhitespace(true);
        const char16_t* startPos = pos;
        ch = readToWsOrPunctuator(ch);
        // dont yet handle [ { destructurings
        if (ch == '{' || ch == '[') {
          pos--;
          return;
        }
        if (pos == startPos)
          return;
        addExport(startPos, pos);
        ch = commentWhitespace(true);
        if (ch == '=') {
          pos--;
          return;
        }
      } while (ch == ',');
      pos--;
      return;


    // export {...}
    case '{':
      pos++;
      ch = commentWhitespace(true);
      while (true) {
        char16_t* startPos = pos;
        char16_t* endPos;

        if (!isQuote(ch)) {
          ch = readToWsOrPunctuator(ch);
          endPos = pos;
          ch = commentWhitespace(true);
        }
        // export { "identifer" as } from
        // export { "@notid" as } from
        // export { "spa ce" as } from
        // export { " space" as } from
        // export { "space " as } from
        // export { "not~id" as } from
        // export { "%notid" as } from
        // export { "identifer" } from
        // export { "%notid" } from
        else {
          char16_t *posQuoteStart = pos;

          stringLiteral(ch);

          char16_t *posQuoteEnd = pos;
          readToWsOrPunctuator(ch);
          ch = commentWhitespace(true);

          if (str_eq2(pos, 'a', 's')) {
            startPos = pos;
            endPos = pos;
          } else {
            startPos = posQuoteStart + 1;
            endPos = posQuoteEnd;
          }
        }

        ch = readExportAs(startPos, endPos);

        // ,
        if (ch == ',') {
          pos++;
          ch = commentWhitespace(true);
        }
        if (ch == '}')
          break;
        if (pos == startPos)
          return syntaxError();
        if (pos > end)
          return syntaxError();
      }
      pos++;
      ch = commentWhitespace(true);
    break;

    // export *
    // export * as X
    case '*':
      pos++;
      commentWhitespace(true);
      ch = readExportAs(pos, pos);
      ch = commentWhitespace(true);
    break;
  }

  // from ...
  if (ch == 'f' && str_eq3(pos + 1, 'r', 'o', 'm')) {
    pos += 4;
    readImportString(sStartPos, commentWhitespace(true));
  }
  else {
    pos--;
  }
}

char16_t readExportAs (char16_t* startPos, char16_t* endPos) {
  char16_t ch = *pos;

  if (ch == 'a') {
    pos += 2;
    ch = commentWhitespace(true);

    if (!isQuote(ch)) {
      startPos = pos;
      ch = readToWsOrPunctuator(ch);
      endPos = pos;
    }
    // export { mod as "identifer" } from
    // export { mod as "@notid" } from
    // export { mod as "spa ce" } from
    // export { mod as " space" } from
    // export { mod as "space " } from
    // export { mod as "not~id" } from
    // export { mod as "%notid" } from
    else {
      startPos = pos + 1;

      stringLiteral(ch);
      readToWsOrPunctuator(ch);
      endPos = pos - 1;
    }

    ch = commentWhitespace(true);
  }

  if (pos != startPos)
    addExport(startPos, endPos);
  return ch;
}

void readImportString (const char16_t* ss, char16_t ch) {
  const char16_t* startPos = pos + 1;
  if (ch == '\'') {
    stringLiteral(ch);
  }
  else if (ch == '"') {
    stringLiteral(ch);
  }
  else {
    syntaxError();
    return;
  }
  addImport(ss, startPos, pos, STANDARD_IMPORT);
  pos++;
  ch = commentWhitespace(false);
  if (ch != 'a' || !str_eq5(pos + 1, 's', 's', 'e', 'r', 't')) {
    pos--;
    return;
  }
  char16_t* assertIndex = pos;
  pos += 6;
  ch = commentWhitespace(true);
  if (ch != '{') {
    pos = assertIndex;
    return;
  }
  const char16_t* assertStart = pos;
  do {
    pos++;
    ch = commentWhitespace(true);
    if (ch == '\'') {
      stringLiteral(ch);
      pos++;
      ch = commentWhitespace(true);
    }
    else if (ch == '"') {
      stringLiteral(ch);
      pos++;
      ch = commentWhitespace(true);
    }
    else {
      ch = readToWsOrPunctuator(ch);
    }
    if (ch != ':') {
      pos = assertIndex;
      return;
    }
    pos++;
    ch = commentWhitespace(true);
    if (ch == '\'') {
      stringLiteral(ch);
    }
    else if (ch == '"') {
      stringLiteral(ch);
    }
    else {
      pos = assertIndex;
      return;
    }
    pos++;
    ch = commentWhitespace(true);
    if (ch == ',') {
      pos++;
      ch = commentWhitespace(true);
      if (ch == '}')
        break;
      continue;
    }
    if (ch == '}')
      break;
    pos = assertIndex;
    return;
  } while (true);
  import_write_head->assert_index = assertStart;
  import_write_head->statement_end = pos + 1;
}

char16_t commentWhitespace (bool br) {
  char16_t ch;
  do {
    ch = *pos;
    if (ch == '/') {
      char16_t next_ch = *(pos + 1);
      if (next_ch == '/')
        lineComment();
      else if (next_ch == '*')
        blockComment(br);
      else
        return ch;
    }
    else if (br ? !isBrOrWs(ch) : !isWsNotBr(ch)) {
      return ch;
    }
  } while (pos++ < end);
  return ch;
}

void templateString () {
  while (pos++ < end) {
    char16_t ch = *pos;
    if (ch == '$' && *(pos + 1) == '{') {
      pos++;
      templateStack[templateStackDepth++] = templateDepth;
      templateDepth = ++openTokenDepth;
      return;
    }
    if (ch == '`')
      return;
    if (ch == '\\')
      pos++;
  }
  syntaxError();
}

void blockComment (bool br) {
  pos++;
  while (pos++ < end) {
    char16_t ch = *pos;
    if (!br && isBr(ch))
      return;
    if (ch == '*' && *(pos + 1) == '/') {
      pos++;
      return;
    }
  }
}

void lineComment () {
  while (pos++ < end) {
    char16_t ch = *pos;
    if (ch == '\n' || ch == '\r')
      return;
  }
}

void stringLiteral (char16_t quote) {
  while (pos++ < end) {
    char16_t ch = *pos;
    if (ch == quote)
      return;
    if (ch == '\\') {
      ch = *++pos;
      if (ch == '\r' && *(pos + 1) == '\n')
        pos++;
    }
    else if (isBr(ch))
      break;
  }
  syntaxError();
}

char16_t regexCharacterClass () {
  while (pos++ < end) {
    char16_t ch = *pos;
    if (ch == ']')
      return ch;
    if (ch == '\\')
      pos++;
    else if (ch == '\n' || ch == '\r')
      break;
  }
  syntaxError();
  return '\0';
}

void regularExpression () {
  while (pos++ < end) {
    char16_t ch = *pos;
    if (ch == '/')
      return;
    if (ch == '[')
      ch = regexCharacterClass();
    else if (ch == '\\')
      pos++;
    else if (ch == '\n' || ch == '\r')
      break;
  }
  syntaxError();
}

char16_t readToWsOrPunctuator (char16_t ch) {
  do {
    if (isBrOrWs(ch) || isPunctuator(ch))
      return ch;
  } while (ch = *(++pos));
  return ch;
}

// Note: non-asii BR and whitespace checks omitted for perf / footprint
// if there is a significant user need this can be reconsidered
bool isBr (char16_t c) {
  return c == '\r' || c == '\n';
}

bool isWsNotBr (char16_t c) {
  return c == 9 || c == 11 || c == 12 || c == 32 || c == 160;
}

bool isBrOrWs (char16_t c) {
  return c > 8 && c < 14 || c == 32 || c == 160;
}

bool isBrOrWsOrPunctuatorNotDot (char16_t c) {
  return c > 8 && c < 14 || c == 32 || c == 160 || isPunctuator(c) && c != '.';
}

bool isQuote (char16_t ch) {
  return ch == '\'' || ch == '"';
}

bool str_eq2 (char16_t* pos, char16_t c1, char16_t c2) {
  return *(pos + 1) == c2 && *pos == c1;
}

bool str_eq3 (char16_t* pos, char16_t c1, char16_t c2, char16_t c3) {
  return *(pos + 2) == c3 && *(pos + 1) == c2 && *pos == c1;
}

bool str_eq4 (char16_t* pos, char16_t c1, char16_t c2, char16_t c3, char16_t c4) {
  return *(pos + 3) == c4 && *(pos + 2) == c3 && *(pos + 1) == c2 && *pos == c1;
}

bool str_eq5 (char16_t* pos, char16_t c1, char16_t c2, char16_t c3, char16_t c4, char16_t c5) {
  return *(pos + 4) == c5 && *(pos + 3) == c4 && *(pos + 2) == c3 && *(pos + 1) == c2 && *pos == c1;
}

bool str_eq6 (char16_t* pos, char16_t c1, char16_t c2, char16_t c3, char16_t c4, char16_t c5, char16_t c6) {
  return *(pos + 5) == c6 && *(pos + 4) == c5 && *(pos + 3) == c4 && *(pos + 2) == c3 && *(pos + 1) == c2 && *pos == c1;
}

bool str_eq7 (char16_t* pos, char16_t c1, char16_t c2, char16_t c3, char16_t c4, char16_t c5, char16_t c6, char16_t c7) {
  return *(pos + 6) == c7 && *(pos + 5) == c6 && *(pos + 4) == c5 && *(pos + 3) == c4 && *(pos + 2) == c3 && *(pos + 1) == c2 && *pos == c1;
}

bool keywordStart (char16_t* pos) {
  return pos == source || isBrOrWsOrPunctuatorNotDot(*(pos - 1));
}

bool readPrecedingKeyword1 (char16_t* pos, char16_t c1) {
  if (pos < source) return false;
  return *pos == c1 && (pos == source || isBrOrWsOrPunctuatorNotDot(*(pos - 1)));
}
bool readPrecedingKeyword2 (char16_t* pos, char16_t c1, char16_t c2) {
  if (pos - 1 < source) return false;
  return str_eq2(pos - 1, c1, c2) && (pos - 1 == source || isBrOrWsOrPunctuatorNotDot(*(pos - 2)));
}
bool readPrecedingKeyword3 (char16_t* pos, char16_t c1, char16_t c2, char16_t c3) {
  if (pos - 2 < source) return false;
  return str_eq3(pos - 2, c1, c2, c3) && (pos - 2 == source || isBrOrWsOrPunctuatorNotDot(*(pos - 3)));
}
bool readPrecedingKeyword4 (char16_t* pos, char16_t c1, char16_t c2, char16_t c3, char16_t c4) {
  if (pos - 3 < source) return false;
  return str_eq4(pos - 3, c1, c2, c3, c4) && (pos - 3 == source || isBrOrWsOrPunctuatorNotDot(*(pos - 4)));
}
bool readPrecedingKeyword5 (char16_t* pos, char16_t c1, char16_t c2, char16_t c3, char16_t c4, char16_t c5) {
  if (pos - 4 < source) return false;
  return str_eq5(pos - 4, c1, c2, c3, c4, c5) && (pos - 4 == source || isBrOrWsOrPunctuatorNotDot(*(pos - 5)));
}
bool readPrecedingKeyword6 (char16_t* pos, char16_t c1, char16_t c2, char16_t c3, char16_t c4, char16_t c5, char16_t c6) {
  if (pos - 5 < source) return false;
  return str_eq6(pos - 5, c1, c2, c3, c4, c5, c6) && (pos - 5 == source || isBrOrWsOrPunctuatorNotDot(*(pos - 6)));
}
bool readPrecedingKeyword7 (char16_t* pos, char16_t c1, char16_t c2, char16_t c3, char16_t c4, char16_t c5, char16_t c6, char16_t c7) {
  if (pos - 6 < source) return false;
  return str_eq7(pos - 6, c1, c2, c3, c4, c5, c6, c7) && (pos - 6 == source || isBrOrWsOrPunctuatorNotDot(*(pos - 7)));
}

// Detects one of case, debugger, delete, do, else, in, instanceof, new,
//   return, throw, typeof, void, yield ,await
bool isExpressionKeyword (char16_t* pos) {
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

bool isParenKeyword (char16_t* curPos) {
  return readPrecedingKeyword5(curPos, 'w', 'h', 'i', 'l', 'e') ||
      readPrecedingKeyword3(curPos, 'f', 'o', 'r') ||
      readPrecedingKeyword2(curPos, 'i', 'f');
}

bool isPunctuator (char16_t ch) {
  // 23 possible punctuator endings: !%&()*+,-./:;<=>?[]^{}|~
  return ch == '!' || ch == '%' || ch == '&' ||
    ch > 39 && ch < 48 || ch > 57 && ch < 64 ||
    ch == '[' || ch == ']' || ch == '^' ||
    ch > 122 && ch < 127;
}

bool isExpressionPunctuator (char16_t ch) {
  // 20 possible expression endings: !%&(*+,-.:;<=>?[^{|~
  return ch == '!' || ch == '%' || ch == '&' ||
    ch > 39 && ch < 47 && ch != 41 || ch > 57 && ch < 64 ||
    ch == '[' || ch == '^' || ch > 122 && ch < 127 && ch != '}';
}

bool isExpressionTerminator (char16_t* curPos) {
  // detects:
  // => ; ) finally catch else class X
  // as all of these followed by a { will indicate a statement brace
  switch (*curPos) {
    case '>':
      return *(curPos - 1) == '=';
    case ';':
    case ')':
      return true;
    case 'h':
      return readPrecedingKeyword4(curPos - 1, 'c', 'a', 't', 'c');
    case 'y':
      return readPrecedingKeyword6(curPos - 1, 'f', 'i', 'n', 'a', 'l', 'l');
    case 'e':
      return readPrecedingKeyword3(curPos - 1, 'e', 'l', 's');
  }
  return false;
}

void bail (uint32_t error) {
  has_error = true;
  parse_error = error;
  pos = end + 1;
}

void syntaxError () {
  has_error = true;
  parse_error = pos - source;
  pos = end + 1;
}
