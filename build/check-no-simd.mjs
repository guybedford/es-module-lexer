// Asserts a wasm binary contains no SIMD instructions, so the minimal build
// (es-module-shims) keeps running in browsers without Wasm SIMD support.
import initWabt from 'wabt';
import { readFileSync } from 'node:fs';

const file = process.env.WASM;
// Plain copy: wabt mishandles Node's pooled Buffer views (a nonzero offset
// into a shared ArrayBuffer), reading past the slice on newer Node versions.
const bytes = new Uint8Array(readFileSync(file));
const wabt = await initWabt();
try {
  wabt.readWasm(bytes, { simd: false });
}
catch {
  // Only a clean parse with SIMD enabled proves the failure above meant SIMD
  // instructions; a binary wabt cannot read at all throws through as-is.
  wabt.readWasm(bytes, { simd: true });
  console.error(`${file}: contains SIMD instructions`);
  process.exit(1);
}
console.log(`${file}: no SIMD instructions`);
