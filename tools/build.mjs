// Builds the offline pages: glb-viewer-offline.html from index.html, character-generator-offline.html
// from character-generator.html, props-generator-offline.html from props-generator.html,
// texture-generator-offline.html from texture-generator.html, vegetation-generator-offline.html from
// vegetation-generator.html, creature-generator-offline.html from creature-generator.html,
// animation-preview-offline.html from animation-preview.html, structures-generator-offline.html from
// structures-generator.html and rocks-generator-offline.html from rocks-generator.html. Each is the same page
// with every library inlined, so it opens by double-click with no internet.
//
// Usage (from anywhere):  npm install && npm run build
//
// How it works: index.html loads libraries through an <script type="importmap"> that points at
// jsDelivr URLs of the form https://cdn.jsdelivr.net/npm/<pkg>@<version>/<file>. This script reads
// that importmap, maps every URL to the same file in node_modules (checking the installed version
// matches the pinned one), bundles the <script type="module"> with esbuild, and writes a copy of
// the page where the importmap (and the HTML comment right before it) is removed and the module
// script is replaced by the bundled classic script. Links with a data-offline-href attribute are
// pointed at that (offline) page instead. Classic <script src="shared/…"></script> tags (the code the pages share,
// see shared/kit.js) are replaced by the file's contents.
//
// It also writes shared/targets-data.js from embers/targets.json and shared/manifest-data.js from embers/manifest.json,
// so the pages' offline copies of the game's size table and shipped ids are the ones in embers/.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as esbuild from 'esbuild';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PAGES = [['index.html', 'glb-viewer-offline.html'], ['character-generator.html', 'character-generator-offline.html'],
  ['props-generator.html', 'props-generator-offline.html'], ['texture-generator.html', 'texture-generator-offline.html'],
  ['vegetation-generator.html', 'vegetation-generator-offline.html'], ['creature-generator.html', 'creature-generator-offline.html'],
  ['animation-preview.html', 'animation-preview-offline.html'], ['structures-generator.html', 'structures-generator-offline.html'],
  ['rocks-generator.html', 'rocks-generator-offline.html']];
const nm = path.join(root, 'node_modules');

const fail = (msg) => { console.error('build failed: ' + msg); process.exit(1); };

writeTargetsData();
writeShippedData();
for (const [src, out] of PAGES) await buildPage(src, out);

function writeTargetsData() {
  const json = JSON.parse(fs.readFileSync(path.join(root, 'embers/targets.json'), 'utf8'));
  const js = '// Made by tools/build.mjs from embers/targets.json (the game\'s src/env/targets.json): do not edit, edit that file\n'
    + '// and run "npm run build". The offline copy of the size table; see shared/targets.js.\n'
    + `(window.EmbersKit = window.EmbersKit || {}).EMBEDDED_TARGETS = ${JSON.stringify(json, null, 1)};\n`;
  const out = path.join(root, 'shared/targets-data.js');
  if (!fs.existsSync(out) || fs.readFileSync(out, 'utf8') !== js) { fs.writeFileSync(out, js); console.log('wrote shared/targets-data.js'); }
}

// shared/manifest-data.js: the ids of embers/manifest.json (the game's public/assets/env/manifest.json), the offline
// copy of the shipped list; see shared/manifest.js.
function writeShippedData() {
  const ids = Object.keys(JSON.parse(fs.readFileSync(path.join(root, 'embers/manifest.json'), 'utf8')).objects).sort();
  const js = '// Made by tools/build.mjs from embers/manifest.json (the game\'s public/assets/env/manifest.json): do not edit, edit\n'
    + '// that file and run "npm run build". The offline copy of the shipped ids; see shared/manifest.js.\n'
    + `(window.EmbersKit = window.EmbersKit || {}).EMBEDDED_SHIPPED = ${JSON.stringify(ids, null, 1)};\n`;
  const out = path.join(root, 'shared/manifest-data.js');
  if (!fs.existsSync(out) || fs.readFileSync(out, 'utf8') !== js) { fs.writeFileSync(out, js); console.log('wrote shared/manifest-data.js'); }
}

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
  res = res.replace(/<script\s+src="(shared\/[\w.-]+\.js)"\s*><\/script>/g, (_, file) => {
    const p = path.join(root, file);
    if (!fs.existsSync(p)) fail(`${srcName} loads ${file}, which does not exist`);
    return `<script>\n${fs.readFileSync(p, 'utf8').replace(/<\/script/gi, '<\\/script')}</script>`;
  });
  res = res.replace(modTag[0], () => `<script>\n${js}</script>`);
  res = res.replace(/href="[^"]*"(\s+)data-offline-href="([^"]*)"/g, 'href="$2"');
  if (/type=["'](importmap|module)["']/i.test(res) || res.includes('cdn.jsdelivr.net') || /<script[^>]+src=/i.test(res)) {
    fail('output still references the importmap, a module script, a script file or jsDelivr');
  }
  fs.writeFileSync(OUT, res);
  console.log(`wrote ${path.relative(process.cwd(), OUT) || OUT} (${(res.length / 1024).toFixed(0)} KB)`);
}
