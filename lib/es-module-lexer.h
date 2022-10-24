#ifndef __BINDINGS_ES_MODULE_LEXER_H
#define __BINDINGS_ES_MODULE_LEXER_H
#ifdef __cplusplus
extern "C" {
#endif

#include <stdint.h>
#include <stdbool.h>
#include <string.h>

typedef struct {
  char *ptr;
  size_t len;
} es_module_lexer_string_t;

typedef struct {
  bool is_some;
  es_module_lexer_string_t val;
} es_module_lexer_option_string_t;

typedef struct {
  es_module_lexer_option_string_t n;
  uint32_t s;
  uint32_t e;
  uint32_t ss;
  uint32_t se;
  uint32_t d;
  uint32_t a;
} es_module_lexer_import_specifier_t;

typedef struct {
  es_module_lexer_string_t n;
  es_module_lexer_option_string_t ln;
  uint32_t s;
  uint32_t e;
  uint32_t ls;
  uint32_t le;
} es_module_lexer_export_specifier_t;

typedef struct {
  es_module_lexer_import_specifier_t *ptr;
  size_t len;
} es_module_lexer_list_import_specifier_t;

typedef struct {
  es_module_lexer_export_specifier_t *ptr;
  size_t len;
} es_module_lexer_list_export_specifier_t;

typedef struct {
  es_module_lexer_list_import_specifier_t imports;
  es_module_lexer_list_export_specifier_t exports;
  bool facade;
} es_module_lexer_parse_result_t;

// Exported Functions

void es_module_lexer_parse(es_module_lexer_string_t *source, es_module_lexer_option_string_t *name, es_module_lexer_parse_result_t *ret);

#ifdef __cplusplus
}
#endif
#endif
