import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { ROOT, VARIANTS, openApp, apply, num, loadSample, parseGLB, glbFaces } from './helpers.js';

for (const file of VARIANTS) {
  test.describe(file, () => {
    let ctx;
    test.beforeEach(async ({ page }) => { ctx = await openApp(page, file); });
    test.afterEach(async () => {
      expect(ctx.unexpected(), 'console/page errors').toEqual([]);
      if (file !== 'index.html') expect(ctx.cdnRequests, 'offline build must not touch the CDN').toEqual([]);
    });

    test('starts with no errors', async ({ page }) => {
      await expect(page.locator('#log')).toContainText('Ready');
      await expect(page.locator('#applyBtn')).toBeDisabled();
      await expect(page.locator('#downloadBtn')).toBeDisabled();
    });

    test('load sample fills original stats', async ({ page }) => {
      await loadSample(page);
      expect(await num(page, 'sOF')).toBeGreaterThan(1000);
      expect(await num(page, 'sOV')).toBeGreaterThan(0);
      expect(await num(page, 'sOM')).toBe(2);
      await expect(page.locator('#sOS')).toHaveText(/\d.*(B|KB|MB)$/);
      await expect(page.locator('#downloadBtn')).toBeEnabled();
      await expect(page.locator('#resetBtn')).toBeEnabled();
    });

    test('decimate to ~50%', async ({ page }) => {
      await loadSample(page);
      const orig = await num(page, 'sOF');
      await page.locator('#ratio').fill('50');
      const target = Number(await page.locator('#targetFaces').inputValue());
      expect(target).toBeCloseTo(orig / 2, -1);
      await apply(page);
      const res = await num(page, 'sRF');
      expect(res).toBeLessThan(orig);
      expect(Math.abs(res - target) / target).toBeLessThanOrEqual(0.1);
    });

    test('subdivide to 400%', async ({ page }) => {
      await loadSample(page);
      const orig = await num(page, 'sOF');
      const target = orig * 4;
      await page.locator('#targetFaces').fill(String(target));
      await apply(page);
      const res = await num(page, 'sRF');
      expect(res).toBeGreaterThan(orig);
      expect(Math.abs(res - target) / target).toBeLessThanOrEqual(0.1);
    });

    test('smoothing moves vertices', async ({ page }) => {
      await loadSample(page);
      const positions = () => page.evaluate(() => {
        const out = []; window.__glbopt.state.result.traverse((o) => {
          if (o.isMesh && o.name.includes('Knot')) out.push(...o.geometry.attributes.position.array);
        });
        return out;
      });
      await apply(page);
      const plain = await positions();
      await page.locator('#smoothIter').fill('5');
      await expect(page.locator('#smoothIterVal')).toHaveText('5');
      await apply(page);
      const smooth = await positions();
      expect(smooth.length).toBe(plain.length);
      expect(plain.length).toBeGreaterThan(0);
      const maxDiff = Math.max(...smooth.map((v, i) => Math.abs(v - plain[i])));
      expect(maxDiff).toBeGreaterThan(1e-4);
      expect(await num(page, 'sRF')).toBe(await num(page, 'sOF'));
    });

    test('fit to target file size', async ({ page }) => {
      await loadSample(page);
      const origBytes = await page.evaluate(() => window.__glbopt.state.originalBytes);
      const targetMB = +(origBytes / 2 / 1048576).toFixed(3);
      await page.locator('#useSize').check();
      await page.locator('#targetMB').fill(String(targetMB));
      await apply(page);
      const bytes = await page.evaluate(() => window.__glbopt.state.lastExport.byteLength);
      const warned = await page.locator('#log .warn', { hasText: /reach/i }).count();
      expect(bytes <= targetMB * 1048576 || warned > 0, `result ${bytes} B vs target ${targetMB} MB`).toBe(true);
      expect(bytes).toBeLessThan(origBytes);
      expect(await num(page, 'sRF')).toBeLessThan(await num(page, 'sOF'));
    });

    test('download produces a valid GLB', async ({ page }, info) => {
      await loadSample(page);
      await page.locator('#ratio').fill('50');
      await apply(page);
      const resultFaces = await num(page, 'sRF');
      const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#downloadBtn')]);
      expect(dl.suggestedFilename()).toMatch(/\.glb$/);
      const out = info.outputPath('download.glb');
      await dl.saveAs(out);
      const buf = fs.readFileSync(out);
      expect(buf.length).toBeGreaterThan(100);
      expect(buf.subarray(0, 4).toString('latin1')).toBe('glTF');
      // reload the downloaded file into the app
      await page.evaluate((b64) => {
        const bin = atob(b64), u8 = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
        return window.__glbopt.loadBuffer(u8.buffer, 'reloaded.glb');
      }, buf.toString('base64'));
      expect(await num(page, 'sOF')).toBe(resultFaces);
    });

    test('open a GLB through the file input', async ({ page }) => {
      await page.locator('#fileInput').setInputFiles(path.join(ROOT, 'tests/fixtures/sphere.glb'));
      await expect(page.locator('#applyBtn')).toBeEnabled();
      await expect(page.locator('#sOF')).toHaveText('720');
      await expect(page.locator('#sOM')).toHaveText('1');
      await expect(page.locator('#filename')).toContainText('sphere.glb');
      await page.locator('#targetFaces').fill('360');
      await apply(page);
      const res = await num(page, 'sRF');
      expect(Math.abs(res - 360) / 360).toBeLessThanOrEqual(0.1);
    });

    test('multi-material meshes keep their groups and materials', async ({ page }) => {
      const info = await page.evaluate(async () => {
        const { THREE, exportGLB, setOriginal } = window.__glbopt;
        const root = new THREE.Group(); root.name = 'Multi';
        const colors = [0xff0000, 0x00ff00, 0x0000ff, 0xffff00, 0xff00ff, 0x00ffff, 0x888888, 0x444444];
        const mats = colors.map((c) => new THREE.MeshStandardMaterial({ color: c }));
        const box = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1, 8, 8, 8), mats.slice(0, 6));
        box.name = 'Box'; box.position.x = -1.5; root.add(box);
        const sg = new THREE.SphereGeometry(1, 32, 16);
        const half = Math.floor(sg.index.count / 6) * 3;
        sg.clearGroups(); sg.addGroup(0, half, 0); sg.addGroup(half, sg.index.count - half, 1);
        const sphere = new THREE.Mesh(sg, mats.slice(6, 8));
        sphere.name = 'Sphere'; sphere.position.x = 1.5; root.add(sphere);
        const buf = await exportGLB(root, []);
        setOriginal(root, [], buf.byteLength, 'multi.glb'); // code-built object, so geometry groups exist
        return { groups: { Box: box.geometry.groups.length, Sphere: sg.groups.length } };
      });
      expect(info.groups).toEqual({ Box: 6, Sphere: 2 });
      await expect(page.locator('#applyBtn')).toBeEnabled();
      const orig = await num(page, 'sOF');
      await page.locator('#ratio').fill('50');
      await apply(page);
      expect(await num(page, 'sRF')).toBeLessThan(orig * 0.75);
      const res = await page.evaluate(() => {
        const out = {};
        window.__glbopt.state.result.traverse((o) => {
          if (o.isMesh) out[o.name] = { groups: o.geometry.groups.length, mats: Array.isArray(o.material) ? o.material.length : 1 };
        });
        return out;
      });
      expect(res).toEqual({ Box: { groups: 6, mats: 6 }, Sphere: { groups: 2, mats: 2 } });
      // the exported file has one primitive per group, each with its own material
      const glb = Buffer.from(await page.evaluate(() => Array.from(new Uint8Array(window.__glbopt.state.lastExport))));
      const { json } = parseGLB(glb);
      const prims = json.meshes.flatMap((m) => m.primitives);
      expect(prims.length).toBe(8);
      expect(new Set(prims.map((p) => p.material)).size).toBe(8);
      expect(json.materials.length).toBe(8);
      expect(glbFaces(glb)).toBe(await num(page, 'sRF'));
      // and it loads back
      await page.evaluate((a) => window.__glbopt.loadBuffer(new Uint8Array(a).buffer, 'reloaded.glb'), Array.from(glb));
      expect(await num(page, 'sOM')).toBe(8);
      expect(await num(page, 'sOF')).toBe(glbFaces(glb));
    });

    test('.gltf with an external .bin loads when both files are selected', async ({ page }, info) => {
      // Turn the GLB fixture into "my model.gltf" + "my model.bin".
      const { json, bin } = parseGLB(fs.readFileSync(path.join(ROOT, 'tests/fixtures/sphere.glb')));
      json.buffers = [{ uri: 'my%20model.bin', byteLength: bin.length }];
      const gltf = info.outputPath('my model.gltf'), binPath = info.outputPath('my model.bin');
      fs.mkdirSync(path.dirname(gltf), { recursive: true });
      fs.writeFileSync(gltf, JSON.stringify(json));
      fs.writeFileSync(binPath, bin);

      await page.locator('#fileInput').setInputFiles([gltf, binPath]);
      await expect(page.locator('#applyBtn')).toBeEnabled();
      await expect(page.locator('#sOF')).toHaveText('720');
      await expect(page.locator('#filename')).toContainText('my model.gltf');
    });

    test('.gltf without its .bin reports the missing file', async ({ page }, info) => {
      ctx.allowed.push(/my model\.bin|my%20model\.bin|Failed to load resource|ERR_FILE_NOT_FOUND/);
      const { json, bin } = parseGLB(fs.readFileSync(path.join(ROOT, 'tests/fixtures/sphere.glb')));
      json.buffers = [{ uri: 'my%20model.bin', byteLength: bin.length }];
      const gltf = info.outputPath('my model.gltf');
      fs.mkdirSync(path.dirname(gltf), { recursive: true });
      fs.writeFileSync(gltf, JSON.stringify(json));

      await page.locator('#fileInput').setInputFiles(gltf);
      await expect(page.locator('#log .err')).toContainText('my model.bin');
      await expect(page.locator('#applyBtn')).toBeDisabled();
    });

    test('download after changing settings re-runs with the new settings', async ({ page }, info) => {
      await loadSample(page);
      await page.locator('#ratio').fill('50');
      await apply(page);
      const at50 = await num(page, 'sRF');
      await page.locator('#ratio').fill('25');
      const target = Number(await page.locator('#targetFaces').inputValue());
      await expect(page.locator('#downloadBtn')).toContainText('re-run');
      const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#downloadBtn')]);
      const out = info.outputPath('dirty.glb');
      await dl.saveAs(out);
      const faces = glbFaces(fs.readFileSync(out));
      expect(faces).toBeLessThan(at50);
      expect(Math.abs(faces - target) / target).toBeLessThanOrEqual(0.1);
      await expect(page.locator('#downloadBtn')).not.toContainText('re-run');
    });
  });
}
