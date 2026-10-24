// Shared setup: open either a CDN page (index.html or one of the generator pages, with jsDelivr served from
// node_modules so it works offline) or its offline build (*-offline.html, with jsDelivr blocked).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { expect } from '@playwright/test';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const VARIANTS = ['index.html', 'glb-viewer-offline.html'];
export const GENERATOR_VARIANTS = ['character-generator.html', 'character-generator-offline.html'];
export const PROPS_VARIANTS = ['props-generator.html', 'props-generator-offline.html'];
export const VEG_VARIANTS = ['vegetation-generator.html', 'vegetation-generator-offline.html'];
const CDN = 'https://cdn.jsdelivr.net/';
// The viewer's game profile fetches the live targets.json from the game repo; tests serve the repo copy instead.
export const TARGETS_URL = 'https://raw.githubusercontent.com/MostafaFarouk90/OpenWorld/main/src/env/targets.json';

// `ready` is the debugging global the page sets once it has started.
export async function openApp(page, file, ready = '__glbopt') {
  const errors = [], cdnRequests = [];
  // Tests that expect an error push regexes here; matching errors are then not counted as failures.
  const allowed = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('request', (r) => { if (r.url().startsWith(CDN)) cdnRequests.push(r.url()); });

  if (!file.includes('offline')) {
    // https://cdn.jsdelivr.net/npm/<pkg>@<ver>/<file> -> node_modules/<pkg>/<file>
    await page.route(CDN + '**', async (route) => {
      const m = route.request().url().match(/\/npm\/((?:@[^/]+\/)?[^@/]+)@[^/]+\/([^?#]*)/);
      const p = m && path.join(ROOT, 'node_modules', m[1], m[2]);
      if (!p || !fs.existsSync(p)) return route.fulfill({ status: 404, body: 'not in node_modules' });
      await route.fulfill({
        status: 200, body: fs.readFileSync(p),
        headers: { 'content-type': 'text/javascript', 'access-control-allow-origin': '*' },
      });
    });
  } else {
    await page.route(CDN + '**', (route) => route.abort());
  }

  await page.route(TARGETS_URL, (route) => route.fulfill({
    status: 200, body: fs.readFileSync(path.join(ROOT, 'embers/targets.json')),
    headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
  }));

  await page.goto(pathToFileURL(path.join(ROOT, file)).href);
  await expect(page.locator('#log')).toContainText('Ready');
  await page.waitForFunction((g) => !!window[g], ready);
  return { errors, cdnRequests, allowed, unexpected: () => errors.filter((e) => !allowed.some((r) => r.test(e))) };
}

const resultCount = (page) => page.locator('#log div', { hasText: 'Result' }).count();

// Clicks Apply and waits for the new "Result" log line.
export async function apply(page) {
  const before = await resultCount(page);
  await page.click('#applyBtn');
  await expect.poll(() => resultCount(page), { timeout: 60_000 }).toBeGreaterThan(before);
  await expect(page.locator('#busy')).not.toHaveClass(/show/);
}

export const num = async (page, id) => Number((await page.locator('#' + id).textContent()).replace(/[^\d.]/g, ''));

export async function loadSample(page) {
  await page.click('#sampleBtn');
  await expect(page.locator('#applyBtn')).toBeEnabled();
  await expect(page.locator('#sOF')).not.toHaveText('–');
}

// Splits a GLB file into its JSON and BIN chunks.
export function parseGLB(buf) {
  if (buf.subarray(0, 4).toString('latin1') !== 'glTF') throw new Error('not a GLB');
  let off = 12, json = null, bin = null;
  while (off < buf.length) {
    const len = buf.readUInt32LE(off), type = buf.readUInt32LE(off + 4);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (type === 0x4e4f534a) json = JSON.parse(data.toString('utf8'));
    else if (type === 0x004e4942) bin = data;
    off += 8 + len;
  }
  return { json, bin };
}

// Total triangle count of a GLB's primitives (triangle mode only).
export function glbFaces(buf) {
  const { json } = parseGLB(buf);
  let n = 0;
  for (const m of json.meshes || []) for (const p of m.primitives) {
    const acc = json.accessors[p.indices ?? p.attributes.POSITION];
    n += acc.count / 3;
  }
  return n;
}
