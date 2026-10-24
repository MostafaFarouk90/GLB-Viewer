# GLB Viewer & Optimizer

A single-page tool to view a `.glb` / `.gltf` model and change its face count, smoothness and file size, then download the result as GLB. Plain HTML + JavaScript: no server, no install, no build step to use it.

## Run it
1. Double-click **`glb-viewer-offline.html`**. It works with no internet because every library is inside the file.
   - `index.html` is the same app in readable form. It loads three.js and the other libraries from the jsDelivr CDN, so it needs internet.
2. Click **Open GLB…** (or drag a file onto the viewer). **Load sample** gives a test model.
3. Change the settings, press **Apply**, compare with the **Original / Result** toggle, then **Download GLB**.

Works in current Chrome, Edge, Firefox and Safari.

## Controls
- **Target faces / %**: below 100% decimates (meshoptimizer). Above 100% it subdivides (Loop) and trims to the exact count.
- **Subdivision levels/type**: Auto picks the number of levels; "Flat" adds faces without changing the shape.
- **Max shape error**: how much decimation may deform the model. Raise it if the face target is not reached.
- **Lock borders**: keep open edges (holes, mesh seams) in place while decimating.
- **Surface smoothing**: Taubin smoothing passes (smooths without shrinking).
- **Shading / normals**: keep, smooth, flat, or auto with a crease angle.
- **Fit to target size**: reduces faces until the exported GLB fits the MB target.
- **Max texture size / format**: textures are often most of the file size; JPEG + 1024 shrinks a lot.

## Notes and limitations
- Skinned (animated) and morph-target meshes are decimated but not subdivided or smoothed, so animation keeps working.
- Draco-compressed input loads only when online (the decoder comes from Google's CDN). Meshopt-compressed input works offline.
- A `.gltf` with external `.bin`/texture files: select or drop all of its files together.
- Output is an uncompressed GLB; textures are re-encoded by the browser.

## Mystical character generator
`character-generator-offline.html` (offline) / `character-generator.html` (CDN) makes fantasy characters procedurally and saves them as GLB. It needs no account or API key and runs entirely in the browser.

- **Archetype**: wizard, elf ranger, stone golem, demon, fairy, forest spirit, specter, celestial. Each has its own proportions, likely parts and palette.
- **Seed / Randomize**: the same archetype + seed always gives the same character (and name). **New colors** rerolls only the palette.
- **Body**: height in metres (top of the head), build, head size, limb length, and pose. Use **T-pose** if you want to auto-rig the model (for example in Mixamo or Blender).
- **Parts**: outfit, hair, ears, beard, horns, headwear, wings, held item, tail, aura, glowing eyes. Any part works with any archetype.
- **Output**: smooth or low-poly style, detail level, combine parts per material (few meshes) or keep every part as its own named mesh, and an optional idle animation (spinning aura, bobbing for floating characters).

The exported GLB opens in the viewer above, so you can then smooth it, change its face count or fit it to a file size. Glow parts use emissive materials (with `KHR_materials_emissive_strength`); the glow halo in the preview is a screen effect and is not part of the file. The body is not rigged.

Why procedural instead of AI text-to-3D: services such as Meshy, Tripo or Hunyuan3D give more detailed sculpted models but need an account, an API key (which would be readable inside a shared HTML file), internet and per-model credits, and take from 30 seconds to minutes per model. The procedural generator is instant, free, offline and reproducible.

## Embers of Valdren game data (`embers/`)
Reference files from the game repo [MostafaFarouk90/OpenWorld](https://github.com/MostafaFarouk90/OpenWorld), so the viewer's game mode and the props page export game-ready models:
- `embers/conventions.md`: file rules (Y up, 1 unit = 1 m, base-centre pivot, front +Z, `<id>.glb`, about 4.5k faces, 512 px textures), palette, and what the game's ingest step does.
- `embers/targets.json`: target size in metres per object id, tolerances and budgets. It changes as the game's map tiles are designed, so the tools should load the live copy from `https://raw.githubusercontent.com/MostafaFarouk90/OpenWorld/main/src/env/targets.json` and fall back to this file offline.
- `embers/environment-needs-prompts.md`: the list of missing objects with sizes and one-line descriptions.

## Editing / development
`index.html` and `character-generator.html` are the sources. `glb-viewer-offline.html` and `character-generator-offline.html` are generated from them by `tools/build.mjs` (esbuild inlines the libraries pinned in `package.json`, which must match the versions in the importmap).

```sh
npm install      # dev tools only: three, meshoptimizer, three-subdivide, esbuild, Playwright
npm run build    # regenerate both *-offline.html files
npm test         # Playwright tests (Chromium) against the CDN pages and their offline files
```

**After editing a source page, run `npm run build` and commit the regenerated offline file together with it.** Tests run offline: CDN requests from the source pages are served from `node_modules`, and the offline file is checked to make no CDN requests. Set `PW_CHROMIUM_PATH` to use a specific Chromium binary.

There is intentionally no CI: build and test locally before committing.
