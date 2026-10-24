import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { test, expect } from '@playwright/test';
import { ANIM_VARIANTS, ROOT, openApp, parseGLB } from './helpers.js';

const KAYKIT_URL = 'https://raw.githubusercontent.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0/main/addons/kaykit_character_pack_adventures/Characters/gltf/Knight.glb';
const KNIGHT = path.join(ROOT, 'tests/fixtures/.cache/Knight.glb');

// Knight.glb (CC0, 3.6 MB) is downloaded once into a git-ignored cache; the Knight test is skipped without internet.
function knightAvailable() {
  if (fs.existsSync(KNIGHT)) return true;
  try {
    fs.mkdirSync(path.dirname(KNIGHT), { recursive: true });
    execFileSync('curl', ['-sSfL', '-o', KNIGHT, KAYKIT_URL], { stdio: 'ignore', timeout: 60_000 });
    return fs.statSync(KNIGHT).size > 100_000;
  } catch { fs.rmSync(KNIGHT, { force: true }); return false; }
}

async function demo(page, kind, name) {
  await page.selectOption('#demo', kind);
  await expect(page.locator('#sM')).toHaveText(name);
}
async function bake(page, info, file = 'out.glb') {
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click('#bakeBtn')]);
  const out = info.outputPath(file);
  await dl.saveAs(out);
  return { name: dl.suggestedFilename(), path: out, ...parseGLB(fs.readFileSync(out)) };
}
const ticked = (page) => page.evaluate(() => window.__animprev.state.entries.filter((e) => e.include).map((e) => e.name));
const clipNames = (json) => (json.animations || []).map((a) => a.name);
const nodeIndex = (json, name) => json.nodes.findIndex((n) => n.name === name);
// Largest keyframe time of an animation (its duration).
const duration = (json, a) => Math.max(...a.samplers.map((s) => json.accessors[s.input].max[0]));

for (const file of ANIM_VARIANTS) {
  test.describe(file, () => {
    let ctx;
    test.beforeEach(async ({ page }) => { ctx = await openApp(page, file, '__animprev'); });
    test.afterEach(async () => {
      expect(ctx.unexpected(), 'console/page errors').toEqual([]);
      if (file.includes('offline')) expect(ctx.cdnRequests, 'offline build must not touch the CDN').toEqual([]);
    });

    test('quadruped gets the game\'s quadruped clips, baked without touching the rest pose', async ({ page }, info) => {
      await demo(page, 'quad', 'Demo_Wolf');
      await expect(page.locator('#rigSummary')).toContainText('quadruped (auto): 4 legs × 3');
      expect(await ticked(page)).toEqual(['Idle', 'Walk', 'Run', 'Bite']);
      // the clip plays: the pose changes over time
      const pose = () => page.evaluate(() => window.__animprev.state.model.root.getObjectByName('LegFL1').quaternion.toArray());
      await page.click('.clip[data-key="p:Walk"]');
      const a = await pose(); await page.waitForTimeout(300); const b = await pose();
      expect(a).not.toEqual(b);

      const out = await bake(page, info);
      expect(out.name).toBe('Demo_Wolf-anim.glb');
      expect(clipNames(out.json)).toEqual(['Idle', 'Walk', 'Run', 'Bite']);
      // rest pose as built: no joint rotation, legs where they were
      for (const n of out.json.nodes) if (/^(Leg|Hips|Chest|Neck|Head|Jaw|Tail)/.test(n.name)) expect(n.rotation || [0, 0, 0, 1]).toEqual([0, 0, 0, 1]);
      const walk = out.json.animations.find((x) => x.name === 'Walk');
      const targets = walk.channels.map((c) => `${out.json.nodes[c.target.node].name}.${c.target.path}`);
      expect(targets).toContain('LegFL1.rotation');
      expect(targets).toContain('Hips.translation');
      expect(targets.some((t) => t.endsWith('.scale'))).toBe(false);
      expect(duration(out.json, walk)).toBeCloseTo(1, 3);
      const extras = out.json.nodes[out.json.scenes[0].nodes[0]].extras;
      expect(extras.animation.clips.map((c) => c.from)).toEqual(['procedural:Idle', 'procedural:Walk', 'procedural:Run', 'procedural:Bite']);
      expect(JSON.stringify(out.json)).not.toContain('__gltfName');
    });

    test('bird and static prop get their own clip sets', async ({ page }, info) => {
      await demo(page, 'bird', 'Demo_Crow');
      await expect(page.locator('#rigSummary')).toContainText('winged flyer (auto): 2 legs × 2, 2 wings');
      expect(await ticked(page)).toEqual(['Idle', 'Fly', 'Bite']);
      await demo(page, 'prop', 'Demo_Lantern');
      await expect(page.locator('#rigSummary')).toContainText('static (auto)');
      expect(await ticked(page)).toEqual(['Bob']);
      const out = await bake(page, info);
      expect(clipNames(out.json)).toEqual(['Bob']);
      const root = out.json.scenes[0].nodes[0];
      expect(out.json.nodes[root].name).toBe('Demo_Lantern');
      expect(out.json.animations[0].channels.map((c) => [c.target.node, c.target.path]).sort()).toEqual([[root, 'rotation'], [root, 'translation']]);
    });

    test('KayKit names survive, file clips reload, and a clip library retargets with trim and rename', async ({ page }, info) => {
      await demo(page, 'biped', 'Demo_KayKit_Figure');
      await expect(page.locator('#rigSummary')).toContainText('biped (auto): 2 legs × 4, 2 arms (T-pose)');
      const first = await bake(page, info, 'figure.glb');
      for (const n of ['upperarm.l', 'handslot.r', 'control-toe-roll.l', 'IK-foot.r']) expect(nodeIndex(first.json, n), n).toBeGreaterThanOrEqual(0);
      expect(clipNames(first.json)).toEqual(['Idle', 'Walk', 'Run', 'Attack']);
      // IK and control bones are left alone
      const animated = new Set(first.json.animations.flatMap((a) => a.channels.map((c) => first.json.nodes[c.target.node].name)));
      expect([...animated].some((n) => /IK|control/.test(n))).toBe(false);
      expect(animated.has('upperleg.l')).toBe(true);

      // reopen the baked file: its clips are listed and ticked, the procedural ones are not
      await page.setInputFiles('#openFile', first.path);
      await expect(page.locator('#sF')).toContainText('4: Idle, Walk, Run, Attack');
      expect(await ticked(page)).toEqual(['Idle', 'Walk', 'Run', 'Attack']);

      // the same file as a clip library on a fresh figure: every animated bone is found, rest poses match
      await demo(page, 'biped', 'Demo_KayKit_Figure');
      await page.setInputFiles('#libFile', first.path);
      await expect(page.locator('#libInfo')).toContainText(`${animated.size} of ${animated.size} animated nodes found`);
      await expect(page.locator('#libInfo')).toContainText('used as they are');
      await page.click('#tickNone');
      await page.click('.clip[data-key="l:1"]'); // library Walk
      await page.locator('.clip[data-key="l:1"] input').check();
      await page.fill('#clipName', 'Stroll'); await page.press('#clipName', 'Enter');
      await page.fill('#trimS', '0.2'); await page.press('#trimS', 'Enter');
      await page.fill('#trimE', '0.8'); await page.press('#trimE', 'Enter');
      await expect(page.locator('.clip[data-key="l:1"] .ren')).toHaveText('→ Stroll');
      const out = await bake(page, info, 'stroll.glb');
      expect(clipNames(out.json)).toEqual(['Stroll']);
      const a = out.json.animations[0];
      expect(duration(out.json, a)).toBeCloseTo(0.6, 3);
      expect(out.json.nodes[out.json.scenes[0].nodes[0]].extras.animation.clips[0]).toEqual({ name: 'Stroll', from: 'figure:Walk', trim: [0.2, 0.8] });
      // hips only: the only translation track is on the hips
      const tr = a.channels.filter((c) => c.target.path === 'translation').map((c) => out.json.nodes[c.target.node].name);
      expect(tr).toEqual(['hips']);
    });

    test('two ticked clips with one name are refused', async ({ page }) => {
      await demo(page, 'quad', 'Demo_Wolf');
      await page.click('.clip[data-key="p:Walk"]');
      await page.fill('#clipName', 'Idle'); await page.press('#clipName', 'Enter');
      ctx.allowed.push(/two ticked clips/);
      await page.click('#bakeBtn');
      await expect(page.locator('#log')).toContainText('two ticked clips are both named "Idle"');
    });

    test('KayKit Knight clips play on a KayKit-rigged model', async ({ page }, info) => {
      test.skip(!knightAvailable(), 'Knight.glb not cached and not downloadable');
      await page.route(KAYKIT_URL, (route) => route.fulfill({ status: 200, body: fs.readFileSync(KNIGHT), headers: { 'access-control-allow-origin': '*' } }));
      await demo(page, 'biped', 'Demo_KayKit_Figure');
      await page.click('#kaykitBtn');
      await expect(page.locator('#libInfo')).toContainText('41 of 41 animated nodes found');
      await expect(page.locator('#libInfo')).toContainText('41 match, 0 differ');
      await page.click('#tickNone');
      await page.fill('#filter', 'Walking_A');
      await page.locator('.clip', { hasText: 'Walking_A' }).locator('input').check();
      await page.locator('.clip', { hasText: 'Walking_A' }).click();
      await page.fill('#clipName', 'Walk'); await page.press('#clipName', 'Enter');
      const out = await bake(page, info);
      expect(clipNames(out.json)).toEqual(['Walk']);
      const targets = new Set(out.json.animations[0].channels.map((c) => out.json.nodes[c.target.node].name));
      expect(targets.has('upperarm.l') && targets.has('lowerleg.r')).toBe(true);
    });
  });
}
