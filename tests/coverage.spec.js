import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { test, expect } from '@playwright/test';
import { ROOT, TARGETS_URL, parseGLB } from './helpers.js';
import { coverageData } from '../tools/coverage-data.mjs';

const MANIFEST_URL = 'https://raw.githubusercontent.com/MostafaFarouk90/OpenWorld/main/public/assets/env/manifest.json';
const TARGETS = JSON.parse(fs.readFileSync(path.join(ROOT, 'embers/targets.json'), 'utf8'));
const MANIFEST = { objects: {
  'oak-a': { id: 'oak-a', scale: 9.1, trisBefore: 50000, trisAfter: 4500, mb: 0.25 },
  'barn-a': { id: 'barn-a', scale: 1, trisBefore: 5000, trisAfter: 4500, mb: 0.3 },
} };

// A GLB holding one box mesh of w x d x h metres (base at y0, footprint centred on cx), optionally authored Z-up with a
// node rotation that stands it upright, and with `tris` triangles (the box repeated).
function boxGlb(w, d, h, { y0 = 0, cx = 0, zUp = false, tris = 12 } = {}) {
  const [x0, x1] = [cx - w / 2, cx + w / 2];
  const ext = zUp ? [[x0, -d / 2, y0], [x1, d / 2, y0 + h]] : [[x0, y0, -d / 2], [x1, y0 + h, d / 2]];
  const pos = [];
  for (let k = 0; k < 8; k++) pos.push(ext[k & 1][0], ext[k & 2 ? 1 : 0][1], ext[k & 4 ? 1 : 0][2]);
  const quad = [0, 1, 3, 0, 3, 2], faces = [];
  for (let i = 0; i < 6; i++) faces.push(...quad);
  const idx = Array.from({ length: tris * 3 }, (_, i) => faces[i % 36]);
  const pb = Buffer.from(new Float32Array(pos).buffer), ib = Buffer.from(new Uint16Array(idx).buffer);
  const ibPad = Buffer.concat([ib, Buffer.alloc((4 - ib.length % 4) % 4)]), bin = Buffer.concat([pb, ibPad]);
  const min = [0, 1, 2].map((a) => Math.min(...pos.filter((_, i) => i % 3 === a)));
  const max = [0, 1, 2].map((a) => Math.max(...pos.filter((_, i) => i % 3 === a)));
  const json = {
    asset: { version: '2.0' }, scene: 0, scenes: [{ nodes: [0] }],
    nodes: [zUp ? { mesh: 0, rotation: [-Math.SQRT1_2, 0, 0, Math.SQRT1_2] } : { mesh: 0 }],
    meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1 }] }],
    buffers: [{ byteLength: bin.length }],
    bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: pb.length }, { buffer: 0, byteOffset: pb.length, byteLength: ib.length }],
    accessors: [{ bufferView: 0, componentType: 5126, count: 8, type: 'VEC3', min, max },
      { bufferView: 1, componentType: 5123, count: idx.length, type: 'SCALAR' }],
  };
  let js = Buffer.from(JSON.stringify(json));
  js = Buffer.concat([js, Buffer.alloc((4 - js.length % 4) % 4, 0x20)]);
  const head = Buffer.alloc(12);
  head.write('glTF', 0, 'latin1'); head.writeUInt32LE(2, 4); head.writeUInt32LE(12 + 8 + js.length + 8 + bin.length, 8);
  const ch = (len, type) => { const b = Buffer.alloc(8); b.writeUInt32LE(len, 0); b.writeUInt32LE(type, 4); return b; };
  return Buffer.concat([head, ch(js.length, 0x4e4f534a), js, ch(bin.length, 0x004e4942), bin]);
}
const file = (name, buffer) => ({ name, mimeType: 'model/gltf-binary', buffer });

async function open(page, { manifest = true } = {}) {
  const errors = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  await page.route(TARGETS_URL, (r) => r.fulfill({ status: 200, body: JSON.stringify(TARGETS), headers: { 'access-control-allow-origin': '*' } }));
  await page.route(MANIFEST_URL, (r) => manifest
    ? r.fulfill({ status: 200, body: JSON.stringify(MANIFEST), headers: { 'access-control-allow-origin': '*' } })
    : r.abort());
  await page.goto(pathToFileURL(path.join(ROOT, 'coverage.html')).href);
  await expect(page.locator('#log')).toContainText('Ready');
  if (manifest) await expect(page.locator('#log')).toContainText('Live game manifest');
  return errors;
}
const row = (page, id) => page.locator(`tr.row[data-id="${id}"]`);
const tile = (page, k) => page.locator(`.tile[data-tile="${k}"] .n`);

test.describe('coverage dashboard', () => {
  test('built-in data matches embers/ and the generator pages', async () => {
    const html = fs.readFileSync(path.join(ROOT, 'coverage.html'), 'utf8'), d = coverageData();
    const block = (id) => html.match(new RegExp(`<script[^>]*id="${id}"[^>]*>\\n([\\s\\S]*?)\\n</script>`))[1];
    expect(block('embersTargets'), 'run npm run coverage-data').toBe(d.targets);
    expect(block('missingList'), 'run npm run coverage-data').toBe(d.list);
    expect(block('generatorIds'), 'run npm run coverage-data').toBe(d.gens);
  });

  test('lists every game id with its section and generators', async ({ page }) => {
    const errors = await open(page);
    const ids = await page.evaluate(() => window.__coverage.rows().map((r) => r.id));
    for (const id of Object.keys(TARGETS.objects)) expect(ids).toContain(id);
    // list ids that are not in targets.json, "-b" shorthand, section E animals, section G rows and set members
    for (const id of ['willow-a', 'bush-holly-a', 'field-gate-a', 'bush-flowering-b', 'flower-patch-red', 'hen-a', 'lift-cage', 'headframe', 'golem-rock-chunks', 'poi-bones', 'shrine-forge', 'cinder-cage']) expect(ids).toContain(id);
    const info = await page.evaluate(() => Object.fromEntries(window.__coverage.rows().map((r) => [r.id, { s: r.section, g: r.gens }])));
    expect(info['oak-a']).toEqual({ s: 'A', g: ['vegetation'] });
    expect(info['bush-flowering-b'].s).toBe('A');
    expect(info['mine-cart']).toEqual({ s: 'D', g: ['structures'] });
    expect(info['hen-a']).toEqual({ s: 'E', g: ['creatures'] });
    expect(info['headframe'].s).toBe('G');
    expect(info['poi-bones'].s).toBe('G');
    expect(info['ash-patch-decal'].g).toEqual(['props', 'textures']);
    expect(info['haystack-round'].g).toEqual([]);
    expect(info['wolf-a'].s).toBe('P');
    // shipped ids from the game manifest
    await expect(row(page, 'oak-a')).toContainText('shipped');
    await expect(row(page, 'oak-b')).not.toContainText('shipped');
    await expect(tile(page, 'game')).toHaveText('2');
    // generator links point at the offline pages, which exist
    for (const href of await page.locator('td.gens a').evaluateAll((as) => [...new Set(as.map((a) => a.getAttribute('href')))])) {
      expect(fs.existsSync(path.join(ROOT, href)), href).toBe(true);
    }
    // filters
    await page.selectOption('#gen', '-');
    await expect(row(page, 'haystack-round')).toBeVisible();
    await expect(row(page, 'oak-a')).toHaveCount(0);
    await page.selectOption('#gen', '');
    await page.fill('#search', 'willow');
    await expect(page.locator('tr.row')).toHaveCount(1);
    expect(errors).toEqual([]);
  });

  test('works offline: no manifest, built-in targets', async ({ page }) => {
    const errors = await open(page, { manifest: false });
    await expect(page.locator('#log')).toContainText('Game manifest not reachable');
    await expect(page.locator('#sources')).toContainText('not loaded');
    await expect(row(page, 'oak-a')).not.toContainText('shipped');
    expect(errors.filter((e) => !/ERR_FAILED|Failed to load|net::/.test(e))).toEqual([]);
  });

  test('checks a folder like check-glb.mjs and exports the report and failing files', async ({ page }, info) => {
    const errors = await open(page);
    const T = TARGETS.objects;
    await page.setInputFiles('#filesInput', [
      file('oak-b.glb', boxGlb(T['oak-b'].w, T['oak-b'].d, T['oak-b'].h)), // passes
      file('Birch_A.glb', boxGlb(3, 3, 5)), // height 5 vs 8: fails, name matched by slug
      file('birch-b.glb', boxGlb(3, 3, 8, { zUp: true })), // Z-up mesh stood up by its node: passes
      file('reeds-a.glb', boxGlb(0.8, 0.8, 1.8, { y0: 0.5 })), // base above 0: fails
      file('fern-a.glb', boxGlb(0.9, 0.9, 0.7, { tris: 11000 })), // over the triangle cap: fails
      file('stonewall-low.glb', boxGlb(1.7, 0.7, 1.0)), // width short, but in the proportion table: passes
      file('willow-a.glb', boxGlb(7, 7, 8)), // not in targets.json
      file('oak-b.lod1.glb', boxGlb(1, 1, 1)), // LOD of oak-b, not checked
      file('mystery-thing.glb', boxGlb(1, 1, 1)),
      file('oak-x.glb', boxGlb(1, 1, 1)),
    ]);
    await expect(page.locator('#log')).toContainText('Scanned 10 model files');
    const st = await page.evaluate(() => Object.fromEntries(window.__coverage.rows().map((r) => [r.id, r.status])));
    expect(st).toMatchObject({ 'oak-b': 'pass', 'birch-a': 'fail', 'birch-b': 'pass', 'reeds-a': 'fail', 'fern-a': 'fail',
      'stonewall-low': 'pass', 'willow-a': 'notarget', 'oak-c': 'missing' });
    await expect(tile(page, 'pass')).toHaveText('3');
    await expect(tile(page, 'fail')).toHaveText('3');
    await expect(tile(page, 'notarget')).toHaveText('1');
    // details
    await row(page, 'birch-a').click();
    await expect(page.locator('tr.detail')).toContainText('height 5.00 m, want 8 m');
    await row(page, 'stonewall-low').click();
    await expect(page.locator('tr.detail').last()).toContainText('ingest fits stonewall-low exactly');
    await expect(page.locator('tr.detail').first()).toBeVisible();
    // unmatched files, with a suggestion
    await expect(page.locator('#unmatchedBox')).toBeVisible();
    await expect(page.locator('#unmatched')).toContainText('mystery-thing.glb');
    await expect(page.locator('#unmatched tr', { hasText: 'oak-x.glb' })).toContainText('oak-');
    await expect(page.locator('#unmatched')).not.toContainText('lod1');
    // still needed: not shipped and no passing file
    const needed = await page.evaluate(() => window.__coverage.rows().filter((r) => r.needed).map((r) => r.id));
    expect(needed).not.toContain('oak-a'); // shipped
    expect(needed).not.toContain('oak-b'); // passing file
    expect(needed).toContain('birch-a');

    const [csvDl] = await Promise.all([page.waitForEvent('download'), page.click('#csvBtn')]);
    expect(csvDl.suggestedFilename()).toBe('report.csv');
    const csv = fs.readFileSync(await csvDl.path(), 'utf8').trim().split('\n');
    expect(csv[0]).toMatch(/^id,section,in_targets/);
    expect(csv.find((l) => l.startsWith('birch-a,'))).toMatch(/,Birch_A\.glb,fail,.*height 5\.00 m/);
    expect(csv.find((l) => l.startsWith('oak-a,'))).toMatch(/,yes,4500,0\.25,/);
    expect(csv.length - 1).toBe(await page.evaluate(() => window.__coverage.rows().length));

    const [zipDl] = await Promise.all([page.waitForEvent('download'), page.click('#zipBtn')]);
    const zip = fs.readFileSync(await zipDl.path());
    const names = [];
    for (let off = 0; zip.readUInt32LE(off) === 0x04034b50;) {
      const size = zip.readUInt32LE(off + 18), nl = zip.readUInt16LE(off + 26);
      names.push(zip.subarray(off + 30, off + 30 + nl).toString());
      off += 30 + nl + size;
    }
    expect(names.sort()).toEqual(['Birch_A.glb', 'failing.txt', 'fern-a.glb', 'reeds-a.glb', 'report.csv', 'willow-a.glb']);
    expect(parseGLB(zip.subarray(zip.indexOf('glTF'))).json.asset.version).toBe('2.0');
    expect(errors).toEqual([]);
    await page.screenshot({ path: info.outputPath('coverage.png'), fullPage: true });
  });

  test('a dropped targets.json or missing list replaces the built-in copy', async ({ page }) => {
    await open(page);
    await page.setInputFiles('#loadInput', { name: 'targets.json', mimeType: 'application/json',
      buffer: Buffer.from(JSON.stringify({ ...TARGETS, objects: { ...TARGETS.objects, 'willow-a': { w: 7, d: 7, h: 8 } } })) });
    await expect(page.locator('#sources')).toContainText('targets.json (72 ids)');
    expect(await page.evaluate(() => window.__coverage.rows().find((r) => r.id === 'willow-a').inTargets)).toBe(true);
    await page.setInputFiles('#loadInput', { name: 'list.md', mimeType: 'text/markdown',
      buffer: Buffer.from('## A. Trees (priority 1)\n| id | size | what |\n| --- | --- | --- |\n| yew-a, -b (x2) | 2 x 2 x 6 | a yew |\n') });
    await expect(page.locator('#sources')).toContainText('list.md (2 ids)');
    expect(await page.evaluate(() => window.__coverage.rows().find((r) => r.id === 'yew-b'))).toMatchObject({ section: 'A', est: { w: 2, d: 2, h: 6 }, inTargets: false });
  });
});
