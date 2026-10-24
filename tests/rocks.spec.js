// Rock and cliff kit (rocks-generator.html and its offline build).
import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { ROOT, openApp, num, parseGLB, glbFaces } from './helpers.js';

const ROCKS_VARIANTS = ['rocks-generator.html', 'rocks-generator-offline.html'];

const setSeed = async (page, category, seed) => {
  await page.selectOption('#category', category);
  await page.fill('#seed', seed);
  await page.press('#seed', 'Enter');
  await expect(page.locator('#log')).toContainText(`seed "${seed}"`);
};

async function download(page, info, name = 'rock.glb') {
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#downloadBtn')]);
  expect(dl.suggestedFilename()).toMatch(/\.glb$/);
  const out = info.outputPath(name);
  await dl.saveAs(out);
  return { buf: fs.readFileSync(out), name: dl.suggestedFilename() };
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
// Picks variant options and waits until the piece has been rebuilt with them.
async function setOpts(page, opts) {
  for (const [slot, v] of Object.entries(opts)) await page.selectOption('#opt_' + slot, v);
  await expect.poll(() => page.evaluate((o) => Object.entries(o).every(([k, v]) => window.__rockgen.state.traits.opts[k] === v), opts)).toBe(true);
}
const dims = (page) => page.evaluate(() => window.__rockgen.state.current.root.userData.dims.toArray());

// The end profiles of the current piece: for each height, the front-most z of the vertices on the plane x = end.
// Rounded to millimetres, so two modules that join seamlessly give the same list.
const endProfiles = (page) => page.evaluate(() => {
  const { THREE, state } = window.__rockgen, root = state.current.root, v = new THREE.Vector3();
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root), ends = { min: new Map(), max: new Map(), back: new Map() };
  root.traverse((o) => {
    if (!o.isMesh) return;
    const p = o.geometry.attributes.position;
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i).applyMatrix4(o.matrixWorld);
      const y = Math.round(v.y * 1000);
      const put = (m, val) => m.set(y, Math.max(m.get(y) ?? -Infinity, Math.round(val * 1000)));
      if (Math.abs(v.x - box.min.x) < 1e-4) put(ends.min, v.z);
      if (Math.abs(v.x - box.max.x) < 1e-4) put(ends.max, v.z);
      if (Math.abs(v.z - box.min.z) < 1e-4) put(ends.back, v.x); // the corner's second end
    }
  });
  const list = (m) => [...m].sort((a, b) => a[0] - b[0]);
  return { min: list(ends.min), max: list(ends.max), back: list(ends.back), box: [box.min.toArray(), box.max.toArray()] };
});

for (const file of ROCKS_VARIANTS) {
  test.describe(file, () => {
    let ctx;
    test.beforeEach(async ({ page }) => {
      // the page fetches the game's live size table; tests keep the built-in copy (an empty answer is ignored)
      await page.route('https://raw.githubusercontent.com/**', (route) => route.fulfill({ status: 200, body: '{}', headers: { 'access-control-allow-origin': '*' } }));
      ctx = await openApp(page, file, '__rockgen');
    });
    test.afterEach(async () => {
      expect(ctx.unexpected(), 'console/page errors').toEqual([]);
      if (file.includes('offline')) expect(ctx.cdnRequests, 'offline build must not touch the CDN').toEqual([]);
    });

    test('starts with a cliff module', async ({ page }) => {
      expect(await num(page, 'sF')).toBeGreaterThan(100);
      await expect(page.locator('#category')).toHaveValue('cliff');
      await expect(page.locator('#rockName')).not.toBeEmpty();
      await expect(page.locator('#downloadBtn')).toBeEnabled();
      await expect(page.locator('#tile')).toBeEnabled();
    });

    test('every type and variant builds at its size', async ({ page }) => {
      test.setTimeout(400_000);
      await page.uncheck('#bloom');
      await page.selectOption('#detail', 'low');
      const cats = await page.evaluate(() => Object.fromEntries(Object.entries(window.__rockgen.CATS).map(([k, c]) =>
        [k, Object.fromEntries(Object.entries(c.opts).map(([s, o]) => [s, Object.keys(o.values)]))])));
      expect(Object.keys(cats).length).toBeGreaterThanOrEqual(12);
      for (const [cat, slots] of Object.entries(cats)) {
        await setSeed(page, cat, 'all-' + cat);
        const want = await page.evaluate(() => window.__rockgen.state.traits.dims);
        const d = await dims(page);
        if (cat !== 'golem') expect(d.map((v) => +v.toFixed(3)), cat).toEqual([want.w, want.h, want.d]);
        for (const [slot, values] of Object.entries(slots)) for (const v of values) {
          await page.selectOption('#opt_' + slot, v);
          await expect.poll(() => page.evaluate((s) => window.__rockgen.state.traits.opts[s], slot), { message: `${cat} ${slot}=${v}` }).toBe(v);
          expect(await num(page, 'sF'), `${cat} ${slot}=${v}`).toBeGreaterThan(40);
        }
      }
    });

    test('same seed gives the same piece, another seed a different one', async ({ page }) => {
      await setSeed(page, 'boulder', 'abc');
      const first = { name: await page.locator('#rockName').textContent(), faces: await num(page, 'sF') };
      await page.click('#randomBtn');
      await expect(page.locator('#seed')).not.toHaveValue('abc');
      await setSeed(page, 'boulder', 'abc');
      expect({ name: await page.locator('#rockName').textContent(), faces: await num(page, 'sF') }).toEqual(first);
      const geo = await page.evaluate(() => {
        const g = window.__rockgen, sig = (seed) => {
          const c = g.buildRock({ ...g.rollTraits('cliff', seed), detail: 'low', style: 'lowpoly' });
          let s = 0; c.root.traverse((o) => { if (o.isMesh) for (const v of o.geometry.attributes.position.array) s += v * v; });
          return s.toFixed(4);
        };
        return [sig('s1'), sig('s1'), sig('s2')];
      });
      expect(geo[0]).toBe(geo[1]);
      expect(geo[0]).not.toBe(geo[2]);
    });

    test('size, style and detail change the model', async ({ page }) => {
      await setSeed(page, 'cliff', 'sz');
      await page.fill('#dimW', '9');
      await page.press('#dimW', 'Tab');
      await expect.poll(async () => (await dims(page))[0]).toBeCloseTo(9, 3);
      // faceted: the three normals of every triangle are equal; smooth: most triangles have differing vertex normals
      const smoothShare = () => page.evaluate(() => {
        let tris = 0, smooth = 0;
        window.__rockgen.state.current.root.traverse((o) => {
          if (!o.isMesh) return;
          const n = o.geometry.attributes.normal.array;
          for (let i = 0; i < n.length; i += 9, tris++) if (Math.abs(n[i] - n[i + 3]) + Math.abs(n[i + 1] - n[i + 4]) + Math.abs(n[i + 2] - n[i + 5]) > 1e-4) smooth++;
        });
        return smooth / tris;
      });
      expect(await smoothShare()).toBeLessThan(0.01);
      await page.selectOption('#style', 'smooth');
      await expect.poll(() => page.evaluate(() => window.__rockgen.state.traits.style)).toBe('smooth');
      expect(await smoothShare()).toBeGreaterThan(0.3); // the flat back and top stay flat
      const med = await num(page, 'sF');
      await page.selectOption('#detail', 'high');
      await expect.poll(() => num(page, 'sF')).toBeGreaterThan(med);
    });

    test('cliff modules join seamlessly whatever the seed, and the corner joins them', async ({ page }) => {
      await page.selectOption('#detail', 'medium');
      const profiles = [];
      for (const seed of ['one', 'two']) { await setSeed(page, 'cliff', seed); await setOpts(page, { form: 'straight', strata: 'bands' }); profiles.push(await endProfiles(page)); }
      const [a, b] = profiles;
      expect(a.min.length).toBeGreaterThan(5);
      expect(a.min).toEqual(a.max); // left end = right end
      expect(b.min).toEqual(a.min); // and the same for another seed
      expect(a.box[0][0]).toBeCloseTo(-3, 4);
      expect(a.box[1][0]).toBeCloseTo(3, 4);
      // the corner's left end and its back (seen from a module turned to face +X) both match the module's end
      await setSeed(page, 'corner', 'three');
      await setOpts(page, { form: 'straight', strata: 'bands' });
      const c = await endProfiles(page);
      expect(c.min).toEqual(a.min);
      expect(c.back).toEqual(a.min);
      // the tile preview shows copies either side
      await setSeed(page, 'cliff', 'one');
      await page.check('#tile');
      expect(await page.evaluate(() => window.__rockgen.state.current.root.parent.children.some((o) => o.children.length === 2 && o !== window.__rockgen.state.current.root))).toBe(true);
    });

    test('download produces a valid GLB with the regeneration data', async ({ page }, info) => {
      await setSeed(page, 'cliff', 'dl');
      await setOpts(page, { top: 'grass', veins: 'embers' });
      const { buf } = await download(page, info);
      const { json, bin } = parseGLB(buf);
      expect(bin.length).toBeGreaterThan(1000);
      expect(json.asset.version).toBe('2.0');
      expect(json.nodes.map((n) => n.name)).toContain('Body');
      const mats = json.materials.map((m) => m.name);
      for (const m of ['Stone', 'StoneBand', 'Top', 'Glow']) expect(mats).toContain(m);
      expect(json.materials.find((m) => m.name === 'Glow').emissiveFactor.some((v) => v > 0.5)).toBe(true);
      expect(json.animations ?? []).toEqual([]);
      expect(glbFaces(buf)).toBe(await num(page, 'sF'));
      const root = json.nodes.find((n) => n.extras?.generator);
      expect(root.extras).toMatchObject({ generator: 'rocks-generator', category: 'cliff', seed: 'dl', tile: { axis: 'x', length: 6 } });
      const { min, max } = glbBounds(json);
      expect(min[1]).toBeCloseTo(0, 3);
      expect(max[0] - min[0]).toBeCloseTo(6, 3);
      expect(max[1] - min[1]).toBeCloseTo(6, 3);
    });

    test('download with separate parts', async ({ page }, info) => {
      await setSeed(page, 'cluster', 'parts-dl');
      await page.uncheck('#combine');
      const { buf } = await download(page, info);
      const { json } = parseGLB(buf);
      expect(json.meshes.length).toBe(await num(page, 'sP'));
      expect(glbFaces(buf)).toBe(await num(page, 'sF'));
    });

    test('golem chunks export one named node per body part', async ({ page }, info) => {
      await page.selectOption('#gameId', 'golem-rock-chunks');
      await expect(page.locator('#fileName')).toHaveValue('golem-rock-chunks');
      let { json } = parseGLB((await download(page, info, 'g.glb')).buf);
      const names = json.nodes.map((n) => n.name);
      for (const p of ['Pelvis', 'Chest', 'Head', 'UpperArm.L', 'Forearm.R', 'Thigh.L', 'Shin.R']) expect(names).toContain(p);
      // each part's mesh sits around its own node origin
      for (const n of json.nodes.filter((n) => n.name === 'Head' || n.name === 'Chest')) {
        expect(n.translation[1]).toBeGreaterThan(1.2);
        let lo = Infinity, hi = -Infinity;
        for (const c of n.children) for (const p of json.meshes[json.nodes[c].mesh].primitives) {
          const a = json.accessors[p.attributes.POSITION]; lo = Math.min(lo, a.min[1]); hi = Math.max(hi, a.max[1]);
        }
        expect(Math.abs((lo + hi) / 2)).toBeLessThan(0.1);
      }
      expect(json.materials.map((m) => m.name)).toContain('Glow');
      await setOpts(page, { pieces: 'kit' });
      ({ json } = parseGLB((await download(page, info, 'k.glb')).buf));
      expect(json.nodes.map((n) => n.name)).toEqual(expect.arrayContaining(['Torso', 'Head', 'Limb', 'Fist']));
    });

    test('every game id fits its target box and budget', async ({ page }) => {
      test.setTimeout(300_000);
      await page.uncheck('#bloom');
      const rows = await page.evaluate(() => {
        const g = window.__rockgen, T = g.targets();
        return Object.keys(g.GAME_IDS).map((id) => {
          g.rollGame(id, 'fit');
          const t = g.state.traits, d = g.state.current.root.userData.dims;
          return { id, box: t.box, inTable: !!T.objects[id], dims: [d.x, d.y, d.z], faces: Number(document.getElementById('sF').textContent.replace(/\D/g, '')) };
        });
      });
      expect(rows.length).toBeGreaterThanOrEqual(20);
      expect(rows.filter((r) => r.inTable).length).toBeGreaterThanOrEqual(6);
      for (const r of rows) {
        const tgt = [r.box.w, r.box.h, r.box.d];
        for (let a = 0; a < 3; a++) expect(r.dims[a], `${r.id} axis ${a}`).toBeCloseTo(tgt[a], 2);
        const budget = r.box.h <= 1.6 && Math.max(r.box.w, r.box.d) <= 2 ? 1500 : 4500;
        expect(r.faces, r.id).toBeLessThanOrEqual(budget);
      }
      await expect(page.locator('#knight')).toBeChecked();
    });

    test('game id export is game-ready', async ({ page }, info) => {
      await page.selectOption('#gameId', 'cliff-face-a');
      await expect(page.locator('#fileName')).toHaveValue('cliff-face-a');
      await expect(page.locator('#sT')).toContainText('✓');
      await expect(page.locator('#dimW')).toBeDisabled();
      const { buf, name } = await download(page, info, 'c.glb');
      expect(name).toBe('cliff-face-a.glb');
      const { json } = parseGLB(buf);
      for (const m of json.materials) {
        expect(m.pbrMetallicRoughness?.roughnessFactor ?? 1, m.name).toBe(1);
        expect(m.pbrMetallicRoughness?.metallicFactor ?? 1, m.name).toBe(0);
        expect(m.alphaMode ?? 'OPAQUE').toBe('OPAQUE');
      }
      expect(json.nodes.find((n) => n.extras?.gameId)?.extras).toMatchObject({ gameId: 'cliff-face-a', category: 'cliff' });
      const { min, max } = glbBounds(json);
      expect(min[1]).toBeCloseTo(0, 3);
      expect(max[1]).toBeCloseTo(6, 2);
      expect((min[0] + max[0]) / 2).toBeCloseTo(0, 2); // footprint centred
      expect((min[2] + max[2]) / 2).toBeCloseTo(0, 2);
      expect(buf.length).toBeLessThan(1.5 * 1048576);
    });

    test('seed variants download as a zip of <id>-a, -b, -c', async ({ page }, info) => {
      await page.selectOption('#gameId', 'boulder-large-a');
      await page.fill('#variantCount', '3');
      const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#variantsBtn')]);
      expect(dl.suggestedFilename()).toBe('boulder-large-variants.zip');
      const out = info.outputPath('v.zip'); await dl.saveAs(out);
      const zip = fs.readFileSync(out), names = [];
      for (let off = 0; zip.readUInt32LE(off) === 0x04034b50;) { // walk the local file headers
        const size = zip.readUInt32LE(off + 18), n = zip.readUInt16LE(off + 26), fname = zip.subarray(off + 30, off + 30 + n).toString();
        const data = zip.subarray(off + 30 + n, off + 30 + n + size);
        expect(data.subarray(0, 4).toString('latin1'), fname).toBe('glTF');
        names.push(fname); off += 30 + n + size;
      }
      expect(names).toEqual(['boulder-large-a.glb', 'boulder-large-b.glb', 'boulder-large-c.glb']);
    });

    test('a loaded targets.json changes the target size', async ({ page }) => {
      await page.selectOption('#gameId', 'cliff-face-a');
      const json = await page.evaluate(() => JSON.stringify({ ...window.__rockgen.targets(), objects: { 'cliff-face-a': { w: 8, d: 3, h: 5 } } }));
      await page.setInputFiles('#targetsFile', { name: 'targets.json', mimeType: 'application/json', buffer: Buffer.from(json) });
      await expect(page.locator('#log')).toContainText('Targets from targets.json');
      await expect.poll(async () => (await dims(page)).map((v) => +v.toFixed(3))).toEqual([8, 5, 3]);
    });

    test('exported GLB opens in the viewer', async ({ page }, info) => {
      await page.selectOption('#gameId', 'cave-mouth-a');
      const { buf } = await download(page, info);
      const faces = glbFaces(buf);
      const viewer = file.includes('offline') ? 'glb-viewer-offline.html' : 'index.html';
      const v = await openApp(page, viewer);
      await page.setInputFiles('#fileInput', { name: 'cave-mouth-a.glb', mimeType: 'model/gltf-binary', buffer: buf });
      await expect(page.locator('#applyBtn')).toBeEnabled();
      await expect.poll(() => num(page, 'sOF')).toBe(faces);
      expect(v.unexpected()).toEqual([]);
    });
  });
}

