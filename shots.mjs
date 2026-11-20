// Take the entry's screenshots in headless Chromium over the DevTools
// protocol (Node 22+, standard library only: global WebSocket + fetch).
// Reads shots.json, serves app/ on :8080 first (node serve.ts), then:
//   node shots.mjs
// Each shot navigates to its URL at 1280x800 and saves a JPEG next to
// the repo's screenshots/ folder. Exits non-zero if any shot is missing
// or over the 256 KiB cap.

import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const shots = JSON.parse(readFileSync(join(here, 'shots.json'), 'utf8'));
const outDir = join(here, 'screenshots');
mkdirSync(outDir, { recursive: true });

const CHROME = process.env.CHROME
  ?? `${process.env.HOME}/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome`;
const DEBUG_PORT = 9222;

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForHttp(url, tries = 30) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch { /* not up yet */ }
    await sleep(500);
  }
  throw new Error(`DevTools endpoint never came up: ${url}`);
}

const chrome = spawn(CHROME, [
  '--headless=new',
  '--no-sandbox',
  '--disable-gpu',
  '--hide-scrollbars',
  '--window-size=1280,800',
  `--remote-debugging-port=${DEBUG_PORT}`,
  '--user-data-dir=/tmp/chrome-shots-profile',
  'about:blank',
], { stdio: 'ignore' });

try {
  await waitForHttp(`http://127.0.0.1:${DEBUG_PORT}/json/version`);
  const targets = await (await fetch(`http://127.0.0.1:${DEBUG_PORT}/json/list`)).json();
  const page = targets.find((t) => t.type === 'page');
  if (!page) throw new Error('no page target in Chromium');

  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    ws.onopen = resolve;
    ws.onerror = (e) => reject(new Error(`WebSocket failed: ${e.message ?? 'unknown'}`));
  });

  let nextId = 1;
  const pending = new Map();
  let loadResolve = null;
  ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(msg.error.message));
      else resolve(msg.result);
    }
    if (msg.method === 'Page.loadEventFired' && loadResolve) {
      const r = loadResolve;
      loadResolve = null;
      r();
    }
  };
  function send(method, params = {}) {
    const id = nextId++;
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }
  async function navigate(url) {
    const loaded = new Promise((r) => { loadResolve = r; });
    await send('Page.navigate', { url });
    await Promise.race([loaded, sleep(8000)]);
    await sleep(1200); // let the app fetch its data and render
  }

  await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });

  for (const shot of shots) {
    const url = `http://localhost:8080${shot.url}`;
    await navigate(url);
    const { data } = await send('Page.captureScreenshot', { format: 'jpeg', quality: 80 });
    const file = join(outDir, shot.file);
    writeFileSync(file, Buffer.from(data, 'base64'));
    const size = statSync(file).size;
    console.log(`${shot.file}: ${size} bytes (${url})`);
    if (size > 262144) throw new Error(`${shot.file} is ${size} bytes, over the 256 KiB cap`);
  }
  console.log(`took ${shots.length} screenshots`);
} finally {
  chrome.kill('SIGTERM');
}
