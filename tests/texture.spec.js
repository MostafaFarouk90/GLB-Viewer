import fs from 'node:fs';
import zlib from 'node:zlib';
import { test, expect } from '@playwright/test';
import { TEXTURE_VARIANTS, openApp, parseGLB } from './helpers.js';

async function download(page, info, button, name) {
  const [dl] = await Promise.all([page.waitForEvent('download'), page.click(button)]);
  const out = info.outputPath(name || dl.suggestedFilename());
  await dl.saveAs(out);
  return { name: dl.suggestedFilename(), buf: fs.readFileSync(out) };
}

// Decodes the PNGs this page writes (8-bit RGBA, filter types 0 and 1 only).
function decodePNG(buf) {
  expect(buf.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  let off = 8, w = 0, h = 0, type = 0; const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off), t = buf.toString('latin1', off + 4, off + 8), d = buf.subarray(off + 8, off + 8 + len);
    if (t === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); type = d[9]; }
    if (t === 'IDAT') idat.push(d);
    off += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat)), px = Buffer.alloc(w * h * 4), stride = w * 4;
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)];
    for (let x = 0; x < stride; x++) {
      const v = raw[y * (stride + 1) + 1 + x];
      px[y * stride + x] = f === 1 ? (v + (x >= 4 ? px[y * stride + x - 4] : 0)) & 255 : v;
    }
  }
  return { w, h, type, px };
}
// Entries of a stored (uncompressed) zip.
function readZip(buf) {
  const out = {}; let off = 0;
  while (buf.readUInt32LE(off) === 0x04034b50) {
    const size = buf.readUInt32LE(off + 18), nlen = buf.readUInt16LE(off + 26), name = buf.toString('utf8', off + 30, off + 30 + nlen);
    out[name] = buf.subarray(off + 30 + nlen, off + 30 + nlen + size);
    off += 30 + nlen + size;
  }
  return out;
}
const accessorBounds = (json) => {
  const a = json.accessors[json.meshes[0].primitives[0].attributes.POSITION];
  return { min: a.min, max: a.max };
};
const imageBytes = (json, bin, i = 0) => { const bv = json.bufferViews[json.images[i].bufferView]; return bin.subarray(bv.byteOffset || 0, (bv.byteOffset || 0) + bv.byteLength); };

for (const file of TEXTURE_VARIANTS) {
  test.describe(file, () => {
    let ctx;
    test.beforeEach(async ({ page }) => { ctx = await openApp(page, file, '__texgen'); });
    test.afterEach(async () => {
      expect(ctx.unexpected(), 'console/page errors').toEqual([]);
      if (file.includes('offline')) expect(ctx.cdnRequests, 'offline build must not touch the CDN').toEqual([]);
    });

    test('starts with a seamless 512 px texture', async ({ page }) => {
      await expect(page.locator('#sR')).toHaveText('512 × 512 px');
      await expect(page.locator('#sS')).toContainText('seamless ✓');
      await expect(page.locator('#texName')).toHaveText('Thatch');
      await expect(page.locator('#log')).toContainText('Targets from the game repo');
    });

    test('every texture tiles, every decal fades out, every variant builds', async ({ page }) => {
      test.setTimeout(240_000);
      const res = await page.evaluate(() => {
        const g = window.__texgen, out = [];
        for (const [k, K] of Object.entries(g.KINDS)) for (const seed of ['s1', 's2']) {
          const vals = K.opts ? Object.keys(K.opts.values) : [null];
          for (const opt of vals) for (const embers of K.embers ? [false, true] : [false]) for (const palette of ['field', 'ash', 'random']) {
            const img = g.generate(g.makeTraits(k, seed, { opt, embers, palette }), 128), d = img.data, n = 128;
            let mean = 0, sq = 0, cnt = 0, border = 0;
            for (let i = 0; i < d.length; i += 4) if (d[i + 3] > 128) { const l = d[i] + d[i + 1] + d[i + 2]; mean += l; sq += l * l; cnt++; }
            for (let x = 0; x < n; x++) for (const y of [0, n - 1]) border = Math.max(border, d[(y * n + x) * 4 + 3], d[(x * n + y) * 4 + 3]);
            mean /= Math.max(cnt, 1);
            out.push({ k, seed, opt, embers, palette, group: K.group, seam: img.tiling ? g.seamRatio(d, n) : 0, opaque: g.opaqueShare(d),
              std: Math.sqrt(Math.max(0, sq / Math.max(cnt, 1) - mean * mean)), border });
          }
        }
        return out;
      });
      expect(new Set(res.filter((r) => r.group === 'tex').map((r) => r.k)).size).toBeGreaterThanOrEqual(11);
      expect(new Set(res.filter((r) => r.group === 'decal').map((r) => r.k)).size).toBeGreaterThanOrEqual(7);
      for (const r of res) {
        const what = `${r.k} ${r.seed} ${r.opt} embers=${r.embers} ${r.palette}`;
        expect(r.std, what + ' has detail').toBeGreaterThan(4);
        if (r.group === 'tex') {
          expect(r.seam, what + ' tiles').toBeLessThan(3); // a real seam is several times the neighbour difference
          expect(r.opaque, what).toBe(1);
        } else {
          expect(r.border, what + ' clear at the border').toBe(0);
          expect(r.opaque, what + ' has content').toBeGreaterThan(0.03);
          expect(r.opaque, what + ' is not a full square').toBeLessThan(0.75);
        }
      }
    });

    test('same seed gives the same image, another seed a different one', async ({ page }) => {
      const hash = () => page.evaluate(() => { let h = 0; const d = window.__texgen.state.image.data; for (let i = 0; i < d.length; i += 7) h = (h * 31 + d[i]) | 0; return h; });
      await page.selectOption('#kind', 'cobbles');
      await page.fill('#seed', 'abc'); await page.press('#seed', 'Enter');
      await expect(page.locator('#log')).toContainText('Cobblestones (seed "abc")');
      const first = await hash();
      await page.click('#randomBtn');
      await expect(page.locator('#seed')).not.toHaveValue('abc');
      expect(await hash()).not.toBe(first);
      await page.fill('#seed', 'abc'); await page.press('#seed', 'Enter');
      await expect.poll(hash).toBe(first);
    });

    test('look, palette and size controls change the image', async ({ page }) => {
      const sig = () => page.evaluate(() => { const s = window.__texgen.state; let h = 0; for (let i = 0; i < s.image.data.length; i += 11) h = (h * 31 + s.image.data[i]) | 0; return h + ':' + s.image.res; });
      await page.selectOption('#kind', 'planks');
      let last = await sig();
      const changed = async (what) => { await expect.poll(sig, { message: what }).not.toBe(last); last = await sig(); };
      await page.locator('#scale').fill('3'); await changed('density');
      await page.locator('#contrast').fill('0.5'); await changed('contrast');
      await page.selectOption('#posterize', '4'); await changed('toon bands');
      await page.selectOption('#opt', 'off'); await changed('nails off');
      await page.selectOption('#palette', 'ash'); await changed('ash palette');
      await expect(page.locator('#c_0')).toHaveValue('#4a3722');
      await page.click('#colorsBtn'); await changed('new colours');
      await expect(page.locator('#palette')).toHaveValue('random');
      await page.selectOption('#res', '256'); await changed('resolution');
      await expect(page.locator('#sR')).toHaveText('256 × 256 px');
      // decals: soft edge row and no JPEG
      await page.selectOption('#kind', 'puddle');
      await expect(page.locator('#softRow')).toBeVisible();
      await expect(page.locator('#format option[value=jpeg]')).toBeDisabled();
      await expect(page.locator('#sS')).toHaveText('decal (no tiling)');
      last = await sig();
      await page.locator('#soft').fill('0.5'); await changed('softness');
    });

    test('PNG download keeps alpha and the colour under transparent pixels', async ({ page }, info) => {
      await page.selectOption('#kind', 'puddle');
      const { name, buf } = await download(page, info, '#imageBtn');
      expect(name).toBe('puddle.png');
      const png = decodePNG(buf);
      expect([png.w, png.h, png.type]).toEqual([512, 512, 6]);
      const corner = [...png.px.subarray(0, 4)], centre = [...png.px.subarray((256 * 512 + 256) * 4, (256 * 512 + 256) * 4 + 4)];
      expect(corner[3]).toBe(0);
      expect(corner[0] + corner[1] + corner[2]).toBeGreaterThan(60); // bled colour, not black
      expect(centre[3]).toBeGreaterThan(150);
      const fromPage = await page.evaluate(() => Array.from(window.__texgen.state.image.data.slice(0, 4)));
      expect(corner).toEqual(fromPage);
    });

    test('texture downloads as JPEG and WebP', async ({ page }, info) => {
      await page.selectOption('#kind', 'bricks');
      await page.selectOption('#format', 'jpeg');
      let { name, buf } = await download(page, info, '#imageBtn');
      expect(name).toBe('bricks.jpg');
      expect(buf.subarray(0, 3).toString('hex')).toBe('ffd8ff');
      await page.selectOption('#format', 'webp');
      ({ name, buf } = await download(page, info, '#imageBtn'));
      expect(name).toBe('bricks.webp');
      expect(buf.toString('latin1', 8, 12)).toBe('WEBP');
    });

    test('ash-patch-decal exports a game-ready flat GLB', async ({ page }, info) => {
      await page.selectOption('#gameId', 'ash-patch-decal');
      await expect(page.locator('#log')).toContainText('ash-patch-decal: Ash patch, 3.00 m × 3.00 m (size from the missing-objects list');
      await expect(page.locator('#decalW')).toBeDisabled();
      await expect(page.locator('#fileName')).toHaveValue('ash-patch-decal');
      await expect(page.locator('#preview')).toHaveValue('decal');
      const { name, buf } = await download(page, info, '#glbBtn');
      expect(name).toBe('ash-patch-decal.glb');
      expect(buf.length).toBeLessThan(1.5 * 1048576);
      const { json, bin } = parseGLB(buf);
      const root = json.nodes[json.scenes[0].nodes[0]];
      expect(root.name).toBe('ash-patch-decal');
      expect(root.extras).toMatchObject({ generator: 'texture-generator', kind: 'ashpatch', gameId: 'ash-patch-decal', palette: 'ash', res: 512 });
      expect(json.nodes.every((n) => !n.rotation && !n.scale && !n.matrix)).toBe(true);
      const b = accessorBounds(json);
      expect(b.min.map((v) => +v.toFixed(3) + 0)).toEqual([-1.5, 0, -1.5]);
      expect(b.max.map((v) => +v.toFixed(3) + 0)).toEqual([1.5, 0, 1.5]);
      const m = json.materials[0];
      expect(m.alphaMode).toBe('BLEND');
      expect(m.pbrMetallicRoughness).toMatchObject({ roughnessFactor: 1, metallicFactor: 0, baseColorTexture: { index: 0 } });
      expect(m.normalTexture || m.emissiveTexture || m.occlusionTexture).toBeUndefined();
      expect(json.images[0].mimeType).toBe('image/png');
      const png = decodePNG(Buffer.from(imageBytes(json, bin)));
      expect([png.w, png.h]).toEqual([512, 512]);
      const fromPage = await page.evaluate(() => Array.from(window.__texgen.state.image.data.slice(0, 4096)));
      expect([...png.px.subarray(0, 4096)]).toEqual(fromPage);
      // cut-out alpha
      await page.selectOption('#alphaMode', 'MASK');
      const { buf: buf2 } = await download(page, info, '#glbBtn', 'mask.glb');
      expect(parseGLB(buf2).json.materials[0]).toMatchObject({ alphaMode: 'MASK', alphaCutoff: 0.5 });
    });

    test('waystone-flagstones is a 9 m circle; a texture tile GLB is opaque', async ({ page }, info) => {
      await page.selectOption('#gameId', 'waystone-flagstones');
      await expect(page.locator('#opt')).toHaveValue('grass');
      let { name, buf } = await download(page, info, '#glbBtn');
      expect(name).toBe('waystone-flagstones.glb');
      let b = accessorBounds(parseGLB(buf).json);
      expect(b.max[0] - b.min[0]).toBeCloseTo(9, 3);
      expect(b.max[2] - b.min[2]).toBeCloseTo(9, 3);
      await page.selectOption('#gameId', '');
      await page.selectOption('#kind', 'grass');
      await page.fill('#tileM', '4'); await page.press('#tileM', 'Enter');
      ({ name, buf } = await download(page, info, '#glbBtn'));
      expect(name).toBe('grass.glb');
      const { json } = parseGLB(buf);
      b = accessorBounds(json);
      expect(b.max[0] - b.min[0]).toBeCloseTo(4, 3);
      expect(json.materials[0].alphaMode).toBeUndefined();
      expect(json.samplers?.[0]?.wrapS ?? 10497).toBe(10497);
    });

    test('texture pack has every kind and a manifest', async ({ page }, info) => {
      test.setTimeout(120_000);
      await page.selectOption('#res', '256');
      const { name, buf } = await download(page, info, '#packBtn');
      expect(name).toMatch(/^textures-field-.*\.zip$/);
      const z = readZip(buf), kinds = await page.evaluate(() => Object.keys(window.__texgen.KINDS));
      const manifest = JSON.parse(z['manifest.json'].toString('utf8'));
      expect(manifest.items.length).toBe(kinds.length);
      for (const it of manifest.items) {
        expect(z[it.file], it.file).toBeTruthy();
        const png = decodePNG(z[it.file]);
        expect([png.w, png.h]).toEqual([256, 256]);
        expect(it).toMatchObject({ generator: 'texture-generator', res: 256 });
      }
      expect(Object.keys(z).filter((n) => n.startsWith('textures/')).length).toBe(11);
      expect(Object.keys(z).filter((n) => n.startsWith('decals/')).length).toBe(7);
    });

    test('palette atlas turns a many-material model into one texture', async ({ page }, info) => {
      // a test model: three flat colours, one textured box, one glowing part and a sphere that repeats its texture
      const bytes = await page.evaluate(async () => {
        const { THREE, GLTFExporter } = window.__texgen;
        const tex = (col) => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); g.fillStyle = col; g.fillRect(0, 0, 64, 64); g.fillStyle = '#fff'; g.fillRect(0, 0, 32, 32); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };
        const root = new THREE.Group(); root.name = 'Model';
        const add = (geo, mat, x) => { const m = new THREE.Mesh(geo, mat); m.position.x = x; m.name = mat.name; root.add(m); };
        add(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial({ name: 'Red', color: 0xff0000 }), 0);
        add(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial({ name: 'Green', color: 0x00ff00, metalness: 1 }), 1.5);
        add(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial({ name: 'Blue', color: 0x0000ff }), 3);
        add(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial({ name: 'Wood', map: tex('#8a5f37') }), 4.5);
        add(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial({ name: 'Glow', color: 0x222222, emissive: 0xff5a0f }), 6);
        const sg = new THREE.SphereGeometry(0.5); const uv = sg.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * 3);
        const rep = tex('#406080'); rep.wrapS = THREE.RepeatWrapping;
        add(sg, new THREE.MeshStandardMaterial({ name: 'Tiled', map: rep }), 7.5);
        return Array.from(new Uint8Array(await new GLTFExporter().parseAsync(root, { binary: true })));
      });
      const src = info.outputPath('many-mats.glb');
      fs.writeFileSync(src, Buffer.from(bytes));
      await page.setInputFiles('#modelFile', src);
      await expect(page.locator('#log')).toContainText('Opened many-mats.glb: 6 materials, 2 with a texture');
      await expect(page.locator('#preview')).toHaveValue('model');
      await page.click('#atlasBtn');
      await expect(page.locator('#log')).toContainText('Atlas 512 px: 6 materials → 2 (1 textures copied, 5 colour swatches)');
      await expect(page.locator('#log')).toContainText('Tiled repeats its texture');
      const { name, buf } = await download(page, info, '#atlasGlbBtn');
      expect(name).toBe('many-mats.glb');
      const { json, bin } = parseGLB(buf);
      expect(json.materials.map((m) => m.name).sort()).toEqual(['Atlas', 'AtlasGlow_ff5a0f']);
      expect(json.images.length).toBe(1);
      expect(json.textures.length).toBe(1);
      for (const m of json.materials) expect(m.pbrMetallicRoughness).toMatchObject({ roughnessFactor: 1, metallicFactor: 0, baseColorTexture: { index: 0 } });
      expect(json.materials.find((m) => m.name.startsWith('AtlasGlow')).emissiveFactor.map((v) => +v.toFixed(2))).toEqual([1, 0.1, 0]);
      for (const mesh of json.meshes) for (const p of mesh.primitives) {
        const a = json.accessors[p.attributes.TEXCOORD_0];
        expect(a.min[0]).toBeGreaterThanOrEqual(0); expect(a.max[0]).toBeLessThanOrEqual(1);
        expect(a.min[1]).toBeGreaterThanOrEqual(0); expect(a.max[1]).toBeLessThanOrEqual(1);
      }
      expect(imageBytes(json, bin).subarray(1, 4).toString()).toBe('PNG');
      const atlas = await download(page, info, '#atlasPngBtn');
      expect(atlas.name).toBe('many-mats-atlas.png');
      expect(decodePNG(atlas.buf).w).toBe(512);
    });
  });
}
