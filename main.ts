// DESERT THUNDER — Canyon Firefighting Airtanker (Node 22, standard library only).
// The hand-in program: it copies this repository's game/ and screenshots/ into the
// grader's output directory and writes dossier.json there with the vendored
// make.fun library, exactly as the competition requires. The program is pure
// copying plus one library call, so two runs always write the same bytes.
//
// Run it outside the grader with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'game'), join(outputDir, 'game'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
const shotDir = join(repoRoot, 'screenshots');
if (existsSync(shotDir)) cpSync(shotDir, join(outputDir, 'screenshots'), { recursive: true });

// Caps from the competition gate: the dossier text budget and the file limits the
// scorer enforces on game/ and screenshots/ (see RULES.txt, "The gate").
writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
