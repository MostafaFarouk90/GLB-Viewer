// The shared/ modules (window.EmbersKit), the offline build's inlining of them and the headless id export.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { test, expect } from '@playwright/test';
import { ROOT, openApp, parseGLB } from './helpers.js';

const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const PAGES = fs.readdirSync(ROOT).filter((f) => f.endsWith('.html') && !f.includes('-offline'));
const offlineOf = (f) => f === 'index.html' ? 'glb-viewer-offline.html' : f.replace('.html', '-offline.html');

test('the built-in targets copy matches embers/targets.json', () => {
  const js = read('shared/targets-data.js'), json = js.slice(js.indexOf('EMBEDDED_TARGETS = ') + 19, js.lastIndexOf(';'));
  expect(JSON.parse(json)).toEqual(JSON.parse(read('embers/targets.json')));
});

test('every shared/ file a page loads exists, and its offline build has them inlined', () => {
  for (const f of PAGES) {
    const srcs = [...read(f).matchAll(/<script src="(shared\/[^"]+)"><\/script>/g)].map((m) => m[1]);
    if (!srcs.length) continue;
    expect(srcs[0], f).toBe('shared/kit.js');
    for (const s of srcs) expect(fs.existsSync(path.join(ROOT, s)), `${f} loads ${s}`).toBe(true);
    const off = read(offlineOf(f));
    expect(off, offlineOf(f)).not.toMatch(/<script[^>]+src=/);
    expect(off).toContain('window.EmbersKit = window.EmbersKit || {}');
  }
});

test('shared helpers: seeded random, zip, variant names, fit to box', async ({ page }) => {
  await openApp(page, 'props-generator.html', '__propgen');
  const r = await page.evaluate(async () => {
    const kit = window.EmbersKit, a = kit.makeRng('x'), b = kit.makeRng('x');
    const zip = new Uint8Array(await kit.makeZip([{ name: 'a.txt', data: 'hello' }, { name: 'b.bin', data: new Uint8Array([1, 2, 3]) }]).arrayBuffer());
    return {
      same: [a.next(), a.int(1, 6), a.pick(['p', 'q', 'r'])].join() === [b.next(), b.int(1, 6), b.pick(['p', 'q', 'r'])].join(),
      zipHead: Array.from(zip.subarray(0, 4)), zipLen: zip.length,
      names: kit.variantNames('oak-a', 3).concat(kit.variantNames('cairn', 2)),
      fit: kit.fitToBox({ x: 1, y: 2, z: 1 }, { w: 1, h: 4, d: 4 }, 1.6),
      seed: /^[a-z]+-[a-z]+-\d+$/.test(kit.randomSeed()),
    };
  });
  expect(r.same).toBe(true);
  expect(r.zipHead).toEqual([0x50, 0x4b, 3, 4]);
  expect(r.zipLen).toBe(30 + 5 + 5 + 30 + 5 + 3 + 46 * 2 + 5 + 5 + 22);
  expect(r.names).toEqual(['oak-a', 'oak-b', 'oak-c', 'cairn-a', 'cairn-b']);
  expect(r.fit).toEqual([2 / 1.6, 2, 2 * 1.6]); // height exact, width and depth stretched by at most 1.6x
  expect(r.seed).toBe(true);
});

test('export-ids makes game ids headless, the same as the page', async ({ page }) => {
  test.setTimeout(180_000);
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'export-ids-'));
  const run = (...a) => execFileSync(process.execPath, [path.join(ROOT, 'tools/export-ids.mjs'), ...a], { encoding: 'utf8' });
  expect(run('--list')).toMatch(/^props \(\d+\): .*stump-a/m);
  run('props', 'vegetation', '--ids', 'stump-a,cairn-a,oak-a', '--targets', 'builtin', '--lods', '--out', out);
  const report = JSON.parse(fs.readFileSync(path.join(out, 'report.json'), 'utf8'));
  expect(report.files.map((f) => f.file).sort()).toEqual(['props/cairn-a.glb', 'props/stump-a.glb', 'vegetation/oak-a.glb', 'vegetation/oak-a.lod1.glb', 'vegetation/oak-a.lod2.glb']);
  for (const f of report.files) {
    const { json } = parseGLB(fs.readFileSync(path.join(out, f.file)));
    expect(json.asset.version).toBe('2.0');
    expect(f.warnings, f.file).toEqual([]);
    expect(Math.abs(f.base)).toBeLessThan(0.01);
  }
  const stump = report.files.find((f) => f.id === 'stump-a');
  expect(stump.size.h).toBeCloseTo(stump.target.h, 2);
  expect(fs.readFileSync(path.join(out, 'report.txt'), 'utf8')).toContain('props/stump-a.glb');

  // byte for byte what the page's own export gives for the same id and seed
  await openApp(page, 'props-generator-offline.html', '__propgen');
  const fromPage = await page.evaluate(async () => {
    const [f] = await window.EmbersKit.generators.props.files('stump-a', 'stump-a');
    return Array.from(new Uint8Array(f.data));
  });
  expect(Buffer.from(fromPage).equals(fs.readFileSync(path.join(out, 'props/stump-a.glb')))).toBe(true);
  fs.rmSync(out, { recursive: true, force: true });
});
