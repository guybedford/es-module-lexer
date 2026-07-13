#include <stdint.h>
#include <stdbool.h>
#include <stddef.h>

typedef unsigned short char16_t;
extern unsigned char __heap_base;

const char16_t* STANDARD_IMPORT = (char16_t*)0x1;
const char16_t* IMPORT_META = (char16_t*)0x2;
const char16_t* source = (void*)&__heap_base;

void setSource (void* ptr) {
  source = ptr;
}

enum ImportType {
  Static = 1,
  Dynamic = 2,
  ImportMeta = 3,
  StaticSourcePhase = 4,
  DynamicSourcePhase = 5,
  StaticDeferPhase = 6,
  DynamicDeferPhase = 7,
};

#ifndef LEXER_MIN
struct Attribute {
  const char16_t* key_start;
  const char16_t* key_end;
  const char16_t* value_start;
  const char16_t* value_end;
  struct Attribute* next;
};
typedef struct Attribute Attribute;
#endif

struct Import {
  const char16_t* start;
  const char16_t* end;
  const char16_t* statement_start;
  const char16_t* statement_end;
  const char16_t* attr_index;
  const char16_t* dynamic;
  bool safe;
#ifdef LEX_TS
  bool type_only;
#endif
  enum ImportType import_ty;
#ifndef LEXER_MIN
  struct Attribute* attributes;
#endif
  struct Import* next;
};
typedef struct Import Import;

enum OpenTokenState {
  AnyParen = 1, // (
  AnyBrace = 2, // {
  Template = 3, // `
  TemplateBrace = 4, // ${
  ImportParen = 5, // import(),
  ClassBrace = 6,
  AsyncParen = 7, // async()
  AnyBracket = 8, // [
};

struct OpenToken {
  enum OpenTokenState token;
  char16_t* pos;
};
typedef struct OpenToken OpenToken;

struct Export {
  const char16_t* start;
  const char16_t* end;
  const char16_t* local_start;
  const char16_t* local_end;
#ifndef LEXER_MIN
  const char16_t* statement_start;
#endif
#ifdef LEX_TS
  bool type_only;
#endif
  struct Export* next;
};
typedef struct Export Export;

Import* first_import = NULL;
Export* first_export = NULL;
Import* import_read_head = NULL;
Export* export_read_head = NULL;
Import* import_write_head = NULL;
Import* import_write_head_last = NULL;
Export* export_write_head = NULL;
#ifndef LEXER_MIN
const char16_t* export_statement_start = NULL;
#endif
void* analysis_base;
void* analysis_head;

bool facade;
#ifndef LEXER_MIN
bool hasModuleSyntax;
#endif
bool lastSlashWasDivision;
uint16_t openTokenDepth;
char16_t* lastTokenPos;
char16_t* pos;
char16_t* end;
OpenToken* openTokenStack;
uint16_t dynamicImportStackDepth;
Import** dynamicImportStack;
bool nextBraceIsClass;

// Memory Structure:
// -> source
// -> analysis starts after source
uint32_t parse_error;
bool has_error = false;
uint32_t sourceLen = 0;

void bail (uint32_t err);

// allocateSource
const char16_t* sa (uint32_t utf16Len) {
  sourceLen = utf16Len;
  const char16_t* sourceEnd = source + utf16Len + 1;
  // ensure source is null terminated
  *(char16_t*)(source + utf16Len) = '\0';
  analysis_base = (void*)sourceEnd;
  analysis_head = analysis_base;
  first_import = NULL;
  import_write_head = NULL;
  import_read_head = NULL;
  first_export = NULL;
  export_write_head = NULL;
  export_read_head = NULL;
  return source;
}

void addImport (const char16_t* statement_start, const char16_t* start, const char16_t* end, const char16_t* dynamic) {
  Import* import = (Import*)(analysis_head);
  analysis_head = analysis_head + sizeof(Import);
  if (import_write_head == NULL)
    first_import = import;
  else
    import_write_head->next = import;
  import_write_head_last = import_write_head;
  import_write_head = import;
  import->statement_start = statement_start;
  if (dynamic == IMPORT_META) {
    import->statement_end = end;
    import->import_ty = ImportMeta;
  }
  else if (dynamic == STANDARD_IMPORT) {
    import->statement_end = end + 1;
    import->import_ty = Static;
  }
  else {
    import->statement_end = 0;
    import->import_ty = Dynamic;
  }
  import->start = start;
  import->end = end;
  import->attr_index = 0;
  import->dynamic = dynamic;
  import->safe = dynamic == STANDARD_IMPORT;
#ifdef LEX_TS
  import->type_only = false;
#endif
#ifndef LEXER_MIN
  import->attributes = NULL;
#endif
  import->next = NULL;
#ifndef LEXER_MIN
  if (dynamic == IMPORT_META || dynamic == STANDARD_IMPORT)
    hasModuleSyntax = true;
#endif
}

void addExport (const char16_t* start, const char16_t* end, const char16_t* local_start, const char16_t* local_end) {
  Export* export = (Export*)(analysis_head);
  analysis_head = analysis_head + sizeof(Export);
  if (export_write_head == NULL)
    first_export = export;
  else
    export_write_head->next = export;
  export_write_head = export;
  export->start = start;
  export->end = end;
  export->local_start = local_start;
  export->local_end = local_end;
#ifndef LEXER_MIN
  export->statement_start = export_statement_start;
#endif
#ifdef LEX_TS
  export->type_only = false;
#endif
  export->next = NULL;
#ifndef LEXER_MIN
  hasModuleSyntax = true;
#endif
}

// getErr
uint32_t e () {
  return parse_error;
}

// getImportStart
uint32_t is () {
  return import_read_head->start - source;
}
// getImportEnd
uint32_t ie () {
  return import_read_head->end == 0 ? -1 : import_read_head->end - source;
}
// getImportStatementStart
uint32_t ss () {
  return import_read_head->statement_start - source;
}
// getImportStatementEnd
uint32_t se () {
  return import_read_head->statement_end == 0 ? -1 : import_read_head->statement_end - source;
}
// getImportType
uint32_t it () {
#ifdef LEX_TS
  return import_read_head->import_ty | import_read_head->type_only << 3;
#else
  return import_read_head->import_ty;
#endif
}
// getAssertIndex
uint32_t ai () {
  return import_read_head->attr_index == 0 ? -1 : import_read_head->attr_index - source;
}
// getImportDynamic
uint32_t id () {
  const char16_t* dynamic = import_read_head->dynamic;
  if (dynamic == STANDARD_IMPORT)
    return -1;
  else if (dynamic == IMPORT_META)
    return -2;
  return import_read_head->dynamic - source;
}
// getImportSafeString
uint32_t ip () {
  return import_read_head->safe;
}
// getExportStart
uint32_t es () {
  return export_read_head->start - source;
}
// getExportEnd
uint32_t ee () {
  return export_read_head->end - source;
}
// getExportLocalStart
int32_t els () {
  return export_read_head->local_start ? export_read_head->local_start - source : -1;
}
// getExportLocalEnd
int32_t ele () {
  return export_read_head->local_end ? export_read_head->local_end - source : -1;
}
#ifndef LEXER_MIN
// getExportStatementStart
uint32_t ess () {
  return export_read_head->statement_start - source;
}
#endif
// readImport
bool ri () {
  if (import_read_head == NULL)
    import_read_head = first_import;
  else
    import_read_head = import_read_head->next;
  if (import_read_head == NULL)
    return false;
  return true;
}
// readExport
uint32_t re () {
  if (export_read_head == NULL)
    export_read_head = first_export;
  else
    export_read_head = export_read_head->next;
  if (export_read_head == NULL)
    return 0;
#ifdef LEX_TS
  return 1 + export_read_head->type_only;
#else
  return 1;
#endif
}
#ifndef LEXER_MIN
bool f () {
  return facade;
}
bool ms () {
  return hasModuleSyntax;
}
#endif

#ifndef LEXER_MIN
Attribute* attribute_read_head = NULL;

// readAttribute
bool ra () {
  if (attribute_read_head == NULL)
    attribute_read_head = import_read_head->attributes;
  else
    attribute_read_head = attribute_read_head->next;
  if (attribute_read_head == NULL)
    return false;
  return true;
}
// getAttributeKeyStart
uint32_t aks () {
  return attribute_read_head->key_start - source;
}
// getAttributeKeyEnd
uint32_t ake () {
  return attribute_read_head->key_end - source;
}
// getAttributeValueStart
uint32_t avs () {
  return attribute_read_head->value_start - source;
}
// getAttributeValueEnd
uint32_t ave () {
  return attribute_read_head->value_end - source;
}
// resetAttributes
void rsa () {
  attribute_read_head = NULL;
}
#endif

bool parse ();

void tryParseImportStatement ();
bool tryParseExportStatement ();

void readImportString (const char16_t* ss, char16_t ch, int phase_keyword);
char16_t readExportAs (char16_t* startPos, char16_t* endPos);

char16_t readBindingTarget (char16_t ch);
void readBindingPattern ();
char16_t skipExpression (bool asi);
bool isValueChar (char16_t c);

#ifdef LEX_TS
// pos AT the start of a `type` token candidate. Returns true when it is the
// contextual `type` keyword whose follower begins an import/export clause,
// not an identifier whose prefix is "type" (typeof, typed, ...).
bool isTsTypeKeyword (char16_t* pos);
bool isTsIdentifierStart (char16_t c);
bool isTsTypePrefixKeyword (char16_t* start, char16_t* afterEnd);
bool tryTsTypeDeclaration (bool bare);
bool skipTsTrivia (char16_t ch);
bool skipTsBalanced ();
#endif

char16_t commentWhitespace (bool br);
void regularExpression ();
void templateString ();
bool noSubstitutionTemplate ();
void blockComment (bool br);
void lineComment ();
void stringLiteral (char16_t quote);

char16_t readToWsOrPunctuator (char16_t ch);

bool isQuote (char16_t ch);

bool isBr (char16_t c);
bool isWsNotBr (char16_t c);
bool isBrOrWs (char16_t c);
bool isBrOrWsOrPunctuator (char16_t c);
bool isSpread (char16_t* c);
bool isBrOrWsOrPunctuatorNotDot (char16_t c);
bool isForOfBinding (char16_t* pos);

bool readPrecedingKeyword1(char16_t* pos, char16_t c1);
bool readPrecedingKeywordn(char16_t* pos, const char16_t* compare, size_t n);

bool isBreakOrContinue (char16_t* curPos);

bool keywordStart (char16_t* pos);
bool isExpressionKeyword (char16_t* pos);
bool isParenKeyword (char16_t* pos);
bool isPunctuator (char16_t charCode);
bool isExpressionPunctuator (char16_t charCode);
bool isExpressionTerminator (char16_t* pos);

void nextChar (char16_t ch);
void nextCharSurrogate (char16_t ch);
char16_t readChar ();

void syntaxError ();
