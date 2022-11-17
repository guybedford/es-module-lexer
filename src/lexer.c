#include "lexer.h"
#include <assert.h>

// Bump allocator

static void* heap_ptr = 0;
static void* heap_top = 0;
static const size_t PAGE_SIZE = 64 * 1024;

__attribute__((weak, export_name("cabi_realloc")))
void* cabi_realloc(void *ptr, size_t orig_size, size_t align, size_t new_size) {
  if (heap_top == 0) {
    heap_top = (void*)(__builtin_wasm_memory_size(0) * PAGE_SIZE);
    heap_ptr = &__heap_base;
  }
  uint32_t align_diff = (uint32_t)heap_ptr % align;
  if (align_diff) heap_ptr += align - align_diff;
  heap_ptr += new_size;
  if (heap_ptr > heap_top) {
    uint32_t pages = (heap_ptr - heap_top) / PAGE_SIZE + 1;
    heap_top = (void*)__builtin_wasm_memory_grow(0, (uintptr_t)pages);
  }
  return heap_ptr - new_size;
}

__attribute__((weak, export_name("cabi_post_parse")))
void __wasm_export_lexer_parse_post_return(int32_t arg0) {
  heap_ptr = &__heap_base;
}

// Strings

#define LEN(STR) (sizeof(STR) / sizeof(STR[0]) - 1)

static inline void cpy(char16_t* out, char16_t* in, size_t len) {
  for (size_t i = 0; i < len; i++) {
    out[i] = in[i];
  }
}

size_t write_num(char16_t* out, uint32_t num) {
  char16_t* ptr = out, *ptr1 = out, tmp_char;
  uint32_t tmp_num;
  do {
    tmp_num = num;
    num /= 10;
    *ptr++ = "0123456789"[tmp_num - num * 10];
  } while (num);
  size_t len = ptr - ptr1 + 1;
  while (ptr1 < ptr) {
    tmp_char = *ptr;
    *ptr-- = *ptr1;
    *ptr1++ = tmp_char;
  }
  return len;
}

static const char16_t PARSE_ERROR_[] = { 'P', 'a', 'r', 's', 'e', ' ', 'e', 'r', 'r', 'o', 'r', ' ' };

static const char16_t XPORT[] = { 'x', 'p', 'o', 'r', 't' };
static const char16_t MPORT[] = { 'm', 'p', 'o', 'r', 't' };
static const char16_t LASS[] = { 'l', 'a', 's', 's' };
static const char16_t FROM[] = { 'f', 'r', 'o', 'm' };
static const char16_t ETA[] = { 'e', 't', 'a' };
static const char16_t SSERT[] = { 's', 's', 'e', 'r', 't' };
static const char16_t VO[] = { 'v', 'o' };
static const char16_t YIE[] = { 'y', 'i', 'e' };
static const char16_t DELE[] = { 'd', 'e', 'l', 'e' };
static const char16_t INSTAN[] = { 'i', 'n', 's', 't', 'a', 'n' };
static const char16_t TY[] = { 't', 'y' };
static const char16_t RETUR[] = { 'r', 'e', 't', 'u', 'r' };
static const char16_t DEBUGGE[] = { 'd', 'e', 'b', 'u', 'g', 'g', 'e' };
static const char16_t AWAI[] = { 'a', 'w', 'a', 'i' };
static const char16_t THR[] = { 't', 'h', 'r' };
static const char16_t WHILE[] = { 'w', 'h', 'i', 'l', 'e' };
static const char16_t FOR[] = { 'f', 'o', 'r' };
static const char16_t IF[] = { 'i', 'f' };
static const char16_t CATC[] = { 'c', 'a', 't', 'c' };
static const char16_t FINALL[] = { 'f', 'i', 'n', 'a', 'l', 'l' };
static const char16_t ELS[] = { 'e', 'l', 's' };
static const char16_t BREA[] = { 'b', 'r', 'e', 'a' };
static const char16_t CONTIN[] = { 'c', 'o', 'n', 't', 'i', 'n' };
static const char16_t SYNC[] = {'s', 'y', 'n', 'c'};
static const char16_t UNCTION[] = {'u', 'n', 'c', 't', 'i', 'o', 'n'};

// Static vars

static char16_t* source;
static uint32_t source_len = 0;

static char16_t* name;
static size_t name_len = 0;

static char16_t* parse_error;
static bool has_error = false;

static bool facade;
static bool last_slash_was_division;
static uint16_t open_token_depth;
static char16_t* last_token_pos;
static char16_t* pos;
static char16_t* end;
static OpenToken* open_token_stack;
static uint16_t dynamic_import_stack_depth;
static lexer_import_t** dynamic_import_stack;
static bool next_brace_is_class;

static lexer_import_t* imports_base;
static lexer_export_t* exports_base;
static lexer_import_t* imports_head;
static lexer_export_t* exports_head;

static const size_t MAX_IMPORTS = 1024;
static const size_t MAX_EXPORTS = 8192;
static const size_t MAX_DYNAMIC_IMPORT_NESTING = 512;
static const size_t MAX_BRACE_DEPTH = 1024;

// Output data

void add_import (const char16_t* statement_start,
                 const char16_t* start,
                 const char16_t* end,
                 const char16_t* dynamic) {
  imports_head->ss = statement_start - source;
  imports_head->s = start - source;
  imports_head->e = end - source;
  imports_head->a = 0;
  if (dynamic == STANDARD_IMPORT) {
    imports_head->d = -1;
    imports_head->se = end - source + 1;
    imports_head->n.is_some = true;
    imports_head->n.val.len = end - start;
    imports_head->n.val.ptr = (char16_t*)start;
  } else if (dynamic == IMPORT_META) {
    imports_head->d = -2;
    imports_head->se = end - source;
    imports_head->n.is_some = false;
  } else {
    imports_head->d = dynamic - source;
    imports_head->se = 0;
    imports_head->n.is_some = false;
  }
  if (imports_head - imports_base < MAX_IMPORTS)
    imports_head++;
}

void add_export (const char16_t* start,
                 const char16_t* end,
                 const char16_t* local_start,
                 const char16_t* local_end) {
  exports_head->s = start - source;
  exports_head->e = end - source;
  exports_head->n.len = end - start;
  exports_head->n.ptr = (char16_t*)start;
  if (local_start == NULL || local_end == NULL) {
    exports_head->ls = exports_head->le = -1;
  } else {
    exports_head->ls = local_start - source;
    exports_head->le = local_end - source;
    exports_head->ln.is_some = true;
    exports_head->ln.val.len = local_end - local_start;
    exports_head->ln.val.ptr = (char16_t*)local_start;
  }
  if (exports_head - exports_base < MAX_IMPORTS)
    exports_head++;
}

// Error handler

static lexer_parse_result_t* ret;

// `Parse error (${name || '@'}:${line}:${col})`
void syntax_error () {
  has_error = true;
  char16_t* err = cabi_realloc(0, 0, 2, 50);
  size_t len = LEN(PARSE_ERROR_) + 1;
  cpy(err, (char16_t*)PARSE_ERROR_, len);
  if (name_len) {
    cpy(err + len, name, name_len);
    len += name_len;
  } else {
    err[len++] = '@';
  }
  err[len++] = ':';
  int32_t line = 1, col = 1;
  char16_t* err_pos = pos;
  char16_t ch;
  pos = source - 1;
  while (++pos < err_pos) {
    ch = *pos;
    if (ch == '\n') {
      line++;
      col = 1;
    } else {
      col++;
    }
  }
  len += write_num(&err[len], line);
  err[len++] = ':';
  len += write_num(&err[len], col);
  lexer_parse_result_t result = {
    .is_err = true,
    .val = {
      .err = {
        .ptr = err,
        .len = len
      }
    }
  };
  *ret = result;
  pos = end + 1;
}

// Main

void lexer_parse(lexer_string_t* input, lexer_option_string_t* name_option, lexer_parse_result_t* _ret) {
  source_len = input->len;
  source = input->ptr;
  ret = _ret;
  if (name_option->is_some) {
    name = name_option->val.ptr;
    name_len = name_option->val.len;
  } else {
    name_len = 0;
  }

  // stack allocations
  OpenToken open_token_stack_[MAX_BRACE_DEPTH];
  lexer_import_t* dynamic_import_stack_[MAX_DYNAMIC_IMPORT_NESTING];
  lexer_import_t imports_[MAX_IMPORTS];
  lexer_export_t exports_[MAX_EXPORTS];

  // TODO: Exact stack sizing based on the above!

  facade = true;
  dynamic_import_stack_depth = 0;
  open_token_depth = 0;
  last_token_pos = (char16_t*)EMPTY_CHAR;
  last_slash_was_division = false;
  has_error = false;
  open_token_stack = &open_token_stack_[0];
  dynamic_import_stack = &dynamic_import_stack_[0];
  imports_base = &imports_[0];
  exports_base = &exports_[0];
  imports_head = imports_base;
  exports_head = exports_base;
  next_brace_is_class = false;

  pos = (char16_t*)(source - 1);
  char16_t ch = '\0';
  end = pos + source_len;

  // start with a pure "module-only" parser
  while (pos++ < end) {
    ch = *pos;

    if (ch == 32 || ch < 14 && ch > 8)
      continue;

    switch (ch) {
      case 'e':
        if (open_token_depth == 0 && keyword_start(pos) && memcmp(pos + 1, &XPORT[0], 5 * 2) == 0) {
          try_parse_export_statement();
          // export might have been a non-pure declaration
          if (!facade) {
            last_token_pos = pos;
            goto main_parse;
          }
        }
        break;
      case 'i':
        if (keyword_start(pos) && memcmp(pos + 1, &MPORT[0], 5 * 2) == 0)
          try_parse_import_statement();
        break;
      case ';':
        break;
      case '/': {
        char16_t next_ch = *(pos + 1);
        if (next_ch == '/') {
          line_comment();
          // dont update lastToken
          continue;
        }
        else if (next_ch == '*') {
          block_comment(true);
          // dont update lastToken
          continue;
        }
        // fallthrough
      }
      default:
        // as soon as we hit a non-module token, we go to main parser
        facade = false;
        pos--;
        goto main_parse; // oh yeahhh
    }
    last_token_pos = pos;
  }

  if (has_error)
    return;

  main_parse: while (pos++ < end) {
    ch = *pos;

    if (ch == 32 || ch < 14 && ch > 8)
      continue;

    switch (ch) {
      case 'e':
        if (open_token_depth == 0 && keyword_start(pos) && memcmp(pos + 1, &XPORT[0], 5 * 2) == 0)
          try_parse_export_statement();
        break;
      case 'i':
        if (keyword_start(pos) && memcmp(pos + 1, &MPORT[0], 5 * 2) == 0)
          try_parse_import_statement();
        break;
      case 'c':
        if (keyword_start(pos) && memcmp(pos + 1, &LASS[0], 4 * 2) == 0 && is_br_or_ws(*(pos + 5)))
          next_brace_is_class = true;
        break;
      case '(':
        open_token_stack[open_token_depth].token = AnyParen;
        open_token_stack[open_token_depth++].pos = last_token_pos;
        break;
      case ')':
        if (open_token_depth == 0)
          return syntax_error();
        open_token_depth--;
        if (dynamic_import_stack_depth > 0 && source + dynamic_import_stack[dynamic_import_stack_depth - 1]->d == open_token_stack[open_token_depth].pos) {
          lexer_import_t* cur_dynamic_import = dynamic_import_stack[dynamic_import_stack_depth - 1];
          if (cur_dynamic_import->e == -1)
            cur_dynamic_import->e = pos - source;
          cur_dynamic_import->se = pos - source + 1;
          dynamic_import_stack_depth--;
        }
        break;
      case '{':
        // dynamic import followed by { is not a dynamic import (so remove)
        // this is a sneaky way to get around { import () {} } v { import () }
        // block / object ambiguity without a parser (assuming source is valid)
        if (*last_token_pos == ')' && imports_head > imports_base && source + (imports_head - 1)->e == last_token_pos) {
          imports_head--;
        }
        open_token_stack[open_token_depth].token = next_brace_is_class ? ClassBrace : AnyBrace;
        open_token_stack[open_token_depth++].pos = last_token_pos;
        next_brace_is_class = false;
        break;
      case '}':
        if (open_token_depth == 0)
          return syntax_error();
        if (open_token_stack[--open_token_depth].token == TemplateBrace) {
          template_string();
        }
        break;
      case '\'':
        string_literal(ch);
        break;
      case '"':
        string_literal(ch);
        break;
      case '/': {
        char16_t next_ch = *(pos + 1);
        if (next_ch == '/') {
          line_comment();
          // dont update lastToken
          continue;
        }
        else if (next_ch == '*') {
          block_comment(true);
          // dont update lastToken
          continue;
        }
        else {
          // Division / regex ambiguity handling based on checking backtrack analysis of:
          // - what token came previously (lastToken)
          // - if a closing brace or paren, what token came before the corresponding
          //   opening brace or paren (lastOpenTokenIndex)
          char16_t lastToken = *last_token_pos;
          if (is_expression_punctuator(lastToken) &&
              !(lastToken == '.' && (*(last_token_pos - 1) >= '0' && *(last_token_pos - 1) <= '9')) &&
              !(lastToken == '+' && *(last_token_pos - 1) == '+') && !(lastToken == '-' && *(last_token_pos - 1) == '-') ||
              lastToken == ')' && is_paren_keyword(open_token_stack[open_token_depth].pos) ||
              lastToken == '}' && (is_expression_terminator(open_token_stack[open_token_depth].pos) || open_token_stack[open_token_depth].token == ClassBrace) ||
              is_expression_keyword(last_token_pos) ||
              lastToken == '/' && last_slash_was_division ||
              !lastToken) {
            regular_expression();
            last_slash_was_division = false;
          }
          else {
            // Final check - if the last token was "break x" or "continue x"
            while (last_token_pos > source && !is_br_or_ws_or_punctuator_not_dot(*(--last_token_pos)));
            if (is_ws_not_br(*last_token_pos)) {
              while (last_token_pos > source && is_ws_not_br(*(--last_token_pos)));
              if (is_break_or_continue(last_token_pos)) {
                regular_expression();
                last_slash_was_division = false;
                break;
              }
            }
            last_slash_was_division = true;
          }
        }
        break;
      }
      case '`':
        open_token_stack[open_token_depth].pos = last_token_pos;
        open_token_stack[open_token_depth++].token = Template;
        template_string();
        break;
    }
    last_token_pos = pos;
  }

  if (has_error)
    return;

  if (open_token_depth || dynamic_import_stack_depth)
    return syntax_error();

  lexer_parse_result_t result = {
    .is_err = false,
    .val = {
      .ok = {
        .f0 = {
          .ptr = imports_base,
          .len = imports_head - imports_base
        },
        .f1 = {
          .ptr = exports_base,
          .len = exports_head - exports_base
        },
        .f2 = facade
      }
    }
  };
  *_ret = result;
}

void try_parse_import_statement () {
  char16_t* start_pos = pos;

  pos += 6;

  char16_t ch = comment_whitespace(true);

  switch (ch) {
    // dynamic import
    case '(':
      open_token_stack[open_token_depth].token = ImportParen;
      open_token_stack[open_token_depth++].pos = pos;
      if (*last_token_pos == '.')
        return;
      // dynamic import indicated by positive d
      char16_t* dynamic_pos = pos;
      // try parse a string, to record a safe dynamic import string
      pos++;
      ch = comment_whitespace(true);
      add_import(start_pos, pos, 0, dynamic_pos);
      dynamic_import_stack[dynamic_import_stack_depth++] = imports_head - 1;
      if (ch == '\'') {
        string_literal(ch);
      }
      else if (ch == '"') {
        string_literal(ch);
      }
      else {
        pos--;
        return;
      }
      pos++;
      char16_t* end_pos = pos;
      ch = comment_whitespace(true);
      if (ch == ',') {
        pos++;
        ch = comment_whitespace(true);
        (imports_head - 1)->e = end_pos - source;
        (imports_head - 1)->a = pos - source;
        (imports_head - 1)->n.is_some = true;
        (imports_head - 1)->n.val.ptr = source + (imports_head - 1)->d + 1;
        (imports_head - 1)->n.val.len = end_pos - source - (imports_head - 1)->d - 1;
        pos--;
      }
      else if (ch == ')') {
        open_token_depth--;
        (imports_head - 1)->e = end_pos - source;
        (imports_head - 1)->se = pos + 1 - source;
        (imports_head - 1)->n.is_some = true;
        (imports_head - 1)->n.val.ptr = source + (imports_head - 1)->d + 1;
        (imports_head - 1)->n.val.len = end_pos - source - (imports_head - 1)->d - 1;
        dynamic_import_stack_depth--;
      }
      else {
        pos--;
      }
      return;
    // import.meta
    case '.':
      pos++;
      ch = comment_whitespace(true);
      // import.meta indicated by d == -2
      if (ch == 'm' && memcmp(pos + 1, &ETA[0], 3 * 2) == 0 && *last_token_pos != '.')
        add_import(start_pos, start_pos, pos + 4, IMPORT_META);
      return;

    default:
      // no space after "import" -> not an import keyword
      if (pos == start_pos + 6) {
        pos--;
        break;
      }
    case '"':
    case '\'':
    case '*': {
      // import statement only permitted at base-level
      if (open_token_depth != 0) {
        pos--;
        return;
      }
      while (pos < end) {
        ch = *pos;
        if (is_quote(ch)) {
          read_import_string(start_pos, ch);
          return;
        }
        pos++;
      }
      syntax_error();
      break;
    }

    case '{': {
      // import statement only permitted at base-level
      if (open_token_depth != 0) {
        pos--;
        return;
      }

      while (pos < end) {
        ch = comment_whitespace(true);

        if (is_quote(ch)) {
          string_literal(ch);
        } else if (ch == '}') {
          pos++;
          break;
        }

        pos++;
      }

      ch = comment_whitespace(true);
      if (memcmp(pos, &FROM[0], 4 * 2) != 0) {
        syntax_error();
        break;
      }

      pos += 4;
      ch = comment_whitespace(true);

      if (!is_quote(ch))
        return syntax_error();

      read_import_string(start_pos, ch);

      break;
    }
  }
}

void try_parse_export_statement () {
  char16_t* s_start_pos = pos;
  lexer_export_t* prev_exports_head = exports_head;

  pos += 6;

  char16_t* cur_pos = pos;

  char16_t ch = comment_whitespace(true);

  if (pos == cur_pos && !is_punctuator(ch))
    return;

  if (ch == '{') {
    pos++;
    ch = comment_whitespace(true);
    while (true) {
      char16_t* start_pos = pos;

      if (!is_quote(ch)) {
        ch = read_to_ws_or_punctuator(ch);
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
        string_literal(ch);
        pos++;
      }

      char16_t* end_pos = pos;
      comment_whitespace(true);
      ch = read_export_as(start_pos, end_pos);
      // ,
      if (ch == ',') {
        pos++;
        ch = comment_whitespace(true);
      }
      if (ch == '}')
        break;
      if (pos == start_pos)
        return syntax_error();
      if (pos > end)
        return syntax_error();
    }
    pos++;
    ch = comment_whitespace(true);
  }
  // export *
  // export * as X
  else if (ch == '*') {
    pos++;
    comment_whitespace(true);
    ch = read_export_as(pos, pos);
    ch = comment_whitespace(true);
  }
  else {
    facade = false;
    switch (ch) {
      // export default ...
      case 'd': {
        const char16_t* start_pos = pos;
        pos += 7;
        ch = comment_whitespace(true);
        bool localName = false;
        // export default async? function*? name? (){}
        if (ch == 'a' && keyword_start(pos) &&  memcmp(pos + 1, &SYNC[0], 4 * 2) == 0 && is_ws_not_br(*(pos + 5))) {
          pos += 5;
          ch = comment_whitespace(false);
        }
        if (ch == 'f' && keyword_start(pos) && memcmp(pos + 1, &UNCTION[0], 7 * 2) == 0 && (is_br_or_ws(*(pos + 8)) || *(pos + 8) == '*' || *(pos + 8) == '(')) {
          pos += 8;
          ch = comment_whitespace(true);
          if (ch == '*') {
            pos++;
            ch = comment_whitespace(true);
          }
          if (ch == '(') {
            add_export(start_pos, start_pos + 7, NULL, NULL);
            pos = (char16_t*)(start_pos + 6);
            return;
          }
          localName = true;
        }
        // export default class name? {}
        if (ch == 'c' && keyword_start(pos) && memcmp(pos + 1, &LASS[0], 4 * 2) == 0 && (is_br_or_ws(*(pos + 5)) || *(pos + 5) == '{')) {
          pos += 5;
          ch = comment_whitespace(true);
          if (ch == '{') {
            add_export(start_pos, start_pos + 7, NULL, NULL);
            pos = (char16_t*)(start_pos + 6);
            return;
          }
          localName = true;
        }
        const char16_t* localstart_pos = pos;
        ch = read_to_ws_or_punctuator(ch);
        if (localName && pos > localstart_pos) {
          add_export(start_pos, start_pos + 7, localstart_pos, pos);
          pos--;
        }
        else {
          add_export(start_pos, start_pos + 7, NULL, NULL);
          pos = (char16_t*)(start_pos + 6);
        }
        return;
      }
      // export async? function*? name () {
      case 'a':
        pos += 5;
        comment_whitespace(true);
      // fallthrough
      case 'f':
        pos += 8;
        ch = comment_whitespace(true);
        if (ch == '*') {
          pos++;
          ch = comment_whitespace(true);
        }
        const char16_t* start_pos = pos;
        ch = read_to_ws_or_punctuator(ch);
        add_export(start_pos, pos, start_pos, pos);
        pos--;
        return;

      // export class name ...
      case 'c':
        if (memcmp(pos + 1, &LASS[0], 4 * 2) == 0 && is_br_or_ws_or_punctuator_not_dot(*(pos + 5))) {
          pos += 5;
          ch = comment_whitespace(true);
          const char16_t* start_pos = pos;
          ch = read_to_ws_or_punctuator(ch);
          add_export(start_pos, pos, start_pos, pos);
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
        do {
          pos++;
          ch = comment_whitespace(true);
          const char16_t* start_pos = pos;
          ch = read_to_ws_or_punctuator(ch);
          // dont yet handle [ { destructurings
          if (ch == '{' || ch == '[') {
            break;
          }
          if (pos == start_pos)
            return;
          add_export(start_pos, pos, start_pos, pos);
          ch = comment_whitespace(true);
          if (ch == '=') {
            break;
          }
        } while (ch == ',');
        pos--;
        return;

      default:
        return;
    }
  }

  // from ...
  if (ch == 'f' && memcmp(pos + 1, &FROM[1], 3 * 2) == 0) {
    pos += 4;
    read_import_string(s_start_pos, comment_whitespace(true));

    // There were no local names.
    for (lexer_export_t* expt = prev_exports_head == exports_base ? exports_base : prev_exports_head + 1; expt != exports_head; expt++) {
      expt->ls = expt->le = -1;
    }
  }
  else {
    pos--;
  }
}

char16_t read_export_as (char16_t* start_pos, char16_t* end_pos) {
  char16_t ch = *pos;
  char16_t* local_start_pos = start_pos == end_pos ? NULL : start_pos;
  char16_t* local_end_pos = start_pos == end_pos ? NULL : end_pos;

  if (ch == 'a') {
    pos += 2;
    ch = comment_whitespace(true);
    start_pos = pos;

    if (!is_quote(ch)) {
      ch = read_to_ws_or_punctuator(ch);
    }
    // export { mod as "identifer" } from
    // export { mod as "@notid" } from
    // export { mod as "spa ce" } from
    // export { mod as " space" } from
    // export { mod as "space " } from
    // export { mod as "not~id" } from
    // export { mod as "%notid" } from
    else {
      string_literal(ch);
      pos++;
    }

    end_pos = pos;

    ch = comment_whitespace(true);
  }

  if (pos != start_pos)
    add_export(start_pos, end_pos, local_start_pos, local_end_pos);
  return ch;
}

void read_import_string (const char16_t* ss, char16_t ch) {
  const char16_t* start_pos = pos + 1;
  if (ch == '\'') {
    string_literal(ch);
  }
  else if (ch == '"') {
    string_literal(ch);
  }
  else {
    syntax_error();
    return;
  }
  add_import(ss, start_pos, pos, STANDARD_IMPORT);
  pos++;
  ch = comment_whitespace(false);
  if (ch != 'a' || memcmp(pos + 1, &SSERT[0], 5 * 2) != 0) {
    pos--;
    return;
  }
  char16_t* assert_idx = pos;
  pos += 6;
  ch = comment_whitespace(true);
  if (ch != '{') {
    pos = assert_idx;
    return;
  }
  const char16_t* assert_start = pos;
  do {
    pos++;
    ch = comment_whitespace(true);
    if (ch == '\'') {
      string_literal(ch);
      pos++;
      ch = comment_whitespace(true);
    }
    else if (ch == '"') {
      string_literal(ch);
      pos++;
      ch = comment_whitespace(true);
    }
    else {
      ch = read_to_ws_or_punctuator(ch);
    }
    if (ch != ':') {
      pos = assert_idx;
      return;
    }
    pos++;
    ch = comment_whitespace(true);
    if (ch == '\'') {
      string_literal(ch);
    }
    else if (ch == '"') {
      string_literal(ch);
    }
    else {
      pos = assert_idx;
      return;
    }
    pos++;
    ch = comment_whitespace(true);
    if (ch == ',') {
      pos++;
      ch = comment_whitespace(true);
      if (ch == '}')
        break;
      continue;
    }
    if (ch == '}')
      break;
    pos = assert_idx;
    return;
  } while (true);
  (imports_head - 1)->a = assert_start - source;
  (imports_head - 1)->se = pos + 1 - source;
}

char16_t comment_whitespace (bool br) {
  char16_t ch;
  do {
    ch = *pos;
    if (ch == '/') {
      char16_t next_ch = *(pos + 1);
      if (next_ch == '/')
        line_comment();
      else if (next_ch == '*')
        block_comment(br);
      else
        return ch;
    }
    else if (br ? !is_br_or_ws(ch) : !is_ws_not_br(ch)) {
      return ch;
    }
  } while (pos++ < end);
  return ch;
}

void template_string () {
  while (pos++ < end) {
    char16_t ch = *pos;
    if (ch == '$' && *(pos + 1) == '{') {
      pos++;
      open_token_stack[open_token_depth].token = TemplateBrace;
      open_token_stack[open_token_depth++].pos = pos;
      return;
    }
    if (ch == '`') {
      if (open_token_stack[--open_token_depth].token != Template)
        syntax_error();
      return;
    }
    if (ch == '\\')
      pos++;
  }
  syntax_error();
}

void block_comment (bool br) {
  pos++;
  while (pos++ < end) {
    char16_t ch = *pos;
    if (!br && is_br(ch))
      return;
    if (ch == '*' && *(pos + 1) == '/') {
      pos++;
      return;
    }
  }
}

void line_comment () {
  while (pos++ < end) {
    char16_t ch = *pos;
    if (ch == '\n' || ch == '\r')
      return;
  }
}

void string_literal (char16_t quote) {
  while (pos++ < end) {
    char16_t ch = *pos;
    if (ch == quote)
      return;
    if (ch == '\\') {
      ch = *++pos;
      if (ch == '\r' && *(pos + 1) == '\n')
        pos++;
    }
    else if (is_br(ch))
      break;
  }
  syntax_error();
}

static inline char16_t regexCharacterClass () {
  while (pos++ < end) {
    char16_t ch = *pos;
    if (ch == ']')
      return ch;
    if (ch == '\\')
      pos++;
    else if (ch == '\n' || ch == '\r')
      break;
  }
  syntax_error();
  return '\0';
}

void regular_expression () {
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
  syntax_error();
}

char16_t read_to_ws_or_punctuator (char16_t ch) {
  do {
    if (is_br_or_ws(ch) || is_punctuator(ch))
      return ch;
  } while (ch = *(++pos));
  return ch;
}

// Note: non-asii BR and whitespace checks omitted for perf / footprint
// if there is a significant user need this can be reconsidered
bool is_br (char16_t c) {
  return c == '\r' || c == '\n';
}

bool is_ws_not_br (char16_t c) {
  return c == 9 || c == 11 || c == 12 || c == 32 || c == 160;
}

bool is_br_or_ws (char16_t c) {
  return c > 8 && c < 14 || c == 32 || c == 160;
}

bool is_br_or_ws_or_punctuator_not_dot (char16_t c) {
  return c > 8 && c < 14 || c == 32 || c == 160 || is_punctuator(c) && c != '.';
}

bool is_quote (char16_t ch) {
  return ch == '\'' || ch == '"';
}

bool keyword_start (char16_t* pos) {
  return pos == source || is_br_or_ws_or_punctuator_not_dot(*(pos - 1));
}

bool read_preceding_keyword_1 (char16_t* pos, char16_t c1) {
  if (pos < source) return false;
  return *pos == c1 && (pos == source || is_br_or_ws_or_punctuator_not_dot(*(pos - 1)));
}

bool read_preceding_keyword_n (char16_t* pos, const char16_t* compare, size_t n) {
  if (pos - n + 1 < source) return false;
  return memcmp(pos - n + 1, compare, n * 2) == 0 && (pos - n + 1 == source || is_br_or_ws_or_punctuator_not_dot(*(pos - n)));
}

// Detects one of case, debugger, delete, do, else, in, instanceof, new,
//   return, throw, typeof, void, yield ,await
bool is_expression_keyword (char16_t* pos) {
  switch (*pos) {
    case 'd':
      switch (*(pos - 1)) {
        case 'i':
          // void
          return read_preceding_keyword_n(pos - 2, &VO[0], 2);
        case 'l':
          // yield
          return read_preceding_keyword_n(pos - 2, &YIE[0], 3);
        default:
          return false;
      }
    case 'e':
      switch (*(pos - 1)) {
        case 's':
          switch (*(pos - 2)) {
            case 'l':
              // else
              return read_preceding_keyword_1(pos - 3, 'e');
            case 'a':
              // case
              return read_preceding_keyword_1(pos - 3, 'c');
            default:
              return false;
          }
        case 't':
          // delete
          return read_preceding_keyword_n(pos - 2, &DELE[0], 4);
        case 'u':
          // continue
          return read_preceding_keyword_n(pos - 2, &CONTIN[0], 6);
        default:
          return false;
      }
    case 'f':
      if (*(pos - 1) != 'o' || *(pos - 2) != 'e')
        return false;
      switch (*(pos - 3)) {
        case 'c':
          // instanceof
          return read_preceding_keyword_n(pos - 4, &INSTAN[0], 6);
        case 'p':
          // typeof
          return read_preceding_keyword_n(pos - 4, &TY[0], 2);
        default:
          return false;
      }
    case 'k':
      // break
      return read_preceding_keyword_n(pos - 1, &BREA[0], 4);
    case 'n':
      // in, return
      return read_preceding_keyword_1(pos - 1, 'i') || read_preceding_keyword_n(pos - 1, &RETUR[0], 5);
    case 'o':
      // do
      return read_preceding_keyword_1(pos - 1, 'd');
    case 'r':
      // debugger
      return read_preceding_keyword_n(pos - 1, &DEBUGGE[0], 7);
    case 't':
      // await
      return read_preceding_keyword_n(pos - 1, &AWAI[0], 4);
    case 'w':
      switch (*(pos - 1)) {
        case 'e':
          // new
          return read_preceding_keyword_1(pos - 2, 'n');
        case 'o':
          // throw
          return read_preceding_keyword_n(pos - 2, &THR[0], 3);
        default:
          return false;
      }
  }
  return false;
}

bool is_paren_keyword (char16_t* cur_pos) {
  return read_preceding_keyword_n(cur_pos, &WHILE[0], 5) ||
      read_preceding_keyword_n(cur_pos, &FOR[0], 3) ||
      read_preceding_keyword_n(cur_pos, &IF[0], 2);
}

bool is_punctuator (char16_t ch) {
  // 23 possible punctuator endings: !%&()*+,-./:;<=>?[]^{}|~
  return ch == '!' || ch == '%' || ch == '&' ||
    ch > 39 && ch < 48 || ch > 57 && ch < 64 ||
    ch == '[' || ch == ']' || ch == '^' ||
    ch > 122 && ch < 127;
}

bool is_expression_punctuator (char16_t ch) {
  // 20 possible expression endings: !%&(*+,-.:;<=>?[^{|~
  return ch == '!' || ch == '%' || ch == '&' ||
    ch > 39 && ch < 47 && ch != 41 || ch > 57 && ch < 64 ||
    ch == '[' || ch == '^' || ch > 122 && ch < 127 && ch != '}';
}

bool is_break_or_continue (char16_t* cur_pos) {
  switch (*cur_pos) {
    case 'k':
      return read_preceding_keyword_n(cur_pos - 1, &BREA[0], 4);
    case 'e':
      if (*(cur_pos - 1) == 'u')
        return read_preceding_keyword_n(cur_pos - 2, &CONTIN[0], 6);
  }
  return false;
}

bool is_expression_terminator (char16_t* cur_pos) {
  // detects:
  // => ; ) finally catch else class X
  // as all of these followed by a { will indicate a statement brace
  switch (*cur_pos) {
    case '>':
      return *(cur_pos - 1) == '=';
    case ';':
    case ')':
      return true;
    case 'h':
      return read_preceding_keyword_n(cur_pos - 1, &CATC[0], 4);
    case 'y':
      return read_preceding_keyword_n(cur_pos - 1, &FINALL[0], 6);
    case 'e':
      return read_preceding_keyword_n(cur_pos - 1, &ELS[0], 3);
  }
  return false;
}
