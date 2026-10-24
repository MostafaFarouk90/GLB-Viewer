// Builds the offline pages: glb-viewer-offline.html from index.html, character-generator-offline.html
// from character-generator.html, props-generator-offline.html from props-generator.html and
// creature-generator-offline.html from creature-generator.html. Each is the same
// page with every library inlined, so it opens by double-click with no internet.
//
// Usage (from anywhere):  npm install && npm run build
//
// How it works: index.html loads libraries through an <script type="importmap"> that points at
// jsDelivr URLs of the form https://cdn.jsdelivr.net/npm/<pkg>@<version>/<file>. This script reads
// that importmap, maps every URL to the same file in node_modules (checking the installed version
// matches the pinned one), bundles the <script type="module"> with esbuild, and writes a copy of
// the page where the importmap (and the HTML comment right before it) is removed and the module
// script is replaced by the bundled classic script. Links with a data-offline-href attribute are
// pointed at that (offline) page instead.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PAGES = [['index.html', 'glb-viewer-offline.html'], ['character-generator.html', 'character-generator-offline.html'],
  ['props-generator.html', 'props-generator-offline.html'], ['creature-generator.html', 'creature-generator-offline.html']];
const nm = path.join(root, 'node_modules');

const fail = (msg) => { console.error('build failed: ' + msg); process.exit(1); };

for (const [src, out] of PAGES) await buildPage(src, out);

async function buildPage(srcName, outName) {
  const SRC = path.join(root, srcName);
  const OUT = path.join(root, outName);
  const one = (re, what) => {
    const all = [...html.matchAll(re)];
    if (all.length !== 1) fail(`expected exactly one ${what} in ${srcName}, found ${all.length}`);
    return all[0];
  };

  const html = fs.readFileSync(SRC, 'utf8');
  // Optional HTML comment directly before the importmap is removed together with it.
  const mapTag = one(/(?:<!--(?:(?!-->)[\s\S])*-->[ \t]*\r?\n[ \t]*)?<script\s+type=["']importmap["']\s*>([\s\S]*?)<\/script>[ \t]*\r?\n?/gi, '<script type="importmap">');
  const modTag = one(/<script\s+type=["']module["']\s*>([\s\S]*?)<\/script>/gi, '<script type="module">');

  let imports;
  try { imports = JSON.parse(mapTag[1]).imports; } catch (e) { fail('importmap is not valid JSON: ' + e.message); }
  if (!imports || !Object.keys(imports).length) fail('importmap has no "imports"');

  // "https://cdn.jsdelivr.net/npm/three@0.170.0/examples/jsm/" -> node_modules/three/examples/jsm/
  const versionChecked = new Set();
  function localPath(url) {
    const m = url.match(/^https:\/\/cdn\.jsdelivr\.net\/npm\/((?:@[^/]+\/)?[^@/]+)@([^/]+)\/(.*)$/);
    if (!m) fail(`importmap URL is not a jsDelivr npm URL: ${url}`);
    const [, pkg, ver, file] = m;
    const pkgJson = path.join(nm, pkg, 'package.json');
    if (!fs.existsSync(pkgJson)) fail(`${pkg} is not installed; run "npm install"`);
    if (!versionChecked.has(pkg)) {
      const installed = JSON.parse(fs.readFileSync(pkgJson, 'utf8')).version;
      if (installed !== ver) fail(`${srcName} uses ${pkg}@${ver} but node_modules has ${installed}; update package.json and run "npm install"`);
      versionChecked.add(pkg);
    }
    return path.join(nm, pkg, file);
  }
  const exact = new Map(), prefixes = [];
  for (const [spec, url] of Object.entries(imports)) {
    const p = localPath(url);
    if (spec.endsWith('/')) prefixes.push([spec, p]);
    else { if (!fs.existsSync(p)) fail(`${spec} -> ${p} does not exist`); exact.set(spec, p); }
  }

  // Longest prefix wins, as in the browser's importmap resolution.
  prefixes.sort((a, b) => b[0].length - a[0].length);

  const out = await esbuild.build({
    stdin: { contents: modTag[1], resolveDir: root, sourcefile: srcName, loader: 'js' },
    bundle: true, format: 'iife', minify: true, write: false, target: 'es2020', legalComments: 'none',
    logLevel: 'warning',
    plugins: [{
      name: 'importmap',
      setup(b) {
        b.onResolve({ filter: /.*/ }, (a) => {
          if (exact.has(a.path)) return { path: exact.get(a.path) };
          const pre = prefixes.find(([s]) => a.path.startsWith(s));
          if (pre) return { path: path.join(pre[1], a.path.slice(pre[0].length)) };
          return undefined; // relative imports inside libraries, and bare 'three' from three-subdivide
        });
      },
    }],
  });
  const js = out.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');

  let res = html.replace(mapTag[0], '');
  res = res.replace(modTag[0], () => `<script>\n${js}</script>`);
  res = res.replace(/href="[^"]*"(\s+)data-offline-href="([^"]*)"/g, 'href="$2"');
  if (/type=["'](importmap|module)["']/i.test(res) || res.includes('cdn.jsdelivr.net')) {
    fail('output still references the importmap, a module script or jsDelivr');
  }
  fs.writeFileSync(OUT, res);
  console.log(`wrote ${path.relative(process.cwd(), OUT) || OUT} (${(res.length / 1024).toFixed(0)} KB)`);
}
