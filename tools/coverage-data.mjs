// Refreshes the data built into coverage.html, so the dashboard works offline and without a build step:
//  - missingList: a copy of embers/environment-needs-prompts.md,
//  - generatorIds: for each generator page, the ids in its GAME_IDS table and their fallback box (if any).
// (The offline targets.json copy is shared/targets-data.js, which npm run build writes.)
// Run it after changing a generator's GAME_IDS or the embers/ files:  npm run coverage-data
// tests/coverage.spec.js fails when coverage.html is out of date.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
// Order is the order the dashboard lists them in. `page` is the offline build, which opens with no internet.
export const GENERATORS = [
  ['vegetation', 'Vegetation', 'vegetation-generator.html', 'vegetation-generator-offline.html'],
  ['props', 'Props', 'props-generator.html', 'props-generator-offline.html'],
  ['structures', 'Structures', 'structures-generator.html', 'structures-generator-offline.html'],
  ['rocks', 'Rocks & cliffs', 'rocks-generator.html', 'rocks-generator-offline.html'],
  ['creatures', 'Creatures', 'creature-generator.html', 'creature-generator-offline.html'],
];

// The keys of `const GAME_IDS = { ... };` (one id per line), with a `box: { w, d, h }` on the same line if present.
export function gameIds(html, file) {
  const i = html.indexOf('const GAME_IDS = {');
  if (i < 0) throw new Error(`${file}: no "const GAME_IDS = {"`);
  const block = html.slice(i, html.indexOf('\n};', i)), ids = {};
  for (const m of block.matchAll(/^\s*'([a-z0-9.-]+)':(.*)$/gm)) { // ids may hold dots (prop.greyfen.ferry-punt)
    const b = m[2].match(/box:\s*\{\s*w:\s*([\d.]+),\s*d:\s*([\d.]+),\s*h:\s*([\d.]+)\s*\}/);
    ids[m[1]] = b ? { w: +b[1], d: +b[2], h: +b[3] } : null;
  }
  if (!Object.keys(ids).length) throw new Error(`${file}: GAME_IDS has no ids`);
  return ids;
}

export function coverageData() {
  const gens = {};
  for (const [key, title, src, page] of GENERATORS) {
    const f = path.join(root, src);
    if (!fs.existsSync(f)) { console.warn(`skipped ${src}: not in this checkout`); continue; }
    gens[key] = { title, page, ids: gameIds(fs.readFileSync(f, 'utf8'), src) };
  }
  return {
    list: fs.readFileSync(path.join(root, 'embers/environment-needs-prompts.md'), 'utf8').trim(),
    gens: JSON.stringify(gens, null, 1),
  };
}

// Replaces the contents of <script ... id="<id>"> ... </script>.
export function setBlock(html, id, text) {
  const re = new RegExp(`(<script[^>]*\\bid="${id}"[^>]*>)[\\s\\S]*?(</script>)`);
  if (!re.test(html)) throw new Error(`coverage.html has no <script id="${id}">`);
  if (/<\/script/i.test(text)) throw new Error(`${id} data contains "</script"`);
  return html.replace(re, (_, a, b) => `${a}\n${text}\n${b}`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const file = path.join(root, 'coverage.html'), d = coverageData();
  let html = fs.readFileSync(file, 'utf8');
  html = setBlock(html, 'missingList', d.list);
  html = setBlock(html, 'generatorIds', d.gens);
  fs.writeFileSync(file, html);
  const gens = JSON.parse(d.gens);
  console.log(`wrote coverage.html: ${Object.entries(gens).map(([k, g]) => `${k} ${Object.keys(g.ids).length}`).join(', ')}`);
}
