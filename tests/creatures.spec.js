import fs from 'node:fs';
import path from 'node:path';
import { test, expect } from '@playwright/test';
import { ROOT, openApp, apply, num, parseGLB, glbFaces } from './helpers.js';

const CREATURE_VARIANTS = ['creature-generator.html', 'creature-generator-offline.html'];

const setSeed = async (page, species, seed) => {
  await page.selectOption('#species', species);
  await page.fill('#seed', seed);
  await page.press('#seed', 'Enter');
  await expect(page.locator('#log')).toContainText(`seed "${seed}"`);
};

async function download(page, info, name = 'creature.glb') {
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#downloadBtn')]);
  expect(dl.suggestedFilename()).toMatch(/\.glb$/);
  const out = info.outputPath(name);
  await dl.saveAs(out);
  return { buf: fs.readFileSync(out), name: dl.suggestedFilename() };
}

// Bounding box of all POSITION accessors, with node translations applied (exported nodes are only translated).
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
const dims = (page) => page.evaluate(() => window.__creaturegen.state.current.root.userData.dims.toArray());
const traits = (page) => page.evaluate(() => window.__creaturegen.state.traits);

for (const file of CREATURE_VARIANTS) {
  test.describe(file, () => {
    let ctx;
    test.beforeEach(async ({ page }) => {
      // the page fetches the game's live size table; tests keep the built-in copy (an empty answer is ignored)
      await page.route('https://raw.githubusercontent.com/**', (route) => route.fulfill({ status: 200, body: '{}', headers: { 'access-control-allow-origin': '*' } }));
      ctx = await openApp(page, file, '__creaturegen');
    });
    test.afterEach(async () => {
      expect(ctx.unexpected(), 'console/page errors').toEqual([]);
      if (file.includes('offline')) expect(ctx.cdnRequests, 'offline build must not touch the CDN').toEqual([]);
    });

    test('starts with a creature', async ({ page }) => {
      expect(await num(page, 'sF')).toBeGreaterThan(200);
      expect(await num(page, 'sJ')).toBeGreaterThan(15);
      await expect(page.locator('#creatureName')).not.toBeEmpty();
      await expect(page.locator('#sC')).toHaveText('Idle, Walk, Run, Bite');
      await expect(page.locator('#downloadBtn')).toBeEnabled();
    });

    test('the embedded size table matches embers/targets.json', async ({ page }) => {
      const embedded = await page.evaluate(() => JSON.parse(document.getElementById('embersTargets').textContent));
      expect(embedded).toEqual(JSON.parse(fs.readFileSync(path.join(ROOT, 'embers/targets.json'), 'utf8')));
    });

    test('every species and variant builds', async ({ page }) => {
      test.setTimeout(500_000); // ~100 rebuilds in software WebGL
      await page.uncheck('#bloom');
      await page.uncheck('#rotate');
      await page.selectOption('#detail', 'low');
      const all = await page.evaluate(() => {
        const g = window.__creaturegen;
        return Object.fromEntries(Object.keys(g.SPECIES).map((sp) => [sp, { plan: g.SPECIES[sp].plan,
          slots: Object.fromEntries(Object.entries(g.slotsOf(sp)).map(([s, o]) => [s, Object.keys(o.values)])) }]));
      });
      expect(Object.keys(all).length).toBeGreaterThanOrEqual(15);
      const plansDone = new Set();
      for (const [sp, { plan, slots }] of Object.entries(all)) {
        await setSeed(page, sp, 'all-' + sp);
        const t = await traits(page);
        expect(Math.max(...await dims(page)), sp).toBeCloseTo(t.size, 2);
        expect(await num(page, 'sF'), sp).toBeGreaterThan(150);
        if (plansDone.has(plan)) continue; // every slot value once per body plan
        plansDone.add(plan);
        for (const [slot, values] of Object.entries(slots)) for (const v of values) {
          await page.selectOption('#opt_' + slot, v);
          await expect.poll(() => page.evaluate((s) => window.__creaturegen.state.traits.opts[s], slot), { message: `${sp} ${slot}=${v}` }).toBe(v);
          expect(await num(page, 'sF'), `${sp} ${slot}=${v}`).toBeGreaterThan(150);
        }
        await page.click('#ember');
        await expect.poll(() => page.evaluate(() => window.__creaturegen.state.traits.ember)).toBe(await page.isChecked('#ember'));
      }
      expect([...plansDone].sort()).toEqual(['bat', 'bird', 'bug', 'quad', 'reptile']);
    });

    test('same seed gives the same creature, another seed a different one', async ({ page }) => {
      await setSeed(page, 'fox', 'abc');
      const first = { name: await page.locator('#creatureName').textContent(), faces: await num(page, 'sF'), dims: await dims(page) };
      await page.click('#randomBtn');
      await expect(page.locator('#seed')).not.toHaveValue('abc');
      await setSeed(page, 'fox', 'abc');
      expect({ name: await page.locator('#creatureName').textContent(), faces: await num(page, 'sF'), dims: await dims(page) }).toEqual(first);
      const t = await page.evaluate(() => {
        const g = window.__creaturegen;
        return [JSON.stringify(g.rollTraits('wolf', 's1')), JSON.stringify(g.rollTraits('wolf', 's1')), JSON.stringify(g.rollTraits('wolf', 's2'))];
      });
      expect(t[0]).toBe(t[1]);
      expect(t[0]).not.toBe(t[2]);
    });

    test('size, style and detail change the model', async ({ page }) => {
      await setSeed(page, 'boar', 'sz');
      await page.locator('#size').fill('0.3'); // log10 of the size in metres
      await expect.poll(async () => Math.max(...await dims(page))).toBeCloseTo(1.995, 2);
      await expect(page.locator('#sizeVal')).toHaveText('2.00 m');
      const flat = await num(page, 'sV');
      await page.selectOption('#style', 'smooth');
      await expect.poll(() => num(page, 'sV')).toBeLessThan(flat);
      const med = await num(page, 'sF');
      await page.selectOption('#detail', 'high');
      await expect.poll(() => num(page, 'sF')).toBeGreaterThan(med);
    });

    test('clips move the joints in the preview', async ({ page }) => {
      await setSeed(page, 'wolf', 'pose');
      const pose = (clip, u) => page.evaluate(([clip, u]) => {
        const g = window.__creaturegen, c = g.state.current;
        g.poseClip(c, clip, u);
        const q = c.J.LegFL1.quaternion.toArray().concat(c.J.Head.quaternion.toArray(), c.hips.position.toArray());
        g.poseClip(c, null);
        return q;
      }, [clip, u]);
      const rest = await pose(null, 0);
      expect(rest.slice(0, 4)).toEqual([0, 0, 0, 1]);
      expect(await pose('Walk', 0.25)).not.toEqual(rest);
      const [w0, w1] = [await pose('Walk', 0), await pose('Walk', 1)]; // loops
      w0.forEach((x, i) => expect(x).toBeCloseTo(w1[i], 6));
      const bite = await pose('Bite', 0.35);
      expect(bite.slice(4, 8)).not.toEqual(rest.slice(4, 8));
      await expect(page.locator('#clip option')).toHaveText(['Rest pose', 'Idle', 'Walk', 'Run', 'Bite']);
      await setSeed(page, 'hen', 'pose');
      await expect(page.locator('#clip option')).toHaveText(['Rest pose', 'Idle', 'Walk', 'Fly', 'Peck']);
    });

    test('static download is one baked mesh set standing on the ground', async ({ page }, info) => {
      await setSeed(page, 'goat', 'dl');
      await expect(page.locator('#rig')).toHaveValue('none');
      await expect(page.locator('#clipsOut')).toBeDisabled();
      const { buf } = await download(page, info);
      const { json, bin } = parseGLB(buf);
      expect(bin.length).toBeGreaterThan(1000);
      expect(json.asset.version).toBe('2.0');
      expect(json.skins ?? []).toEqual([]);
      expect(json.animations ?? []).toEqual([]);
      expect(json.nodes.map((n) => n.name)).toContain('Body');
      expect(json.nodes.find((n) => n.extras?.species)?.extras).toMatchObject({ species: 'goat', seed: 'dl', plan: 'quad', rig: 'none' });
      expect(glbFaces(buf)).toBe(await num(page, 'sF'));
      const { min, max } = glbBounds(json), size = (await traits(page)).size;
      expect(min[1]).toBeCloseTo(0, 2);
      expect(Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2])).toBeCloseTo(size, 1);
      expect(max[2]).toBeGreaterThan(-min[2] * 0.5); // the head end is towards +Z
    });

    test('skeleton export: one skin on named bones, with looping clips', async ({ page }, info) => {
      await setSeed(page, 'wolf', 'rig');
      await page.selectOption('#rig', 'skin');
      await expect(page.locator('#clipsOut')).toBeEnabled();
      const joints = await num(page, 'sJ');
      const { buf } = await download(page, info);
      const { json } = parseGLB(buf);
      expect(json.skins.length).toBe(1);
      const bones = json.skins[0].joints.map((i) => json.nodes[i].name);
      expect(bones.length).toBe(joints);
      for (const b of ['Root', 'Hips', 'Chest', 'Neck', 'Head', 'Jaw', 'Tail1', 'LegFL1', 'LegFL2', 'LegFL3', 'LegBR3']) expect(bones).toContain(b);
      const skinned = json.nodes.filter((n) => n.skin !== undefined);
      expect(skinned.length).toBe(1);
      const prims = json.meshes[skinned[0].mesh].primitives;
      expect(prims.every((p) => p.attributes.JOINTS_0 !== undefined && p.attributes.WEIGHTS_0 !== undefined)).toBe(true);
      expect(json.animations.map((a) => a.name)).toEqual(['Idle', 'Walk', 'Run', 'Bite']);
      const walk = json.animations.find((a) => a.name === 'Walk');
      const targets = walk.channels.map((c) => `${json.nodes[c.target.node].name}.${c.target.path}`);
      expect(targets).toContain('LegFL1.rotation');
      expect(targets).toContain('Hips.translation');
      expect(glbFaces(buf)).toBe(await num(page, 'sF'));
      // bones carry no rest rotation
      for (const i of json.skins[0].joints) expect(json.nodes[i].rotation ?? [0, 0, 0, 1]).toEqual([0, 0, 0, 1]);
    });

    test('jointed parts export: a node per joint holding its own pieces', async ({ page }, info) => {
      await setSeed(page, 'spider', 'parts');
      await page.selectOption('#rig', 'parts');
      const { buf } = await download(page, info);
      const { json } = parseGLB(buf);
      expect(json.skins ?? []).toEqual([]);
      const byName = Object.fromEntries(json.nodes.map((n) => [n.name, n]));
      for (const j of ['Root', 'Hips', 'Chest', 'Head', 'Jaw', 'Leg1L1', 'Leg1L2', 'Leg4R2']) expect(byName[j], j).toBeTruthy();
      const childNames = (n) => (n.children || []).map((i) => json.nodes[i].name);
      expect(childNames(byName.Leg1L1)).toContain('Leg1L2');
      expect(childNames(byName.Leg1L2).some((s) => s.startsWith('Leg1L2_'))).toBe(true); // its own mesh
      expect(json.animations.map((a) => a.name)).toEqual(['Idle', 'Walk', 'Bite']);
      expect(glbFaces(buf)).toBe(await num(page, 'sF'));
      await page.uncheck('#clipsOut');
      expect(parseGLB((await download(page, info, 'b.glb')).buf).json.animations ?? []).toEqual([]);
    });

    test('a rigged export plays in three.js', async ({ page }, info) => {
      await setSeed(page, 'hen', 'play');
      await page.selectOption('#rig', 'skin');
      const { buf } = await download(page, info);
      // load it back with GLTFLoader and play Walk: the skinned mesh must move
      const moved = await page.evaluate(async (b64) => {
        const { THREE } = window.__creaturegen;
        const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js').catch(() => ({}));
        if (!GLTFLoader) return 'no-loader';
        const bin = Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0)).buffer;
        const gltf = await new GLTFLoader().parseAsync(bin, '');
        const mixer = new THREE.AnimationMixer(gltf.scene);
        mixer.clipAction(gltf.animations.find((a) => a.name === 'Walk')).play();
        const at = (t) => { mixer.setTime(t); gltf.scene.updateMatrixWorld(true); const bone = gltf.scene.getObjectByName('LegL1'); return bone.quaternion.toArray(); };
        return JSON.stringify(at(0.1)) !== JSON.stringify(at(0.3));
      }, buf.toString('base64'));
      if (moved === 'no-loader') test.skip(file.includes('offline'), 'the offline build has no module loader');
      else expect(moved).toBe(true);
    });

    test('every game id fits its target box and budget', async ({ page }) => {
      test.setTimeout(300_000);
      await page.uncheck('#bloom');
      const rows = await page.evaluate(() => {
        const g = window.__creaturegen;
        return Object.keys(g.GAME_IDS).map((id) => {
          g.rollGame(id, 'fit');
          const t = g.state.traits, d = g.state.current.root.userData.dims;
          return { id, box: t.box, dims: [d.x, d.y, d.z], faces: Number(document.getElementById('sF').textContent.replace(/\D/g, '')) };
        });
      });
      expect(rows.length).toBeGreaterThanOrEqual(12);
      for (const id of ['hen-a', 'goat-a', 'crow-a']) expect(rows.map((r) => r.id)).toContain(id);
      for (const r of rows) {
        const tgt = [r.box.w, r.box.h, r.box.d], drv = Math.max(r.box.w, r.box.d) > 1.8 * r.box.h ? (r.box.w >= r.box.d ? 0 : 2) : 1;
        expect(r.dims[drv], r.id).toBeCloseTo(tgt[drv], 2);
        for (let a = 0; a < 3; a++) expect(r.dims[a] / tgt[a], `${r.id} axis ${a}`).toBeLessThan(1.6);
        for (let a = 0; a < 3; a++) expect(r.dims[a] / tgt[a], `${r.id} axis ${a}`).toBeGreaterThan(1 / 1.6);
        expect(r.faces, r.id).toBeLessThanOrEqual(r.box.h <= 0.6 && Math.max(r.box.w, r.box.d) <= 1 ? 1500 : 4000);
      }
      await expect(page.locator('#knight')).toBeChecked();
    });

    test('game id export is game-ready', async ({ page }, info) => {
      await page.selectOption('#gameId', 'hen-a');
      await expect(page.locator('#fileName')).toHaveValue('hen-a');
      await expect(page.locator('#sT')).toContainText('✓');
      await expect(page.locator('#sB')).toContainText('✓');
      const { buf, name } = await download(page, info, 'hen.glb');
      expect(name).toBe('hen-a.glb');
      const { json } = parseGLB(buf);
      expect(json.animations ?? []).toEqual([]);
      expect(json.skins ?? []).toEqual([]);
      for (const m of json.materials) {
        expect(m.pbrMetallicRoughness?.roughnessFactor ?? 1, m.name).toBe(1);
        expect(m.pbrMetallicRoughness?.metallicFactor ?? 1, m.name).toBe(0);
        expect(m.alphaMode ?? 'OPAQUE').toBe('OPAQUE');
      }
      expect(json.nodes.find((n) => n.extras?.gameId)?.extras).toMatchObject({ gameId: 'hen-a', species: 'hen' });
      const { min, max } = glbBounds(json);
      expect(min[1]).toBeCloseTo(0, 2);
      expect(max[1]).toBeCloseTo(0.42, 2);
      expect((min[0] + max[0]) / 2).toBeCloseTo(0, 1); // footprint centred
      expect((min[2] + max[2]) / 2).toBeCloseTo(0, 1);
      expect(buf.length).toBeLessThan(1.5 * 1048576);
    });

    test('foes glow: ember hound keeps an emissive material', async ({ page }, info) => {
      await page.selectOption('#gameId', 'ember-hound');
      await expect(page.locator('#ember')).toBeChecked();
      const { json } = parseGLB((await download(page, info)).buf);
      const glow = json.materials.find((m) => m.name === 'Glow');
      expect(glow?.emissiveFactor?.some((x) => x > 0.5)).toBe(true);
    });

    test('seed variants download as a zip of <id>-a, -b, -c', async ({ page }, info) => {
      await page.selectOption('#gameId', 'crow-a');
      await page.fill('#variantCount', '3');
      const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#variantsBtn')]);
      expect(dl.suggestedFilename()).toBe('crow-variants.zip');
      const out = info.outputPath('v.zip'); await dl.saveAs(out);
      const zip = fs.readFileSync(out), names = [];
      for (let off = 0; zip.readUInt32LE(off) === 0x04034b50;) { // walk the local file headers
        const size = zip.readUInt32LE(off + 18), n = zip.readUInt16LE(off + 26), name = zip.subarray(off + 30, off + 30 + n).toString();
        const data = zip.subarray(off + 30 + n, off + 30 + n + size);
        expect(data.subarray(0, 4).toString('latin1'), name).toBe('glTF');
        names.push(name); off += 30 + n + size;
      }
      expect(names).toEqual(['crow-a.glb', 'crow-b.glb', 'crow-c.glb']);
    });

    test('a loaded targets.json with the id sets the target size', async ({ page }) => {
      await page.selectOption('#gameId', 'goat-a');
      const json = await page.evaluate(() => JSON.stringify({ ...window.__creaturegen.targets(), objects: { 'goat-a': { w: 0.4, d: 1.4, h: 1.2 } } }));
      await page.setInputFiles('#targetsFile', { name: 'targets.json', mimeType: 'application/json', buffer: Buffer.from(json) });
      await expect(page.locator('#log')).toContainText('Targets from targets.json: 1 ids, 1 of the');
      await expect.poll(async () => (await dims(page))[1]).toBeCloseTo(1.2, 2);
    });

    test('exported GLB opens in the viewer and can be decimated', async ({ page }, info) => {
      await setSeed(page, 'bear', 'roundtrip');
      await page.selectOption('#style', 'smooth'); // shared vertices, so the decimator can collapse edges
      await expect.poll(() => page.evaluate(() => window.__creaturegen.state.traits.style)).toBe('smooth');
      const faces = await num(page, 'sF');
      const { buf } = await download(page, info);
      const viewer = file.includes('offline') ? 'glb-viewer-offline.html' : 'index.html';
      const v = await openApp(page, viewer);
      await page.setInputFiles('#fileInput', { name: 'bear.glb', mimeType: 'model/gltf-binary', buffer: buf });
      await expect(page.locator('#applyBtn')).toBeEnabled();
      expect(await num(page, 'sOF')).toBe(faces);
      await page.locator('#ratio').fill('50');
      await apply(page);
      expect(await num(page, 'sRF')).toBeLessThan(faces * 0.6);
      expect(v.unexpected()).toEqual([]);
    });
  });
}
