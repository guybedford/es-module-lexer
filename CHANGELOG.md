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
