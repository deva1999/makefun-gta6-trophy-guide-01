// Takes the entry's 4 screenshots from its own running app (headless Chromium),
// one view each, then converts them to JPEG (quality 82) and checks the gate caps:
// each ≤256 KiB, long side ≤1280 px, short side ≥480 px.
// Run with the app served: node serve.ts (http://localhost:8080), then node shots.mjs
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repo = fileURLToPath(new URL('.', import.meta.url));
const shotsDir = join(repo, 'screenshots');
const tmpDir = join(repo, '.shots-tmp');
const chrome = process.env.CHROME_BIN ?? `${process.env.HOME}/.cache/ms-playwright/chromium-1255/chrome-linux64/chrome`;
const base = 'http://localhost:8080/';

const views = [
  { file: '1-cover.jpg', hash: '#demo=13&trophy=28', note: 'tracker, progress 13/55, Positive Mental Attitude guide open' },
  { file: '2-roadmap.jpg', hash: '#tab=roadmap&demo=13', note: '8-stage roadmap to platinum' },
  { file: '3-spoiler.jpg', hash: '#spoilers=on&grade=silver&demo=13', note: 'spoiler-safe on, silver filter' },
  { file: '4-sources.jpg', hash: '#tab=sources&demo=13', note: 'sources & method page' },
];

mkdirSync(tmpDir, { recursive: true });
for (const view of views) {
  const png = join(tmpDir, view.file.replace(/\.jpg$/, '.png'));
  console.log(`shot ${view.file}: ${view.note}`);
  execFileSync(chrome, [
    '--headless=new', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
    '--force-device-scale-factor=1', '--window-size=1280,800',
    '--virtual-time-budget=8000', `--screenshot=${png}`, base + view.hash,
  ], { stdio: 'inherit', timeout: 60000 });
}

// Convert to JPEG quality 82 and verify the gate caps with Pillow.
const convert = `
from PIL import Image
import os, sys
tmp, out = sys.argv[1], sys.argv[2]
for name in sorted(os.listdir(tmp)):
    if not name.endswith('.png'):
        continue
    src = os.path.join(tmp, name)
    dst = os.path.join(out, name[:-4] + '.jpg')
    im = Image.open(src).convert('RGB')
    im.save(dst, 'JPEG', quality=82)
    w, h = im.size
    size = os.path.getsize(dst)
    long_side, short_side = max(w, h), min(w, h)
    ok = size <= 262144 and long_side <= 1280 and short_side >= 480
    print(f"{os.path.basename(dst)}: {w}x{h} {size} bytes {'OK' if ok else 'FAIL'}")
    if not ok:
        sys.exit(1)
`;
mkdirSync(shotsDir, { recursive: true });
execFileSync('python3', ['-c', convert, tmpDir, shotsDir], { stdio: 'inherit' });

// Clean the temp PNGs so they never land in the repo.
for (const f of readdirSync(tmpDir)) unlinkSync(join(tmpDir, f));
console.log('screenshots done:', readdirSync(shotsDir).sort().join(', '));
