// Asserts a wasm binary contains no SIMD instructions, so the minimal build
// (es-module-shims) keeps running in browsers without Wasm SIMD support.
import initWabt from 'wabt';
import { readFileSync } from 'node:fs';

const file = process.env.WASM;
const wabt = await initWabt();
try {
  wabt.readWasm(readFileSync(file), { simd: false });
}
catch {
  console.error(`${file}: contains SIMD instructions`);
  process.exit(1);
}
console.log(`${file}: no SIMD instructions`);
