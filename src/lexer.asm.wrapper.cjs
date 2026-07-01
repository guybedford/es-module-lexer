// CJS wrapper for the CSP-safe asm.js build (`es-module-lexer/js`).
//
// The asm.js payload is loaded once as a side-effecting script that publishes
// its API on a shared realm-global (see src/lexer.asm.js). This wrapper simply
// re-exports it, so the ~22KB payload is not duplicated across the ESM and CJS
// entry points.
require('./lexer.asm.core.cjs');

module.exports = globalThis[Symbol.for('es-module-lexer/js')];
