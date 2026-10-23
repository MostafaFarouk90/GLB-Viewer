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

## Editing / development
`index.html` is the source. `glb-viewer-offline.html` is generated from it by `tools/build.mjs` (esbuild inlines the libraries pinned in `package.json`, which must match the versions in the importmap).

```sh
npm install      # dev tools only: three, meshoptimizer, three-subdivide, esbuild, Playwright
npm run build    # regenerate glb-viewer-offline.html from index.html
npm test         # Playwright tests (Chromium) against both index.html and the offline file
```

**After editing `index.html`, run `npm run build` and commit the regenerated `glb-viewer-offline.html` together with it.** Tests run offline: CDN requests from `index.html` are served from `node_modules`, and the offline file is checked to make no CDN requests. Set `PW_CHROMIUM_PATH` to use a specific Chromium binary.

There is intentionally no CI: build and test locally before committing.
