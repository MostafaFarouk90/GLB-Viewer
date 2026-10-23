// Builds glb-optimizer-offline.html: same app with all libraries inlined (no internet needed).
// Usage: npm i three@0.170.0 meshoptimizer@1.3.0 three-subdivide@1.1.5 esbuild && node build.mjs
import fs from 'node:fs';
import path from 'node:path';
import * as esbuild from 'esbuild';

const html = fs.readFileSync('glb-optimizer.html', 'utf8');
const m = html.match(/<script type="module">([\s\S]*?)<\/script>/);
const nm = path.resolve('node_modules');
const alias = {
  'meshoptimizer/simplifier': `${nm}/meshoptimizer/meshopt_simplifier.js`,
  'meshoptimizer/decoder': `${nm}/meshoptimizer/meshopt_decoder.mjs`,
  'three-subdivide': `${nm}/three-subdivide/src/index.js`,
};
const out = await esbuild.build({
  stdin: { contents: m[1], resolveDir: process.cwd(), loader: 'js' },
  bundle: true, format: 'iife', minify: true, write: false, target: 'es2020', legalComments: 'none',
  plugins: [{ name: 'alias', setup(b) {
    b.onResolve({ filter: /^(meshoptimizer\/|three-subdivide$)/ }, (a) => ({ path: alias[a.path] }));
    b.onResolve({ filter: /^three\/addons\// }, (a) => ({ path: `${nm}/three/examples/jsm/${a.path.slice(13)}` }));
  } }],
});
const js = out.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');
let res = html.replace(/<!-- Libraries load[\s\S]*?<\/script>\n/, '');
res = res.replace(m[0], () => `<script>\n${js}</script>`);
fs.writeFileSync('glb-optimizer-offline.html', res);
console.log('wrote glb-optimizer-offline.html', (res.length / 1024).toFixed(0), 'KB');
