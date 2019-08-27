0.3.8
* Fix template parsing bug (https://github.com/guybedford/es-module-lexer/pull/22)

0.3.7
* Refactoring (https://github.com/guybedford/es-module-lexer/pull/20, https://github.com/guybedford/es-module-lexer/pull/21)

0.3.6
* Fix case where methods named import would be incorrectly reported as dynamic imports (https://github.com/guybedford/es-module-lexer/pull/19)

0.3.5
* Fix Node.js 10 memory grow support for globals without a value getter (https://github.com/guybedford/es-module-lexer/issues/14)

0.3.4
* Use UTF16 encoding for better performance, and removing reliance on TextEncoder (https://github.com/guybedford/es-module-lexer/pull/15)

0.3.3
* Minification improvements
* Fix for TextEncoder global being missing in Node.js 10
* Fix CJS build to end in .cjs extension for modules compatibility

0.3.2
* Fix export declaration parse bugs (https://github.com/guybedford/es-module-lexer/pull/11)

0.3.1
* Fix up the ESM and CJS interfaces to use named exports

0.3.0
* Web Assembly conversion for performance (https://github.com/guybedford/es-module-lexer/pull/7)
* Fix $ characters in templates (https://github.com/guybedford/es-module-lexer/pull/6, @LarsDenBakker)
* Fix comment handling in imports (https://github.com/guybedford/es-module-lexer/issues/8)

0.2.0
* Include CJS build (https://github.com/guybedford/es-module-lexer/pull/1, @LarsDenBakker)
