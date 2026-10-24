// Game profile (Embers), transforms, texture export, presets and batch mode of the viewer.
import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { ROOT, VARIANTS, TARGETS_URL, openApp, apply, num, loadSample, parseGLB, glbFaces, readZip } from './helpers.js';

const sphere = fs.readFileSync(path.join(ROOT, 'tests/fixtures/sphere.glb'));
const asFile = (name, buffer = sphere) => ({ name, mimeType: 'model/gltf-binary', buffer });
const fromPage = async (page, expr) => Buffer.from(await page.evaluate(expr));
const verdict = (page) => page.locator('#verdict li');

// World box of the shown original, as { min, max } arrays.
const boxOf = (page) => page.evaluate(() => {
  const { THREE, state } = window.__glbopt;
  state.original.updateMatrixWorld(true);
  const b = new THREE.Box3().setFromObject(state.original);
  return { min: b.min.toArray(), max: b.max.toArray() };
});

// Builds a textured model in the page and loads it as `name`. Its base colour texture is a JPEG.
async function loadTextured(page, name, { normalMap = false, size = 64 } = {}) {
  await page.evaluate(async ({ name, normalMap, size }) => {
    const { THREE, exportGLB, loadBuffer } = window.__glbopt;
    const cv = document.createElement('canvas'); cv.width = cv.height = size;
    const ctx = cv.getContext('2d');
    for (let i = 0; i < 8; i++) { ctx.fillStyle = `hsl(${i * 45},70%,50%)`; ctx.fillRect(i * size / 8, 0, size / 8, size); }
    const tex = (c) => { const t = new THREE.CanvasTexture(c); t.flipY = false; return t; };
    const mat = new THREE.MeshStandardMaterial({ map: tex(cv), metalness: 1, roughness: 0.2 });
    if (normalMap) mat.normalMap = tex(cv);
    const root = new THREE.Group();
    root.add(new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), mat));
    const buf = await exportGLB(root, [], { texFormat: 'jpeg', texSize: 0, baseOnly: false });
    window.__glbopt.state.loadedBuffer = buf.slice(0);
    await loadBuffer(buf, name);
  }, { name, normalMap, size });
}

for (const file of VARIANTS) {
  test.describe(file, () => {
    let ctx;
    test.beforeEach(async ({ page }) => { ctx = await openApp(page, file); });
    test.afterEach(async () => {
      expect(ctx.unexpected(), 'console/page errors').toEqual([]);
      if (file !== 'index.html') expect(ctx.cdnRequests, 'offline build must not touch the CDN').toEqual([]);
    });

    test('game profile checks the id against targets.json and Make game-ready fixes it', async ({ page }, info) => {
      await page.selectOption('#profile', 'embers');
      await expect(page.locator('#targetsInfo')).toContainText('game repo (live)');
      await expect(page.locator('#texFormat')).toHaveValue('webp');
      await expect(page.locator('#texSize')).toHaveValue('512');
      await expect(page.locator('#baseOnly')).toBeChecked();
      await page.locator('#fileInput').setInputFiles(asFile('cairn-a.glb'));
      await expect(page.locator('#gameId')).toHaveValue('cairn-a');
      // the fixture is a 2 m sphere centred on the origin; cairn-a is 1.2 x 1.2 x 1.3 m
      await expect(verdict(page).filter({ hasText: /^Height/ })).toHaveClass('fail');
      await expect(verdict(page).filter({ hasText: 'Base at y' })).toHaveClass('fail');
      await page.click('#gameReadyBtn');
      await expect(verdict(page).first()).toContainText('Result');
      await expect(verdict(page).filter({ hasText: /^Height/ })).toHaveClass('pass');
      await expect(verdict(page).filter({ hasText: 'Base at y' })).toHaveClass('pass');
      await expect(verdict(page).filter({ hasText: 'Footprint centre' })).toHaveClass('pass');
      await expect(page.locator('#verdict li.fail')).toHaveCount(0);
      const b = await boxOf(page);
      expect(b.max[1] - b.min[1]).toBeCloseTo(1.3, 3);
      expect(b.min[1]).toBeCloseTo(0, 4);
      const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#downloadBtn')]);
      expect(dl.suggestedFilename()).toBe('cairn-a.glb');
      const out = info.outputPath('cairn-a.glb'); await dl.saveAs(out);
      // the file reloads at the fitted size and place
      await page.evaluate((a) => window.__glbopt.loadBuffer(new Uint8Array(a).buffer, 'cairn-a.glb'), Array.from(fs.readFileSync(out)));
      const r = await boxOf(page);
      expect(r.max[1] - r.min[1]).toBeCloseTo(1.3, 3);
      expect(r.min[1]).toBeCloseTo(0, 4);
      await expect(page.locator('#verdict li.fail')).toHaveCount(0);
    });

    test('unknown ids fail, and a typed id is used instead', async ({ page }) => {
      await page.selectOption('#profile', 'embers');
      await page.locator('#fileInput').setInputFiles(asFile('my rock.glb'));
      await expect(verdict(page).filter({ hasText: 'no target' })).toHaveClass('fail');
      await page.locator('#gameId').fill('cairn-a');
      await expect(verdict(page).filter({ hasText: 'no target' })).toHaveCount(0);
      await expect(verdict(page).filter({ hasText: /^Height/ })).toContainText('target 1.30 m');
      await expect(page.locator('#heightM')).toHaveValue('1.3');
    });

    test('proportion ids are not failed on width or depth', async ({ page }) => {
      await page.selectOption('#profile', 'embers');
      await page.locator('#fileInput').setInputFiles(asFile('barn-a.glb'));
      await page.click('#gameReadyBtn');
      await expect(verdict(page).filter({ hasText: 'Width' })).toHaveClass('info');
      await expect(verdict(page).filter({ hasText: 'Width' })).toContainText('fits barn-a exactly');
    });

    test('live targets.json from the game repo replaces the built-in copy; a loaded file wins', async ({ page }, info) => {
      await page.route(TARGETS_URL, (r) => r.fulfill({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify({ objects: { 'test-rock': { w: 1, d: 1, h: 2 } }, maxTriangles: 500 }) }));
      await page.selectOption('#profile', 'embers');
      await expect(page.locator('#targetsInfo')).toContainText('1 target sizes from the game repo (live)');
      await page.locator('#fileInput').setInputFiles(asFile('test-rock.glb'));
      await expect(verdict(page).filter({ hasText: /^Height/ })).toHaveClass('pass'); // the sphere is 2 m high
      await expect(verdict(page).filter({ hasText: 'triangles' })).toHaveClass('fail'); // 720 > 500
      const f = info.outputPath('targets.json');
      fs.mkdirSync(path.dirname(f), { recursive: true });
      fs.writeFileSync(f, JSON.stringify({ objects: { 'test-rock': { w: 1, d: 1, h: 4 } } }));
      await page.locator('#targetsInput').setInputFiles(f);
      await expect(page.locator('#targetsInfo')).toContainText('from targets.json');
      await expect(verdict(page).filter({ hasText: /^Height/ })).toHaveClass('fail');
    });

    test('falls back to the built-in targets when the game repo is unreachable', async ({ page }) => {
      ctx.allowed.push(/Failed to load resource|ERR_FAILED|ERR_INTERNET_DISCONNECTED/);
      await page.route(TARGETS_URL, (r) => r.abort());
      await page.selectOption('#profile', 'embers');
      await expect(page.locator('#log .warn')).toContainText('Could not load the live targets.json');
      await expect(page.locator('#targetsInfo')).toContainText('the copy built into this page');
    });

    test('transform buttons: pivot, rotate, Z-up, scale, bake', async ({ page }) => {
      await loadSample(page);
      await page.click('#pivotBtn');
      let b = await boxOf(page);
      expect(b.min[1]).toBeCloseTo(0, 5);
      expect((b.min[0] + b.max[0]) / 2).toBeCloseTo(0, 5);
      expect((b.min[2] + b.max[2]) / 2).toBeCloseTo(0, 5);
      const w = b.max[0] - b.min[0], d = b.max[2] - b.min[2];
      await page.click('#rotLBtn');
      b = await boxOf(page);
      expect(b.max[0] - b.min[0]).toBeCloseTo(d, 4); expect(b.max[2] - b.min[2]).toBeCloseTo(w, 4);
      const h = b.max[1] - b.min[1];
      await page.click('#zupBtn');
      b = await boxOf(page);
      expect(b.max[1] - b.min[1]).not.toBeCloseTo(h, 2); // depth became height
      await page.locator('#heightM').fill('3');
      await page.click('#scaleBtn');
      b = await boxOf(page);
      expect(b.max[1] - b.min[1]).toBeCloseTo(3, 4);
      const faces = await num(page, 'sOF');
      await page.click('#bakeBtn');
      const after = await boxOf(page);
      for (let i = 0; i < 3; i++) { expect(after.min[i]).toBeCloseTo(b.min[i], 4); expect(after.max[i]).toBeCloseTo(b.max[i], 4); }
      const identity = await page.evaluate(() => {
        let ok = true; window.__glbopt.state.original.traverse((o) => { o.updateMatrix(); if (!o.matrix.equals(new window.__glbopt.THREE.Matrix4())) ok = false; });
        return ok;
      });
      expect(identity).toBe(true);
      expect(await num(page, 'sOF')).toBe(faces);
      await apply(page);
      expect(await num(page, 'sRF')).toBe(faces);
    });

    test('WebP export declares EXT_texture_webp; base colour only drops the other maps', async ({ page }) => {
      await loadTextured(page, 'tex.glb', { normalMap: true });
      await page.selectOption('#texFormat', 'webp');
      await page.locator('#baseOnly').check();
      await apply(page);
      const glb = await fromPage(page, () => Array.from(new Uint8Array(window.__glbopt.state.lastExport)));
      const { json, bin } = parseGLB(glb);
      expect(json.extensionsUsed).toContain('EXT_texture_webp');
      expect(json.extensionsRequired).toContain('EXT_texture_webp');
      expect(json.textures.length).toBe(1);
      const img = json.images[json.textures[0].extensions.EXT_texture_webp.source];
      expect(img.mimeType).toBe('image/webp');
      const bv = json.bufferViews[img.bufferView];
      expect(bin.subarray(bv.byteOffset + 8, bv.byteOffset + 12).toString('latin1')).toBe('WEBP');
      const mat = json.materials[0];
      expect(mat.normalTexture).toBeUndefined();
      expect(mat.pbrMetallicRoughness.baseColorTexture).toBeDefined();
      expect(mat.pbrMetallicRoughness.metallicFactor ?? 1).toBe(0);
      expect(mat.pbrMetallicRoughness.roughnessFactor ?? 1).toBe(1);
      // the shown model keeps its normal map; the file loads back
      expect(await page.evaluate(() => { let n = 0; window.__glbopt.state.result.traverse((o) => { if (o.isMesh && o.material.normalMap) n++; }); return n; })).toBe(1);
      await page.evaluate((a) => window.__glbopt.loadBuffer(new Uint8Array(a).buffer, 'back.glb'), Array.from(glb));
      expect(await page.evaluate(() => { let n = 0; window.__glbopt.state.original.traverse((o) => { if (o.isMesh && o.material.map) n++; }); return n; })).toBe(1);
    });

    test('"Keep" writes the original image bytes instead of re-encoding them', async ({ page }) => {
      await loadTextured(page, 'tex.glb', { size: 512 });
      const imageOf = (glb) => {
        const { json, bin } = parseGLB(glb), bv = json.bufferViews[json.images[0].bufferView];
        return { mime: json.images[0].mimeType, bytes: Buffer.from(bin.subarray(bv.byteOffset || 0, (bv.byteOffset || 0) + bv.byteLength)) };
      };
      const loaded = imageOf(await fromPage(page, () => Array.from(new Uint8Array(window.__glbopt.state.loadedBuffer))));
      expect(loaded.mime).toBe('image/jpeg');
      await page.selectOption('#texFormat', 'keep');
      await page.selectOption('#texSize', '0');
      await apply(page);
      const kept = imageOf(await fromPage(page, () => Array.from(new Uint8Array(window.__glbopt.state.lastExport))));
      expect(kept.mime).toBe('image/jpeg');
      expect(kept.bytes.equals(loaded.bytes)).toBe(true);
      // a resize has to re-encode, but keeps the format
      await page.selectOption('#texSize', '256');
      await apply(page);
      const resized = imageOf(await fromPage(page, () => Array.from(new Uint8Array(window.__glbopt.state.lastExport))));
      expect(resized.mime).toBe('image/jpeg');
      expect(resized.bytes.equals(loaded.bytes)).toBe(false);
    });

    test('face budget presets never subdivide; huge targets ask first', async ({ page }) => {
      await page.evaluate(async () => {
        const { THREE, exportGLB, loadBuffer } = window.__glbopt;
        const root = new THREE.Group(); root.add(new THREE.Mesh(new THREE.SphereGeometry(1, 64, 64), new THREE.MeshStandardMaterial()));
        await loadBuffer(await exportGLB(root, []), 'ball.glb');
      });
      const orig = await num(page, 'sOF');
      expect(orig).toBeGreaterThan(6000);
      await page.selectOption('#facePreset', '1500');
      await expect(page.locator('#targetFaces')).toHaveValue('1500');
      await page.selectOption('#facePreset', '6000');
      await expect(page.locator('#targetFaces')).toHaveValue('6000');
      await apply(page);
      expect(Math.abs(await num(page, 'sRF') - 6000) / 6000).toBeLessThanOrEqual(0.1);
      // typing a value switches the preset to Custom
      await page.locator('#targetFaces').fill('200000');
      await expect(page.locator('#facePreset')).toHaveValue('0');
      let asked = '';
      page.once('dialog', (d) => { asked = d.message(); d.dismiss(); });
      await page.click('#applyBtn');
      await expect(page.locator('#log .warn').last()).toContainText('Apply cancelled');
      expect(asked).toContain('200,000');
      expect(await num(page, 'sRF')).toBeLessThan(10000); // nothing ran
    });

    test('batch: several files give a zip of <id>.glb plus a report', async ({ page }) => {
      await page.selectOption('#profile', 'embers');
      await expect(page.locator('#targetsInfo')).toContainText('live');
      const [dl] = await Promise.all([
        page.waitForEvent('download'),
        page.locator('#fileInput').setInputFiles([asFile('cairn-a.glb'), asFile('Bush_Round_A.glb'), asFile('mystery.glb')]),
      ]);
      expect(dl.suggestedFilename()).toBe('game-ready-3-files.zip');
      const zip = readZip(fs.readFileSync(await dl.path()));
      expect(Object.keys(zip).sort()).toEqual(['bush-round-a.glb', 'cairn-a.glb', 'mystery.glb', 'report.json', 'report.txt']);
      expect(glbFaces(zip['cairn-a.glb'])).toBe(720);
      const report = JSON.parse(zip['report.json'].toString('utf8'));
      const byId = Object.fromEntries(report.files.map((f) => [f.id, f]));
      expect(byId['cairn-a'].ok).toBe(true);
      expect(byId['cairn-a'].size.h).toBeCloseTo(1.3, 2);
      expect(byId['bush-round-a'].size.h).toBeCloseTo(1.1, 2);
      expect(byId.mystery.ok).toBe(false); // no target for that id
      expect(zip['report.txt'].toString('utf8')).toMatch(/ok {3}cairn-a\.glb/);
      await expect(page.locator('#log')).toContainText('Batch done: 3 of 3 files');
    });

    test('scale aids show sizes, the figure and the facing arrow', async ({ page }) => {
      await loadSample(page);
      await expect(page.locator('#labels')).toContainText('W ');
      await expect(page.locator('#labels')).toContainText('1.8 m');
      await expect(page.locator('#labels')).toContainText('+Z front');
      await page.locator('#aids').uncheck();
      await expect(page.locator('#labels .lbl')).toHaveCount(0);
      // the aids are not part of the export
      await apply(page);
      const { json } = parseGLB(await fromPage(page, () => Array.from(new Uint8Array(window.__glbopt.state.lastExport))));
      expect(json.meshes.length).toBe(2);
    });
  });
}

test('the built-in targets copy matches embers/targets.json', () => {
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const m = html.match(/<script type="application\/json" id="embersTargets">([\s\S]*?)<\/script>/);
  expect(JSON.parse(m[1])).toEqual(JSON.parse(fs.readFileSync(path.join(ROOT, 'embers/targets.json'), 'utf8')));
});
