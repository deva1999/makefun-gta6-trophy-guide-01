// Leonida Platinum Fieldbook — entrypoint (Node 22, standard library only).
//
// The guide itself is the static app/ folder: index.html opens in desktop
// Chrome with the network off, and app/data/trophies.json holds the 55
// official trophies with a guide each. This program hands it in: it copies
// app/ and screenshots/ from beside this file to the output directory and
// writes /output/dossier.json with the vendored make.fun library, which must
// stay byte-identical to the kit's copy (vendor/makefun-frontend.ts).
//
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// V2 gate: refuse to hand in a bundle whose trophy file is short a
// trophy, a guide, or a citation. Every guide must name its source
// beside the text, so a trophy with no source is a broken entry.
function checkTrophies() {
  const doc = JSON.parse(readFileSync(join(here, 'app', 'data', 'trophies.json'), 'utf8'));
  const list = doc.trophies;
  if (!Array.isArray(list) || list.length !== 55) {
    throw new Error(`expected 55 trophies, found ${Array.isArray(list) ? list.length : 'none'}`);
  }
  const names = new Set();
  for (const t of list) {
    if (typeof t.name !== 'string' || !t.name.trim()) throw new Error('a trophy has no name');
    if (names.has(t.name)) throw new Error(`duplicate trophy name: ${t.name}`);
    names.add(t.name);
    if (typeof t.guide !== 'string' || !t.guide.trim()) throw new Error(`trophy ${t.name} has no guide`);
    if (!Array.isArray(t.sources) || t.sources.length === 0) throw new Error(`trophy ${t.name} cites no source`);
    if (!Array.isArray(t.steps) || t.steps.length === 0) throw new Error(`trophy ${t.name} has no steps`);
  }
  console.log(`trophies checked: 55, each with a guide, steps and at least one cited source`);
}
checkTrophies();

function countEntries(dir) {
  let total = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    total += 1;
    if (entry.isDirectory()) total += countEntries(join(dir, entry.name));
  }
  return total;
}

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) {
  cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });
}

// Refuse to hand in a bundle the scorer would refuse: more than 4
// screenshots or one over 256 KiB; app/ over the 993-entry / 48 MiB caps.
const shots = existsSync(join(here, 'screenshots'))
  ? readdirSync(join(here, 'screenshots')).filter((f) => /\.(png|jpe?g)$/i.test(f))
  : [];
if (shots.length < 3 || shots.length > 4) {
  throw new Error(`expected 3 or 4 screenshots, found ${shots.length}`);
}
for (const shot of shots) {
  const size = statSync(join(here, 'screenshots', shot)).size;
  if (size > 262144) throw new Error(`screenshot ${shot} is ${size} bytes, over the 256 KiB cap`);
}
if (countEntries(join(here, 'app')) > 993) {
  throw new Error('app/ holds more than 993 files and directories');
}

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes
// the bytes; the others refuse an entry the scorer would refuse.
const dossierPath = join(out, 'dossier.json');
writeFileSync(
  dossierPath,
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
  }),
);
const dossierSize = statSync(dossierPath).size;
if (dossierSize > 1572864) throw new Error(`dossier.json is ${dossierSize} bytes, over the 1.5 MiB cap`);
console.log(`handed in ${shots.length} screenshots, dossier written to ${dossierPath} (${dossierSize} bytes, app/ ${countEntries(join(here, 'app'))} entries)`);
