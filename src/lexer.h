#include <stdint.h>
#include <stdbool.h>
#include <stddef.h>

typedef unsigned short char16_t;
extern unsigned char __heap_base;

const char16_t* STANDARD_IMPORT = (char16_t*)0x1;
const char16_t* IMPORT_META = (char16_t*)0x2;
const char16_t __empty_char = '\0';
const char16_t* EMPTY_CHAR = &__empty_char;
// tracked depth of template and brackets
const uint32_t STACK_DEPTH = 1024;
const char16_t* source = (void*)&__heap_base;

struct Import {
  const char16_t* start;
  const char16_t* end;
  const char16_t* dynamic;
  struct Import* next;
};
typedef struct Import Import;

struct Export {
  const char16_t* start;
  const char16_t* end;
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
void* analysis_base;
void* analysis_head;

char templateStackDepth;
char openTokenDepth;
char templateDepth;
char braceDepth;
char16_t* lastTokenPos;
char16_t* pos;
char16_t* end;
char* templateStack;
char16_t** openTokenPosStack;

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

void addImport (const char16_t* start, const char16_t* end, const char16_t* dynamic) {
  Import* import = (Import*)(analysis_head);
  analysis_head = analysis_head + sizeof(Import);
  if (import_write_head == NULL)
    first_import = import;
  else
    import_write_head->next = import;
  import_write_head_last = import_write_head;
  import_write_head = import;
  import->start = start;
  import->end = end;
  import->dynamic = dynamic;
  import->next = NULL;
}

void addExport (const char16_t* start, const char16_t* end) {
  Export* export = (Export*)(analysis_head);
  analysis_head = analysis_head + sizeof(Export);
  if (export_write_head == NULL)
    first_export = export;
  else
    export_write_head->next = export;
  export_write_head = export;
  export->start = start;
  export->end = end;
  export->next = NULL;
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
  return import_read_head->end - source;
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
// getExportStart
uint32_t es () {
  return export_read_head->start - source;
}
// getExportEnd
uint32_t ee () {
  return export_read_head->end - source;
}
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
bool re () {
  if (export_read_head == NULL)
    export_read_head = first_export;
  else
    export_read_head = export_read_head->next;
  if (export_read_head == NULL)
    return false;
  return true;
}

bool parse (uint32_t point);

void tryParseImportStatement ();
void tryParseExportStatement ();

void readImportString (char16_t ch);

char16_t commentWhitespace ();
void singleQuoteString ();
void doubleQuoteString ();
void regularExpression ();
void templateString ();
void blockComment ();
void lineComment ();

char16_t readToWsOrPunctuator (char16_t ch);

bool isBr (char16_t c);
bool isBrOrWs (char16_t c);
bool isBrOrWsOrPunctuator (char16_t c);
bool isBrOrWsOrPunctuatorNotDot (char16_t c);

bool str_eq2 (char16_t* pos, char16_t c1, char16_t c2);
bool str_eq3 (char16_t* pos, char16_t c1, char16_t c2, char16_t c3);
bool str_eq4 (char16_t* pos, char16_t c1, char16_t c2, char16_t c3, char16_t c4);
bool str_eq5 (char16_t* pos, char16_t c1, char16_t c2, char16_t c3, char16_t c4, char16_t c5);
bool str_eq6 (char16_t* pos, char16_t c1, char16_t c2, char16_t c3, char16_t c4, char16_t c5, char16_t c6);
bool str_eq7 (char16_t* pos, char16_t c1, char16_t c2, char16_t c3, char16_t c4, char16_t c5, char16_t c6, char16_t c7);

bool readPrecedingKeyword2(char16_t* pos, char16_t c1, char16_t c2);
bool readPrecedingKeyword3(char16_t* pos, char16_t c1, char16_t c2, char16_t c3);
bool readPrecedingKeyword4(char16_t* pos, char16_t c1, char16_t c2, char16_t c3, char16_t c4);
bool readPrecedingKeyword5(char16_t* pos, char16_t c1, char16_t c2, char16_t c3, char16_t c4, char16_t c5);
bool readPrecedingKeyword6(char16_t* pos, char16_t c1, char16_t c2, char16_t c3, char16_t c4, char16_t c5, char16_t c6);
bool readPrecedingKeyword7(char16_t* pos, char16_t c1, char16_t c2, char16_t c3, char16_t c4, char16_t c5, char16_t c6, char16_t c7);

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
