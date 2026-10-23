// Shared setup: open either the CDN version (index.html, with jsDelivr served from node_modules
// so it works offline) or the offline build (glb-viewer-offline.html, with jsDelivr blocked).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { expect } from '@playwright/test';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const VARIANTS = ['index.html', 'glb-viewer-offline.html'];
const CDN = 'https://cdn.jsdelivr.net/';

export async function openApp(page, file) {
  const errors = [], cdnRequests = [];
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });
  page.on('request', (r) => { if (r.url().startsWith(CDN)) cdnRequests.push(r.url()); });

  if (file === 'index.html') {
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

  await page.goto(pathToFileURL(path.join(ROOT, file)).href);
  await expect(page.locator('#log')).toContainText('Ready');
  await page.waitForFunction(() => !!window.__glbopt);
  return { errors, cdnRequests };
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
