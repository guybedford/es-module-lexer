const assert = require('assert');
const { spawnSync } = require('child_process');
const { resolve } = require('path');
const { pathToFileURL } = require('url');

if (process.env.ASM) {
  const min = !!process.env.MINIMAL;

  suite('asm.js', () => {
    test('validates without falling back to JavaScript', function () {
      const bundle = pathToFileURL(resolve(
        __dirname,
        min ? '../dist/lexer.minimal.asm.js' : process.env.BINDINGS ? '../dist/lexer.bindings.asm.js' : '../dist/lexer.asm.js'
      )).href;
      const env = { ...process.env };
      delete env.NODE_NO_WARNINGS;
      delete env.NODE_OPTIONS;

      const options = spawnSync(process.execPath, ['--v8-options'], { encoding: 'utf8', env });
      if (options.error) throw options.error;
      assert.strictEqual(options.status, 0, options.stderr || options.stdout);
      if (!options.stdout.includes('--validate-asm (') && !options.stdout.includes('--suppress-asm-messages (')) {
        this.skip();
      }

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
