import fs from 'node:fs';
import { test, expect } from '@playwright/test';
import { GENERATOR_VARIANTS, openApp, apply, num, parseGLB, glbFaces, readZip } from './helpers.js';

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
      test.setTimeout(600_000); // ~70 rebuilds per archetype in software WebGL
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

    test('KayKit look, skeleton, one material and game budget', async ({ page }, info) => {
      await expect(page.locator('#chibi')).not.toBeChecked(); // the general generator is not limited to the chibi look
      await expect(page.locator('#rig')).not.toBeChecked();
      await page.uncheck('#bloom');
      await page.check('#chibi');
      await expect(page.locator('#limbs')).toBeDisabled();
      await page.check('#rig');
      await expect(page.locator('#pose')).toBeDisabled();
      await page.check('#atlas');
      await page.selectOption('#detail', 'game');
      await setSeed(page, 'elf', 'kk');
      await page.selectOption('#item', 'sword');
      await expect.poll(() => page.evaluate(() => window.__chargen.state.traits.item)).toBe('sword');
      const shown = await num(page, 'sF');
      expect(shown).toBeLessThanOrEqual(4000);
      expect(shown).toBeGreaterThan(2500);
      const buf = await download(page, info);
      const { json } = parseGLB(buf);
      expect(glbFaces(buf)).toBe(shown);
      // KayKit Adventurers skeleton: 41 bones with KayKit's names and, on the chibi body, KayKit's rest offsets
      const kk = await page.evaluate(() => window.__chargen.KK_BONES);
      expect(json.skins.length).toBe(1);
      const joints = json.skins[0].joints.map((j) => json.nodes[j]);
      expect(joints.map((n) => n.name).sort()).toEqual(kk.map((b) => b[0]).sort());
      expect(joints.length).toBe(41);
      for (const [name, , tr, q] of kk) {
        const n = joints.find((j) => j.name === name);
        (n.translation ?? [0, 0, 0]).forEach((v, i) => expect(v, name).toBeCloseTo(tr[i], 3));
        (n.rotation ?? [0, 0, 0, 1]).forEach((v, i) => expect(v, name).toBeCloseTo(q[i], 3));
      }
      // every skinned primitive carries joints and weights; the held item hangs on handslot.r
      const skinnedNodes = json.nodes.filter((n) => n.skin !== undefined);
      expect(skinnedNodes.length).toBeGreaterThan(0);
      for (const n of skinnedNodes) for (const p of json.meshes[n.mesh].primitives) {
        expect(p.attributes.JOINTS_0).toBeDefined(); expect(p.attributes.WEIGHTS_0).toBeDefined();
      }
      const slot = joints.find((n) => n.name === 'handslot.r');
      expect(slot.children.map((c) => json.nodes[c].name)).toContain('Item');
      // one palette material (+ Glow), one small texture
      expect(json.materials.map((m) => m.name).every((n) => n === 'Palette' || n === 'Glow')).toBe(true);
      expect(json.images.length).toBe(1);
      const pal = json.materials.find((m) => m.name === 'Palette');
      expect(pal.pbrMetallicRoughness.roughnessFactor ?? 1).toBe(1);
      expect(pal.pbrMetallicRoughness.metallicFactor ?? 1).toBe(0);
      // archetype and seed in the root node's extras
      const root = json.nodes[json.scenes[0].nodes[0]];
      expect(root.extras).toMatchObject({ archetype: 'elf', seed: 'kk', chibi: true });
      expect(root.extras.traits.item).toBe('sword');
      expect(root.children.map((c) => json.nodes[c].name)).toContain('Rig');
    });

    test('KayKit skeleton on a realistic body keeps bone names and rotations', async ({ page }, info) => {
      await page.check('#rig');
      await setSeed(page, 'demon', 'kk2');
      const buf = await download(page, info);
      const { json } = parseGLB(buf);
      const kk = await page.evaluate(() => window.__chargen.KK_BONES);
      const joints = json.skins[0].joints.map((j) => json.nodes[j]);
      expect(joints.length).toBe(41);
      const arm = joints.find((n) => n.name === 'upperarm.l'), kArm = kk.find((b) => b[0] === 'upperarm.l');
      arm.rotation.forEach((v, i) => expect(v).toBeCloseTo(kArm[3][i], 3));
      // moved onto this body's (longer) arm
      expect(joints.find((n) => n.name === 'lowerarm.l').translation[1]).toBeGreaterThan(0.25);
      expect(json.materials.length).toBeGreaterThan(2); // per-colour materials unless "One material" is on
      expect(glbFaces(buf)).toBe(await num(page, 'sF'));
    });

    test('townsfolk archetypes roll everyday clothing; older archetypes are unchanged', async ({ page }) => {
      const r = await page.evaluate(() => {
        const g = window.__chargen, town = Object.keys(g.ARCH).filter((a) => g.ARCH[a].group === 'Townsfolk');
        return { town, guard: g.rollTraits('guard', 'g1'), wizard: g.rollTraits('wizard', 'w1'), survivors: [1, 2, 3, 4, 5, 6].map((i) => g.rollTraits('survivor', 's' + i).ash) };
      });
      expect(r.town.sort()).toEqual(['blacksmith', 'farmer', 'guard', 'merchant', 'miner', 'priest', 'survivor', 'villager']);
      expect(r.guard).toMatchObject({ outfit: 'armor', headwear: 'helmet', shoulders: 'pauldrons', boots: 'boots', ash: false });
      expect(r.guard.colors.leather).toMatch(/^#[0-9a-f]{6}$/);
      expect(r.survivors.filter(Boolean).length).toBeGreaterThan(2); // mostly ash-covered
      // archetypes from before the townsfolk keep their rolls: the new slots are 'none' and draw nothing from the seed
      expect(r.wizard).toMatchObject({ offhand: 'none', cloak: 'none', back: 'none', shoulders: 'none', apron: 'none', boots: 'none', ash: false });
      // the archetype list groups them
      await expect(page.locator('#archetype optgroup')).toHaveCount(2);
      await setSeed(page, 'survivor', 'ash');
      await page.check('#ash');
      await expect.poll(() => page.evaluate(() => window.__chargen.state.traits.ash)).toBe(true);
      const ashy = await page.evaluate(() => window.__chargen.state.current.materials.cloth.color.getHexString());
      await page.uncheck('#ash');
      await expect.poll(() => page.evaluate(() => window.__chargen.state.current.materials.cloth.color.getHexString())).not.toBe(ashy);
    });

    test('gear hangs on KayKit bones and downloads as a kit', async ({ page }, info) => {
      await page.uncheck('#bloom');
      await page.check('#chibi');
      await setSeed(page, 'guard', 'gear');
      for (const [slot, v] of [['headwear', 'helmet'], ['item', 'spear'], ['offhand', 'shield'], ['cloak', 'cape'], ['back', 'backpack'], ['shoulders', 'pauldrons'], ['apron', 'leather']]) {
        await page.selectOption('#' + slot, v);
        await expect.poll(() => page.evaluate((k) => window.__chargen.state.traits[k], slot)).toBe(v);
      }
      // kit first, with the preview not rigged: the kit rigs a copy in the T rest pose
      const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#gearBtn')]);
      expect(dl.suggestedFilename()).toMatch(/-gear\.zip$/);
      const zip = readZip(fs.readFileSync(await dl.path()));
      const manifest = JSON.parse(zip['gear.json'].toString('utf8'));
      expect(manifest.units).toBe('KayKit units (bone space)');
      const bones = Object.fromEntries(manifest.gear.map((g) => [g.slot + ':' + g.kind, g.bone]));
      expect(bones).toEqual({ 'headwear:helmet': 'head', 'item:spear': 'handslot.r', 'offhand:shield': 'handslot.l', 'cloak:cape': 'chest',
        'back:backpack': 'chest', 'shoulders:pauldrons-l': 'upperarm.l', 'shoulders:pauldrons-r': 'upperarm.r' });
      expect(Object.keys(zip).sort()).toEqual([manifest.body, 'gear.json', ...manifest.gear.map((g) => g.file)].sort());
      let kitFaces = 0;
      for (const g of manifest.gear) {
        const { json } = parseGLB(zip[g.file]);
        const root = json.nodes[json.scenes[0].nodes[0]];
        expect(root.extras, g.file).toMatchObject({ bone: g.bone, slot: g.slot, kind: g.kind });
        expect(root.translation ?? [0, 0, 0]).toEqual([0, 0, 0]);
        expect(json.skins ?? []).toEqual([]);
        kitFaces += glbFaces(zip[g.file]);
      }
      const body = parseGLB(zip[manifest.body]).json;
      expect(body.skins[0].joints.length).toBe(41);
      expect(body.nodes.filter((n) => /^(Gear_|Item$|Offhand$)/.test(n.name))).toEqual([]);
      kitFaces += glbFaces(zip[manifest.body]);
      expect(kitFaces).toBe(await num(page, 'sF')); // body + gear is the whole character

      // the rigged download keeps the gear, as plain meshes in a group under each bone
      await page.check('#rig');
      await expect.poll(() => page.evaluate(() => window.__chargen.state.traits.rig)).toBe(true);
      const { json } = parseGLB(await download(page, info));
      const childOf = (bone) => json.nodes.find((n) => n.name === bone).children.map((c) => json.nodes[c].name);
      expect(childOf('head')).toContain('Gear_Headwear');
      expect(childOf('chest')).toEqual(expect.arrayContaining(['Gear_Cloak', 'Gear_Back']));
      expect(childOf('upperarm.l')).toContain('Gear_Shoulders_L');
      expect(childOf('handslot.r')).toContain('Item');
      expect(childOf('handslot.l')).toContain('Offhand');
      const gearNode = json.nodes.find((n) => n.name === 'Gear_Headwear');
      expect(gearNode.extras).toMatchObject({ bone: 'head', slot: 'headwear', kind: 'helmet' });
      for (const c of gearNode.children) expect(json.nodes[c].skin).toBeUndefined();
    });

    test('game budget stays at or under 4,000 triangles', async ({ page }) => {
      await page.uncheck('#bloom');
      await page.selectOption('#detail', 'game');
      for (const a of ['wizard', 'golem', 'demon', 'fairy', 'guard', 'miner']) {
        await setSeed(page, a, 'budget');
        const f = await num(page, 'sF');
        expect(f, a).toBeLessThanOrEqual(4000);
        expect(f, a).toBeGreaterThan(a === 'golem' ? 800 : 2500);
      }
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
