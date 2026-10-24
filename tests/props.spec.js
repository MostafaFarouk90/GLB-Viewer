import fs from 'node:fs';
import { test, expect } from '@playwright/test';
import { PROPS_VARIANTS, openApp, apply, num, parseGLB, glbFaces } from './helpers.js';

const setSeed = async (page, category, seed) => {
  await page.selectOption('#category', category);
  await page.fill('#seed', seed);
  await page.press('#seed', 'Enter');
  await expect(page.locator('#log')).toContainText(`seed "${seed}"`);
};

async function download(page, info, name = 'prop.glb') {
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#downloadBtn')]);
  expect(dl.suggestedFilename()).toMatch(/\.glb$/);
  const out = info.outputPath(name);
  await dl.saveAs(out);
  return fs.readFileSync(out);
}

// Bounding box of all POSITION accessors, with node translations applied (nodes are only translated, never turned).
function glbBounds(json) {
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  const visit = (i, off) => {
    const n = json.nodes[i], t = n.translation || (n.matrix ? n.matrix.slice(12, 15) : [0, 0, 0]), o = off.map((v, k) => v + t[k]);
    if (n.mesh !== undefined) for (const p of json.meshes[n.mesh].primitives) {
      const a = json.accessors[p.attributes.POSITION];
      for (let k = 0; k < 3; k++) { min[k] = Math.min(min[k], a.min[k] + o[k]); max[k] = Math.max(max[k], a.max[k] + o[k]); }
    }
    for (const c of n.children || []) visit(c, o);
  };
  for (const i of json.scenes[0].nodes) visit(i, [0, 0, 0]);
  return { min, max };
}
const dims = (page) => page.evaluate(() => window.__propgen.state.current.root.userData.dims.toArray());

for (const file of PROPS_VARIANTS) {
  test.describe(file, () => {
    let ctx;
    test.beforeEach(async ({ page }) => {
      // the page fetches the game's live size table; tests keep the built-in copy (an empty answer is ignored)
      await page.route('https://raw.githubusercontent.com/**', (route) => route.fulfill({ status: 200, body: '{}', headers: { 'access-control-allow-origin': '*' } }));
      ctx = await openApp(page, file, '__propgen');
    });
    test.afterEach(async () => {
      expect(ctx.unexpected(), 'console/page errors').toEqual([]);
      if (file.includes('offline')) expect(ctx.cdnRequests, 'offline build must not touch the CDN').toEqual([]);
    });

    test('starts with a prop', async ({ page }) => {
      expect(await num(page, 'sF')).toBeGreaterThan(100);
      expect(await num(page, 'sP')).toBeGreaterThan(3);
      await expect(page.locator('#propName')).not.toBeEmpty();
      await expect(page.locator('#downloadBtn')).toBeEnabled();
    });

    test('every category and variant builds', async ({ page }) => {
      test.setTimeout(500_000); // ~200 rebuilds in software WebGL
      await page.uncheck('#bloom');
      await page.uncheck('#rotate');
      await page.selectOption('#detail', 'low');
      const cats = await page.evaluate(() => Object.fromEntries(Object.entries(window.__propgen.CATS).map(([k, c]) =>
        [k, Object.fromEntries(Object.entries(c.opts).map(([s, o]) => [s, Object.keys(o.values)]))])));
      expect(Object.keys(cats).length).toBeGreaterThanOrEqual(28);
      for (const [cat, slots] of Object.entries(cats)) {
        await setSeed(page, cat, 'all-' + cat);
        const size = await page.evaluate(() => window.__propgen.state.traits.size);
        const d = await dims(page);
        expect(Math.max(...d), cat).toBeCloseTo(size, 2);
        for (const [slot, values] of Object.entries(slots)) for (const v of values) {
          await page.selectOption('#opt_' + slot, v);
          await expect.poll(() => page.evaluate((s) => window.__propgen.state.traits.opts[s], slot), { message: `${cat} ${slot}=${v}` }).toBe(v);
          expect(await num(page, 'sF'), `${cat} ${slot}=${v}`).toBeGreaterThan(40);
        }
        await page.click('#enchant');
        await expect.poll(() => page.evaluate(() => window.__propgen.state.traits.enchanted)).toBe(await page.isChecked('#enchant'));
      }
    });

    test('same seed gives the same prop, another seed a different one', async ({ page }) => {
      await setSeed(page, 'potion', 'abc');
      const first = { name: await page.locator('#propName').textContent(), faces: await num(page, 'sF') };
      await page.click('#randomBtn');
      await expect(page.locator('#seed')).not.toHaveValue('abc');
      await setSeed(page, 'potion', 'abc');
      expect({ name: await page.locator('#propName').textContent(), faces: await num(page, 'sF') }).toEqual(first);
      const traits = await page.evaluate(() => {
        const g = window.__propgen;
        return [JSON.stringify(g.rollTraits('tree', 's1')), JSON.stringify(g.rollTraits('tree', 's1')), JSON.stringify(g.rollTraits('tree', 's2'))];
      });
      expect(traits[0]).toBe(traits[1]);
      expect(traits[0]).not.toBe(traits[2]);
    });

    test('size, style and detail change the model', async ({ page }) => {
      await setSeed(page, 'chest', 'sz');
      await page.locator('#size').fill('0.3'); // log10 of the size in metres
      await expect.poll(async () => Math.max(...await dims(page))).toBeCloseTo(1.995, 2);
      await expect(page.locator('#sizeVal')).toHaveText('2.00 m');
      const smooth = await num(page, 'sV');
      await page.selectOption('#style', 'lowpoly');
      await expect.poll(() => num(page, 'sV')).toBeGreaterThan(smooth);
      const med = await num(page, 'sF');
      await page.selectOption('#detail', 'high');
      await expect.poll(() => num(page, 'sF')).toBeGreaterThan(med);
    });

    test('download produces a valid GLB with idle animation (portal)', async ({ page }, info) => {
      await setSeed(page, 'portal', 'dl');
      await page.selectOption('#opt_swirl', 'vortex');
      await expect.poll(() => page.evaluate(() => window.__propgen.state.traits.opts.swirl)).toBe('vortex');
      const buf = await download(page, info);
      const { json, bin } = parseGLB(buf);
      expect(bin.length).toBeGreaterThan(1000);
      expect(json.asset.version).toBe('2.0');
      const names = json.nodes.map((n) => n.name);
      expect(names).toContain('Body');
      expect(names).toContain('Spin');
      expect(json.materials.map((m) => m.name)).toContain('PortalSurface');
      expect(json.animations?.[0]?.name).toBe('Idle');
      expect(json.animations[0].channels.map((c) => c.target.path)).toContain('rotation');
      expect(glbFaces(buf)).toBe(await num(page, 'sF'));
      // stands on the ground, longest side as set
      const { min, max } = glbBounds(json), size = await page.evaluate(() => window.__propgen.state.traits.size);
      expect(min[1]).toBeCloseTo(0, 2);
      expect(Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2])).toBeCloseTo(size, 1);
    });

    test('flames flicker in the exported animation (campfire)', async ({ page }, info) => {
      await setSeed(page, 'campfire', 'fire');
      await page.selectOption('#opt_fire', 'burning');
      await expect.poll(() => page.evaluate(() => window.__propgen.state.traits.opts.fire)).toBe('burning');
      const buf = await download(page, info);
      const { json } = parseGLB(buf);
      const flames = json.nodes.filter((n) => /^Flame\d+$/.test(n.name));
      expect(flames.length).toBeGreaterThanOrEqual(3);
      const scaled = json.animations[0].channels.filter((c) => c.target.path === 'scale');
      expect(scaled.length).toBe(flames.length);
    });

    test('download with separate parts and no animation', async ({ page }, info) => {
      await setSeed(page, 'chest', 'parts-dl');
      await page.uncheck('#combine');
      await page.uncheck('#anim');
      const buf = await download(page, info);
      const { json } = parseGLB(buf);
      expect(json.meshes.length).toBe(await num(page, 'sP'));
      expect(json.animations ?? []).toEqual([]);
      expect(glbFaces(buf)).toBe(await num(page, 'sF'));
    });

    test('weapons can have their origin at the handle', async ({ page }, info) => {
      await setSeed(page, 'sword', 'grip');
      await expect(page.locator('#gripOrigin')).toBeEnabled();
      let { min, max } = glbBounds(parseGLB(await download(page, info, 'a.glb')).json);
      expect(min[1]).toBeLessThan(-0.03); // pommel below the hand
      expect(max[1]).toBeGreaterThan(0.5); // blade above it
      await page.uncheck('#gripOrigin');
      ({ min } = glbBounds(parseGLB(await download(page, info, 'b.glb')).json));
      expect(min[1]).toBeCloseTo(0, 2);
      await setSeed(page, 'barrel', 'nogrip');
      await expect(page.locator('#gripOrigin')).toBeDisabled();
    });

    test('every game id fits its target box and budget', async ({ page }) => {
      test.setTimeout(300_000);
      await page.uncheck('#bloom');
      const rows = await page.evaluate(() => {
        const g = window.__propgen, T = g.targets();
        return Object.keys(g.GAME_IDS).map((id) => {
          g.rollGame(id, 'fit');
          const t = g.state.traits, d = g.state.current.root.userData.dims;
          return { id, box: t.box, inTable: !!T.objects[id], dims: [d.x, d.y, d.z], faces: Number(document.getElementById('sF').textContent.replace(/\D/g, '')) };
        });
      });
      expect(rows.length).toBeGreaterThanOrEqual(30);
      expect(rows.filter((r) => r.inTable).length).toBeGreaterThanOrEqual(20);
      for (const r of rows) {
        const tgt = [r.box.w, r.box.h, r.box.d], drv = Math.max(r.box.w, r.box.d) > 1.8 * r.box.h ? (r.box.w >= r.box.d ? 0 : 2) : 1;
        expect(r.dims[drv], r.id).toBeCloseTo(tgt[drv], 2);
        for (let a = 0; a < 3; a++) expect(r.dims[a] / tgt[a], `${r.id} axis ${a}`).toBeLessThan(2.1);
        expect(r.faces, r.id).toBeLessThan(10000);
      }
      await expect(page.locator('#knight')).toBeChecked();
    });

    test('game id export is game-ready', async ({ page }, info) => {
      await page.selectOption('#gameId', 'basalt-columns-a');
      await expect(page.locator('#fileName')).toHaveValue('basalt-columns-a');
      await expect(page.locator('#sT')).toContainText('✓');
      const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#downloadBtn')]);
      expect(dl.suggestedFilename()).toBe('basalt-columns-a.glb');
      const out = info.outputPath('b.glb'); await dl.saveAs(out);
      const { json } = parseGLB(fs.readFileSync(out));
      expect(json.animations ?? []).toEqual([]);
      for (const m of json.materials) {
        expect(m.pbrMetallicRoughness?.roughnessFactor ?? 1, m.name).toBe(1);
        expect(m.pbrMetallicRoughness?.metallicFactor ?? 1, m.name).toBe(0);
        expect(m.alphaMode ?? 'OPAQUE').toBe('OPAQUE');
      }
      expect(json.nodes.find((n) => n.extras?.gameId)?.extras).toMatchObject({ gameId: 'basalt-columns-a', category: 'basalt' });
      const { min, max } = glbBounds(json);
      expect(min[1]).toBeCloseTo(0, 2);
      expect(max[1]).toBeCloseTo(4, 1);
      expect((min[0] + max[0]) / 2).toBeCloseTo(0, 1); // footprint centred
      expect((min[2] + max[2]) / 2).toBeCloseTo(0, 1);
    });

    test('seed variants download as a zip of <id>-a, -b, -c', async ({ page }, info) => {
      await page.selectOption('#gameId', 'ember-rock-a');
      await page.fill('#variantCount', '3');
      const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#variantsBtn')]);
      expect(dl.suggestedFilename()).toBe('ember-rock-variants.zip');
      const out = info.outputPath('v.zip'); await dl.saveAs(out);
      const zip = fs.readFileSync(out), names = [];
      for (let off = 0; zip.readUInt32LE(off) === 0x04034b50;) { // walk the local file headers
        const size = zip.readUInt32LE(off + 18), n = zip.readUInt16LE(off + 26), name = zip.subarray(off + 30, off + 30 + n).toString();
        const data = zip.subarray(off + 30 + n, off + 30 + n + size);
        expect(data.subarray(0, 4).toString('latin1'), name).toBe('glTF');
        names.push(name); off += 30 + n + size;
      }
      expect(names).toEqual(['ember-rock-a.glb', 'ember-rock-b.glb', 'ember-rock-c.glb']);
    });

    test('a loaded targets.json changes the target size', async ({ page }) => {
      await page.selectOption('#gameId', 'cairn-a');
      const json = await page.evaluate(() => JSON.stringify({ ...window.__propgen.targets(), objects: { 'cairn-a': { w: 2, d: 2, h: 3 } } }));
      await page.setInputFiles('#targetsFile', { name: 'targets.json', mimeType: 'application/json', buffer: Buffer.from(json) });
      await expect(page.locator('#log')).toContainText('Targets from targets.json');
      await expect.poll(async () => (await dims(page))[1]).toBeCloseTo(3, 2);
    });

    test('exported GLB opens in the viewer and can be decimated', async ({ page }, info) => {
      await setSeed(page, 'tree', 'roundtrip');
      const faces = await num(page, 'sF');
      const buf = await download(page, info);
      const viewer = file.includes('offline') ? 'glb-viewer-offline.html' : 'index.html';
      const v = await openApp(page, viewer);
      await page.setInputFiles('#fileInput', { name: 'tree.glb', mimeType: 'model/gltf-binary', buffer: buf });
      await expect(page.locator('#applyBtn')).toBeEnabled();
      expect(await num(page, 'sOF')).toBe(faces);
      await page.locator('#ratio').fill('50');
      await apply(page);
      expect(await num(page, 'sRF')).toBeLessThan(faces * 0.6);
      expect(v.unexpected()).toEqual([]);
    });
  });
}
