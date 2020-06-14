#include <stdint.h>
#include <stdbool.h>
#include <stddef.h>

typedef unsigned short char16_t;
typedef unsigned long char32_t;
extern unsigned char __heap_base;

const char16_t* STANDARD_IMPORT = (char16_t*)0x1;
const char16_t* IMPORT_META = (char16_t*)0x2;
const char16_t __empty_char = '\0';
const char16_t* EMPTY_CHAR = &__empty_char;
// tracked depth of template and brackets
const uint32_t STACK_DEPTH = 2048;
const char16_t* source = (void*)&__heap_base;

struct Slice {
  const char16_t* start;
  const char16_t* end;
  struct Slice* next;
};
typedef struct Slice Slice;

Slice* first_export = NULL;
Slice* export_read_head = NULL;
Slice* export_write_head = NULL;
Slice* first_reexport = NULL;
Slice* reexport_read_head = NULL;
Slice* reexport_write_head = NULL;
void* analysis_base;
void* analysis_head;

char templateStackDepth;
uint16_t openTokenDepth;
char templateDepth;
uint16_t braceDepth;
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
bool top_level_exec = true;
bool has_webpack_export = false;
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
  first_export = NULL;
  export_write_head = NULL;
  export_read_head = NULL;
  first_reexport = NULL;
  reexport_write_head = NULL;
  reexport_read_head = NULL;
  return source;
}

void addExport (const char16_t* start, const char16_t* end) {
  Slice* export = (Slice*)(analysis_head);
  analysis_head = analysis_head + sizeof(Slice);
  if (export_write_head == NULL)
    first_export = export;
  else
    export_write_head->next = export;
  export_write_head = export;
  export->start = start;
  export->end = end;
  export->next = NULL;
}
void addReexport (const char16_t* start, const char16_t* end) {
  Slice* reexport = (Slice*)(analysis_head);
  analysis_head = analysis_head + sizeof(Slice);
  if (reexport_write_head == NULL)
    first_reexport = reexport;
  else
    reexport_write_head->next = reexport;
  reexport_write_head = reexport;
  reexport->start = start;
  reexport->end = end;
  reexport->next = NULL;
}

// getErr
uint32_t e () {
  return parse_error;
}

// getExportStart
uint32_t es () {
  return export_read_head->start - source;
}
// getExportEnd
uint32_t ee () {
  return export_read_head->end - source;
}
// getReexportStart
uint32_t res () {
  return reexport_read_head->start - source;
}
// getReexportEnd
uint32_t ree () {
  return reexport_read_head->end - source;
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
// readReexport
bool rre () {
  if (reexport_read_head == NULL)
    reexport_read_head = first_reexport;
  else
    reexport_read_head = reexport_read_head->next;
  if (reexport_read_head == NULL)
    return false;
  return true;
}

bool parse (uint32_t point);

void tryParseLiteralExports ();
void tryParseWebpackExports ();
void tryParseModuleExportsDotAssign ();
void tryParseExportsDotAssign (bool assign);
void tryParseObjectDefine ();
bool identifier (char16_t ch);

void throwIfImportStatement ();
void throwIfExportStatement ();

void readImportString (const char16_t* ss, char16_t ch);
char16_t readExportAs (char16_t* startPos, char16_t* endPos);

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
bool str_eq13 (char16_t* pos, char16_t c1, char16_t c2, char16_t c3, char16_t c4, char16_t c5, char16_t c6, char16_t c7, char16_t c8, char16_t c9, char16_t c10, char16_t c11, char16_t c12, char16_t c13);
bool str_eq18 (char16_t* pos, char16_t c1, char16_t c2, char16_t c3, char16_t c4, char16_t c5, char16_t c6, char16_t c7, char16_t c8, char16_t c9, char16_t c10, char16_t c11, char16_t c12, char16_t c13, char16_t c14, char16_t c15, char16_t c16, char16_t c17, char16_t c18);

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
