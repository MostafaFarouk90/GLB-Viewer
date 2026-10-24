import fs from 'node:fs';
import { test, expect } from '@playwright/test';
import { VEG_VARIANTS, openApp, apply, num, parseGLB, glbFaces } from './helpers.js';

const setSeed = async (page, category, seed) => {
  await page.selectOption('#category', category);
  await page.fill('#seed', seed);
  await page.press('#seed', 'Enter');
  await expect(page.locator('#log')).toContainText(`seed "${seed}"`);
};
async function download(page, info, button = '#downloadBtn', name = 'out.bin') {
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click(button)]);
  const out = info.outputPath(name);
  await dl.saveAs(out);
  return { buf: fs.readFileSync(out), name: dl.suggestedFilename() };
}
// Files of a stored (uncompressed) zip, as {name: Buffer}.
function unzip(zip) {
  const files = {};
  for (let off = 0; zip.readUInt32LE(off) === 0x04034b50;) {
    const size = zip.readUInt32LE(off + 18), n = zip.readUInt16LE(off + 26), name = zip.subarray(off + 30, off + 30 + n).toString();
    files[name] = zip.subarray(off + 30 + n, off + 30 + n + size); off += 30 + n + size;
  }
  return files;
}
// Bounding box of all POSITION accessors, with node translations applied (nodes are only translated, never turned).
function glbBounds(json) {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  const visit = (i, off) => {
    const n = json.nodes[i], t = n.translation || [0, 0, 0], o = off.map((v, k) => v + t[k]);
    if (n.mesh !== undefined) for (const p of json.meshes[n.mesh].primitives) {
      const a = json.accessors[p.attributes.POSITION];
      for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], a.min[k] + o[k]); max[k] = Math.max(max[k], a.max[k] + o[k]); }
    }
    for (const c of n.children || []) visit(c, o);
  };
  for (const i of json.scenes[0].nodes) visit(i, [0, 0, 0]);
  return { min, max };
}
// All vertex positions of a GLB (float32 POSITION accessors, node translations applied).
function glbPositions(buf) {
  const { json, bin } = parseGLB(buf), out = [];
  const visit = (i, off) => {
    const n = json.nodes[i], t = n.translation || [0, 0, 0], o = off.map((v, k) => v + t[k]);
    if (n.mesh !== undefined) for (const p of json.meshes[n.mesh].primitives) {
      const a = json.accessors[p.attributes.POSITION], bv = json.bufferViews[a.bufferView];
      const f = new Float32Array(bin.buffer, bin.byteOffset + (bv.byteOffset || 0) + (a.byteOffset || 0), a.count * 3);
      for (let k = 0; k < a.count; k++) out.push([f[k * 3] + o[0], f[k * 3 + 1] + o[1], f[k * 3 + 2] + o[2]]);
    }
    for (const c of n.children || []) visit(c, o);
  };
  for (const i of json.scenes[0].nodes) visit(i, [0, 0, 0]);
  return out;
}
const dims = (page) => page.evaluate(() => window.__veggen.state.current.root.userData.dims.toArray());

for (const file of VEG_VARIANTS) {
  test.describe(file, () => {
    let ctx;
    test.beforeEach(async ({ page }) => {
      // the page fetches the game's live size table; tests keep the built-in copy (an empty answer is ignored)
      await page.route('https://raw.githubusercontent.com/**', (route) => route.fulfill({ status: 200, body: '{}', headers: { 'access-control-allow-origin': '*' } }));
      ctx = await openApp(page, file, '__veggen');
    });
    test.afterEach(async () => {
      expect(ctx.unexpected(), 'console/page errors').toEqual([]);
      if (file.includes('offline')) expect(ctx.cdnRequests, 'offline build must not touch the CDN').toEqual([]);
    });

    test('starts with a tree and its LOD counts', async ({ page }) => {
      expect(await num(page, 'sF')).toBeGreaterThan(300);
      await expect(page.locator('#plantName')).not.toBeEmpty();
      await expect(page.locator('#sL')).toHaveText(/^[\d,]+ · [\d,]+$/);
      const [l1, l2] = (await page.locator('#sL').textContent()).split('·').map((s) => Number(s.replace(/\D/g, '')));
      const f = await num(page, 'sF');
      expect(l1).toBeLessThan(f);
      expect(l2).toBeLessThanOrEqual(l1);
    });

    test('every category and variant builds', async ({ page }) => {
      test.setTimeout(400_000);
      await page.uncheck('#rotate');
      await page.selectOption('#detail', 'low');
      const cats = await page.evaluate(() => Object.fromEntries(Object.entries(window.__veggen.CATS).map(([k, c]) =>
        [k, Object.fromEntries(Object.entries(c.opts).map(([s, o]) => [s, Object.keys(o.values)]))])));
      expect(Object.keys(cats).length).toBe(7);
      for (const [cat, slots] of Object.entries(cats)) {
        await setSeed(page, cat, 'all-' + cat);
        const size = await page.evaluate(() => window.__veggen.state.traits.size);
        expect((await dims(page))[1], cat).toBeCloseTo(size, 2); // size measures the height by default
        for (const [slot, values] of Object.entries(slots)) for (const v of values) {
          await page.selectOption('#opt_' + slot, v);
          await expect.poll(() => page.evaluate((s) => window.__veggen.state.traits.opts[s], slot), { message: `${cat} ${slot}=${v}` }).toBe(v);
          expect(await num(page, 'sF'), `${cat} ${slot}=${v}`).toBeGreaterThan(40);
        }
      }
    });

    test('same seed gives the same plant, another seed a different one', async ({ page }) => {
      const traits = await page.evaluate(() => {
        const g = window.__veggen;
        return [JSON.stringify(g.rollTraits('bush', 's1')), JSON.stringify(g.rollTraits('bush', 's1')), JSON.stringify(g.rollTraits('bush', 's2'))];
      });
      expect(traits[0]).toBe(traits[1]);
      expect(traits[0]).not.toBe(traits[2]);
      await setSeed(page, 'tree', 'abc');
      const first = { name: await page.locator('#plantName').textContent(), faces: await num(page, 'sF') };
      await page.click('#randomBtn');
      await expect(page.locator('#seed')).not.toHaveValue('abc');
      await setSeed(page, 'tree', 'abc');
      expect({ name: await page.locator('#plantName').textContent(), faces: await num(page, 'sF') }).toEqual(first);
    });

    test('size, style, detail and species change the model', async ({ page }) => {
      await setSeed(page, 'tree', 'sz');
      await page.locator('#size').fill('1'); // log10 of the height in metres
      await expect.poll(async () => (await dims(page))[1]).toBeCloseTo(10, 1);
      await expect(page.locator('#sizeVal')).toHaveText('10.00 m');
      await page.selectOption('#detail', 'low');
      const low = await num(page, 'sF');
      await page.selectOption('#detail', 'high');
      await expect.poll(() => num(page, 'sF')).toBeGreaterThan(low);
      const flat = await num(page, 'sV');
      await page.selectOption('#style', 'smooth');
      await expect.poll(() => num(page, 'sV')).toBeLessThan(flat);
      await page.selectOption('#opt_kind', 'birch');
      await expect(page.locator('#c_bark')).toHaveValue('#e6e2d6'); // a birch brings its white bark
    });

    test('every game id fits its target box and triangle budget', async ({ page }) => {
      test.setTimeout(300_000);
      await page.uncheck('#rotate');
      const rows = await page.evaluate(() => {
        const g = window.__veggen, T = g.targets();
        return Object.keys(g.GAME_IDS).map((id) => {
          g.rollGame(id, 'fit');
          const t = g.state.traits, d = g.state.current.root.userData.dims;
          return { id, box: t.box, inTable: !!T.objects[id], dims: [d.x, d.y, d.z], budget: g.gameBudget(t.box),
            faces: Number(document.getElementById('sF').textContent.replace(/\D/g, '')) };
        });
      });
      expect(rows.length).toBe(27);
      expect(rows.filter((r) => !r.inTable).map((r) => r.id).sort()).toEqual(['bush-holly-a', 'willow-a']);
      for (const r of rows) {
        const tgt = [r.box.w, r.box.h, r.box.d], drv = Math.max(r.box.w, r.box.d) > 1.8 * r.box.h ? (r.box.w >= r.box.d ? 0 : 2) : 1;
        expect(r.dims[drv], r.id).toBeCloseTo(tgt[drv], 2);
        for (let a = 0; a < 3; a++) expect(Math.abs(r.dims[a] / tgt[a] - 1), `${r.id} axis ${a}`).toBeLessThan(0.1);
        expect(r.faces, r.id).toBeLessThanOrEqual(r.budget);
      }
      await expect(page.locator('#knight')).toBeChecked();
    });

    test('game id export is game-ready', async ({ page }, info) => {
      await page.selectOption('#gameId', 'oak-a');
      await expect(page.locator('#fileName')).toHaveValue('oak-a');
      await expect(page.locator('#sT')).toContainText('✓');
      const { buf, name } = await download(page, info);
      expect(name).toBe('oak-a.glb');
      const { json } = parseGLB(buf);
      expect(json.animations ?? []).toEqual([]);
      for (const m of json.materials) {
        expect(m.pbrMetallicRoughness?.roughnessFactor ?? 1, m.name).toBe(1);
        expect(m.pbrMetallicRoughness?.metallicFactor ?? 1, m.name).toBe(0);
        expect(m.alphaMode ?? 'OPAQUE').toBe('OPAQUE');
      }
      expect(json.materials.map((m) => m.name)).toEqual(expect.arrayContaining(['Leaves', 'Bark']));
      expect(json.nodes.find((n) => n.extras?.gameId)?.extras).toMatchObject({ gameId: 'oak-a', category: 'tree', generator: 'vegetation-generator' });
      expect(glbFaces(buf)).toBe(await num(page, 'sF'));
      const { min, max } = glbBounds(json);
      expect(min[1]).toBeCloseTo(0, 2);
      expect(max[1]).toBeCloseTo(13, 1);
      expect(max[0] - min[0]).toBeCloseTo(10.5, 1);
      expect((min[0] + max[0]) / 2).toBeCloseTo(0, 1); // footprint centred
      expect((min[2] + max[2]) / 2).toBeCloseTo(0, 1);
    });

    test('hedge modules have flat ends that join', async ({ page }, info) => {
      await page.selectOption('#gameId', 'hedge-straight');
      const pts = glbPositions((await download(page, info)).buf);
      const xs = pts.map((p) => p[0]), x0 = Math.min(...xs), x1 = Math.max(...xs);
      expect(x1 - x0).toBeCloseTo(3.4, 2);
      // the vertices on each end plane span the same rectangle, the full height of the hedge's core
      const face = (xv) => { const f = pts.filter((p) => Math.abs(p[0] - xv) < 1e-4); return [Math.min(...f.map((p) => p[1])), Math.max(...f.map((p) => p[1])), Math.min(...f.map((p) => p[2])), Math.max(...f.map((p) => p[2]))]; };
      const a = face(x0), b = face(x1);
      for (let k = 0; k < 4; k++) expect(a[k]).toBeCloseTo(b[k], 3);
      expect(a[0]).toBeCloseTo(0, 3);
      expect(a[1]).toBeGreaterThan(1.2);
      expect(a[3] - a[2]).toBeGreaterThan(0.5);
    });

    test('LOD zip holds the plant and two lighter copies', async ({ page }, info) => {
      await page.selectOption('#gameId', 'oak-b');
      await page.selectOption('#lodView', '2'); // preview works and the export does not depend on it
      await expect.poll(() => page.evaluate(() => !!window.__veggen.state.lodView)).toBe(true);
      const { buf, name } = await download(page, info, '#lodBtn', 'l.zip');
      expect(name).toBe('oak-b-lods.zip');
      const files = unzip(buf);
      expect(Object.keys(files)).toEqual(['oak-b.glb', 'oak-b.lod1.glb', 'oak-b.lod2.glb']);
      const f = Object.values(files).map(glbFaces);
      expect(f[0]).toBe(await num(page, 'sF'));
      expect(f[1]).toBeLessThan(f[0] * 0.35);
      expect(f[2]).toBeLessThan(f[1]);
      expect(f[2]).toBeGreaterThan(60);
      for (const [n, b] of Object.entries(files)) { // every LOD has the same footprint and height
        const { min, max } = glbBounds(parseGLB(b).json);
        expect(max[1] - min[1], n).toBeCloseTo(13, 0);
        expect(min[1], n).toBeCloseTo(0, 2);
      }
      expect(parseGLB(files['oak-b.lod2.glb']).json.nodes.find((x) => x.extras?.gameId).extras.lod).toBe(2);
    });

    test('seed variants download as a zip of <id>-a, -b, -c, with LODs when asked', async ({ page }, info) => {
      await page.selectOption('#gameId', 'bush-round-a');
      await page.fill('#variantCount', '3');
      let { buf, name } = await download(page, info, '#variantsBtn', 'v.zip');
      expect(name).toBe('bush-round-variants.zip');
      let files = unzip(buf);
      expect(Object.keys(files)).toEqual(['bush-round-a.glb', 'bush-round-b.glb', 'bush-round-c.glb']);
      for (const [n, b] of Object.entries(files)) expect(b.subarray(0, 4).toString('latin1'), n).toBe('glTF');
      await page.check('#lodInVariants');
      await page.fill('#variantCount', '2');
      ({ buf } = await download(page, info, '#variantsBtn', 'v2.zip'));
      files = unzip(buf);
      expect(Object.keys(files)).toEqual(['bush-round-a.glb', 'bush-round-a.lod1.glb', 'bush-round-a.lod2.glb', 'bush-round-b.glb', 'bush-round-b.lod1.glb', 'bush-round-b.lod2.glb']);
    });

    test('a loaded targets.json changes the target size', async ({ page }) => {
      await page.selectOption('#gameId', 'birch-a');
      const json = await page.evaluate(() => JSON.stringify({ ...window.__veggen.targets(), objects: { 'birch-a': { w: 4, d: 4, h: 10 } } }));
      await page.setInputFiles('#targetsFile', { name: 'targets.json', mimeType: 'application/json', buffer: Buffer.from(json) });
      await expect(page.locator('#log')).toContainText('Targets from targets.json');
      await expect.poll(async () => (await dims(page))[1]).toBeCloseTo(10, 2);
    });

    test('exported GLB opens in the viewer and can be decimated', async ({ page }, info) => {
      await setSeed(page, 'tree', 'roundtrip');
      await page.selectOption('#style', 'smooth');
      const faces = await num(page, 'sF');
      const { buf } = await download(page, info);
      const viewer = file.includes('offline') ? 'glb-viewer-offline.html' : 'index.html';
      const v = await openApp(page, viewer);
      await page.setInputFiles('#fileInput', { name: 'bush.glb', mimeType: 'model/gltf-binary', buffer: buf });
      await expect(page.locator('#applyBtn')).toBeEnabled();
      expect(await num(page, 'sOF')).toBe(faces);
      await page.locator('#ratio').fill('50');
      await apply(page);
      expect(await num(page, 'sRF')).toBeLessThan(faces * 0.6);
      expect(v.unexpected()).toEqual([]);
    });
  });
}
