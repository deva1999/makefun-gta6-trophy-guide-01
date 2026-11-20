// Leonida Trophy Compass — a gta6-trophy-guide-01 entry (Node 22, stdlib only).
//
// The guide itself is app/: plain static files a browser opens at
// app/index.html (ES module, CSS, JSON data, no build step), working offline
// with zero network requests. This program hands it in: it copies app/ and
// screenshots/ from beside this file into /output and writes
// /output/dossier.json with the vendored make.fun library, exactly as the kit
// requires. vendor/makefun-frontend.ts is the kit's copy, unchanged — the
// scorer rebuilds the dossier from its own copy and compares byte for byte.
//
// Run it locally with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Serve the guide while building with `node serve.ts` (http://localhost:8080).

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'app'), join(outputDir, 'app'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

// The scorer's caps, as the kit's starter passes them: the dossier text is
// capped at 163,840 bytes; at most 4 screenshots of 262,144 bytes each; app/
// at most 993 files and directories and 48 MiB in all.
writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
  }),
);
