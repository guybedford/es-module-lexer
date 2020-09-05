#ifndef __CJS_MODULE_LEXER_H__
#define __CJS_MODULE_LEXER_H__

#ifdef __cplusplus
extern "C" {
#endif

#include <stdint.h>
#include <stdbool.h>
#include <stddef.h>
#include <stdio.h>

void bail (uint32_t err);

bool parseCJS (uint16_t* source, uint32_t sourceLen, void (*addExport)(const uint16_t*, const uint16_t*), void (*addReexport)(const uint16_t*, const uint16_t*));

void tryParseRequire (uint16_t ch);
void tryParseLiteralExports ();
void tryParseModuleExportsDotAssign ();
void tryParseExportsDotAssign (bool assign);
void tryParseObjectDefine ();
bool identifier (uint16_t ch);

void throwIfImportStatement ();
void throwIfExportStatement ();

void readImportString (const uint16_t* ss, uint16_t ch);
uint16_t readExportAs (uint16_t* startPos, uint16_t* endPos);

uint16_t commentWhitespace ();
void singleQuoteString ();
void doubleQuoteString ();
void regularExpression ();
void templateString ();
void blockComment ();
void lineComment ();

uint16_t readToWsOrPunctuator (uint16_t ch);

bool isBr (uint16_t c);
bool isBrOrWs (uint16_t c);
bool isBrOrWsOrPunctuator (uint16_t c);
bool isBrOrWsOrPunctuatorNotDot (uint16_t c);

bool str_eq2 (uint16_t* pos, uint16_t c1, uint16_t c2);
bool str_eq3 (uint16_t* pos, uint16_t c1, uint16_t c2, uint16_t c3);
bool str_eq4 (uint16_t* pos, uint16_t c1, uint16_t c2, uint16_t c3, uint16_t c4);
bool str_eq5 (uint16_t* pos, uint16_t c1, uint16_t c2, uint16_t c3, uint16_t c4, uint16_t c5);
bool str_eq6 (uint16_t* pos, uint16_t c1, uint16_t c2, uint16_t c3, uint16_t c4, uint16_t c5, uint16_t c6);
bool str_eq7 (uint16_t* pos, uint16_t c1, uint16_t c2, uint16_t c3, uint16_t c4, uint16_t c5, uint16_t c6, uint16_t c7);
bool str_eq13 (uint16_t* pos, uint16_t c1, uint16_t c2, uint16_t c3, uint16_t c4, uint16_t c5, uint16_t c6, uint16_t c7, uint16_t c8, uint16_t c9, uint16_t c10, uint16_t c11, uint16_t c12, uint16_t c13);
bool str_eq18 (uint16_t* pos, uint16_t c1, uint16_t c2, uint16_t c3, uint16_t c4, uint16_t c5, uint16_t c6, uint16_t c7, uint16_t c8, uint16_t c9, uint16_t c10, uint16_t c11, uint16_t c12, uint16_t c13, uint16_t c14, uint16_t c15, uint16_t c16, uint16_t c17, uint16_t c18);

bool readPrecedingKeyword2(uint16_t* pos, uint16_t c1, uint16_t c2);
bool readPrecedingKeyword3(uint16_t* pos, uint16_t c1, uint16_t c2, uint16_t c3);
bool readPrecedingKeyword4(uint16_t* pos, uint16_t c1, uint16_t c2, uint16_t c3, uint16_t c4);
bool readPrecedingKeyword5(uint16_t* pos, uint16_t c1, uint16_t c2, uint16_t c3, uint16_t c4, uint16_t c5);
bool readPrecedingKeyword6(uint16_t* pos, uint16_t c1, uint16_t c2, uint16_t c3, uint16_t c4, uint16_t c5, uint16_t c6);
bool readPrecedingKeyword7(uint16_t* pos, uint16_t c1, uint16_t c2, uint16_t c3, uint16_t c4, uint16_t c5, uint16_t c6, uint16_t c7);

bool keywordStart (uint16_t* pos);
bool isExpressionKeyword (uint16_t* pos);
bool isParenKeyword (uint16_t* pos);
bool isPunctuator (uint16_t charCode);
bool isExpressionPunctuator (uint16_t charCode);
bool isExpressionTerminator (uint16_t* pos);

void nextChar (uint16_t ch);
void nextCharSurrogate (uint16_t ch);
uint16_t readChar ();

void syntaxError ();

#ifdef __cplusplus
}
#endif

#endif /* __CJS_MODULE_LEXER_H__ */