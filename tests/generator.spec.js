import fs from 'node:fs';
import { test, expect } from '@playwright/test';
import { GENERATOR_VARIANTS, openApp, apply, num, parseGLB, glbFaces } from './helpers.js';

const setSeed = async (page, archetype, seed) => {
  await page.selectOption('#archetype', archetype);
  await page.fill('#seed', seed);
  await page.press('#seed', 'Enter');
  await expect(page.locator('#log')).toContainText(`seed "${seed}"`);
};

async function download(page, info, name = 'character.glb') {
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#downloadBtn')]);
  expect(dl.suggestedFilename()).toMatch(/\.glb$/);
  const out = info.outputPath(name);
  await dl.saveAs(out);
  return fs.readFileSync(out);
}

for (const file of GENERATOR_VARIANTS) {
  test.describe(file, () => {
    let ctx;
    test.beforeEach(async ({ page }) => { ctx = await openApp(page, file, '__chargen'); });
    test.afterEach(async () => {
      expect(ctx.unexpected(), 'console/page errors').toEqual([]);
      if (file.includes('offline')) expect(ctx.cdnRequests, 'offline build must not touch the CDN').toEqual([]);
    });

    test('starts with a character', async ({ page }) => {
      expect(await num(page, 'sF')).toBeGreaterThan(500);
      expect(await num(page, 'sP')).toBeGreaterThan(5);
      await expect(page.locator('#charName')).not.toBeEmpty();
      await expect(page.locator('#downloadBtn')).toBeEnabled();
    });

    test('every archetype builds', async ({ page }) => {
      const archetypes = await page.evaluate(() => Object.keys(window.__chargen.ARCH));
      expect(archetypes.length).toBeGreaterThanOrEqual(8);
      for (const a of archetypes) {
        await setSeed(page, a, 'test-' + a);
        expect(await num(page, 'sF'), a).toBeGreaterThan(300);
        const h = await num(page, 'sH');
        expect(h, a).toBeGreaterThan(0.5);
        expect(h, a).toBeLessThan(5);
      }
    });

    test('every part option builds', async ({ page }) => {
      test.setTimeout(300_000); // ~40 rebuilds per archetype in software WebGL
      await page.uncheck('#bloom');
      await page.uncheck('#rotate');
      const options = await page.evaluate(() => window.__chargen.OPTIONS);
      for (const a of ['wizard', 'golem', 'specter']) {
        await setSeed(page, a, 'parts');
        for (const [slot, values] of Object.entries(options)) for (const v of Object.keys(values)) {
          await page.selectOption('#' + slot, v);
          await expect.poll(() => page.evaluate((k) => window.__chargen.state.traits[k], slot), { message: `${a} ${slot}=${v}` }).toBe(v);
          expect(await num(page, 'sF'), `${a} ${slot}=${v}`).toBeGreaterThan(300);
        }
        for (const pose of ['a', 't', 'cast']) await page.selectOption('#pose', pose);
      }
    });

    test('same seed gives the same character, another seed a different one', async ({ page }) => {
      await setSeed(page, 'demon', 'abc');
      const first = { name: await page.locator('#charName').textContent(), faces: await num(page, 'sF') };
      await page.click('#randomBtn');
      await expect(page.locator('#seed')).not.toHaveValue('abc');
      await setSeed(page, 'demon', 'abc');
      expect({ name: await page.locator('#charName').textContent(), faces: await num(page, 'sF') }).toEqual(first);
      const traits = await page.evaluate(() => {
        const g = window.__chargen;
        return [JSON.stringify(g.rollTraits('elf', 's1')), JSON.stringify(g.rollTraits('elf', 's1')), JSON.stringify(g.rollTraits('elf', 's2'))];
      });
      expect(traits[0]).toBe(traits[1]);
      expect(traits[0]).not.toBe(traits[2]);
    });

    test('sliders and style change the model', async ({ page }) => {
      await setSeed(page, 'elf', 'sl');
      await page.locator('#height').fill('3');
      await expect.poll(() => num(page, 'sH')).toBeGreaterThan(2.9);
      const smooth = await num(page, 'sV');
      await page.selectOption('#style', 'lowpoly');
      await expect.poll(() => num(page, 'sV')).toBeGreaterThan(smooth);
      const med = await num(page, 'sF');
      await page.selectOption('#detail', 'high');
      await expect.poll(() => num(page, 'sF')).toBeGreaterThan(med);
    });

    test('download produces a valid GLB (combined, animated)', async ({ page }, info) => {
      await setSeed(page, 'fairy', 'dl');
      await page.selectOption('#aura', 'crystals');
      await expect.poll(() => page.evaluate(() => window.__chargen.state.traits.aura)).toBe('crystals');
      const buf = await download(page, info);
      const { json, bin } = parseGLB(buf);
      expect(bin.length).toBeGreaterThan(1000);
      expect(json.asset.version).toBe('2.0');
      const nodeNames = json.nodes.map((n) => n.name);
      expect(nodeNames).toContain('Body');
      expect(nodeNames).toContain('Aura');
      // one mesh per material and node
      expect(json.meshes.length).toBeLessThanOrEqual(json.materials.length * 2);
      expect(json.materials.map((m) => m.name)).toContain('Glow');
      expect(json.animations?.[0]?.name).toBe('Idle');
      expect(json.animations[0].channels.map((c) => c.target.path).sort()).toEqual(['rotation', 'translation']);
      // exported faces match what the page shows (combining only merges vertices)
      expect(glbFaces(buf)).toBe(await num(page, 'sF'));
      // character stands on the ground, about the shown height
      const body = json.meshes.flatMap((m) => m.primitives).map((p) => json.accessors[p.attributes.POSITION]);
      const minY = Math.min(...body.map((a) => a.min[1])), maxY = Math.max(...body.map((a) => a.max[1]));
      expect(minY).toBeGreaterThan(-0.5);
      expect(maxY).toBeGreaterThan(0.5);
    });

    test('download with separate parts and no animation', async ({ page }, info) => {
      await setSeed(page, 'wizard', 'parts-dl');
      await page.uncheck('#combine');
      await page.uncheck('#anim');
      const buf = await download(page, info);
      const { json } = parseGLB(buf);
      expect(json.meshes.length).toBe(await num(page, 'sP'));
      expect(json.animations ?? []).toEqual([]);
      expect(glbFaces(buf)).toBe(await num(page, 'sF'));
    });

    test('exported GLB opens in the viewer and can be decimated', async ({ page }, info) => {
      await setSeed(page, 'demon', 'roundtrip');
      const faces = await num(page, 'sF');
      const buf = await download(page, info);
      const viewer = file.includes('offline') ? 'glb-viewer-offline.html' : 'index.html';
      const v = await openApp(page, viewer);
      await page.setInputFiles('#fileInput', { name: 'demon.glb', mimeType: 'model/gltf-binary', buffer: buf });
      await expect(page.locator('#applyBtn')).toBeEnabled();
      expect(await num(page, 'sOF')).toBe(faces);
      await page.locator('#ratio').fill('50');
      await apply(page);
      expect(await num(page, 'sRF')).toBeLessThan(faces * 0.6);
      expect(v.unexpected()).toEqual([]);
    });
  });
}
