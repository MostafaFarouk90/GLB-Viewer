// Variant forge of the viewer: N seeded variants of one model as <id>.glb, with colour and shape changes.
import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { ROOT, VARIANTS, openApp, loadSample, parseGLB, glbFaces } from './helpers.js';

const sphere = fs.readFileSync(path.join(ROOT, 'tests/fixtures/sphere.glb'));
const asFile = (name, buffer = sphere) => ({ name, mimeType: 'model/gltf-binary', buffer });

// Reads a stored (uncompressed) zip, as the viewer writes it.
function readZip(buf) {
  const out = {}; let off = 0;
  while (buf.readUInt32LE(off) === 0x04034b50) {
    const size = buf.readUInt32LE(off + 18), nameLen = buf.readUInt16LE(off + 26), extra = buf.readUInt16LE(off + 28);
    const name = buf.subarray(off + 30, off + 30 + nameLen).toString('utf8');
    out[name] = buf.subarray(off + 30 + nameLen + extra, off + 30 + nameLen + extra + size);
    off += 30 + nameLen + extra + size;
  }
  return out;
}

// Height (y extent) of a GLB from its POSITION accessor bounds and node transforms (translation and scale only).
function glbBox(buf) {
  const { json } = parseGLB(buf);
  const min = [Infinity, Infinity, Infinity], max = [-Infinity, -Infinity, -Infinity];
  const walk = (i, s, t) => {
    const n = json.nodes[i], ns = n.scale || [1, 1, 1], nt = n.translation || [0, 0, 0];
    const S = s.map((v, k) => v * ns[k]), T = t.map((v, k) => v + s[k] * nt[k]);
    if (n.mesh !== undefined) for (const p of json.meshes[n.mesh].primitives) {
      const a = json.accessors[p.attributes.POSITION];
      for (let k = 0; k < 3; k++) for (const v of [a.min[k], a.max[k]]) {
        const w = T[k] + S[k] * v; min[k] = Math.min(min[k], w); max[k] = Math.max(max[k], w);
      }
    }
    for (const c of n.children || []) walk(c, S, T);
  };
  for (const i of json.scenes[json.scene || 0].nodes) walk(i, [1, 1, 1], [0, 0, 0]);
  return { min, max };
}
const extrasOf = (buf) => {
  const { json } = parseGLB(buf), found = [];
  for (const n of json.nodes) if (n.extras?.variantOf) found.push(n.extras);
  return found[0];
};

const setRange = (page, id, v) => page.locator('#' + id).evaluate((el, v) => {
  el.value = v; el.dispatchEvent(new Event('input', { bubbles: true }));
}, String(v));

for (const file of VARIANTS) {
  test.describe(file, () => {
    let ctx;
    test.beforeEach(async ({ page }) => { ctx = await openApp(page, file); });
    test.afterEach(async () => {
      expect(ctx.unexpected(), 'console/page errors').toEqual([]);
      if (file !== 'index.html') expect(ctx.cdnRequests, 'offline build must not touch the CDN').toEqual([]);
    });

    test('forge exports a zip of <id>.glb variants with a report, and a seed repeats exactly', async ({ page }) => {
      await loadSample(page);
      await page.selectOption('#forgeRecipe', 'strong');
      await expect(page.locator('#forgeHueVar')).toHaveValue('25');
      const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#forgeExportBtn')]);
      expect(dl.suggestedFilename()).toBe('sample-variants-3.zip');
      const zip = readZip(fs.readFileSync(await dl.path()));
      expect(Object.keys(zip).sort()).toEqual(['report.json', 'report.txt', 'sample-b.glb', 'sample-c.glb', 'sample-d.glb']);
      const report = JSON.parse(zip['report.json'].toString('utf8'));
      expect(report.source).toBe('sample');
      expect(report.files.map((f) => f.output)).toEqual(['sample-b.glb', 'sample-c.glb', 'sample-d.glb']);
      // noise and stretch keep the face count; the variants differ from each other
      for (const n of ['sample-b.glb', 'sample-c.glb', 'sample-d.glb']) expect(glbFaces(zip[n])).toBe(1292);
      expect(zip['sample-b.glb'].equals(zip['sample-c.glb'])).toBe(false);
      expect(extrasOf(zip['sample-c.glb'])).toMatchObject({ variantOf: 'sample', variantSeed: 1, variantIndex: 1 });
      await expect(page.locator('#log')).toContainText('Forged 3 variant(s) of sample: sample-b, sample-c, sample-d');
      // the preview row is in the scene, and the Result/Original buttons bring the model back
      expect(await page.evaluate(() => !!window.__glbopt.state.original.parent.getObjectByName('VariantPreview'))).toBe(true);
      await page.click('#viewOriginal');
      expect(await page.evaluate(() => !!window.__glbopt.state.original.parent.getObjectByName('VariantPreview'))).toBe(false);
      expect(await page.evaluate(() => window.__glbopt.state.original.visible)).toBe(true);
      // same seed, same bytes; another seed, other bytes
      const run = () => page.evaluate(async () => {
        const items = await window.__glbopt.forgeVariants(false);
        return items.map((it) => Array.from(new Uint8Array(it.buf)).join(','));
      });
      const a = await run(), b = await run();
      expect(a).toEqual(b);
      await page.fill('#forgeSeed', '7');
      const c = await run();
      expect(c[0]).not.toEqual(a[0]);
    });

    test('ids follow the source letter, typed ids come first', async ({ page }) => {
      const ids = await page.evaluate(() => {
        const { variantIds } = window.__glbopt, f = (count, names = []) => ({ count, names });
        return [variantIds('oak-a', f(3)), variantIds('haystack-round', f(2)), variantIds('oak-a', f(3, ['oak-c'])), variantIds('bush-round-a', f(1, ['bush-holly-a']))];
      });
      expect(ids).toEqual([['oak-b', 'oak-c', 'oak-d'], ['haystack-round-b', 'haystack-round-c'], ['oak-c', 'oak-b', 'oak-d'], ['bush-holly-a']]);
    });

    test('game profile: each variant is fitted to its own target and checked', async ({ page }) => {
      await page.selectOption('#profile', 'embers');
      await expect(page.locator('#targetsInfo')).toContainText('live');
      await page.locator('#fileInput').setInputFiles(asFile('oak-a.glb'));
      await expect(page.locator('#gameId')).toHaveValue('oak-a');
      await page.fill('#forgeCount', '2');
      await setRange(page, 'forgeSizeVar', 30); // clamped inside the tolerance when fitting
      await setRange(page, 'forgeWVar', 10);
      await setRange(page, 'forgeNoise', 2);
      const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#forgeExportBtn')]);
      expect(dl.suggestedFilename()).toBe('oak-a-variants-2.zip');
      const zip = readZip(fs.readFileSync(await dl.path()));
      expect(Object.keys(zip).sort()).toEqual(['oak-b.glb', 'oak-c.glb', 'report.json', 'report.txt']);
      const report = JSON.parse(zip['report.json'].toString('utf8'));
      for (const f of report.files) {
        expect(f.ok, JSON.stringify(f.checks)).toBe(true);
        expect(Math.abs(f.size.h - 13) / 13).toBeLessThanOrEqual(0.15 * 0.8 + 1e-3);
      }
      const box = glbBox(zip['oak-b.glb']);
      expect(box.min[1]).toBeCloseTo(0, 3);
      expect((box.min[0] + box.max[0]) / 2).toBeCloseTo(0, 2);
      expect(zip['report.txt'].toString('utf8')).toMatch(/ok {3}oak-b\.glb/);
    });

    test('holly recipe: one tinted bush-holly-a.glb from bush-round-a', async ({ page }) => {
      await page.selectOption('#profile', 'embers');
      await expect(page.locator('#targetsInfo')).toContainText('live');
      await page.locator('#fileInput').setInputFiles(asFile('bush-round-a.glb'));
      await page.click('#gameReadyBtn');
      await expect(page.locator('#verdict li').first()).toContainText('Result');
      await page.selectOption('#forgeRecipe', 'holly');
      await expect(page.locator('#forgeNames')).toHaveValue('bush-holly-a');
      const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#forgeExportBtn')]);
      expect(dl.suggestedFilename()).toBe('bush-holly-a.glb');
      const buf = fs.readFileSync(await dl.path());
      // targets.json now has bush-holly-a (1.5 x 1.5 x 1.3): the variant is fitted to its height
      const box = glbBox(buf);
      expect(box.max[1] - box.min[1]).toBeCloseTo(1.3, 2);
      expect(extrasOf(buf)).toMatchObject({ variantOf: 'bush-round-a', variant: { hue: -20, saturation: 0.9, tint: '#7fa070' } }); // fitted to the target, so no Scale
      // the material colour carries the multiply tint
      const { json } = parseGLB(buf);
      const f = json.materials[0].pbrMetallicRoughness.baseColorFactor;
      expect(f[1]).toBeGreaterThan(f[0]);
      expect(f[1]).toBeGreaterThan(f[2]);
    });

    test('hue shift recolours the base colour texture of the variant, not the source', async ({ page }) => {
      await page.evaluate(async () => {
        const { THREE, exportGLB, loadBuffer } = window.__glbopt;
        const cv = document.createElement('canvas'); cv.width = cv.height = 32;
        const ctx = cv.getContext('2d'); ctx.fillStyle = '#ff0000'; ctx.fillRect(0, 0, 32, 32);
        const t = new THREE.CanvasTexture(cv); t.flipY = false;
        const root = new THREE.Group(); root.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ map: t })));
        await loadBuffer(await exportGLB(root, [], { texFormat: 'png', texSize: 0, baseOnly: false }), 'crate.glb');
      });
      await page.selectOption('#texFormat', 'png');
      await page.fill('#forgeCount', '1');
      await setRange(page, 'forgeHue', 120);
      const px = await page.evaluate(async () => {
        const [it] = await window.__glbopt.forgeVariants(false);
        const read = (img) => {
          const cv = document.createElement('canvas'); cv.width = img.width; cv.height = img.height;
          const c = cv.getContext('2d'); c.drawImage(img, 0, 0); return Array.from(c.getImageData(4, 4, 1, 1).data.slice(0, 3));
        };
        let vMap; it.root.traverse((o) => { if (o.isMesh) vMap = o.material.map; });
        let sMap; window.__glbopt.state.original.traverse((o) => { if (o.isMesh) sMap = o.material.map; });
        return { variant: read(vMap.image), source: read(sMap.image) };
      });
      expect(px.source[0]).toBeGreaterThan(200); // still red
      expect(px.variant[1]).toBeGreaterThan(200); // red + 120° = green
      expect(px.variant[0]).toBeLessThan(40);
    });

    test('hidden parts are left out of the variant, never all of them', async ({ page }) => {
      await loadSample(page);
      await expect(page.locator('#forgeParts input')).toHaveCount(2);
      await page.locator('#forgeParts input').nth(0).check();
      await page.locator('#forgeParts input').nth(1).check();
      await setRange(page, 'forgeHideChance', 100);
      await page.fill('#forgeCount', '1');
      const r = await page.evaluate(async () => {
        const [it] = await window.__glbopt.forgeVariants(false);
        const names = []; it.root.traverse((o) => { if (o.isMesh) names.push(o.name); });
        return { names, hidden: it.draw.hidden, faces: it.faces };
      });
      expect(r.names).toEqual(['Box']);
      expect(r.hidden).toEqual(['Knot']);
      expect(r.faces).toBe(12);
    });
  });
}
