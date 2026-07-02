// Inlines the wasm binary as base64 into the reader source and minifies, to
// produce a single self-contained module (dist/lexer[.minimal].js).
//
// Shared by the full and minimal wasm builds; paths come from env: SRC, WASM,
// TARGET.
import { readFileSync, writeFileSync } from 'fs';
import { minify } from 'terser';

const wasmBuffer = readFileSync(process.env.WASM);
const jsSource = readFileSync(process.env.SRC, 'utf8');
const pjson = JSON.parse(readFileSync('package.json', 'utf8'));

const jsSourceProcessed = jsSource.replace('WASM_BINARY', wasmBuffer.toString('base64'));

const { code: minified } = await minify(jsSourceProcessed, {
  module: true,
  output: {
    preamble: `/* es-module-lexer ${pjson.version} */`
  }
});

writeFileSync(process.env.TARGET, minified ? minified : jsSourceProcessed);
