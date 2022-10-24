#include "../obj/lexer_world.h"

extern void* __heap_base;
void *sbrk(intptr_t increment);

const char16_t* STANDARD_IMPORT = (char16_t*)0x1;
const char16_t* IMPORT_META = (char16_t*)0x2;
const char16_t __empty_char = '\0';
const char16_t* EMPTY_CHAR = &__empty_char;

// Paren = odd, Brace = even
enum OpenTokenState {
  AnyParen = 1, // (
  AnyBrace = 2, // {
  Template = 3, // `
  TemplateBrace = 4, // ${
  ImportParen = 5, // import(),
  ClassBrace = 6,
  AsyncParen = 7, // async()
};

struct OpenToken {
  enum OpenTokenState token;
  char16_t* pos;
};
typedef struct OpenToken OpenToken;

void add_import (const char16_t* statement_start,
                 const char16_t* start,
                 const char16_t* end,
                 const char16_t* dynamic);

void add_export (const char16_t* start,
                 const char16_t* end,
                 const char16_t* local_start,
                 const char16_t* local_end);

void try_parse_import_statement ();
void try_parse_export_statement ();

void read_import_string (const char16_t* ss, char16_t ch);
char16_t read_export_as (char16_t* startPos, char16_t* endPos);

char16_t comment_whitespace (bool br);
void regular_expression ();
void template_string ();
void block_comment (bool br);
void line_comment ();
void string_literal (char16_t quote);

char16_t read_to_ws_or_punctuator (char16_t ch);

bool is_quote (char16_t ch);

bool is_br (char16_t c);
bool is_ws_not_br (char16_t c);
bool is_br_or_ws (char16_t c);
bool is_br_or_ws_not_punctuator (char16_t c);
bool is_br_or_ws_or_punctuator_not_dot (char16_t c);

bool read_preceding_keyword_1 (char16_t* pos, char16_t c1);
bool read_preceding_keyword_n (char16_t* pos, const char16_t* compare, size_t n);

bool is_break_or_continue (char16_t* curPos);

bool keyword_start (char16_t* pos);
bool is_expression_keyword (char16_t* pos);
bool is_paren_keyword (char16_t* pos);
bool is_punctuator (char16_t charCode);
bool is_expression_punctuator (char16_t charCode);
bool is_expression_terminator (char16_t* pos);

void next_char (char16_t ch);
void next_char_surrogate (char16_t ch);
char16_t read_char ();

void syntaxError ();
