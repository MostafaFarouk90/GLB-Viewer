import fs from 'node:fs';
import { test, expect } from '@playwright/test';
import { openApp, apply, num, parseGLB, glbFaces } from './helpers.js';

const STRUCT_VARIANTS = ['structures-generator.html', 'structures-generator-offline.html'];

const setSeed = async (page, category, seed) => {
  await page.selectOption('#category', category);
  await page.fill('#seed', seed);
  await page.press('#seed', 'Enter');
  await expect(page.locator('#log')).toContainText(`seed "${seed}"`);
};
const setOpt = async (page, slot, v) => {
  await page.selectOption('#opt_' + slot, v);
  await expect.poll(() => page.evaluate((s) => window.__structgen.state.traits.opts[s], slot)).toBe(v);
};

async function download(page, info, name = 'piece.glb', button = '#downloadBtn') {
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click(button)]);
  const out = info.outputPath(name);
  await dl.saveAs(out);
  return { buf: fs.readFileSync(out), name: dl.suggestedFilename() };
}
// Files in a stored (uncompressed) zip, from the local file headers.
function unzip(zip) {
  const files = [];
  for (let off = 0; zip.readUInt32LE(off) === 0x04034b50;) {
    const size = zip.readUInt32LE(off + 18), n = zip.readUInt16LE(off + 26), name = zip.subarray(off + 30, off + 30 + n).toString();
    files.push({ name, data: zip.subarray(off + 30 + n, off + 30 + n + size) });
    off += 30 + n + size;
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
const dims = (page) => page.evaluate(() => window.__structgen.state.current.root.userData.dims.toArray());

for (const file of STRUCT_VARIANTS) {
  test.describe(file, () => {
    let ctx;
    test.beforeEach(async ({ page }) => {
      // the page fetches the game's live size table; tests keep the built-in copy (an empty answer is ignored)
      await page.route('https://raw.githubusercontent.com/**', (route) => route.fulfill({ status: 200, body: '{}', headers: { 'access-control-allow-origin': '*' } }));
      ctx = await openApp(page, file, '__structgen');
    });
    test.afterEach(async () => {
      expect(ctx.unexpected(), 'console/page errors').toEqual([]);
      if (file.includes('offline')) expect(ctx.cdnRequests, 'offline build must not touch the CDN').toEqual([]);
    });

    test('starts with a wall module at real size', async ({ page }) => {
      expect(await num(page, 'sF')).toBeGreaterThan(20);
      await expect(page.locator('#propName')).not.toBeEmpty();
      await expect(page.locator('#fit')).toHaveValue('design');
      await expect(page.locator('#size')).toBeDisabled();
      await expect(page.locator('#kitBtn')).toBeEnabled();
      await expect(page.locator('#knight')).toBeChecked();
    });

    test('every type and variant builds', async ({ page }) => {
      test.setTimeout(500_000); // ~90 rebuilds in software WebGL
      await page.uncheck('#bloom');
      await page.uncheck('#rotate');
      await page.selectOption('#detail', 'low');
      const cats = await page.evaluate(() => Object.fromEntries(Object.entries(window.__structgen.CATS).map(([k, c]) =>
        [k, Object.fromEntries(Object.entries(c.opts).map(([s, o]) => [s, Object.keys(o.values)]))])));
      expect(Object.keys(cats).length).toBeGreaterThanOrEqual(20);
      for (const [cat, slots] of Object.entries(cats)) {
        await setSeed(page, cat, 'all-' + cat);
        for (const [slot, values] of Object.entries(slots)) for (const v of values) {
          await setOpt(page, slot, v);
          expect(await num(page, 'sF'), `${cat} ${slot}=${v}`).toBeGreaterThan(10);
          const d = await dims(page);
          for (const a of d) expect(Number.isFinite(a) && a > 0.05 && a < 20, `${cat} ${slot}=${v} dims ${d}`).toBe(true);
        }
        await page.click('#enchant');
        await expect.poll(() => page.evaluate(() => window.__structgen.state.traits.enchanted)).toBe(await page.isChecked('#enchant'));
      }
    });

    test('same seed gives the same piece, another seed a different one', async ({ page }) => {
      await setSeed(page, 'wagon', 'abc');
      const first = { name: await page.locator('#propName').textContent(), faces: await num(page, 'sF') };
      await page.click('#randomBtn');
      await expect(page.locator('#seed')).not.toHaveValue('abc');
      await setSeed(page, 'wagon', 'abc');
      expect({ name: await page.locator('#propName').textContent(), faces: await num(page, 'sF') }).toEqual(first);
      const traits = await page.evaluate(() => {
        const g = window.__structgen;
        return [JSON.stringify(g.rollTraits('roof', 's1')), JSON.stringify(g.rollTraits('roof', 's1')), JSON.stringify(g.rollTraits('roof', 's2'))];
      });
      expect(traits[0]).toBe(traits[1]);
      expect(traits[0]).not.toBe(traits[2]);
    });

    test('wall modules are built to size with flat ends, so they tile', async ({ page }) => {
      await setSeed(page, 'wall', 'tile');
      for (const [material, T] of [['stone', 0.4], ['plaster', 0.25], ['plank', 0.14], ['logs', 0.3]]) for (const len of ['2', '3', '4']) {
        await setOpt(page, 'material', material);
        await setOpt(page, 'length', len);
        await setOpt(page, 'state', 'intact');
        await setOpt(page, 'height', 'storey');
        const d = await dims(page);
        expect(d[0], `${material} ${len} m length`).toBeCloseTo(+len, 3);
        expect(d[1], `${material} height`).toBeCloseTo(2.8, 1);
        expect(d[2], `${material} thickness`).toBeLessThan(T + 0.25);
      }
      // a door is 2.1 m high whatever the wall
      const holes = await page.evaluate(() => window.__structgen.wallRects(3, 2.8, [{ x0: -0.5, x1: 0.5, y0: 0, y1: 2.1 }], [], () => 2.8));
      expect(holes.filter((q) => q.x0 >= -0.5 && q.x1 <= 0.5).map((q) => q.y0)).toEqual([2.1]);
    });

    test('scale modes: as designed, longest side and height', async ({ page }) => {
      await setSeed(page, 'gateway', 'scale');
      const d0 = await dims(page);
      await page.selectOption('#fit', 'longest');
      await expect(page.locator('#size')).toBeEnabled();
      await page.locator('#size').fill('1'); // log10 of the size in metres
      await expect.poll(async () => Math.max(...await dims(page))).toBeCloseTo(10, 2);
      await page.selectOption('#fit', 'height');
      await page.locator('#size').fill('0.5');
      await expect.poll(async () => (await dims(page))[1]).toBeCloseTo(3.162, 2);
      await page.selectOption('#fit', 'design');
      await expect.poll(() => dims(page)).toEqual(d0);
    });

    test('download produces a valid GLB with turning wheels (headframe)', async ({ page }, info) => {
      await setSeed(page, 'headframe', 'dl');
      await setOpt(page, 'wheels', '2');
      const { buf } = await download(page, info);
      const { json, bin } = parseGLB(buf);
      expect(bin.length).toBeGreaterThan(1000);
      expect(json.asset.version).toBe('2.0');
      const names = json.nodes.map((n) => n.name);
      expect(names).toContain('Body');
      expect(names.filter((n) => /^Spin\d*$/.test(n)).length).toBe(2);
      expect(json.animations?.[0]?.name).toBe('Idle');
      expect(json.animations[0].channels.map((c) => c.target.path)).toContain('rotation');
      expect(glbFaces(buf)).toBe(await num(page, 'sF'));
      const { min, max } = glbBounds(json), d = await dims(page);
      expect(min[1]).toBeCloseTo(0, 2);
      for (let a = 0; a < 3; a++) expect(max[a] - min[a]).toBeCloseTo(d[a], 1);
      expect((min[0] + max[0]) / 2).toBeCloseTo(0, 1);
      expect((min[2] + max[2]) / 2).toBeCloseTo(0, 1);
    });

    test('fires and candles flicker in the exported animation (forge)', async ({ page }, info) => {
      await setSeed(page, 'forge', 'fire');
      await setOpt(page, 'fire', 'lit');
      const { json } = parseGLB((await download(page, info)).buf);
      const flames = json.nodes.filter((n) => /^Flame\d+$/.test(n.name));
      expect(flames.length).toBeGreaterThanOrEqual(1);
      expect(json.animations[0].channels.filter((c) => c.target.path === 'scale').length).toBe(flames.length);
      expect(json.materials.map((m) => m.name)).toContain('Glow');
    });

    test('download with separate parts and no animation', async ({ page }, info) => {
      await setSeed(page, 'well', 'parts-dl');
      await page.uncheck('#combine');
      await page.uncheck('#anim');
      const { buf } = await download(page, info);
      const { json } = parseGLB(buf);
      expect(json.meshes.length).toBe(await num(page, 'sP'));
      expect(json.animations ?? []).toEqual([]);
      expect(glbFaces(buf)).toBe(await num(page, 'sF'));
    });

    test('kit zip has one piece per opening, all the same length', async ({ page }, info) => {
      await setSeed(page, 'wall', 'kit');
      await setOpt(page, 'length', '3');
      await setOpt(page, 'state', 'intact');
      await page.fill('#fileName', 'stone-wall');
      const { buf, name } = await download(page, info, 'kit.zip', '#kitBtn');
      expect(name).toBe('stone-wall-kit.zip');
      const files = unzip(buf);
      expect(files.map((f) => f.name)).toEqual(['stone-wall-none.glb', 'stone-wall-door.glb', 'stone-wall-window.glb', 'stone-wall-windows.glb', 'stone-wall-arch.glb']);
      for (const f of files) {
        const { min, max } = glbBounds(parseGLB(f.data).json);
        expect(max[0] - min[0], f.name).toBeCloseTo(3, 2);
      }
      await setSeed(page, 'wagon', 'nokit');
      await expect(page.locator('#kitBtn')).toBeDisabled();
    });

    test('every game id fits its target box and budget', async ({ page }) => {
      test.setTimeout(300_000);
      await page.uncheck('#bloom');
      await page.uncheck('#rotate');
      const rows = await page.evaluate(() => {
        const g = window.__structgen, T = g.targets();
        return Object.keys(g.GAME_IDS).map((id) => {
          g.rollGame(id, 'fit');
          const t = g.state.traits, d = g.state.current.root.userData.dims;
          return { id, box: t.box, inTable: !!T.objects[id], dims: [d.x, d.y, d.z], faces: Number(document.getElementById('sF').textContent.replace(/\D/g, '')) };
        });
      });
      expect(rows.length).toBeGreaterThanOrEqual(15);
      // targets.json has the game's own ids; the list's new Greyfen and Dragonspine pieces fall back to their list boxes
      expect(rows.filter((r) => r.inTable).map((r) => r.id)).toEqual(expect.arrayContaining(['cart-goods-a', 'cottage-thatch-b', 'deepgate-headframe', 'handcart-a', 'mine-cart', 'wagon-wreck-a']));
      expect(rows.filter((r) => !r.inTable).map((r) => r.id)).toEqual(expect.arrayContaining(['greyfen-stilt-house', 'dragonspine-sled-shed']));
      for (const r of rows) {
        const tgt = [r.box.w, r.box.h, r.box.d], drv = Math.max(r.box.w, r.box.d) > 1.8 * r.box.h ? (r.box.w >= r.box.d ? 0 : 2) : 1;
        expect(r.dims[drv], r.id).toBeCloseTo(tgt[drv], 2);
        for (let a = 0; a < 3; a++) expect(r.dims[a] / tgt[a], `${r.id} axis ${a}`).toBeLessThan(2.1);
        expect(r.faces, r.id).toBeLessThan(10000);
      }
    });

    test('game id export is game-ready', async ({ page }, info) => {
      await page.selectOption('#gameId', 'wagon-wreck-a');
      await expect(page.locator('#fileName')).toHaveValue('wagon-wreck-a');
      await expect(page.locator('#sT')).toContainText('✓');
      await expect(page.locator('#kitBtn')).toBeDisabled();
      const { buf, name } = await download(page, info, 'w.glb');
      expect(name).toBe('wagon-wreck-a.glb');
      const { json } = parseGLB(buf);
      expect(json.animations ?? []).toEqual([]);
      for (const m of json.materials) {
        expect(m.pbrMetallicRoughness?.roughnessFactor ?? 1, m.name).toBe(1);
        expect(m.pbrMetallicRoughness?.metallicFactor ?? 1, m.name).toBe(0);
        expect(m.alphaMode ?? 'OPAQUE').toBe('OPAQUE');
      }
      expect(json.nodes.find((n) => n.extras?.gameId)?.extras).toMatchObject({ gameId: 'wagon-wreck-a', category: 'wagon', generator: 'structures-generator' });
      const { min, max } = glbBounds(json);
      expect(min[1]).toBeCloseTo(0, 2);
      expect(max[1]).toBeCloseTo(2.2, 1);
      expect((min[0] + max[0]) / 2).toBeCloseTo(0, 1);
      expect((min[2] + max[2]) / 2).toBeCloseTo(0, 1);
    });

    test('seed variants download as a zip of <id>-a, -b, -c', async ({ page }, info) => {
      await page.selectOption('#gameId', 'wagon-wreck-a');
      await page.fill('#variantCount', '3');
      const { buf, name } = await download(page, info, 'v.zip', '#variantsBtn');
      expect(name).toBe('wagon-wreck-variants.zip');
      const files = unzip(buf);
      for (const f of files) expect(f.data.subarray(0, 4).toString('latin1'), f.name).toBe('glTF');
      expect(files.map((f) => f.name)).toEqual(['wagon-wreck-a.glb', 'wagon-wreck-b.glb', 'wagon-wreck-c.glb']);
    });

    test('a loaded targets.json changes the target size', async ({ page }) => {
      await page.selectOption('#gameId', 'roadside-shrine-a');
      const json = await page.evaluate(() => JSON.stringify({ ...window.__structgen.targets(), objects: { 'roadside-shrine-a': { w: 1.5, d: 1.5, h: 3 } } }));
      await page.setInputFiles('#targetsFile', { name: 'targets.json', mimeType: 'application/json', buffer: Buffer.from(json) });
      await expect(page.locator('#log')).toContainText('Targets from targets.json');
      await expect.poll(async () => (await dims(page))[1]).toBeCloseTo(3, 2);
    });

    test('exported GLB opens in the viewer and can be decimated', async ({ page }, info) => {
      // round parts (a dome kiln) so there is something to decimate; box-built pieces are already minimal
      await setSeed(page, 'furnace', 'roundtrip');
      await setOpt(page, 'kind', 'kiln');
      await page.selectOption('#detail', 'high');
      await page.selectOption('#style', 'smooth'); // faceted pieces have split vertices, which decimation keeps
      await expect.poll(() => page.evaluate(() => window.__structgen.state.traits.style)).toBe('smooth');
      const faces = await num(page, 'sF');
      const { buf } = await download(page, info);
      const viewer = file.includes('offline') ? 'glb-viewer-offline.html' : 'index.html';
      const v = await openApp(page, viewer);
      await page.setInputFiles('#fileInput', { name: 'kiln.glb', mimeType: 'model/gltf-binary', buffer: buf });
      await expect(page.locator('#applyBtn')).toBeEnabled();
      expect(await num(page, 'sOF')).toBe(faces);
      await page.locator('#ratio').fill('50');
      await apply(page);
      expect(await num(page, 'sRF')).toBeLessThan(faces * 0.6);
      expect(v.unexpected()).toEqual([]);
    });
  });
}
