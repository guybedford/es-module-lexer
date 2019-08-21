#include <stdint.h>
#include <stdbool.h>
#include <stddef.h>

typedef unsigned char uchar_t;
extern uchar_t __heap_base;

struct Import {
  uint32_t start;
  uint32_t end;
  uchar_t* endPos;
  uint32_t dynamic;
  uchar_t* dynamicPos;
  struct Import* next;
};
typedef struct Import Import;

struct Export {
  uint32_t start;
  uint32_t end;
  struct Export* next;
};
typedef struct Export Export;

// depth of template and brackets
const uint32_t STACK_DEPTH = 1024;

const uchar_t __empty_char = '\0';
const uchar_t* EMPTY_CHAR = &__empty_char;
Import* first_import = NULL;
Export* first_export = NULL;
Import* import_read_head = NULL;
Export* export_read_head = NULL;
Import* import_write_head = NULL;
Import* import_write_head_last = NULL;
Export* export_write_head = NULL;
void* analysis_base;
void* analysis_head;

size_t SOURCE_LEN;

char templateStackDepth;
char openTokenPosStackDepth;
char templateDepth;
char braceDepth;
uchar_t* lastTokenPos;
uchar_t* lastOpenTokenPos;
uchar_t* pos;
// js string index offset (accounting for different codepoint lengths)
uchar_t* jsIndexOffset;
char* templateStack;
uchar_t** openTokenPosStack;

// Memory Structure:
// allocateSource sets SOURCE_LEN
// -> source [SOURCE_LEN]
// -> analysis starts at source + SOURCE_LEN [bump allocated after source allocated]
// Therefore: very important source* is last defined local!
uint32_t parse_error;
bool has_error = false;
const uchar_t* source = &__heap_base;

void bail (uint32_t err);

// allocateSource
void* salloc (size_t len) {
  SOURCE_LEN = len;
  analysis_base = (void*)(source + len + 1 + ((len + 1) % 4));
  analysis_head = analysis_base;
  first_import = NULL;
  import_write_head = NULL;
  import_read_head = NULL;
  first_export = NULL;
  export_write_head = NULL;
  export_read_head = NULL;
  return (void*)source;
}

void addImport (uint32_t start, uint32_t end, uchar_t* endPos, uint32_t dynamic, uchar_t* dynamicPos) {
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
  import->endPos = endPos;
  import->dynamic = dynamic;
  import->dynamicPos = dynamicPos;
  import->next = NULL;
}

void addExport (uint32_t start, uint32_t end) {
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
  return import_read_head->start;
}
// getImportEnd
uint32_t ie () {
  return import_read_head->end;
}
// getImportDynamic
uint32_t id () {
  return import_read_head->dynamic;
}
// getExportStart
uint32_t es () {
  return export_read_head->start;
}
// getExportEnd
uint32_t ee () {
  return export_read_head->end;
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

void readImportString (uchar_t ch);

uchar_t commentWhitespace ();
void singleQuoteString ();
void doubleQuoteString ();
void regularExpression ();
void templateString ();
void blockComment ();
void lineComment ();

uchar_t readToWsOrPunctuator (uchar_t ch);

bool isBr (uchar_t c);
bool isBrOrWs (uchar_t c);
bool isBrOrWsOrPunctuator (uchar_t c);
bool isBrOrWsOrPunctuatorNotDot (uchar_t c);

bool str_eq2 (uchar_t* pos, uchar_t c1, uchar_t c2);
bool str_eq3 (uchar_t* pos, uchar_t c1, uchar_t c2, uchar_t c3);
bool str_eq4 (uchar_t* pos, uchar_t c1, uchar_t c2, uchar_t c3, uchar_t c4);
bool str_eq5 (uchar_t* pos, uchar_t c1, uchar_t c2, uchar_t c3, uchar_t c4, uchar_t c5);
bool str_eq6 (uchar_t* pos, uchar_t c1, uchar_t c2, uchar_t c3, uchar_t c4, uchar_t c5, uchar_t c6);
bool str_eq7 (uchar_t* pos, uchar_t c1, uchar_t c2, uchar_t c3, uchar_t c4, uchar_t c5, uchar_t c6, uchar_t c7);

bool readPrecedingKeyword2(uchar_t* pos, uchar_t c1, uchar_t c2);
bool readPrecedingKeyword3(uchar_t* pos, uchar_t c1, uchar_t c2, uchar_t c3);
bool readPrecedingKeyword4(uchar_t* pos, uchar_t c1, uchar_t c2, uchar_t c3, uchar_t c4);
bool readPrecedingKeyword5(uchar_t* pos, uchar_t c1, uchar_t c2, uchar_t c3, uchar_t c4, uchar_t c5);
bool readPrecedingKeyword6(uchar_t* pos, uchar_t c1, uchar_t c2, uchar_t c3, uchar_t c4, uchar_t c5, uchar_t c6);
bool readPrecedingKeyword7(uchar_t* pos, uchar_t c1, uchar_t c2, uchar_t c3, uchar_t c4, uchar_t c5, uchar_t c6, uchar_t c7);

bool isExpressionKeyword (uchar_t* pos);
bool isParenKeyword (uchar_t* pos);
bool isPunctuator (uchar_t charCode);
bool isExpressionPunctuator (uchar_t charCode);
bool isExpressionTerminator (uchar_t* pos);

void nextChar (uchar_t ch);
void nextCharSurrogate (uchar_t ch);
uchar_t readChar ();

void syntaxError ();
