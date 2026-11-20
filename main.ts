// Leonida Platinum Atlas — a GTA 6 trophy guide and offline tracker (Node 22, stdlib only).
// This program hands the guide in: it copies app/ and screenshots/ from beside this
// file to /output and writes /output/dossier.json with the vendored make.fun library.
// vendor/makefun-frontend.ts is the kit's copy, byte for byte — leave it alone.
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

// The guide is only worth handing in with all 55 trophies present and guided,
// so refuse to build a dossier from a trophy file that lost one.
const trophyFile = JSON.parse(readFileSync(join(repoRoot, 'app', 'data', 'trophies.json'), 'utf8'));
const guided = trophyFile.trophies.filter((t) => typeof t.guide === 'string' && t.guide.trim().length > 0);
if (trophyFile.trophies.length !== 55 || guided.length !== 55) {
  throw new Error(`trophies.json must hold 55 guided trophies, found ${trophyFile.trophies.length} trophies and ${guided.length} guides`);
}

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'app'), join(outputDir, 'app'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes;
// the others refuse an entry the scorer would refuse (more than 4 screenshots or one
// over 256 KiB; more than 993 files and directories in app/ or 48 MiB of app files).
writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, { text_max_bytes: 163840, screenshots: { max: 4, max_bytes: 262144 }, app_max_files: 993, app_max_bytes: 50331648 }),
);

console.log(`Leonida Platinum Atlas: handed in ${guided.length} guided trophies.`);

// Say how big the hand-in is, so a bad run is obvious before anyone submits it.
const dossierBytes = readFileSync(join(outputDir, 'dossier.json')).length;
console.log(`dossier.json: ${dossierBytes} bytes (cap 1.5 MiB).`);
