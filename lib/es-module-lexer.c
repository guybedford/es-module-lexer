#include <stdlib.h>
#include "es-module-lexer.h"

__attribute__((weak, export_name("cabi_realloc")))
void *cabi_realloc(void *ptr, size_t orig_size, size_t org_align, size_t new_size) {
  void *ret = realloc(ptr, new_size);
  if (!ret) abort();
  return ret;
}

__attribute__((weak, export_name("cabi_post_parse")))
void __wasm_export_es_module_lexer_parse_post_return(int32_t arg0) {
  int32_t ptr = *((int32_t*) (arg0 + 0));
  int32_t len = *((int32_t*) (arg0 + 4));
  for (int32_t i = 0; i < len; i++) {
    int32_t base = ptr + i * 36;
    (void) base;
    switch ((int32_t) (int32_t) (*((uint8_t*) (base + 0)))) {
      case 0: {
        break;
      }
      case 1: {
        if ((*((int32_t*) (base + 8))) > 0) {
          free((void*) (*((int32_t*) (base + 4))));
        }
        break;
      }
    }
  }
  if (len > 0) {
    free((void*) (ptr));
  }
  int32_t ptr0 = *((int32_t*) (arg0 + 8));
  int32_t len1 = *((int32_t*) (arg0 + 12));
  for (int32_t i2 = 0; i2 < len1; i2++) {
    int32_t base = ptr0 + i2 * 36;
    (void) base;
    if ((*((int32_t*) (base + 4))) > 0) {
      free((void*) (*((int32_t*) (base + 0))));
    }
    switch ((int32_t) (int32_t) (*((uint8_t*) (base + 8)))) {
      case 0: {
        break;
      }
      case 1: {
        if ((*((int32_t*) (base + 16))) > 0) {
          free((void*) (*((int32_t*) (base + 12))));
        }
        break;
      }
    }
  }
  if (len1 > 0) {
    free((void*) (ptr0));
  }
}

// Component Adapters

extern void __component_type_object_force_link_es_module_lexer_export(void);
void __component_type_object_force_link_es_module_lexer_export_public_use_in_this_compilation_unit(void) {
  __component_type_object_force_link_es_module_lexer_export();
}

__attribute__((aligned(4)))
static uint8_t RET_AREA[20];

__attribute__((export_name("parse")))
int32_t __wasm_export_es_module_lexer_parse(int32_t arg, int32_t arg0, int32_t arg1, int32_t arg2, int32_t arg3) {
  es_module_lexer_option_string_t option;
  switch (arg1) {
    case 0: {
      option.is_some = false;
      break;
    }
    case 1: {
      option.is_some = true;
      option.val = (es_module_lexer_string_t) { (char*)(arg2), (size_t)(arg3) };
      break;
    }
  }
  es_module_lexer_string_t arg4 = (es_module_lexer_string_t) { (char*)(arg), (size_t)(arg0) };
  es_module_lexer_option_string_t arg5 = option;
  es_module_lexer_parse_result_t ret;
  es_module_lexer_parse(&arg4, &arg5, &ret);
  int32_t ptr = (int32_t) &RET_AREA;
  *((int32_t*)(ptr + 4)) = (int32_t) ((ret).imports).len;
  *((int32_t*)(ptr + 0)) = (int32_t) ((ret).imports).ptr;
  *((int32_t*)(ptr + 12)) = (int32_t) ((ret).exports).len;
  *((int32_t*)(ptr + 8)) = (int32_t) ((ret).exports).ptr;
  *((int8_t*)(ptr + 16)) = (ret).facade;
  return ptr;
}
