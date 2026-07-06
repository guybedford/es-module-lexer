// Shared loader for the TypeScript suites. The full wasm (WASM=1) and asm.js
// (ASM=1) builds both lex TypeScript, so the suites run against whichever the
// job selects, mirroring the WASM/ASM switch of the legacy test/*.cjs suites.
let parse;

const init = (async () => {
  if (parse) return;
  if (process.env.ASM) {
    ({ parse } = await import('../../dist/lexer.asm.js'));
  } else {
    const m = await import('../../dist/lexer.js');
    await m.init;
    parse = m.parse;
  }
})();

module.exports = {
  init,
  parse: (...args) => parse(...args),
};
