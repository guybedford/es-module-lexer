// Runs test/legacy.html in a legacy headless Firefox over raw WebDriver HTTP,
// asserting the non-SIMD builds still parse there. FIREFOX_BIN and GECKODRIVER
// point at the binaries (see the CI workflow's legacy step).
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { spawn } from 'node:child_process';
import { extname } from 'node:path';

const MIME = { '.html': 'text/html', '.js': 'application/javascript', '.mjs': 'application/javascript' };
const server = createServer(async (req, res) => {
  try {
    const path = req.url.split('?')[0];
    const body = await readFile('.' + path);
    res.writeHead(200, { 'content-type': MIME[extname(path)] || 'application/octet-stream' });
    res.end(body);
  }
  catch {
    res.writeHead(404);
    res.end();
  }
});
await new Promise(resolve => server.listen(8123, resolve));

// A legacy Firefox content sandbox crashes on modern kernels; the smoke test
// needs no isolation, so run single-process with the sandbox off.
const driver = spawn(process.env.GECKODRIVER, ['--port', '4444'], {
  stdio: 'inherit',
  env: { ...process.env, MOZ_DISABLE_CONTENT_SANDBOX: '1', MOZ_FORCE_DISABLE_E10S: '1' }
});
await new Promise(resolve => setTimeout(resolve, 2000));

const drive = async (path, body) => {
  const res = await fetch('http://127.0.0.1:4444' + path, body === undefined
    ? undefined
    : { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
  const json = await res.json();
  if (!res.ok)
    throw new Error(`${path}: ${JSON.stringify(json).slice(0, 400)}`);
  return json.value;
};

let failure = null;
try {
  const session = await drive('/session', {
    capabilities: { alwaysMatch: { 'moz:firefoxOptions': { binary: process.env.FIREFOX_BIN, args: ['-headless'] } } }
  });
  await drive(`/session/${session.sessionId}/url`, { url: 'http://127.0.0.1:8123/test/legacy.html' });
  let title = 'RUNNING';
  for (let i = 0; i < 30 && title === 'RUNNING'; i++) {
    await new Promise(resolve => setTimeout(resolve, 500));
    title = await drive(`/session/${session.sessionId}/title`);
  }
  if (title !== 'PASS')
    failure = title === 'RUNNING' ? 'timed out' : title;
  await drive(`/session/${session.sessionId}`, undefined).catch(() => {});
}
catch (err) {
  failure = err.message;
}
driver.kill();
server.close();
if (failure) {
  console.error(`legacy browser test: ${failure}`);
  process.exit(1);
}
console.log('legacy browser test: PASS');
