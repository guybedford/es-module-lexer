// Shared loader for the TypeScript suites. They run against the full wasm build
// (test:ts:wasm, WASM=1), which lexes type-only syntax; the asm.js / CSP build
// is JavaScript-only and is not exercised here.
let parse;

const init = (async () => {
  if (parse) return;
  const m = await import('../../dist/lexer.js');
  await m.init;
  parse = m.parse;
})();

module.exports = {
  init,
  parse: (...args) => parse(...args),
};
