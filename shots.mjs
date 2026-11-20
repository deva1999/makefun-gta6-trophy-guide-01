// Takes the screenshots listed in shots.json from the running app on
// localhost:8080, using the Playwright Chromium binary headlessly.
// Usage: node shots.mjs   (serve.ts must already be running on port 8080)
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const run = promisify(execFile);
const here = fileURLToPath(new URL('.', import.meta.url));
const chrome = `${process.env.HOME}/.cache/ms-playwright/chromium-1148/chrome-linux/chrome`;
const shots = JSON.parse(readFileSync(join(here, 'shots.json'), 'utf8'));

for (const shot of shots) {
  const url = `http://localhost:8080/${shot.query}`;
  const out = join(here, 'screenshots', shot.file);
  await run(chrome, [
    '--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars',
    `--window-size=${shot.viewport.width},${shot.viewport.height}`,
    '--virtual-time-budget=8000',
    `--screenshot=${out}`, url,
  ]);
  const size = statSync(out).size;
  console.log(`${shot.file}: ${size} bytes (${(size / 1024).toFixed(1)} KiB)`);
}
console.log('done');
