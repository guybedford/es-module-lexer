// LEXER_MIN (defined via -DLEXER_MIN): stripped build for es-module-shims, which
// only consumes imports (n,s,e,ss,se,d,t,a) and exports (n,s,e,ls,le,ln). Drops
// the fields/getters/paths it never reads: export classification and origin
// analysis, the parsed attribute list (Attribute + ra/aks/ake/avs/ave), export
// statement_start/ess(), the facade f()/hasModuleSyntax ms() flags, and the
// module-only facade fast path. Without binding collection it also keeps the v2
// import-clause skip loop instead of the binding scanner.
#include "lexer.h"
#include <stdio.h>
#include <string.h>
// SIMD scanning is full-build only: the minimal build favors footprint
#if defined(LEXER_MIN)
#undef LEXER_SIMD
#elif defined(LEXER_SIMD)
#define LEXER_SIMD_TARGET __attribute__((target("simd128")))
#include <wasm_simd128.h>
#elif defined(__wasm_simd128__)
#define LEXER_SIMD
#define LEXER_SIMD_TARGET
#include <wasm_simd128.h>
#endif

#ifdef LEXER_SIMD
// Sparse template files do not amortize vector setup; dense files do after a
// short scalar warmup.
#define TEMPLATE_SIMD_THRESHOLD 16
static uint32_t template_scan_count;
#endif

// Keep the keyword tails in one object so the fastcomp memory image is
// contiguous and build/gen-asm-in.mjs can extract it without spanning gaps.
static const char16_t KEYWORDS[] = {
  'x', 'p', 'o', 'r', 't',
  'p', 'o', 'r', 't',
  'l', 'a', 's', 's',
  'r', 'o', 'm',
  'e', 't', 'a',
  'v', 'o',
  'y', 'i', 'e',
  'd', 'e', 'l', 'e',
  'i', 'n', 's', 't', 'a', 'n',
  't', 'y',
  'r', 'e', 't', 'u', 'r',
  'd', 'e', 'b', 'u', 'g', 'g', 'e',
  'a', 'w', 'a', 'i',
  't', 'h', 'r',
  'w', 'h', 'i', 'l', 'e',
  'f', 'o', 'r',
  'i', 'f',
  'c', 'a', 't', 'c',
  'f', 'i', 'n', 'a', 'l', 'l',
  'e', 'l', 's',
  'b', 'r', 'e', 'a',
  'c', 'o', 'n', 't', 'i', 'n',
  's', 'y', 'n', 'c',
  'u', 'n', 'c', 't', 'i', 'o', 'n',
  'o', 'u', 'r', 'c', 'e',
  'e', 'f', 'e', 'r',
  ';',
#ifdef LEX_TS
  'y', 'p', 'e',
  'n', 't', 'e', 'r', 'f', 'a', 'c', 'e',
  'n', 'e', 'w',
  'k', 'e', 'y', 'o', 'f',
  'i', 'n', 'f', 'e', 'r',
  't', 'y', 'p', 'e', 'o', 'f',
  'u', 'n', 'i', 'q', 'u', 'e',
  'i', 'm', 'p', 'o', 'r', 't',
  'r', 'e', 'a', 'd', 'o', 'n', 'l', 'y',
  'a', 'b', 's', 't', 'r', 'a', 'c', 't',
  't', 'h', 'e', 'n',
  'c', 'a', 't', 'c', 'h',
  'f', 'i', 'n', 'a', 'l', 'l', 'y',
  'e', 'c', 'l', 'a', 'r', 'e',
  'x', 't', 'e', 'n', 'd', 's',
  'n', 'u', 'm',
  'a', 'm', 'e', 's', 'p', 'a', 'c', 'e',
  'o', 'n', 's', 't',
  'o', 'd', 'u', 'l', 'e',
  'e', 'q', 'u', 'i', 'r', 'e',
#endif
};

#define XPORT KEYWORDS
#define PORT (XPORT + 5)
#define LASS (PORT + 4)
#define ROM (LASS + 4)
#define ETA (ROM + 3)
#define VO (ETA + 3)
#define YIE (VO + 2)
#define DELE (YIE + 3)
#define INSTAN (DELE + 4)
#define TY (INSTAN + 6)
#define RETUR (TY + 2)
#define DEBUGGE (RETUR + 5)
#define AWAI (DEBUGGE + 7)
#define THR (AWAI + 4)
#define WHILE (THR + 3)
#define FOR (WHILE + 5)
#define IF (FOR + 3)
#define CATC (IF + 2)
#define FINALL (CATC + 4)
#define ELS (FINALL + 6)
#define BREA (ELS + 3)
#define CONTIN (BREA + 4)
#define SYNC (CONTIN + 6)
#define UNCTION (SYNC + 4)
#define OURCE (UNCTION + 7)
#define EFER (OURCE + 5)
// Program start and opaque declaration erasure are statement boundaries.
#define STATEMENT_END (EFER + 4)
#ifdef LEX_TS
#define YPE (STATEMENT_END + 1)
#define NTERFACE (YPE + 3)
#define NEW (NTERFACE + 8)
#define KEYOF (NEW + 3)
#define INFER (KEYOF + 5)
#define TYPEOF (INFER + 5)
#define UNIQUE (TYPEOF + 6)
#define IMPORT (UNIQUE + 6)
#define READONLY (IMPORT + 6)
#define ABSTRACT (READONLY + 8)
#define THEN (ABSTRACT + 8)
#define CATCH_KW (THEN + 4)
#define FINALLY_KW (CATCH_KW + 5)
#define ECLARE (FINALLY_KW + 7)
#define XTENDS (ECLARE + 6)
#define NUM (XTENDS + 6)
#define AMESPACE (NUM + 3)
#define ONST (AMESPACE + 8)
#define ODULE (ONST + 4)
#define EQUIRE (ODULE + 5)
#endif


#ifndef LEXER_MIN
static Export** export_buckets;
static uint32_t export_bucket_count;
static uint32_t export_bucket_mask;

static int skipBracedEscape ();
static void resolvePendingExports ();

static inline __attribute__((always_inline)) bool isIdentifierCodeUnit (char16_t ch) {
  return ch >= '0' && ch <= '9' ||
         ch >= 'A' && ch <= 'Z' ||
         ch >= 'a' && ch <= 'z' ||
         ch == '_' || ch == '$' || ch == '\\' || ch >= 128;
}

// Consumes a `\u{...}` identifier escape at a '\\' on pos, leaving pos on the
// closing '}'. Returns 0 when this is not a braced escape, 1 after skipping it,
// and -1 when it never terminates.
static int skipBracedEscape () {
  if (pos + 2 > end || *(pos + 1) != 'u' || *(pos + 2) != '{')
    return 0;
  pos += 3;
  while (pos <= end && *pos != '}')
    pos++;
  return pos > end ? -1 : 1;
}

static char16_t readImportName (char16_t ch) {
  // isBrOrWs excludes U+00A0, which is ES whitespace but passes the >= 128
  // identifier test.
  while (isIdentifierCodeUnit(ch) && !isBrOrWs(ch)) {
    if (ch == '\\' && skipBracedEscape() < 0)
      return '\0';
    ch = *(++pos);
  }
  return ch;
}

static uint32_t identifierNameHash (const char16_t* start, const char16_t* identifier_end);
static char16_t readImportClause (uint32_t import_index, bool type_only_statement);
static void collectStaticImportBindings (
  char16_t ch,
  int phase_keyword,
  uint32_t import_index,
  bool type_only_statement
);
#endif

// Division / regex ambiguity + comment dispatch, shared so skipExpression
// resolves '/' with the exact main-loop logic. Returns true for a comment
// (caller must not update lastTokenPos).
static inline __attribute__((always_inline)) bool handleSlash () {
  char16_t next_ch = *(pos + 1);
  if (next_ch == '/') { lineComment(); return true; }
  if (next_ch == '*') { blockComment(true); return true; }
  char16_t lastToken = *lastTokenPos;
  if (isExpressionPunctuator(lastToken) &&
      !(lastToken == '.' && (*(lastTokenPos - 1) >= '0' && *(lastTokenPos - 1) <= '9')) &&
      !(lastToken == '+' && *(lastTokenPos - 1) == '+') && !(lastToken == '-' && *(lastTokenPos - 1) == '-') ||
      lastToken == ')' && isParenKeyword(openTokenStack[openTokenDepth].pos) ||
      openTokenDepth > 0 && openTokenStack[openTokenDepth - 1].token == AnyParen && *(lastTokenPos) == 'f' && *(lastTokenPos - 1) == 'o' && isForOfBinding(lastTokenPos - 2) && readPrecedingKeywordn(openTokenStack[openTokenDepth - 1].pos, FOR, 3) ||
      lastToken == '}' && (isExpressionTerminator(openTokenStack[openTokenDepth].pos) || openTokenStack[openTokenDepth].token == ClassBrace) ||
      isExpressionKeyword(lastTokenPos) ||
      lastToken == '/' && lastSlashWasDivision ||
      !lastToken) {
    regularExpression();
    lastSlashWasDivision = false;
  }
  else if (export_write_head != NULL && lastTokenPos >= export_write_head->start && lastTokenPos <= export_write_head->end) {
    regularExpression();
    lastSlashWasDivision = false;
  }
  else {
    while (lastTokenPos > source && !isBrOrWsOrPunctuatorNotDot(*(--lastTokenPos)));
    if (isWsNotBr(*lastTokenPos)) {
      while (lastTokenPos > source && isWsNotBr(*(--lastTokenPos)));
      if (isBreakOrContinue(lastTokenPos)) { regularExpression(); lastSlashWasDivision = false; return false; }
    }
    lastSlashWasDivision = true;
  }
  return false;
}

static inline __attribute__((always_inline)) bool isTokenRunChar (char16_t ch) {
  // Fold ASCII case; NBSP is the only non-ASCII whitespace recognized here.
  return (char16_t)((ch | 32) - 'a') < 26 || (char16_t)(ch - '0') < 10 ||
    ch == '$' || ch == '_' || ch == '\\' || (ch > 127 && ch != 160);
}

// At dynamic-import finalization: keep the recorded ${...} spans only when the
// specifier template's closing backtick was the last token of the argument, so
// its non-empty list means "lone template glob". A concatenation (`a${x}` + b)
// or a trailing operator recorded spans for its first template but does not end
// on that backtick, so its list is dropped and the decoders report undefined.
// No-op in the minimal build, which never records or reads a glob.
static inline __attribute__((always_inline)) void dropUncommittedGlob (Import* import) {
#ifndef LEXER_MIN
  if (import->template_close != import->end - 1)
    import->template_spans = NULL;
#endif
}

#ifdef LEX_TS
static inline __attribute__((always_inline)) bool isPromiseMember (const char16_t* s, size_t len) {
  return len == 4 && memcmp(s, THEN, 4 * 2) == 0 ||
         len == 5 && memcmp(s, CATCH_KW, 5 * 2) == 0 ||
         len == 7 && memcmp(s, FINALLY_KW, 7 * 2) == 0;
}

// A promise has no members besides then / catch / finally, so a qualified
// (`import('m').T`) or indexed (`import('m')['x']`) access on a dynamic import
// never dereferences in real JS and marks a type-position `import()` type.
// Called at the closing paren; a pure peek, so pos is restored.
static void classifyDynamicImportMember (Import* impt) {
  if (impt->type_only || impt->type_value_certain)
    return;
  char16_t* savePos = pos;
  pos++;
  char16_t ch = commentWhitespace(true);
  bool type_only = false;
  if (ch == '[') {
    // Only a quoted promise-member name (`import('m')['then']`) keeps an
    // indexed access runtime.
    type_only = true;
    pos++;
    ch = commentWhitespace(true);
    if (isQuote(ch)) {
      char16_t* s = pos + 1;
      char16_t* p = s;
      while (p <= end && isIdentifierCodeUnit(*p) && !isBrOrWs(*p) && *p != '\\') p++;
      if (*p == ch && isPromiseMember(s, p - s))
        type_only = false;
    }
  }
  else if (ch == '.') {
    pos++;
    ch = commentWhitespace(true);
    char16_t* s = pos;
    char16_t* p = s;
    while (p <= end && isIdentifierCodeUnit(*p) && !isBrOrWs(*p)) p++;
    type_only = p != s && !isPromiseMember(s, p - s);
  }
  pos = savePos;
  impt->type_only = type_only;
}
#endif

// Consume one token at the current ch/pos, updating the global tokenizer state.
// The single source of tokenization: the main loop and skipExpression both call
// it, so the regex/keyword/import rules never diverge. Comments do not advance
// lastTokenPos. Returns false on a syntax error so the caller can early-exit;
// always_inline lets that fold into the hot loop without a per-token has_error
// load (the comment flag, not an early `return`, keeps the fast-path shape).
static inline __attribute__((always_inline)) bool consumeToken (char16_t ch) {
  bool isComment = false;
  switch (ch) {
    case 'e':
      if (openTokenDepth == 0 && keywordStart(pos) && memcmp(pos + 1, XPORT, 5 * 2) == 0) {
        if (tryParseExportStatement()) {
          lastTokenPos = (char16_t*)STATEMENT_END;
          return true;
        }
        break;
      }
      goto skipTokenRun;
    case 'i':
      if (*(pos + 1) == 'm' && keywordStart(pos) && memcmp(pos + 2, PORT, 4 * 2) == 0) {
        tryParseImportStatement();
        break;
      }
#ifdef LEX_TS
      // Bare `interface Foo { ... }` (no `export`): skip it opaquely so a
      // member type like `m(): import('m')` is not lexed as a runtime edge. The
      // `n` pre-check keeps `if` / `in` / `instanceof` off the memcmp path.
      else if (*(pos + 1) == 'n' && keywordStart(pos) && tryTsTypeDeclaration(true)) {
        lastTokenPos = (char16_t*)STATEMENT_END;
        return true;
      }
#endif
      goto skipTokenRun;
    case 'c':
      if (*(pos + 1) == 'l' && keywordStart(pos) && memcmp(pos + 2, LASS + 1, 3 * 2) == 0 && isBrOrWs(*(pos + 5)))
        nextBraceIsClass = true;
      goto skipTokenRun;
#ifdef LEX_TS
    case 't':
      // Bare `type Foo = ...` (no `export`): skip the erased RHS so a buried
      // `import('m')` type records no runtime edge. tryTsTypeDeclaration only
      // commits when it is really `type <name> =`. The `y` pre-check keeps
      // `this` / `throw` / `try` / `typeof` off that path.
      if (*(pos + 1) == 'y' && keywordStart(pos) && tryTsTypeDeclaration(true)) {
        lastTokenPos = (char16_t*)STATEMENT_END;
        return true;
      }
      goto skipTokenRun;
#endif
    case '(':
      openTokenStack[openTokenDepth].token = AnyParen;
      openTokenStack[openTokenDepth++].pos = lastTokenPos;
      break;
    case '[':
      openTokenStack[openTokenDepth].token = AnyBracket;
      openTokenStack[openTokenDepth++].pos = lastTokenPos;
      break;
    case ']':
      if (openTokenDepth == 0) return syntaxError(), false;
      openTokenDepth--;
      break;
    case ',':
      if (dynamicImportStackDepth > 0 && openTokenDepth > 0 && openTokenStack[openTokenDepth - 1].token == ImportParen) {
        Import* cur_dynamic_import = dynamicImportStack[dynamicImportStackDepth - 1];
        if (cur_dynamic_import->end == 0) {
          cur_dynamic_import->end = lastTokenPos + 1;
          dropUncommittedGlob(cur_dynamic_import);
          pos++;
          ch = commentWhitespace(true);
          cur_dynamic_import->attr_index = pos;
          pos--;
        }
      }
      break;
    case ')':
      if (openTokenDepth == 0) return syntaxError(), false;
      openTokenDepth--;
      if (dynamicImportStackDepth > 0 && openTokenStack[openTokenDepth].token == ImportParen) {
        Import* cur_dynamic_import = dynamicImportStack[dynamicImportStackDepth - 1];
        if (cur_dynamic_import->end == 0) {
          cur_dynamic_import->end = lastTokenPos + 1;
          dropUncommittedGlob(cur_dynamic_import);
        }
        cur_dynamic_import->statement_end = pos + 1;
#ifdef LEX_TS
        classifyDynamicImportMember(cur_dynamic_import);
#endif
        dynamicImportStackDepth--;
      }
      break;
    case '{':
      // dynamic import followed by { is not a dynamic import (so remove)
      // this is a sneaky way to get around { import () {} } v { import () }
      // block / object ambiguity without a parser (assuming source is valid)
      // statement_end (the char after the closing paren) identifies that paren;
      // end is moved before the first comma for import(a, b), so it can't be used here
      if (*lastTokenPos == ')' && import_write_head && import_write_head->statement_end == lastTokenPos + 1) {
        import_write_head = import_write_head_last;
        if (import_write_head)
          import_write_head->next = NULL;
        else
          first_import = NULL;
#ifndef LEXER_MIN
        import_count--;
#endif
      }
      openTokenStack[openTokenDepth].token = nextBraceIsClass ? ClassBrace : AnyBrace;
      openTokenStack[openTokenDepth++].pos = lastTokenPos;
      nextBraceIsClass = false;
      break;
    case '}':
      if (openTokenDepth == 0) return syntaxError(), false;
      if (openTokenStack[--openTokenDepth].token == TemplateBrace) {
#ifndef LEXER_MIN
        // A top-level ${...} of an open dynamic import's specifier template just
        // closed: record the position after "}" so the decoders splice a "*".
        // The top import is the innermost, so a nested import's substitutions
        // record against the nested entry, never this one.
        if (dynamicImportStackDepth > 0) {
          Import* cur_dynamic_import = dynamicImportStack[dynamicImportStackDepth - 1];
          if (cur_dynamic_import->specifier_template_depth == openTokenDepth) {
            ensureAnalysisCapacity(sizeof(TemplateSpan));
            TemplateSpan* span = (TemplateSpan*)(analysis_head);
            analysis_head = analysis_head + sizeof(TemplateSpan);
            span->end = pos + 1;
            span->next = NULL;
            if (cur_dynamic_import->template_span_tail == NULL)
              cur_dynamic_import->template_spans = span;
            else
              cur_dynamic_import->template_span_tail->next = span;
            cur_dynamic_import->template_span_tail = span;
          }
        }
#endif
        templateString();
      }
      break;
    case '\'':
    case '"':
      stringLiteral(ch);
      break;
#ifndef LEXER_MIN
    case '\\': {
      char16_t* escapePos = pos;
      int escape = skipBracedEscape();
      // A plain `\uXXXX` escape is part of the identifier run.
      if (escape == 0)
        goto skipTokenRun;
      if (escape < 0)
        return syntaxError(), false;
      // The escape is one identifier token, so its braces are not brace tokens.
      lastTokenPos = escapePos;
      return true;
    }
#endif
    case '/':
      isComment = handleSlash();
      break;
    case '`':
#ifndef LEXER_MIN
      // A backtick that opens an active dynamic import's argument (its recorded
      // specifier start, so leading whitespace/comments don't matter) opens the
      // specifier template: mark this import so its top-level ${...} spans are
      // recorded for globbing (see struct TemplateSpan). Per-import, so a nested
      // import(`...`) in a substitution records against its own entry and never
      // corrupts an enclosing import.
      if (dynamicImportStackDepth > 0 &&
          dynamicImportStack[dynamicImportStackDepth - 1]->end == 0 &&
          dynamicImportStack[dynamicImportStackDepth - 1]->start == pos)
        dynamicImportStack[dynamicImportStackDepth - 1]->specifier_template_depth = openTokenDepth + 1;
#endif
      openTokenStack[openTokenDepth].pos = lastTokenPos;
      openTokenStack[openTokenDepth++].token = Template;
      templateString();
      break;
    default:
      if (!isTokenRunChar(ch))
        break;
    skipTokenRun:
      while (isTokenRunChar(*(pos + 1))) pos++;
  }
  if (!isComment)
    lastTokenPos = pos;
  return true;
}

// Note: parsing is based on the _assumption_ that the source is already valid
bool parse () {
  // stack allocations
  // these are done here to avoid data section \0\0\0 repetition bloat
  // (while gzip fixes this, still better to have ~10KiB ungzipped over ~20KiB)
  OpenToken openTokenStack_[1024];
  Import* dynamicImportStack_[512];

  facade = true;
#ifndef LEXER_MIN
  hasModuleSyntax = false;
#endif
  dynamicImportStackDepth = 0;
  openTokenDepth = 0;
  lastTokenPos = (char16_t*)STATEMENT_END;
  lastSlashWasDivision = false;
  parse_error = 0;
  has_error = false;
  openTokenStack = &openTokenStack_[0];
  dynamicImportStack = &dynamicImportStack_[0];
  nextBraceIsClass = false;
#ifdef LEXER_SIMD
  template_scan_count = 0;
#endif

  pos = (char16_t*)(source - 1);
  char16_t ch = '\0';
  end = pos + sourceLen;

#ifndef LEXER_MIN
  // start with a pure "module-only" parser
  while (pos++ < end) {
    ch = *pos;

    if (ch == 32 || ch < 14 && ch > 8) {
      continue;
    }

    switch (ch) {
      case 'e':
        if (openTokenDepth == 0 && keywordStart(pos) && memcmp(pos + 1, XPORT, 5 * 2) == 0) {
          if (tryParseExportStatement()) {
            lastTokenPos = (char16_t*)STATEMENT_END;
            continue;
          }
          // export might have been a non-pure declaration
          if (!facade) {
            lastTokenPos = pos;
            goto mainparse;
          }
        }
        break;
      case 'i':
        if (*(pos + 1) == 'm' && keywordStart(pos) && memcmp(pos + 2, PORT, 4 * 2) == 0) {
          tryParseImportStatement();
          break;
        }
#ifdef LEX_TS
        // A bare `interface` is a non-import statement: leave the facade fast
        // path like any other token so the main parser skips its body (where a
        // member type must not be lexed as a runtime edge).
        if (keywordStart(pos) && isTsInterfaceKeyword(pos)) {
          facade = false;
          pos--;
          goto mainparse;
        }
#endif
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

  // the minimal build has no facade fast-path; everything goes through mainparse
  mainparse:
#endif
  while (pos++ < end) {
    ch = *pos;

    if (ch == 32 || ch < 14 && ch > 8) {
      continue;
    }

    if (!consumeToken(ch))
      return false;
  }

  if (openTokenDepth || has_error || dynamicImportStackDepth)
    return false;

#ifndef LEXER_MIN
  if (pending_export_count != 0) {
    resolvePendingExports();
    // The resolver arena can still run out in the asm.js build.
    if (has_error)
      return false;
  }
#endif

  // succeess
  return true;
}

void tryParseImportStatement () {
  char16_t* startPos = pos;

  pos += 6;

  char16_t ch = commentWhitespace(true);

#ifdef LEX_TS
  // `import type ...` is type-only unless `type` is really the binding: a value
  // default import named `type` (`import type,`, `import type =`, and
  // `import type from 'x'` where `from` is the keyword) keeps a runtime edge.
  // Only `import type from from 'x'` (default binding named `from`) is type-only.
  bool typeOnly = false;
  if (isTsTypeKeyword(pos)) {
    char16_t* savePos = pos;
    pos += 4;
    char16_t nextCh = commentWhitespace(true);
    bool typeIsBinding = nextCh == ',' || nextCh == '=';
    // `import type from ...`: `from` is the keyword and `type` the default
    // binding only when a string follows; `import type from from 'x'` binds
    // `from` and stays type-only.
    if (!typeIsBinding && nextCh == 'f' && memcmp(pos + 1, ROM, 3 * 2) == 0 &&
        (isBrOrWs(*(pos + 4)) || isQuote(*(pos + 4)) || *(pos + 4) == '/')) {
      char16_t* fromPos = pos;
      pos += 4;
      typeIsBinding = isQuote(commentWhitespace(true));
      pos = fromPos;
    }
    if (!typeIsBinding) {
      typeOnly = true;
      ch = nextCh;
    } else {
      pos = savePos;
    }
  }
#endif

  char16_t* maybePhasePos = pos;

  int phase_keyword = 0;

  if (ch == '.') {
    // import.meta
    pos++;
    ch = commentWhitespace(true);
    // import.meta indicated by d == -2
    if (ch == 'm' && memcmp(pos + 1, ETA, 3 * 2) == 0 && (isSpread(lastTokenPos) || *lastTokenPos != '.')) {
      addImport(startPos, startPos, pos + 4, IMPORT_META);
      return;
    }
    else if (ch == 's' && memcmp(pos + 1, OURCE, 5 * 2) == 0 && (isSpread(lastTokenPos) || *lastTokenPos != '.')) {
      phase_keyword = 1;
      pos += 6;
      ch = commentWhitespace(true);
    }
    else if (ch == 'd' && memcmp(pos + 1, EFER, 4 * 2) == 0 && (isSpread(lastTokenPos) || *lastTokenPos != '.')) {
      phase_keyword = 2;
      pos += 5;
      ch = commentWhitespace(true);
    }
    else {
      return;
    }
  }
  else if (pos > startPos + 6 && ch == 's' && memcmp(pos + 1, OURCE, 5 * 2) == 0 && isBrOrWs(*(pos + 6))) {
    phase_keyword = 1;
    pos += 6;
    ch = commentWhitespace(true);
    // need a space after the source keyword, and must not be followed by from keyword
    if (
      pos == maybePhasePos + 6 ||
      ch == ',' ||
      ch == 'f' && memcmp(pos + 1, &ROM[0], 3 * 2) == 0 && isBrOrWsOrPunctuatorNotDot(*(pos + 4))
    ) {
      pos = maybePhasePos;
      ch = *pos;
      phase_keyword = 0;
    }
  }
  else if (pos > startPos + 5 && ch == 'd' && memcmp(pos + 1, EFER, 4 * 2) == 0 && isBrOrWs(*(pos + 5))) {
    phase_keyword = 2;
    pos += 5;
    ch = commentWhitespace(true);
    // need a * after the defer keyword
    if (ch != '*') {
      pos = maybePhasePos;
      ch = *pos;
      phase_keyword = 0;
    }
  }

  // dynamic import
  if (ch == '(') {
    openTokenStack[openTokenDepth].token = ImportParen;
    openTokenStack[openTokenDepth++].pos = pos;
    if (*lastTokenPos == '.')
      return;
    // dynamic import indicated by positive d
    char16_t* dynamicPos = pos;
    // try parse a string, to record a safe dynamic import string
    pos++;
    ch = commentWhitespace(true);
    addImport(startPos, pos, 0, dynamicPos);
#ifdef LEX_TS
    // `await` cannot precede a type, vetoing the member peek; `typeof
    // import('m')` is a namespace type in TS and dead code on a promise in JS.
    import_write_head->type_value_certain = *lastTokenPos == 't' && readPrecedingKeywordn(lastTokenPos - 1, AWAI, 4);
    if (*lastTokenPos == 'f' && readPrecedingKeywordn(lastTokenPos, TYPEOF, 6))
      import_write_head->type_only = true;
#endif
    if (phase_keyword > 0)
      import_write_head->import_ty = phase_keyword == 1 ? DynamicSourcePhase : DynamicDeferPhase;
    dynamicImportStack[dynamicImportStackDepth++] = import_write_head;
    if (ch == '\'') {
      stringLiteral(ch);
    }
    else if (ch == '"') {
      stringLiteral(ch);
    }
    else if (ch == '`' && noSubstitutionTemplate()) {
      // A no-substitution template literal is a constant string, so it is a
      // safe specifier exactly like a quoted one. An interpolated template
      // leaves noSubstitutionTemplate() false and falls through to the open-
      // token machinery, which records the import as unsafe (n stays unset).
    }
    else {
      pos--;
      return;
    }
    pos++;
    char16_t* endPos = pos;
    ch = commentWhitespace(true);
    if (ch == ',') {
      pos++;
      ch = commentWhitespace(true);
      import_write_head->end = endPos;
      import_write_head->attr_index = pos;
      import_write_head->safe = true;
      pos--;
    }
    else if (ch == ')') {
      openTokenDepth--;
      import_write_head->end = endPos;
      import_write_head->statement_end = pos + 1;
      import_write_head->safe = true;
#ifdef LEX_TS
      classifyDynamicImportMember(import_write_head);
#endif
      dynamicImportStackDepth--;
    }
    else {
      pos--;
    }
    return;
  }

  if (ch == '{' && phase_keyword == 0) {
    // import statement only permitted at base-level
    if (openTokenDepth != 0) {
      pos--;
      return;
    }

#ifndef LEXER_MIN
    pos++;
    ch = readImportClause(import_count, false);
    if (ch != '}')
      return syntaxError();
    pos++;
#else
    while (pos < end) {
      ch = commentWhitespace(true);
      if (isQuote(ch)) {
        stringLiteral(ch);
      }
      else if (ch == '}') {
        pos++;
        break;
      }
      pos++;
    }
#endif

    ch = commentWhitespace(true);
    if (ch == 'f' && memcmp(pos + 1, ROM, 3 * 2) != 0) {
      syntaxError();
      return;
    }

    pos += 4;
    ch = commentWhitespace(true);

    if (!isQuote(ch)) {
      return syntaxError();
    }

    readImportString(startPos, ch, false);
#ifdef LEX_TS
    if (typeOnly && import_write_head)
      import_write_head->type_only = true;
#endif
  }
  else {
    if (!(ch == '"' || ch == '\'' || ch == '*')) {
      // no space after "import" -> not an import keyword
      if (pos == startPos + 6) {
        pos--;
        return;
      }
    }
    // import defer * as foo mandates *;
    // import statement only permitted at base-level
    if (phase_keyword == 2 && ch != '*' || openTokenDepth != 0) {
      pos--;
      return;
    }
#ifdef LEX_TS
    // TS import-equals: `import A = require('m')` keeps a runtime CJS edge
    // (type-only under an `import type` modifier); a namespace alias RHS
    // (`import A = N.M`) is erased.
    if (phase_keyword == 0 && isTsIdentifierStart(ch)) {
      char16_t* clausePos = pos;
      readImportName(ch);
      if (pos != clausePos) {
        char16_t eqCh = commentWhitespace(true);
        if (eqCh == '=' && *(pos + 1) != '=') {
          pos++;
          char16_t rhCh = commentWhitespace(true);
          if (rhCh == 'r' && memcmp(pos + 1, EQUIRE, 6 * 2) == 0 && !isIdentifierCodeUnit(*(pos + 7))) {
            char16_t* requirePos = pos;
            pos += 7;
            if (commentWhitespace(true) == '(') {
              pos++;
              char16_t quote = commentWhitespace(true);
              if (isQuote(quote)) {
                readImportString(startPos, quote, false);
                if (has_error)
                  return;
                if (typeOnly && import_write_head)
                  import_write_head->type_only = true;
                pos++;
                if (commentWhitespace(true) != ')')
                  pos--;
                return;
              }
            }
            pos = requirePos;
          }
          skipTsErasedTail(true);
          pos--;
          return;
        }
        pos = clausePos;
        ch = *pos;
      }
    }
#endif
#ifndef LEXER_MIN
    if (!isQuote(ch))
      collectStaticImportBindings(ch, phase_keyword, import_count, false);
#endif
    while (pos < end) {
      ch = *pos;
      if (isQuote(ch)) {
        readImportString(startPos, ch, phase_keyword);
#ifdef LEX_TS
        if (typeOnly && import_write_head)
          import_write_head->type_only = true;
#endif
        return;
      }
      pos++;
    }
    syntaxError();
  }
}

// True for a char that can end a value. skipExpression uses this to tell
// division from a regex: a '/' right after a value is division. Non-ASCII is
// always an identifier char here (every JS operator is ASCII), so it counts as
// a value — otherwise `x = π / 2` would read the '/' as a regex.
bool isValueChar (char16_t c) {
  return c >= '0' && c <= '9' || c >= 'A' && c <= 'Z' || c >= 'a' && c <= 'z' || c == '_' || c == '$' || c >= 128;
}

#ifdef LEX_TS
// True for the contextual `type` token, not identifiers like `typeof`. The
// follower begins an import/export clause: whitespace (`type T`, `type from`),
// `{` (`type{`), `*` (`type* as ns`) or `/` (a `type/*c*/{ ... }` comment).
static inline __attribute__((always_inline)) bool isTsTypeKeyword (char16_t* pos) {
  if (*pos != 't' || memcmp(pos + 1, YPE, 3 * 2) != 0)
    return false;
  char16_t after = *(pos + 4);
  return isBrOrWs(after) || after == '{' || after == '*' || after == '/';
}

static inline __attribute__((always_inline)) bool isTsInterfaceKeyword (char16_t* pos) {
  return *pos == 'i' && memcmp(pos + 1, NTERFACE, 8 * 2) == 0 &&
    (isBrOrWs(*(pos + 9)) || *(pos + 9) == '/');
}

// An identifier may begin here. Type/interface names never start with a digit,
// and escaped declaration names are erased without entering the export list.
static inline __attribute__((always_inline)) bool isTsIdentifierStart (char16_t c) {
  return c != '\\' && !(c >= '0' && c <= '9') && isIdentifierCodeUnit(c);
}

// `type` is a modifier when another specifier name follows. A bare `type` or
// `type as T` names the value `type`; `type as as T` modifies the name `as`.
static inline __attribute__((always_inline)) bool tryTsTypeModifier (char16_t* ch) {
  if (!isTsTypeKeyword(pos))
    return false;
  char16_t* savePos = pos;
  pos += 4;
  char16_t afterCh = commentWhitespace(true);
  bool typeIsName = afterCh == ',' || afterCh == '}';
  if (!typeIsName && afterCh == 'a' && *(pos + 1) == 's' && isBrOrWsOrPunctuatorNotDot(*(pos + 2))) {
    char16_t* asPos = pos;
    pos += 2;
    char16_t afterAs = commentWhitespace(true);
    typeIsName = true;
    if (afterAs == 'a' && *(pos + 1) == 's' && isBrOrWsOrPunctuatorNotDot(*(pos + 2))) {
      // `type as as X` renames the type `as`; a terminated `type as as` is
      // still the value `type` renamed `as`.
      pos += 2;
      char16_t afterSecond = commentWhitespace(true);
      typeIsName = !isTsIdentifierStart(afterSecond) && afterSecond != '\\';
    }
    pos = asPos;
  }
  if (typeIsName) {
    pos = savePos;
    return false;
  }
  *ch = afterCh;
  return true;
}

// Consumes a comment, string, or template literal so no bracket, angle, or
// `import` inside one is misread while skipping erased type syntax. pos AT the
// candidate char; returns true and leaves pos AT the last consumed char when it
// was one, false with pos unchanged otherwise. Templates are skipped whole,
// including `${ ... }` substitutions, via skipTsBalanced on the inner brace.
bool skipTsTrivia (char16_t ch, bool stopAtLineBreak) {
  if (ch == '/') {
    char16_t next = *(pos + 1);
    if (next == '/') {
      lineComment();
      return true;
    }
    if (next == '*') {
      blockComment(!stopAtLineBreak);
      return true;
    }
    return false;
  }
  if (isQuote(ch)) {
    stringLiteral(ch);
    return true;
  }
  if (ch == '`') {
    while (++pos <= end) {
      char16_t c = *pos;
      if (c == '`')
        return true;
      if (c == '\\') {
        pos++;
      } else if (c == '$' && *(pos + 1) == '{') {
        pos++;
        // skipTsBalanced leaves pos AT the char after the matching '}'; step
        // back so the loop's ++pos re-reads it. Otherwise a substitution at the
        // very end (`\`${T}\``) skips the closing backtick and the scan runs
        // past the template into the following code.
        skipTsBalanced();
        pos--;
      }
    }
    return true;
  }
  return false;
}

// A line-leading token that can only continue a type keeps the erased region
// open across the break: union/intersection arms, conditional-type branches
// (`? X : Y`), a `extends` constraint, an arrow result or a qualified-name
// segment. None of these can begin a JS statement, so ASI never applies there.
static bool tryTsTypeContinuation () {
  char16_t* savePos = pos;
  char16_t ch = commentWhitespace(true);
  if (ch == '|' || ch == '&' || ch == '?' || ch == ':' || ch == '.') {
    pos++;
    return true;
  }
  if (ch == '=' && *(pos + 1) == '>') {
    pos += 2;
    return true;
  }
  if (ch == 'e' && memcmp(pos + 1, XTENDS, 6 * 2) == 0 && isBrOrWsOrPunctuatorNotDot(*(pos + 7))) {
    pos += 7;
    return true;
  }
  pos = savePos;
  return false;
}

// pos AT an opener: '<' (type parameter / argument list) or '(' / '[' / '{'.
// Skips the balanced region opaquely, leaving pos AT the char after the
// matching closer. Comments, strings, and templates are consumed so a bracket
// inside one is ignored; nested openers recurse. For angles, `>>` / `>>>` close
// multiple levels and `=>` never closes. Nothing here re-enters the tokenizer,
// so an `import(...)` inside erased type text records no runtime edge. Returns
// false at EOF when the region is unbalanced.
bool skipTsBalanced () {
  char16_t open = *pos;
  if (open == '<') {
    int angle = 0;
    while (pos <= end) {
      char16_t ch = *pos;
      if (ch == '<') {
        angle++;
      } else if (ch == '>') {
        // `=>` is not a closer.
        if (*(pos - 1) != '=' && --angle == 0) {
          pos++;
          return true;
        }
      } else if (ch == '(' || ch == '[' || ch == '{') {
        if (!skipTsBalanced())
          return false;
        continue;
      } else if (skipTsTrivia(ch, false)) {
        // pos left AT the last consumed char; fall through to the pos++ below.
      }
      pos++;
    }
    return false;
  }
  char16_t close = open == '(' ? ')' : open == '[' ? ']' : '}';
  while (++pos <= end) {
    char16_t ch = *pos;
    if (ch == close) {
      pos++;
      return true;
    }
    if (ch == '(' || ch == '[' || ch == '{') {
      if (!skipTsBalanced())
        return false;
      pos--;
    } else {
      skipTsTrivia(ch, false);
    }
  }
  return false;
}

// pos AT a `type` or `interface` keyword candidate that begins a declaration.
// Consumes the whole declaration (alias RHS or interface body) so its erased
// contents never reach the tokenizer. On the `export` path (bare == false) the
// declared name is recorded as a type-only export; a bare declaration
// (bare == true, `type Foo = ...` / `interface Foo {}` with no `export`)
// produces no export, it only shields its body's `import(...)` types from
// becoming runtime edges. Returns false without moving pos when this is not a
// declaration, so the caller falls back to its normal paths.
//
// The two modes differ only in the entry ambiguity: after `export`, `type` /
// `interface` are unambiguously the declaration keyword, so invalid input with
// a name on the next line is handled best-effort. At statement position without
// `export`, `type` is also a valid identifier, so a bare alias is only accepted
// as `type <name> =` on the same line (`type\nX` is `type` then, via ASI, `X`;
// `type as T`, `type()` are value expressions). `interface Foo {` has no value
// meaning, so it needs no `=` confirmation.
bool tryTsTypeDeclaration (bool bare) {
  char16_t* savePos = pos;
  bool isInterface = *pos == 'i';
  int keywordLen;
  if (isInterface) {
    if (!isTsInterfaceKeyword(pos))
      return false;
    keywordLen = 9;
  }
  else {
    if (!isTsTypeKeyword(pos))
      return false;
    keywordLen = 4;
  }
  pos += keywordLen;

  // The export path handles a name on the next line best-effort. A bare
  // declaration must stop at the break so a value `type` on its own line is
  // not swallowed.
  char16_t nameCh = commentWhitespace(!bare);
  bool reportExport = isTsIdentifierStart(nameCh);
  if (!reportExport && nameCh != '\\') {
    pos = savePos;
    return false;
  }

  char16_t* nameStart = pos;
  readToWsOrPunctuator(nameCh);
  char16_t* nameEnd = pos;

  char16_t ch = commentWhitespace(true);
  if (ch == '<') {
    if (!skipTsBalanced()) {
      syntaxError();
      return true;
    }
    ch = commentWhitespace(true);
  }

  // A bare alias is only a declaration when a `=` follows the (optional) type
  // parameters. Without it (`type foo` used as a value, `type as X`) restore
  // and let the normal tokenizer handle it. `interface`'s `{` body is
  // unambiguous, so no confirmation is needed there.
  if (bare && !isInterface && ch != '=') {
    pos = savePos;
    return false;
  }

  if (!bare && reportExport) {
    addExport(nameStart, nameEnd, nameStart, nameEnd);
    export_write_head->import_name_ty |= TYPE_ONLY_EXPORT;
  }

  if (isInterface) {
    // Scan the `extends` / `implements` heritage to the body `{`, skipping any
    // type-argument list (`extends Bar<{ x }>`) balanced so an inner brace is
    // not mistaken for the body, then skip the body itself balanced. The whole
    // declaration is erased, so no member (`load(): import('m')`) must reach the
    // tokenizer and record a bogus edge.
    while (pos < end && ch != '{') {
      if (ch == '<' || ch == '(' || ch == '[') {
        if (!skipTsBalanced())
          break;
      } else {
        pos++;
      }
      ch = commentWhitespace(true);
    }
    if (ch == '{')
      skipTsBalanced();
  }
  else {
    // `type Foo = <rhs>`: skip to '=', then skip the erased RHS
    // (skipTsErasedTail), pending an operand so a line break directly after the
    // '=' keeps the type open.
    while (pos < end && ch != '=' && ch != ';' && !isBr(ch))
      ch = (pos++, commentWhitespace(false));
    if (ch == '=') {
      pos++;
      skipTsErasedTail(true);
    }
  }
  pos--;
  return true;
}

// Erased-region scan to the statement end: a depth-0 ';', EOF, or an ASI line
// break once the current operand is complete. `operandPending` is true after
// any operator or prefix keyword (`keyof`, `|`, `=>`, ...) that still needs an
// operand, so a line break there keeps the region open (`type T = keyof\n
// Foo`); it is false after a value (name, string, template, balanced region),
// where a line break ends the region by ASI unless a type-only continuation
// token follows (tryTsTypeContinuation). Leaves pos AT the terminator.
void skipTsErasedTail (bool operandPending) {
  while (pos <= end) {
    char16_t ch = *pos;
    if (ch == ';')
      break;
    if (isBr(ch)) {
      if (!operandPending) {
        if (!tryTsTypeContinuation())
          break;
        operandPending = true;
      }
      else {
        pos++;
      }
      continue;
    }
    if (isWsNotBr(ch)) {
      pos++;
      continue;
    }
    if (ch == '}' && openTokenDepth > 0)
      break;
    if (ch == '<' || ch == '(' || ch == '[' || ch == '{') {
      if (!skipTsBalanced())
        break;
      operandPending = false;
      continue;
    }
    bool multilineComment = ch == '/' && *(pos + 1) == '*';
    if (skipTsTrivia(ch, true)) {
      bool sawLineBreak = ch == '/' && isBr(*pos);
      if (sawLineBreak && multilineComment) {
        // blockComment starts scanning after its opening position.
        pos--;
        blockComment(true);
      }
      // A comment leaves operandPending unchanged (it is not a token); a
      // string / template is a value, so the operand is now satisfied.
      if (ch != '/')
        operandPending = false;
      pos++;
      if (sawLineBreak && !operandPending) {
        if (!tryTsTypeContinuation())
          break;
        operandPending = true;
      }
      continue;
    }
    if (isTsIdentifierStart(ch)) {
      // A prefix type keyword (`keyof Foo`, `typeof x`, `new () => T`, ...)
      // still needs an operand, so a following line break must not end the
      // alias; any other identifier completes the current operand.
      char16_t* wordStart = pos;
      readToWsOrPunctuator(ch);
      operandPending = isTsTypePrefixKeyword(wordStart, pos);
      continue;
    }
    // An operator (`|`, `&`, `.`, `?`, `:`, `,`, `=>`, ...) needs an
    // operand next; `)`, `]`, `}` already advanced via skipTsBalanced.
    operandPending = true;
    pos++;
  }
}

// True for a leading type operator keyword that must bind an operand to its
// right (`keyof T`, `typeof x`, `readonly T[]`, `unique symbol`, `infer U`,
// `new () => T`, `abstract new () => T`, `import('m')`). A line break after one
// continues the type, so the erased alias RHS must not end there. Matched on
// exact length + memcmp so `newish` / `imports` (longer words) do not qualify.
bool isTsTypePrefixKeyword (char16_t* start, char16_t* afterEnd) {
  switch (afterEnd - start) {
    case 3: return memcmp(start, NEW, 3 * 2) == 0;
    case 5: return memcmp(start, KEYOF, 5 * 2) == 0 || memcmp(start, INFER, 5 * 2) == 0;
    case 6: return memcmp(start, TYPEOF, 6 * 2) == 0 || memcmp(start, UNIQUE, 6 * 2) == 0 ||
                   memcmp(start, IMPORT, 6 * 2) == 0;
    case 8: return memcmp(start, READONLY, 8 * 2) == 0 || memcmp(start, ABSTRACT, 8 * 2) == 0;
    default: return false;
  }
}

// `export enum E` / `export namespace N`: records the declared runtime value
// name; the (non-erasable) body tokenizes as JS. Leaves pos before the char
// after the name, matching the class declaration convention.
static bool tryTsValueDeclarationName (char16_t ch) {
  int keywordLen;
  if (ch == 'e' && memcmp(pos + 1, NUM, 3 * 2) == 0 && isBrOrWs(*(pos + 4)))
    keywordLen = 4;
  else if (ch == 'n' && memcmp(pos + 1, AMESPACE, 8 * 2) == 0 && isBrOrWs(*(pos + 9)))
    keywordLen = 9;
  else
    return false;
  char16_t* savePos = pos;
  pos += keywordLen;
  ch = commentWhitespace(true);
  if (!isTsIdentifierStart(ch)) {
    pos = savePos;
    return false;
  }
  char16_t* nameStart = pos;
  readToWsOrPunctuator(ch);
  addExport(nameStart, pos, nameStart, pos);
  pos--;
  return true;
}

// `export declare <declaration>`: the declaration is ambient and fully erased,
// but its name stays importable, so it is recorded as a type-only export.
// Modifier and declaration-kind keywords are skipped to the declared name; a
// non-identifier there (`declare module 'm'`) records nothing.
void tsAmbientExportDeclaration () {
  char16_t ch = commentWhitespace(true);
  if (tryTsTypeDeclaration(false))
    return;
  for (bool matched = true; matched;) {
    matched = false;
    switch (ch) {
      case 'a':
        if (memcmp(pos, ABSTRACT, 8 * 2) == 0 && isBrOrWs(*(pos + 8))) {
          pos += 8;
          matched = true;
        }
        break;
      case 'c':
        if ((memcmp(pos + 1, LASS, 4 * 2) == 0 || memcmp(pos + 1, ONST, 4 * 2) == 0) && isBrOrWs(*(pos + 5))) {
          pos += 5;
          matched = true;
        }
        break;
      case 'l':
        if (*(pos + 1) == 'e' && *(pos + 2) == 't' && isBrOrWs(*(pos + 3))) {
          pos += 3;
          matched = true;
        }
        break;
      case 'v':
        if (*(pos + 1) == 'a' && *(pos + 2) == 'r' && isBrOrWs(*(pos + 3))) {
          pos += 3;
          matched = true;
        }
        break;
      case 'f':
        if (memcmp(pos + 1, UNCTION, 7 * 2) == 0 && isBrOrWs(*(pos + 8))) {
          pos += 8;
          matched = true;
        }
        break;
      case 'e':
        if (memcmp(pos + 1, NUM, 3 * 2) == 0 && isBrOrWs(*(pos + 4))) {
          pos += 4;
          matched = true;
        }
        break;
      case 'n':
        if (memcmp(pos + 1, AMESPACE, 8 * 2) == 0 && isBrOrWs(*(pos + 9))) {
          pos += 9;
          matched = true;
        }
        break;
      case 'm':
        if (memcmp(pos + 1, ODULE, 5 * 2) == 0 && isBrOrWs(*(pos + 6))) {
          pos += 6;
          matched = true;
        }
        break;
    }
    if (matched)
      ch = commentWhitespace(true);
  }
  if (isTsIdentifierStart(ch)) {
    char16_t* nameStart = pos;
    readToWsOrPunctuator(ch);
    addExport(nameStart, pos, nameStart, pos);
    export_write_head->import_name_ty |= TYPE_ONLY_EXPORT;
  }
  skipTsErasedTail(false);
  pos--;
}
#endif

// Skips an initializer or default-value expression, returning the depth-0
// terminator (',' or ';', or an enclosing ')'/']'/'}' that the expression did
// not open) and leaving pos AT it. With `asi` set, a line break following a
// value also terminates, so the statement after an automatic semicolon is never
// read as another binding. Entry: pos AT the char before the expression (the
// '=' of an initializer, or the '[' of a computed key).
char16_t skipExpression (bool asi) {
  // Rides consumeToken (the single tokenizer) so the regex/keyword/import rules
  // match the main loop exactly. Ends at a ',' / ';' / enclosing closer at the
  // entry depth, or - with asi - a line break after a value. Entry: pos AT the
  // char before the expression (the '=' of an initializer or the '[' of a
  // computed key); that char is the previous token, so a leading '/' is a regex.
  uint32_t baseDepth = openTokenDepth;
  bool lastWasValue = false;
  lastTokenPos = pos;
  while (pos++ < end) {
    char16_t ch = *pos;
    if (isWsNotBr(ch))
      continue;
    if (openTokenDepth == baseDepth) {
      if (ch == ',' || ch == ';' || ch == ')' || ch == ']' || ch == '}')
        return ch;
      if (asi && lastWasValue && isBr(ch))
        return ch;
    }
    if (isBr(ch))
      continue;
    char16_t* before = lastTokenPos;
    consumeToken(ch);
    if (has_error)
      return '\0';
    if (lastTokenPos == before) {
      // a comment: a line comment can land on the ASI-terminating line break
      if (asi && openTokenDepth == baseDepth && lastWasValue && isBr(*pos))
        return *pos;
    }
    else {
      lastWasValue = ch == '/' ? !lastSlashWasDivision
                   : isValueChar(ch) || ch == ')' || ch == ']' || ch == '}' || ch == '\'' || ch == '"' || ch == '`';
    }
  }
  return '\0';
}

// pos AT a binding target: an identifier or a nested '{'/'[' destructuring
// pattern. Adds the bound name(s), then skips trailing whitespace/comments and
// returns the next significant char with pos AT it. pos is left unchanged when
// no target is present (malformed input or the end of a binding list).
char16_t readBindingTarget (char16_t ch) {
  if (ch == '{' || ch == '[') {
    readBindingPattern();
    pos++;
  } else {
    char16_t* nameStart = pos;
    readToWsOrPunctuator(ch);
    if (pos > nameStart)
      addExport(nameStart, pos, nameStart, pos);
  }
  return commentWhitespace(true);
}

// pos AT '{' or '['. Adds every identifier bound by the destructuring pattern,
// resolving aliases ({ a: b } adds b), defaults ({ a = 1 } adds a), rest
// (...rest adds rest) and arbitrary nesting. Leaves pos AT the matching closer.
void readBindingPattern () {
  bool isObject = *pos == '{';
  char16_t close = isObject ? '}' : ']';
  pos++;
  char16_t ch = commentWhitespace(true);
  while (ch != close && pos <= end) {
    // ...rest element
    if (ch == '.' && *(pos + 1) == '.' && *(pos + 2) == '.') {
      pos += 3;
      ch = commentWhitespace(true);
      ch = readBindingTarget(ch);
      continue;
    }
    if (isObject) {
      char16_t* keyStart = pos;
      char16_t* keyEnd = pos;
      if (ch == '[') {
        skipExpression(false); // computed key: pos AT matching ']'
        pos++;
        ch = commentWhitespace(true);
      } else if (isQuote(ch)) {
        stringLiteral(ch);
        pos++;
        ch = commentWhitespace(true);
      } else if (ch >= '0' && ch <= '9') {
        ch = *(++pos);
        while ((ch >= '0' && ch <= '9') || ch == '.' || ch == '_' ||
               ch == 'e' || ch == 'E' || ch == 'n' ||
               ch == 'x' || ch == 'X' || ch == 'b' || ch == 'B' || ch == 'o' || ch == 'O' ||
               (ch >= 'a' && ch <= 'f') || (ch >= 'A' && ch <= 'F') ||
               ((ch == '+' || ch == '-') && (*(pos - 1) == 'e' || *(pos - 1) == 'E')))
          ch = *(++pos);
        ch = commentWhitespace(true);
      } else {
        readToWsOrPunctuator(ch);
        keyEnd = pos;
        ch = commentWhitespace(true);
      }
      // { key: target } binds target; shorthand { key } / { key = default }
      // binds the key. A computed ([expr]) or string key has no shorthand.
      if (ch == ':') {
        pos++;
        ch = commentWhitespace(true);
        ch = readBindingTarget(ch);
      } else if (keyEnd > keyStart) {
        addExport(keyStart, keyEnd, keyStart, keyEnd);
      }
    } else if (ch == ',') { // array elision
      pos++;
      ch = commentWhitespace(true);
      continue;
    } else {
      ch = readBindingTarget(ch);
    }
    if (ch == '=')
      ch = skipExpression(false); // default value
    if (ch == ',') {
      pos++;
      ch = commentWhitespace(true);
    } else {
      break;
    }
  }
}

// Returns true when an erased TypeScript declaration consumed the statement.
bool tryParseExportStatement () {
  char16_t* sStartPos = pos;
  Export* prev_export_write_head = export_write_head;
  bool export_clause = false;
  bool export_all = false;
#ifndef LEXER_MIN
  char16_t* starPos = NULL;
#endif

  pos += 6;

  char16_t* curPos = pos;

  char16_t ch = commentWhitespace(true);

  if (pos == curPos && !isPunctuator(ch))
    return false;

#ifndef LEXER_MIN
  // Only commit the statement start once this is a real export: skipExpression
  // re-enters here for an `export`-prefixed identifier (e.g. `exports`) in an
  // initializer, which would otherwise clobber the start for later bindings.
  export_statement_start = sStartPos;
#endif

#ifdef LEX_TS
  // `export type { ... }`, `export type { ... } from` and `export type * as ns
  // from` are type-only re-exports: every name they introduce is a type. The
  // `type` keyword is only the modifier when a clause (`{` or `*`) follows; an
  // identifier after it (`export type T = ...`) is a type alias declaration,
  // handled by tryTsTypeDeclaration alongside `export interface Foo`.
  bool typeOnlyStatement = false;
  if (isTsTypeKeyword(pos)) {
    char16_t* savePos = pos;
    pos += 4;
    char16_t nextCh = commentWhitespace(true);
    if (nextCh == '{' || nextCh == '*') {
      typeOnlyStatement = true;
      ch = nextCh;
    } else {
      pos = savePos;
      if (tryTsTypeDeclaration(false))
        return true;
    }
  }
  else if (tryTsTypeDeclaration(false))
    return true;
#endif

  if (ch == '{') {
    export_clause = true;
    pos++;
    ch = commentWhitespace(true);
    while (true) {
#ifdef LEX_TS
      bool typeOnlySpecifier = typeOnlyStatement || tryTsTypeModifier(&ch);
#endif
      char16_t* startPos = pos;

      if (!isQuote(ch)) {
#ifndef LEXER_MIN
        ch = readImportName(ch);
#else
        ch = readToWsOrPunctuator(ch);
#endif
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
        stringLiteral(ch);
        pos++;
      }

      char16_t* endPos = pos;
      commentWhitespace(true);
#ifdef LEX_TS
      Export* before_export = export_write_head;
#endif
      ch = readExportAs(startPos, endPos);
#ifdef LEX_TS
      if (typeOnlySpecifier && export_write_head && export_write_head != before_export)
        export_write_head->import_name_ty |= TYPE_ONLY_EXPORT;
#endif
      // ,
      if (ch == ',') {
        pos++;
        ch = commentWhitespace(true);
      }
      if (ch == '}')
        break;
      if (pos == startPos || pos > end) {
        syntaxError();
        return false;
      }
    }
#ifndef LEXER_MIN
    hasModuleSyntax = true; // to handle "export {}"
#endif
    pos++;
    ch = commentWhitespace(true);
  }
  // export *
  // export * as X
  else if (ch == '*') {
#ifndef LEXER_MIN
    starPos = pos;
#endif
    pos++;
    commentWhitespace(true);
    ch = readExportAs(pos, pos);
    ch = commentWhitespace(true);
    export_all = export_write_head == prev_export_write_head;
  }
  else {
    facade = false;
#ifdef LEX_TS
    // `export declare ...` is an ambient declaration: erased, with its name a
    // type-only export.
    if (ch == 'd' && memcmp(pos + 1, ECLARE, 6 * 2) == 0 && isBrOrWs(*(pos + 7))) {
      pos += 7;
      tsAmbientExportDeclaration();
      return false;
    }
    // `abstract` is a value-level class modifier.
    if (ch == 'a' && memcmp(pos, ABSTRACT, 8 * 2) == 0 && isBrOrWs(*(pos + 8))) {
      pos += 8;
      ch = commentWhitespace(true);
    }
    if (tryTsValueDeclarationName(ch))
      return false;
#endif
    switch (ch) {
      // export default ...
      case 'd': {
        const char16_t* startPos = pos;
        pos += 7;
        ch = commentWhitespace(true);
        bool localName = false;
        switch (ch) {
#ifdef LEX_TS
          case 'i':
            if (tryTsTypeDeclaration(true))
              return true;
            break;
#endif
          // export default async? function*? name? (){}
          case 'a':
            if (memcmp(pos + 1, SYNC, 4 * 2) == 0 && isWsNotBr(*(pos + 5))) {
              pos += 5;
              ch = commentWhitespace(false);
            }
            else {
              break;
            }
          // fallthrough
          case 'f':
            if (memcmp(pos + 1, UNCTION, 7 * 2) == 0 && (isBrOrWs(*(pos + 8)) || *(pos + 8) == '*' || *(pos + 8) == '(')) {
              pos += 8;
              ch = commentWhitespace(true);
              if (ch == '*') {
                pos++;
                ch = commentWhitespace(true);
              }
              if (ch == '(') {
                break;
              }
              localName = true;
            }
            break;
          case 'c':
            // export default class name? {}
            if (memcmp(pos + 1, LASS, 4 * 2) == 0 && (isBrOrWs(*(pos + 5)) || *(pos + 5) == '{')) {
              pos += 5;
              ch = commentWhitespace(true);
              if (ch == '{') {
                break;
              }
              localName = true;
            }
            break;
        }
        if (localName) {
          const char16_t* localStartPos = pos;
          readToWsOrPunctuator(ch);
          if (pos > localStartPos) {
            addExport(startPos, startPos + 7, localStartPos, pos);
            pos--;
            return false;
          }
        }
        addExport(startPos, startPos + 7, NULL, NULL);
        pos = (char16_t*)(startPos + 6);
        return false;
      }
      // export async? function*? name () {
      case 'a':
        pos += 5;
        commentWhitespace(false);
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
        addExport(startPos, pos, startPos, pos);
        pos--;
        return false;

      // export class name ...
      case 'c':
        if (memcmp(pos + 1, LASS, 4 * 2) == 0 && isBrOrWsOrPunctuatorNotDot(*(pos + 5))) {
          pos += 5;
          ch = commentWhitespace(true);
          const char16_t* startPos = pos;
          ch = readToWsOrPunctuator(ch);
          addExport(startPos, pos, startPos, pos);
          pos--;
          return false;
        }
        pos += 2;
      // fallthrough

      // export var/let/const binding (, binding)*  — each binding is an
      // identifier or a destructuring pattern, optionally `= initializer`.
      // Initializers and defaults are skipped expression-aware (see
      // skipExpression) so a comma inside them does not split the binding list,
      // and the list ends at ';', EOF or an ASI line break — never reading into
      // the following statement.
      case 'v':
      case 'l': {
        pos += 3;
        facade = false;
        ch = commentWhitespace(true);
#ifdef LEX_TS
        // `export const enum E`: the runtime value name, not a binding list.
        if (tryTsValueDeclarationName(ch))
          return false;
#endif
        while (pos <= end) {
          char16_t* bindingStart = pos;
          ch = readBindingTarget(ch);
          if (pos == bindingStart)
            break;
          if (ch == '=')
            ch = skipExpression(true);
          if (ch != ',')
            break;
          pos++;
          ch = commentWhitespace(true);
        }
        pos--;
        return false;
      }

      default:
        return false;
    }
  }

#ifdef LEX_TS
  // A statement-level `export type` marks every name it introduced (the brace
  // and `* as ns` forms reach here); inline per-specifier `type` is marked at
  // the specifier site instead.
  if (typeOnlyStatement) {
    for (Export* exprt = prev_export_write_head == NULL ? first_export : prev_export_write_head->next; exprt != NULL; exprt = exprt->next)
      exprt->import_name_ty |= TYPE_ONLY_EXPORT;
  }
#endif

  // from ...
  if (ch == 'f' && memcmp(pos + 1, ROM, 3 * 2) == 0) {
    pos += 4;
    readImportString(sStartPos, commentWhitespace(true), false);
    // A missing specifier leaves no import record to attach the star to.
    if (has_error)
      return false;
    if (export_all) {
#ifndef LEXER_MIN
      import_write_head->import_ty = StaticReexportStar;
      addExport(starPos, starPos + 1, NULL, NULL);
      export_write_head->export_ty = ReexportAll;
#ifdef LEX_TS
      if (typeOnlyStatement)
        export_write_head->import_name_ty |= TYPE_ONLY_EXPORT;
#endif
#endif
    }
#ifdef LEX_TS
    // `export type { A } from 'm'` re-exports types only, so the module import
    // it generates is itself type-only.
    if (typeOnlyStatement && import_write_head)
      import_write_head->type_only = true;
#endif

#ifndef LEXER_MIN
    uint32_t import_index = import_count - 1;
#endif
    // There were no local names.
    for (Export* exprt = prev_export_write_head == NULL ? first_export : prev_export_write_head->next; exprt != NULL; exprt = exprt->next) {
#ifndef LEXER_MIN
      exprt->import_index = import_index;
      if (exprt->export_ty != ReexportAll) {
        exprt->export_ty = Reexport;
#ifdef LEX_TS
        exprt->import_name_ty = (exprt->import_name_ty & TYPE_ONLY_EXPORT) |
          (exprt->local_start == NULL ? NamespaceImport : NamedImport);
#else
        exprt->import_name_ty = exprt->local_start == NULL ? NamespaceImport : NamedImport;
#endif
      }
#else
      exprt->local_start = exprt->local_end = NULL;
#endif
    }
  }
  else {
#ifndef LEXER_MIN
    if (export_clause) {
      // import_index doubles as the hash slot until the export resolves. Hashing
      // here rather than in the clause scan skips the names of a `from` clause,
      // and rather than at resolve time keeps the name text cache-hot.
      for (Export* exprt = prev_export_write_head == NULL ? first_export : prev_export_write_head->next; exprt != NULL; exprt = exprt->next) {
        exprt->export_ty = Pending;
        pending_export_count++;
      }
    }
#endif
    pos--;
  }
  return false;
}

#ifndef LEXER_MIN
// '0'-'9' have bit 6 clear and 'A'-'F' / 'a'-'f' have it set, so the low nibble
// plus 9 for the letters covers all three ranges without a branch.
static inline __attribute__((always_inline)) uint32_t hexValue (char16_t ch) {
  return (ch & 0xF) + (ch >> 6) * 9;
}

static uint32_t readIdentifierCodePoint (
  const char16_t** cursor,
  const char16_t* identifier_end
) {
  const char16_t* cur = *cursor;
  uint32_t code_point = *cur++;

  if (code_point == '\\') {
    const char16_t* escaped_start = cur;
    if (cur >= identifier_end || *cur++ != 'u') {
      *cursor = escaped_start;
      return code_point;
    }

    if (cur < identifier_end && *cur == '{') {
      code_point = 0;
      cur++;
      while (cur < identifier_end && *cur != '}')
        code_point = code_point * 16 + hexValue(*cur++);
      if (cur == identifier_end) {
        *cursor = escaped_start;
        return '\\';
      }
      cur++;
    }
    else {
      if (identifier_end - cur < 4) {
        *cursor = escaped_start;
        return '\\';
      }
      code_point = hexValue(*cur++);
      for (uint32_t i = 1; i < 4; i++)
        code_point = code_point * 16 + hexValue(*cur++);
      if (
        code_point >= 0xD800 && code_point <= 0xDBFF &&
        cur + 6 <= identifier_end &&
        cur[0] == '\\' && cur[1] == 'u' && cur[2] != '{'
      ) {
        uint32_t low = hexValue(cur[2]);
        for (uint32_t i = 3; i < 6; i++)
          low = low * 16 + hexValue(cur[i]);
        if (low >= 0xDC00 && low <= 0xDFFF) {
          code_point = 0x10000 + ((code_point - 0xD800) << 10) + low - 0xDC00;
          cur += 6;
        }
      }
    }
  }
  else if (code_point >= 0xD800 && code_point <= 0xDBFF && cur < identifier_end) {
    uint32_t low = *cur;
    if (low >= 0xDC00 && low <= 0xDFFF) {
      code_point = 0x10000 + ((code_point - 0xD800) << 10) + low - 0xDC00;
      cur++;
    }
  }

  *cursor = cur;
  return code_point;
}

static bool identifierNameEqual (
  const char16_t* a_start,
  const char16_t* a_end,
  const char16_t* b_start,
  const char16_t* b_end
) {
  if (a_end - a_start == b_end - b_start && memcmp(a_start, b_start, (a_end - a_start) * 2) == 0)
    return true;

  while (a_start < a_end && b_start < b_end) {
    if (readIdentifierCodePoint(&a_start, a_end) != readIdentifierCodePoint(&b_start, b_end))
      return false;
  }
  return a_start == a_end && b_start == b_end;
}

static inline __attribute__((always_inline)) uint32_t updateIdentifierHash (uint32_t hash, uint32_t code_point) {
  hash += code_point;
  hash += hash << 10;
  return hash ^ hash >> 6;
}

static inline __attribute__((always_inline)) uint32_t finalizeIdentifierHash (uint32_t hash) {
  hash += hash << 3;
  hash ^= hash >> 11;
  return hash + (hash << 15);
}

static uint32_t escapedIdentifierNameHash (const char16_t* start, const char16_t* identifier_end) {
  uint32_t hash = 0;
  while (start < identifier_end)
    hash = updateIdentifierHash(hash, readIdentifierCodePoint(&start, identifier_end));
  return finalizeIdentifierHash(hash);
}

// `\u{61}` and `a` are the same binding, so an escaped or astral name has to hash
// by code point. Plain names take the code unit loop and skip that machinery.
static uint32_t identifierNameHash (const char16_t* start, const char16_t* identifier_end) {
  uint32_t hash = 0;
  for (const char16_t* cursor = start; cursor < identifier_end; cursor++) {
    char16_t ch = *cursor;
    if (ch == '\\' || ch >= 0xD800 && ch <= 0xDBFF)
      return escapedIdentifierNameHash(start, identifier_end);
    hash = updateIdentifierHash(hash, ch);
  }
  return finalizeIdentifierHash(hash);
}

static void resolveExport (
  Export* exprt,
  const char16_t* import_start,
  const char16_t* import_end,
  enum ExportImportNameType import_name_ty,
  uint32_t import_index
) {
  exprt->local_start = import_start;
  exprt->local_end = import_end;
  exprt->import_index = import_index;
#ifdef LEX_TS
  exprt->import_name_ty = (exprt->import_name_ty & TYPE_ONLY_EXPORT) | import_name_ty;
#else
  exprt->import_name_ty = import_name_ty;
#endif
  exprt->export_ty = Reexport;
  pending_export_count--;
}

// Bindings are not stored. The main-loop pass only skips the clause; the deferred
// pass re-reads it against the pending-export table, so a module without detached
// exports pays nothing for the analysis.
static void resolveBinding (
  const char16_t* local_start,
  const char16_t* local_end,
  const char16_t* import_start,
  const char16_t* import_end,
  enum ExportImportNameType import_name_ty,
  uint32_t import_index,
  bool type_only
) {
  if (export_buckets == NULL)
    return;
  uint32_t binding_hash = identifierNameHash(local_start, local_end);
  // resolveExport() overwrites the hash and the name it matched on, but never
  // the chain, so resolved entries stay walkable for the rest of the bucket.
  for (
    Export* exprt = export_buckets[binding_hash & export_bucket_mask];
    exprt != NULL;
    exprt = exprt->bucket_next
  ) {
    if (exprt->export_ty != Pending || exprt->import_index != binding_hash)
      continue;
#ifdef LEX_TS
    if (type_only && !(exprt->import_name_ty & TYPE_ONLY_EXPORT))
      continue;
#endif
    if (identifierNameEqual(exprt->local_start, exprt->local_end, local_start, local_end))
      resolveExport(exprt, import_start, import_end, import_name_ty, import_index);
  }
}

// Finds the clause end without tokenizing it, by stepping over the only
// constructs that can hide a '}' from a straight scan.
static char16_t skipImportClause () {
  while (pos <= end) {
    char16_t ch = *pos;
    if (ch == '}')
      return ch;
    if (isQuote(ch)) {
      stringLiteral(ch);
    }
    else if (ch == '/') {
      char16_t next_ch = *(pos + 1);
      if (next_ch == '/')
        lineComment();
      else if (next_ch == '*')
        blockComment(true);
    }
    else if (ch == '\\' && skipBracedEscape() < 0) {
      syntaxError();
      return '\0';
    }
    pos++;
  }
  return '\0';
}

static char16_t collectNamedImportBindings (uint32_t import_index, bool type_only_statement);

// The main loop only needs to know where the clause ends. Binding structure is
// worth reading in the deferred pass, which is also the only caller holding a
// table to resolve it against, so a table is what selects the reader.
static char16_t readImportClause (uint32_t import_index, bool type_only_statement) {
  has_import_bindings = true;
  return export_buckets == NULL
    ? skipImportClause()
    : collectNamedImportBindings(import_index, type_only_statement);
}

static char16_t collectNamedImportBindings (uint32_t import_index, bool type_only_statement) {
  char16_t ch = commentWhitespace(true);

  while (ch != '}' && pos <= end) {
#ifdef LEX_TS
    bool typeOnly = type_only_statement || tryTsTypeModifier(&ch);
#else
    bool typeOnly = false;
#endif
    const char16_t* import_start;
    const char16_t* import_end;
    if (isQuote(ch)) {
      import_start = pos;
      stringLiteral(ch);
      pos++;
      import_end = pos;
      ch = *pos;
    }
    else {
      import_start = pos;
      ch = readImportName(ch);
      // Not a binding start, so the clause is malformed. Skipping the code unit
      // keeps the scan advancing instead of re-reading it forever.
      if (pos == import_start) {
        pos++;
        ch = commentWhitespace(true);
        continue;
      }
      import_end = pos;
    }
    ch = commentWhitespace(true);

    const char16_t* local_start = import_start;
    const char16_t* local_end = import_end;
    // Anything that cannot continue an identifier ends the `as` keyword, so
    // `a as/*c*/b` renames just like `a as b` does. U+00A0 is ES whitespace
    // despite passing the >= 128 identifier test.
    if (ch == 'a' && *(pos + 1) == 's' && (!isIdentifierCodeUnit(*(pos + 2)) || isBrOrWs(*(pos + 2)))) {
      pos += 2;
      ch = commentWhitespace(true);
      local_start = pos;
      ch = readImportName(ch);
      local_end = pos;
    }

    resolveBinding(local_start, local_end, import_start, import_end, NamedImport, import_index, typeOnly);
    ch = commentWhitespace(true);
    if (ch == ',') {
      pos++;
      ch = commentWhitespace(true);
    }
  }
  return ch;
}

static void collectNamespaceImportBinding (
  uint32_t import_index,
  enum ExportImportNameType import_name_ty,
  bool type_only
) {
  pos++;
  commentWhitespace(true);
  pos += 2;
  char16_t ch = commentWhitespace(true);
  const char16_t* local_start = pos;
  readImportName(ch);
  resolveBinding(local_start, pos, NULL, NULL, import_name_ty, import_index, type_only);
}

static void collectStaticImportBindings (
  char16_t ch,
  int phase_keyword,
  uint32_t import_index,
  bool type_only_statement
) {
  has_import_bindings = true;
  if (phase_keyword == 1) {
    const char16_t* local_start = pos;
    readImportName(ch);
    resolveBinding(local_start, pos, NULL, NULL, SourceImport, import_index, false);
    return;
  }

  if (phase_keyword == 2) {
    collectNamespaceImportBinding(import_index, NamespaceImport, false);
    return;
  }

  if (ch != '{' && ch != '*') {
    const char16_t* local_start = pos;
    ch = readImportName(ch);
    resolveBinding(local_start, pos, NULL, NULL, DefaultImport, import_index, type_only_statement);
    ch = commentWhitespace(true);
    if (ch != ',')
      return;
    pos++;
    ch = commentWhitespace(true);
  }

  if (ch == '{') {
    pos++;
    readImportClause(import_index, type_only_statement);
  }
  else if (ch == '*')
    collectNamespaceImportBinding(import_index, NamespaceImport, type_only_statement);
}

// The table lives in the analysis arena, so a module without detached exports
// never reserves it.
static void collectStaticImportBindingsFromRecord (Import* impt, uint32_t import_index) {
  pos = (char16_t*)impt->statement_start + 6;
  char16_t ch = commentWhitespace(true);
#ifdef LEX_TS
  bool typeOnly = impt->type_only;
  if (typeOnly) {
    pos += 4;
    ch = commentWhitespace(true);
  }
#else
  bool typeOnly = false;
#endif

  if (impt->import_ty == StaticSourcePhase) {
    pos += 6;
    ch = commentWhitespace(true);
    collectStaticImportBindings(ch, 1, import_index, false);
  }
  else if (impt->import_ty == StaticDeferPhase) {
    pos += 5;
    ch = commentWhitespace(true);
    collectStaticImportBindings(ch, 2, import_index, false);
  }
  else if (!isQuote(ch)) {
    collectStaticImportBindings(ch, 0, import_index, typeOnly);
  }
}

// A clause export that no import binding claimed is a local export after all.
static inline __attribute__((always_inline)) void markExportLocal (Export* exprt) {
  exprt->export_ty = Direct;
  exprt->import_index = -1;
}

static void resolvePendingExports () {
  // With no import clause in the module there is nothing a pending export could
  // resolve against, so the table would be allocated, zeroed and swept for
  // nothing.
  if (!has_import_bindings) {
    for (Export* exprt = first_export; exprt != NULL; exprt = exprt->next)
      if (exprt->export_ty == Pending)
        markExportLocal(exprt);
    return;
  }

  export_bucket_count = 4;
  while (export_bucket_count < pending_export_count * 2)
    export_bucket_count <<= 1;
  export_bucket_mask = export_bucket_count - 1;
  size_t export_bucket_size = export_bucket_count * sizeof(Export*);
  ensureAnalysisCapacity(export_bucket_size);
  if (has_error)
    return;
  export_buckets = (Export**)analysis_head;
  analysis_head += export_bucket_size;
  // volatile keeps this a store loop: memset is a libc symbol the asm.js build
  // strips (build/combine-asm.mjs).
  for (uint32_t i = 0; i < export_bucket_count; i++)
    ((Export* volatile*)export_buckets)[i] = NULL;

  // Chained rather than open addressed: names repeat in a clause without being
  // legal, and probing for a free slot makes that quadratic. Prepending costs no
  // comparison at all, and a bucket a name shares stays one walk to resolve.
  for (Export* exprt = first_export; exprt != NULL; exprt = exprt->next) {
    if (exprt->export_ty != Pending)
      continue;
    // Hashed here rather than at the clause: a module with no import clause
    // never builds the table and never needs the name hashed at all.
    exprt->import_index = identifierNameHash(exprt->local_start, exprt->local_end);
    uint32_t bucket_index = exprt->import_index & export_bucket_mask;
    exprt->bucket_next = export_buckets[bucket_index];
    export_buckets[bucket_index] = exprt;
  }

  char16_t* parse_end = pos;
  uint32_t import_index = 0;
  for (Import* impt = first_import; impt != NULL; impt = impt->next, import_index++) {
    // `export … from` records share the Import shape but carry no local bindings.
    if (impt->dynamic == STANDARD_IMPORT && *impt->statement_start == 'i')
      collectStaticImportBindingsFromRecord(impt, import_index);
    if (pending_export_count == 0)
      break;
  }
  pos = parse_end;

  // resolveExport() keeps the count, so a fully resolved table skips this.
  if (pending_export_count != 0) {
    for (uint32_t i = 0; i < export_bucket_count; i++)
      for (Export* exprt = export_buckets[i]; exprt != NULL; exprt = exprt->bucket_next)
        if (exprt->export_ty == Pending)
          markExportLocal(exprt);
  }
  // The table is what tells the clause reader to resolve, so it must not outlive
  // this pass into the next parse's main loop.
  export_buckets = NULL;
}
#endif

char16_t readExportAs (char16_t* startPos, char16_t* endPos) {
  char16_t ch = *pos;
  char16_t* localStartPos = startPos == endPos ? NULL : startPos;
  char16_t* localEndPos = startPos == endPos ? NULL : endPos;

  if (ch == 'a') {
    pos += 2;
    ch = commentWhitespace(true);
    startPos = pos;

    if (!isQuote(ch)) {
#ifndef LEXER_MIN
      ch = readImportName(ch);
#else
      ch = readToWsOrPunctuator(ch);
#endif
    }
    // export { mod as "identifer" } from
    // export { mod as "@notid" } from
    // export { mod as "spa ce" } from
    // export { mod as " space" } from
    // export { mod as "space " } from
    // export { mod as "not~id" } from
    // export { mod as "%notid" } from
    else {
      stringLiteral(ch);
      pos++;
    }

    endPos = pos;

    ch = commentWhitespace(true);
  }

  if (pos != startPos)
    addExport(startPos, endPos, localStartPos, localEndPos);
  return ch;
}

void readImportString (const char16_t* ss, char16_t ch, int phase_keyword) {
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
  if (phase_keyword > 0) {
    import_write_head->import_ty = phase_keyword == 1 ? StaticSourcePhase : StaticDeferPhase;
  }
  pos++;
  ch = commentWhitespace(false);
  if (!(ch == 'w' && *(pos + 1) == 'i' && *(pos + 2) == 't' && *(pos + 3) == 'h')) {
    pos--;
    return;
  }
  char16_t* attrIndex = pos;
  pos += 4;
  ch = commentWhitespace(true);
  if (ch != '{') {
    pos = attrIndex;
    return;
  }
  const char16_t* attrStart = pos;
#ifndef LEXER_MIN
  Attribute* attr_write_head = NULL;
  Attribute* attr_write_head_last = NULL;
#endif
  do {
    pos++;
    ch = commentWhitespace(true);
    const char16_t* key_start;
    const char16_t* key_end;
    if (ch == '\'') {
      key_start = pos;
      stringLiteral(ch);
      key_end = pos + 1;
      pos++;
      ch = commentWhitespace(true);
    }
    else if (ch == '"') {
      key_start = pos;
      stringLiteral(ch);
      key_end = pos + 1;
      pos++;
      ch = commentWhitespace(true);
    }
    else {
      key_start = pos;
      ch = readToWsOrPunctuator(ch);
      key_end = pos;
    }
    if (ch != ':') {
      pos = attrIndex;
      return;
    }
    pos++;
    ch = commentWhitespace(true);
    const char16_t* value_start;
    const char16_t* value_end;
    if (ch == '\'') {
      value_start = pos;
      stringLiteral(ch);
      value_end = pos + 1;
    }
    else if (ch == '"') {
      value_start = pos;
      stringLiteral(ch);
      value_end = pos + 1;
    }
    else {
      pos = attrIndex;
      return;
    }
#ifndef LEXER_MIN
    ensureAnalysisCapacity(sizeof(Attribute));
    Attribute* attr = (Attribute*)(analysis_head);
    analysis_head = analysis_head + sizeof(Attribute);
    attr->key_start = key_start;
    attr->key_end = key_end;
    attr->value_start = value_start;
    attr->value_end = value_end;
    attr->next = NULL;
    if (attr_write_head == NULL)
      import_write_head->attributes = attr;
    else
      attr_write_head->next = attr;
    attr_write_head_last = attr_write_head;
    attr_write_head = attr;
#endif
    pos++;
    ch = commentWhitespace(true);
    if (ch == ',') {
      pos++;
      continue;
    }
    if (ch == '}')
      break;
    pos = attrIndex;
    return;
  } while (true);
  import_write_head->attr_index = attrStart;
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

#ifdef LEXER_SIMD
// Returns the next template stop character at or after p. Relies on the source
// null sentinel to terminate and may overread one vector past it.
LEXER_SIMD_TARGET __attribute__((noinline))
static char16_t* simdTemplateScan (char16_t* p) {
  const v128_t dollar = wasm_i16x8_splat('$');
  const v128_t backtick = wasm_i16x8_splat('`');
  const v128_t slash = wasm_i16x8_splat('\\');
  const v128_t zero = wasm_i16x8_splat(0);
  for (;;) {
    v128_t chunk = wasm_v128_load(p);
    uint32_t mask = wasm_i8x16_bitmask(wasm_v128_or(
        wasm_v128_or(wasm_i16x8_eq(chunk, dollar), wasm_i16x8_eq(chunk, backtick)),
        wasm_v128_or(wasm_i16x8_eq(chunk, slash), wasm_i16x8_eq(chunk, zero))));
    if (mask)
      return p + __builtin_ctz(mask) / 2;
    p += 8;
  }
}

#endif

static inline __attribute__((always_inline)) void templateStringScalar () {
  while (pos++ < end) {
    char16_t ch = *pos;
    if (ch == '$' && *(pos + 1) == '{') {
      pos++;
      openTokenStack[openTokenDepth].token = TemplateBrace;
      openTokenStack[openTokenDepth++].pos = pos;
      return;
    }
    if (ch == '`') {
      if (openTokenStack[--openTokenDepth].token != Template)
        syntaxError();
#ifndef LEXER_MIN
      // The specifier template just closed. Note its closing backtick and stop
      // recording (depth back to 0); finalization keeps the spans only if this
      // backtick is the last token of the argument.
      if (dynamicImportStackDepth > 0) {
        Import* cur_dynamic_import = dynamicImportStack[dynamicImportStackDepth - 1];
        if (cur_dynamic_import->specifier_template_depth == openTokenDepth + 1) {
          cur_dynamic_import->template_close = pos;
          cur_dynamic_import->specifier_template_depth = 0;
        }
      }
#endif
      return;
    }
    if (ch == '\\')
      pos++;
  }
  syntaxError();
}

#ifdef LEXER_SIMD
void templateString () {
  if (template_scan_count < TEMPLATE_SIMD_THRESHOLD) {
    template_scan_count++;
    templateStringScalar();
    return;
  }
  char16_t* p = pos;
  for (;;) {
    char16_t next_ch = *(p + 1);
    if (next_ch == '`')
      p++;
    else if (next_ch != '\\' && *(p + 2) == '`')
      p += 2;
    else
      p = simdTemplateScan(p + 1);
    char16_t ch = *p;
    if (ch == '$') {
      if (*(p + 1) != '{')
        continue;
      pos = p + 1;
      openTokenStack[openTokenDepth].token = TemplateBrace;
      openTokenStack[openTokenDepth++].pos = pos;
      return;
    }
    if (ch == '`') {
      pos = p;
      if (openTokenStack[--openTokenDepth].token != Template)
        syntaxError();
      // The specifier template just closed. Note its closing backtick and stop
      // recording (depth back to 0); finalization keeps the spans only if this
      // backtick is the last token of the argument.
      if (dynamicImportStackDepth > 0) {
        Import* cur_dynamic_import = dynamicImportStack[dynamicImportStackDepth - 1];
        if (cur_dynamic_import->specifier_template_depth == openTokenDepth + 1) {
          cur_dynamic_import->template_close = pos;
          cur_dynamic_import->specifier_template_depth = 0;
        }
      }
      return;
    }
    if (ch == '\\') {
      p++;
      if (p > end) {
        pos = p + 1;
        syntaxError();
        return;
      }
      continue;
    }
    if (p <= end)   // embedded null: keep looking
      continue;
    pos = p;        // the terminating sentinel at end + 1
    syntaxError();
    return;
  }
}
#else
void templateString () {
  templateStringScalar();
}
#endif

// pos AT the opening backtick. A no-substitution template literal (no ${...})
// is a constant string, so a dynamic import can record it as a safe specifier.
// On success consumes it, leaves pos AT the closing backtick and returns true.
// On a substitution or EOF restores pos and returns false, leaving the literal
// to the main loop's template handling.
static inline __attribute__((always_inline)) bool noSubstitutionTemplateScalar () {
  char16_t* startPos = pos;
  while (pos++ < end) {
    char16_t ch = *pos;
    if (ch == '`')
      return true;
    if (ch == '\\') {
      pos++;
      continue;
    }
    if (ch == '$' && *(pos + 1) == '{')
      break;
  }
  pos = startPos;
  return false;
}

#ifdef LEXER_SIMD
bool noSubstitutionTemplate () {
  if (template_scan_count < TEMPLATE_SIMD_THRESHOLD) {
    template_scan_count++;
    return noSubstitutionTemplateScalar();
  }
  char16_t* p = pos;
  for (;;) {
    char16_t next_ch = *(p + 1);
    if (next_ch == '`')
      p++;
    else if (next_ch != '\\' && *(p + 2) == '`')
      p += 2;
    else
      p = simdTemplateScan(p + 1);
    char16_t ch = *p;
    if (ch == '`') {
      pos = p;
      return true;
    }
    if (ch == '\\') {
      p++;
      if (p > end)
        return false;
      continue;
    }
    if (ch == '$') {
      if (*(p + 1) == '{')
        return false;
      continue;
    }
    if (p > end)   // the terminating sentinel
      return false;
    // embedded null: keep looking
  }
}
#else
bool noSubstitutionTemplate () {
  return noSubstitutionTemplateScalar();
}
#endif

void blockComment (bool br) {
  pos++;
  // br is loop invariant and a comment body is scanned one character at a time,
  // so the line-break exit is hoisted out rather than tested on every one.
  if (br) {
    while (pos++ < end) {
      if (*pos == '*' && *(pos + 1) == '/') {
        pos++;
        return;
      }
    }
    return;
  }
  while (pos++ < end) {
    char16_t ch = *pos;
    if (isBr(ch))
      return;
    if (ch == '*' && *(pos + 1) == '/') {
      pos++;
      return;
    }
  }
}

#ifdef LEXER_SIMD
LEXER_SIMD_TARGET __attribute__((noinline))
#endif
void lineComment () {
#ifdef LEXER_SIMD
  pos++;
  // The unrolled prefix is faster than entering the vector loop for short comments.
  char16_t* p = pos + 1;
  if (p > end || isBr(*p)) goto lineCommentEnd;
  p++;
  if (p > end || isBr(*p)) goto lineCommentEnd;
  p++;
  if (p > end || isBr(*p)) goto lineCommentEnd;
  p++;
  if (p > end || isBr(*p)) goto lineCommentEnd;
  p++;
  if (p > end || isBr(*p)) goto lineCommentEnd;
  p++;
  if (p > end || isBr(*p)) goto lineCommentEnd;
  p++;
  if (p > end || isBr(*p)) goto lineCommentEnd;
  p++;
  if (p > end || isBr(*p)) goto lineCommentEnd;
  p++;
  if (p > end || isBr(*p)) goto lineCommentEnd;
  p++;
  const v128_t newline = wasm_i16x8_splat('\n');
  const v128_t carriage_return = wasm_i16x8_splat('\r');
  const v128_t zero = wasm_i16x8_splat(0);
  for (;;) {
    v128_t chunk = wasm_v128_load(p);
    uint32_t mask = wasm_i16x8_bitmask(wasm_v128_or(
        wasm_i16x8_eq(chunk, zero),
        wasm_v128_or(wasm_i16x8_eq(chunk, newline), wasm_i16x8_eq(chunk, carriage_return))));
    if (mask) {
      p += __builtin_ctz(mask);
      if (*p != 0 || p > end) {
        pos = p;
        return;
      }
      p++;
    }
    else {
      p += 8;
    }
  }

lineCommentEnd:
  pos = p;
#else
  while (pos++ < end) {
    char16_t ch = *pos;
    if (ch == '\n' || ch == '\r')
      return;
  }
#endif
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
#ifndef LEXER_MIN
    while (ch == '\\') {
      int escape = skipBracedEscape();
      if (escape < 0)
        return '\0';
      if (escape == 0)
        break;
      ch = *(++pos);
    }
#endif
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
  // (c - 9) < 5 is the 9..13 range as one unsigned compare: fewer wasm ops than
  // `c > 8 && c < 14` at every inlined copy of this hot helper.
  return (char16_t)(c - 9) < 5 || c == 32 || c == 160;
}

bool isBrOrWsOrPunctuatorNotDot (char16_t c) {
  return c > 8 && c < 14 || c == 32 || c == 160 || isPunctuator(c) && c != '.';
}

bool isBrOrWsOrPunctuatorOrSpreadNotDot (char16_t* c) {
  return *c > 8 && *c < 14 || *c == 32 || *c == 160 || isPunctuator(*c) && (isSpread(c) || *c != '.');
}

// Detects whether the character sequence ending at `pos` (inclusive) ends a
// for-of binding. In valid JS, the for-of `of` keyword always follows a
// binding that ends with an identifier-tail char, ']', '}', or ')'.
// Used to disambiguate `for (... of /regex/)` from `for (i = of / 2;;)`.
bool isForOfBinding (char16_t* pos) {
  // 'of' must be a complete token: the char before 'o' must be whitespace
  // or a binding-terminator punctuator (excludes `proof / 2` etc.)
  if (!isBrOrWs(*pos) && *pos != ']' && *pos != '}' && *pos != ')')
    return false;
  // Skip whitespace back to the binding's last char.
  while (pos > source && isBrOrWs(*pos))
    pos--;
  return *pos == ']' || *pos == '}' || *pos == ')' || !isPunctuator(*pos);
}

bool isSpread (char16_t* c) {
  return *c == '.' && *(c - 1) == '.' && *(c - 2) == '.';
}

bool isQuote (char16_t ch) {
  return ch == '\'' || ch == '"';
}

bool keywordStart (char16_t* pos) {
  return pos == source || isBrOrWsOrPunctuatorOrSpreadNotDot(pos - 1);
}

bool readPrecedingKeyword1 (char16_t* pos, char16_t c1) {
  if (pos < source) return false;
  return *pos == c1 && (pos == source || isBrOrWsOrPunctuatorNotDot(*(pos - 1)));
}

bool readPrecedingKeywordn (char16_t* pos, const char16_t* compare, size_t n) {
  if (pos - n + 1 < source) return false;
  return memcmp(pos - n + 1, compare, n * 2) == 0 && (pos - n + 1 == source || isBrOrWsOrPunctuatorOrSpreadNotDot(pos - n));
}

// Detects one of case, debugger, delete, do, else, in, instanceof, new,
//   return, throw, typeof, void, yield ,await
bool isExpressionKeyword (char16_t* pos) {
  switch (*pos) {
    case 'd':
      switch (*(pos - 1)) {
        case 'i':
          // void
          return readPrecedingKeywordn(pos - 2, VO, 2);
        case 'l':
          // yield
          return readPrecedingKeywordn(pos - 2, YIE, 3);
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
          return readPrecedingKeywordn(pos - 2, DELE, 4);
        case 'u':
          // continue
          return readPrecedingKeywordn(pos - 2, CONTIN, 6);
        default:
          return false;
      }
    case 'f':
      if (*(pos - 1) != 'o' || *(pos - 2) != 'e')
        return false;
      switch (*(pos - 3)) {
        case 'c':
          // instanceof
          return readPrecedingKeywordn(pos - 4, INSTAN, 6);
        case 'p':
          // typeof
          return readPrecedingKeywordn(pos - 4, TY, 2);
        default:
          return false;
      }
    case 'k':
      // break
      return readPrecedingKeywordn(pos - 1, BREA, 4);
    case 'n':
      // in, return
      return readPrecedingKeyword1(pos - 1, 'i') || readPrecedingKeywordn(pos - 1, RETUR, 5);
    case 'o':
      // do
      return readPrecedingKeyword1(pos - 1, 'd');
    case 'r':
      // debugger
      return readPrecedingKeywordn(pos - 1, DEBUGGE, 7);
    case 't':
      // await
      return readPrecedingKeywordn(pos - 1, AWAI, 4);
    case 'w':
      switch (*(pos - 1)) {
        case 'e':
          // new
          return readPrecedingKeyword1(pos - 2, 'n');
        case 'o':
          // throw
          return readPrecedingKeywordn(pos - 2, THR, 3);
        default:
          return false;
      }
  }
  return false;
}

bool isParenKeyword (char16_t* curPos) {
  return readPrecedingKeywordn(curPos, WHILE, 5) ||
      readPrecedingKeywordn(curPos, FOR, 3) ||
      readPrecedingKeywordn(curPos, IF, 2);
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

bool isBreakOrContinue (char16_t* curPos) {
  switch (*curPos) {
    case 'k':
      return readPrecedingKeywordn(curPos - 1, BREA, 4);
    case 'e':
      if (*(curPos - 1) == 'u')
        return readPrecedingKeywordn(curPos - 2, CONTIN, 6);
  }
  return false;
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
      return readPrecedingKeywordn(curPos - 1, CATC, 4);
    case 'y':
      return readPrecedingKeywordn(curPos - 1, FINALL, 6);
    case 'e':
      return readPrecedingKeywordn(curPos - 1, ELS, 3);
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
