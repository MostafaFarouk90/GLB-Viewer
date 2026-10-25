// Headless batch export: makes every game id of the generator pages from the command line, as the pages'
// Download button would save it, and writes a report.
//
// Usage (from anywhere, after "npm install"):
//   node tools/export-ids.mjs                         every generator page, every game id
//   node tools/export-ids.mjs props vegetation        only these pages (the name before -generator.html)
//   node tools/export-ids.mjs props --ids stump-a,cairn-a --seed v2 --out ~/embers-export
//   node tools/export-ids.mjs --list                  the pages and their game ids, nothing exported
//
// Options:
//   --ids a,b,c      only these ids (ids a page does not have are skipped)
//   --seed s         seed for every id (default: the id itself, so a run is repeatable)
//   --out dir        output folder (default: export/ in the repo); files go to <out>/<page>/<file>
//   --targets x      size table: "live" (default; the game repo, falling back to the built-in copy when offline),
//                    "builtin" (the copy in the page, made from embers/targets.json) or a path to a targets.json
//   --lods           also LOD 1 and LOD 2 (<id>.lod1.glb, <id>.lod2.glb) where the page makes them (vegetation)
//   --shipped how    ids the game already ships (its public/assets/env/manifest.json; most are Mostafa's own models):
//                    "skip" (default) exports nothing for them, "gen" saves them as <id>-gen.glb (as the pages'
//                    Download buttons do), "replace" saves them as <id>.glb, which replaces the game's model on ingest
//   --manifest x     the shipped list: "live" (default; the game repo, falling back to the built-in copy when offline),
//                    "builtin" (made from embers/manifest.json) or a path to a manifest.json
//   --report-check   also run the game's full check (tools/env-pass/check-glb.mjs in the game repo) on every file, plus
//                    the ingest's CAP rule, print its lines, write check.txt, and exit 1 when a file fails, as it does
//   --cdn            use the CDN pages (props-generator.html) instead of the offline builds; needs internet
//
// It opens the offline page (*-generator-offline.html) in headless Chromium, the browser Playwright installs with
// "npm install" (or PW_CHROMIUM_PATH), and calls the page's EmbersKit.generators entry (see shared/kit.js).
// report.json and report.txt list each file's triangles, size in metres, bytes and the target box, with warnings
// for what the game's check would flag (driver axis off its target, base not on y 0, triangles or bytes over the cap).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TARGETS_URL = 'https://raw.githubusercontent.com/MostafaFarouk90/OpenWorld/main/src/env/targets.json';
const MANIFEST_URL = 'https://raw.githubusercontent.com/MostafaFarouk90/OpenWorld/main/public/assets/env/manifest.json';

const args = process.argv.slice(2), opts = { pages: [], ids: null, seed: null, out: path.join(root, 'export'), targets: 'live', manifest: 'live', shipped: 'skip', check: false, cdn: false, lods: false, list: false };
for (let i = 0; i < args.length; i++) {
  const a = args[i], val = () => { if (i + 1 >= args.length) fail(`${a} needs a value`); return args[++i]; };
  if (a === '--ids') opts.ids = new Set(val().split(',').map((s) => s.trim()).filter(Boolean));
  else if (a === '--seed') opts.seed = val();
  else if (a === '--out') opts.out = path.resolve(val().replace(/^~(?=\/|$)/, process.env.HOME || '~'));
  else if (a === '--targets') opts.targets = val();
  else if (a === '--cdn') opts.cdn = true;
  else if (a === '--lods') opts.lods = true;
  else if (a === '--shipped') { opts.shipped = val(); if (!['skip', 'gen', 'replace'].includes(opts.shipped)) fail('--shipped is skip, gen or replace'); }
  else if (a === '--manifest') opts.manifest = val();
  else if (a === '--report-check') opts.check = true;
  else if (a === '--list') opts.list = true;
  else if (a === '-h' || a === '--help') { console.log(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\nimport ')[0].replace(/^\/\/ ?/gm, '')); process.exit(0); }
  else if (a.startsWith('-')) fail(`unknown option ${a} (see --help)`);
  else opts.pages.push(a.replace(/-generator(-offline)?\.html$/, ''));
}
function fail(msg) { console.error('export-ids: ' + msg); process.exit(1); }

const allPages = fs.readdirSync(root).map((f) => f.match(/^([a-z0-9-]+)-generator\.html$/)?.[1]).filter(Boolean).sort();
const pages = opts.pages.length ? opts.pages : allPages;
for (const p of pages) if (!allPages.includes(p)) fail(`no page ${p}-generator.html (pages: ${allPages.join(', ')})`);
const fileOpt = (name, v) => {
  if (['live', 'builtin'].includes(v)) return null;
  const f = path.resolve(v);
  if (!fs.existsSync(f)) fail(`--${name}: ${f} does not exist`);
  return f;
};
const targetsFile = fileOpt('targets', opts.targets), manifestFile = fileOpt('manifest', opts.manifest);

const browser = await chromium.launch({
  executablePath: process.env.PW_CHROMIUM_PATH || undefined,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'], // WebGL without a GPU
});
const report = { generatedAt: new Date().toISOString(), targets: opts.targets, manifest: opts.manifest, shipped: opts.shipped, seed: opts.seed || '(the id)', files: [] };
try {
  for (const name of pages) await runPage(name);
} finally { await browser.close(); }

if (!opts.list) {
  fs.mkdirSync(opts.out, { recursive: true });
  fs.writeFileSync(path.join(opts.out, 'report.json'), JSON.stringify(report, null, 1) + '\n');
  fs.writeFileSync(path.join(opts.out, 'report.txt'), reportText(report));
  const made = report.files.filter((f) => f.file), warned = made.filter((f) => f.warnings.length).length;
  const skipped = report.files.filter((f) => f.skipped).length;
  console.log(`\n${made.length} files in ${opts.out}${warned ? `, ${warned} with warnings (see report.txt)` : ''}`
    + (skipped ? `; ${skipped} shipped id${skipped > 1 ? 's' : ''} skipped (--shipped gen saves them as <id>-gen.glb)` : ''));
  if (opts.check) {
    const lines = made.map((f) => f.check.line), bad = made.filter((f) => !f.check.ok).length;
    fs.writeFileSync(path.join(opts.out, 'check.txt'), lines.join('\n') + '\n');
    console.log(`\ncheck-glb (${opts.targets} targets):\n${lines.join('\n')}\n${bad ? `${bad} of ${made.length} fail` : `all ${made.length} ok`} (check.txt)`);
    if (bad) process.exitCode = 1;
  }
}

async function runPage(name) {
  const file = `${name}-generator${opts.cdn ? '' : '-offline'}.html`;
  if (!fs.existsSync(path.join(root, file))) fail(`${file} is missing; run "npm run build"`);
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  for (const [url, file, how] of [[TARGETS_URL, targetsFile, opts.targets], [MANIFEST_URL, manifestFile, opts.manifest]]) {
    if (file) await page.route(url, (r) => r.fulfill({ status: 200, body: fs.readFileSync(file), headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' } }));
    else if (how === 'builtin') await page.route(url, (r) => r.abort());
  }
  // a page's own downloads (none are expected) would otherwise wait for a dialog
  page.on('download', (d) => d.cancel());

  await page.goto(pathToFileURL(path.join(root, file)).href);
  try {
    await page.waitForFunction(() => document.getElementById('log')?.textContent.includes('Ready'), null, { timeout: 60_000 });
  } catch { fail(`${file} did not start${errors.length ? ': ' + errors[0] : ''}`); }
  if (!await page.evaluate((n) => !!window.EmbersKit?.generators?.[n], name)) {
    await page.close();
    if (opts.pages.length) fail(`${file} has no game ids to export`);
    return; // a page without game ids (the character generator)
  }
  // let the live size table and shipped list arrive (or fail) first, so every id uses the same ones
  await page.evaluate(async () => {
    for (const p of [window.EmbersKit.liveTargets, window.EmbersKit.liveShipped]) try { await p; } catch {}
    await new Promise((r) => setTimeout(r, 0));
  });
  const shipped = new Set(await page.evaluate(() => [...(window.EmbersKit.shipped || [])]));

  const ids = await page.evaluate((n) => window.EmbersKit.generators[n].ids(), name);
  const todo = opts.ids ? ids.filter((id) => opts.ids.has(id)) : ids;
  if (opts.list) {
    console.log(`${name} (${ids.length}): ${ids.map((id) => shipped.has(id) ? id + ' (shipped)' : id).join(' ')}`);
    await page.close(); return;
  }
  if (!todo.length) { await page.close(); return; }
  const targets = await page.evaluate((n) => window.EmbersKit.generators[n].targets?.() || null, name);
  const dir = path.join(opts.out, name);
  fs.mkdirSync(dir, { recursive: true });
  console.log(`${name}: ${todo.length} id${todo.length > 1 ? 's' : ''}`);

  for (const id of todo) {
    const seed = opts.seed || id;
    if (shipped.has(id) && opts.shipped === 'skip') {
      console.log(`  ${id}: skipped, the game ships it`);
      report.files.push({ page: name, id, seed, file: null, skipped: 'shipped', warnings: [] });
      continue;
    }
    // <id>-gen.glb, <id>-gen.lod1.glb…, so the file never replaces the game's own model
    const rename = (f) => shipped.has(id) && opts.shipped === 'gen' ? f.replace(id, id + '-gen') : f;
    const before = errors.length;
    let files;
    try {
      files = await page.evaluate(async ([n, id, seed, lods]) => {
        const out = await window.EmbersKit.generators[n].files(id, seed, { lods });
        const b64 = (buf) => { const u = new Uint8Array(buf); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s); };
        return out.map((f) => ({ name: f.name, data: b64(f.data), pivot: f.pivot }));
      }, [name, id, seed, opts.lods]);
    } catch (e) {
      console.log(`  ${id}: FAILED ${e.message.split('\n')[0]}`);
      report.files.push({ page: name, id, seed, file: null, warnings: ['export failed: ' + e.message.split('\n')[0]] });
      continue;
    }
    for (const f of files) {
      const data = Buffer.from(f.data, 'base64'), file = rename(f.name);
      fs.writeFileSync(path.join(dir, file), data);
      const entry = { page: name, id, seed, file: `${name}/${file}`, bytes: data.length, ...inspectGLB(data), target: targets?.objects?.[id] || null };
      if (f.pivot) entry.pivot = f.pivot; // 'grip': a hand-held prop with its origin at the hand (section H of the list)
      if (shipped.has(id)) entry.shipped = true;
      entry.warnings = [...checks(entry, targets), ...errors.slice(before).map((e) => 'page error: ' + e)];
      if (opts.check) entry.check = checkGlb(file.replace(/\.glb$/, '').replace(/\.lod\d+$/, ''), id, entry, targets); // a LOD is checked as its id
      report.files.push(entry);
      console.log(`  ${file}: ${entry.triangles.toLocaleString()} tris, ${fmtSize(entry.size)}, ${(data.length / 1024).toFixed(0)} KB${entry.warnings.length ? '  ! ' + entry.warnings.join('; ') : ''}`);
    }
  }
  await page.close();
}

// Triangles, meshes, materials, animations and the bounding box (in metres, after node transforms) of a GLB.
function inspectGLB(buf) {
  if (buf.readUInt32LE(0) !== 0x46546c67) throw new Error('not a GLB');
  const json = JSON.parse(buf.subarray(20, 20 + buf.readUInt32LE(12)).toString('utf8'));
  let triangles = 0, indexedTriangles = 0;
  for (const m of json.meshes || []) for (const p of m.primitives) if (p.indices !== undefined) indexedTriangles += json.accessors[p.indices].count / 3;
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  const visit = (ni, parent) => {
    const n = json.nodes[ni], m = mul(parent, local(n));
    if (n.mesh !== undefined) for (const p of json.meshes[n.mesh].primitives) {
      if ((p.mode ?? 4) === 4) triangles += (p.indices !== undefined ? json.accessors[p.indices].count : json.accessors[p.attributes.POSITION].count) / 3;
      const a = json.accessors[p.attributes.POSITION];
      if (!a.min || !a.max) continue;
      for (let c = 0; c < 8; c++) {
        const v = [0, 1, 2].map((k) => (c >> k) & 1 ? a.max[k] : a.min[k]);
        for (let k = 0; k < 3; k++) {
          const w = m[k] * v[0] + m[4 + k] * v[1] + m[8 + k] * v[2] + m[12 + k];
          min[k] = Math.min(min[k], w); max[k] = Math.max(max[k], w);
        }
      }
    }
    for (const c of n.children || []) visit(c, m);
  };
  for (const ni of json.scenes[json.scene ?? 0].nodes) visit(ni, [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  const ok = isFinite(min[0]), r = (x) => +x.toFixed(3);
  return {
    triangles: Math.round(triangles), indexedTriangles, meshes: json.meshes?.length || 0, materials: json.materials?.length || 0,
    textures: json.images?.length || 0, animations: (json.animations || []).map((a) => a.name),
    size: ok ? { w: r(max[0] - min[0]), h: r(max[1] - min[1]), d: r(max[2] - min[2]) } : null,
    base: ok ? r(min[1]) : null, center: ok ? { x: r((min[0] + max[0]) / 2), z: r((min[2] + max[2]) / 2) } : null,
  };
}
// Column-major 4x4 matrices, as glTF stores them.
function local(n) {
  if (n.matrix) return n.matrix;
  const [x, y, z, w] = n.rotation || [0, 0, 0, 1], [sx, sy, sz] = n.scale || [1, 1, 1], [tx, ty, tz] = n.translation || [0, 0, 0];
  return [
    (1 - 2 * (y * y + z * z)) * sx, 2 * (x * y + z * w) * sx, 2 * (x * z - y * w) * sx, 0,
    2 * (x * y - z * w) * sy, (1 - 2 * (x * x + z * z)) * sy, 2 * (y * z + x * w) * sy, 0,
    2 * (x * z + y * w) * sz, 2 * (y * z - x * w) * sz, (1 - 2 * (x * x + y * y)) * sz, 0,
    tx, ty, tz, 1,
  ];
}
function mul(a, b) {
  const o = new Array(16);
  for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) o[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
  return o;
}

// The game's main rules (tools/env-pass/check-glb.mjs in the game repo; the viewer's game mode has all of them).
function checks(e, targets) {
  const w = [], t = e.target, tol = targets?.tolerance ?? 0.15;
  if (e.triangles > (targets?.maxTriangles || 10000)) w.push(`${e.triangles} triangles is over the ${targets?.maxTriangles || 10000} cap`);
  if (e.bytes > (targets?.maxFileMB || 1.5) * 1048576) w.push(`${(e.bytes / 1048576).toFixed(2)} MB is over ${targets?.maxFileMB || 1.5} MB`);
  if (e.base !== null && Math.abs(e.base) > 0.02 && e.pivot !== 'grip') w.push(`base at y ${e.base}, not 0`);
  if (t && e.size && t.h > 0) {
    const drv = Math.max(t.w, t.d) > 1.8 * t.h ? (t.w >= t.d ? 'w' : 'd') : 'h';
    const off = e.size[drv] / t[drv] - 1;
    if (Math.abs(off) > tol) w.push(`${drv === 'h' ? 'height' : drv === 'w' ? 'width' : 'depth'} ${e.size[drv]} m is ${(off * 100).toFixed(0)}% off the target ${t[drv]} m`);
  }
  return w;
}

// The game's full check, as tools/env-pass/check-glb.mjs in the game repo prints it ("ok  <name>  w x d x h m" or
// "FAIL <name>  <problems>"; the name is the file name, which is the id the game reads), plus the ingest's CAP rule
// (tools/env-pass/ingest.mjs): scaled uniformly to the target height, width and depth may need at most 15% stretch
// (proportion ids are fitted exactly, so they get no CAP line). A CAP is a warning in the game, not a FAIL.
function checkGlb(fileId, id, e, cfg0) {
  const cfg = { tolerance: 0.15, proportionTolerance: 1.1, maxTriangles: 10000, maxFileMB: 1.5, proportion: {}, ...cfg0 };
  const want = cfg.objects?.[fileId], size = e.size || { w: 0, d: 0, h: 0 }, problems = [], caps = [];
  if (e.indexedTriangles > cfg.maxTriangles) problems.push(`${Math.round(e.indexedTriangles)} triangles, budget ${cfg.maxTriangles}`);
  if (e.bytes / 1e6 > cfg.maxFileMB) problems.push(`file ${(e.bytes / 1e6).toFixed(1)} MB, budget ${cfg.maxFileMB} MB`);
  if (!want) problems.push('no target in src/env/targets.json' + (fileId !== id ? ` (${fileId}: the game ships ${id})` : ''));
  else {
    const wide = Math.max(want.w, want.d) > 1.8 * want.h;
    if (wide) {
      const got = Math.max(size.w, size.d), tgt = Math.max(want.w, want.d), dev = (got - tgt) / tgt;
      if (Math.abs(dev) > cfg.tolerance) problems.push(`longest side ${got.toFixed(2)} m, want ${tgt} m (${Math.round(dev * 100)}%)`);
    }
    for (const [k, name] of [['w', 'width'], ['d', 'depth'], ['h', 'height']]) {
      const dev = (size[k] - want[k]) / want[k], driver = !wide && k === 'h';
      if (Math.abs(dev) > (driver ? cfg.tolerance : cfg.proportionTolerance)) problems.push(`${name} ${size[k].toFixed(2)} m, want ${want[k]} m (${Math.round(dev * 100)}%)`);
    }
    if (!Object.hasOwn(cfg.proportion || {}, fileId) && size.h > 0) for (const [k, name] of [['w', 'width'], ['d', 'depth']]) {
      const f = want[k] / (size[k] * (want.h / size.h)); // stretch still needed after the uniform scale to the height
      if (f > 1.15 || f < 1 / 1.15) caps.push(`CAP ${name} ${(size[k] * want.h / size.h).toFixed(2)} m at the target height, want ${want[k]} m (needs ×${f.toFixed(2)}, ingest stretches ×1.15 at most)`);
    }
  }
  // a hand-held prop has its origin at the grip, as section H of the list asks, so the base-centre rules do not apply
  if (e.pivot === 'grip') caps.push('pivot at the grip (hand-held, section H): base and footprint-centre rules skipped');
  else {
    if (Math.abs(e.base ?? 0) > 0.05) problems.push(`pivot: base at y ${e.base.toFixed(2)}, want 0`);
    if (e.center && Math.hypot(e.center.x, e.center.z) > 0.1 * Math.max(size.w, size.d)) problems.push(`pivot: footprint centre at (${e.center.x.toFixed(2)}, ${e.center.z.toFixed(2)}), want about 0, 0`);
  }
  const line = `${problems.length ? 'FAIL' : 'ok  '} ${fileId}  ${size.w.toFixed(2)} x ${size.d.toFixed(2)} x ${size.h.toFixed(2)} m${problems.length ? '  ' + problems.join('; ') : ''}`
    + caps.map((c) => '\n     ' + c).join('');
  return { ok: !problems.length, problems, caps, line };
}

function fmtSize(s) { return s ? `${s.w} × ${s.h} × ${s.d} m` : 'empty'; }
function reportText(r) {
  const lines = [`Embers game id export, ${r.generatedAt}`, `targets: ${r.targets}, seed: ${r.seed}`, ''];
  for (const f of r.files) {
    lines.push(f.file ? `${f.file}  ${f.triangles} tris  ${fmtSize(f.size)} (w × h × d)  ${(f.bytes / 1024).toFixed(0)} KB`
      + (f.target ? `  target ${f.target.w} × ${f.target.h} × ${f.target.d} m` : '') + (f.shipped ? '  (the game ships this id)' : '')
      : `${f.page}/${f.id}  ${f.skipped ? 'skipped: the game ships it' : 'not exported'}`);
    if (f.check) for (const l of f.check.line.split('\n')) lines.push('    check: ' + l.trim());
    for (const w of f.warnings) lines.push(`    ! ${w}`);
  }
  return lines.join('\n') + '\n';
}
