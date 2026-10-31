// readme.html: README.md rendered in the browser, from disk (the built-in copy) and over http (README.md itself).
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { test, expect } from '@playwright/test';
import { ROOT } from './helpers.js';

const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const h2s = read('README.md').split('\n').filter((l) => l.startsWith('## ')).length;

test('the built-in README copy matches README.md', () => {
  const js = read('shared/readme-data.js'), str = js.slice(js.indexOf('README_MD = ') + 12, js.lastIndexOf(';'));
  expect(JSON.parse(str)).toBe(read('README.md'));
});

async function check(page, url, from) {
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  await page.goto(url);
  await page.waitForFunction(() => window.__readme);
  expect(await page.evaluate(() => window.__readme.from)).toContain(from);
  await expect(page.locator('#doc h2')).toHaveCount(h2s);
  expect(await page.locator('#toc a').count()).toBeGreaterThanOrEqual(h2s);
  await expect(page.locator('#doc table tbody tr').first()).toBeVisible();
  await expect(page.locator('#doc pre code').filter({ hasText: 'npm run build' })).toHaveCount(1);
  // Every in-page link from the pages table and the contents list lands on a heading.
  const broken = await page.evaluate(() => [...document.querySelectorAll('a[href^="#"]')]
    .map((a) => a.getAttribute('href').slice(1)).filter((id) => !document.getElementById(id)));
  expect(broken).toEqual([]);
  // Page file names in the text link to the pages.
  await expect(page.locator('#doc a[href="coverage.html"]').first()).toBeVisible();
  await expect(page.locator('nav.kit-nav a[aria-current]')).toHaveText('README');
  expect(errors).toEqual([]);
}

test('readme.html from disk shows the built-in copy', async ({ page }) => {
  await check(page, pathToFileURL(path.join(ROOT, 'readme.html')).href, 'readme-data.js');
});

test('readme.html over http reads README.md', async ({ page }) => {
  const server = http.createServer((req, res) => {
    const f = path.join(ROOT, decodeURIComponent(new URL(req.url, 'http://x').pathname));
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'content-type': f.endsWith('.html') ? 'text/html' : f.endsWith('.js') ? 'text/javascript' : 'text/plain' });
    res.end(fs.readFileSync(f));
  });
  await new Promise((r) => server.listen(0, r));
  try { await check(page, `http://localhost:${server.address().port}/readme.html`, 'README.md'); }
  finally { server.close(); }
});
