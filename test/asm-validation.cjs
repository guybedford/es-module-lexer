const assert = require('assert');
const { spawnSync } = require('child_process');
const { resolve } = require('path');
const { pathToFileURL } = require('url');

if (process.env.ASM) {
  const min = !!process.env.MINIMAL;

  suite('asm.js', () => {
    test('validates without falling back to JavaScript', () => {
      const bundle = pathToFileURL(resolve(
        __dirname,
        min ? '../dist/lexer.minimal.asm.js' : '../dist/lexer.asm.js'
      )).href;
      const env = { ...process.env };
      delete env.NODE_NO_WARNINGS;
      delete env.NODE_OPTIONS;

      // Invalid asm.js remains valid JavaScript, so V8 otherwise falls back
      // successfully and the normal parser assertions cannot detect it.
      const child = spawnSync(process.execPath, [
        '--validate-asm',
        '--no-suppress-asm-messages',
        '--input-type=module',
        '--eval',
        `const { parse } = await import(${JSON.stringify(bundle)}); parse('export {}')`
      ], { encoding: 'utf8', env });

      if (child.error) throw child.error;
      assert.strictEqual(child.status, 0, child.stderr || child.stdout);
      assert.strictEqual(/Invalid asm\.js|Linking failure in asm\.js/.test(child.stderr), false, child.stderr);
    });
  });
}
