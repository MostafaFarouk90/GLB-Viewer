# GLB Optimizer (local, no build needed)

A single-page tool to view a .glb model and change its face count, smoothness and file size.

## Run it
1. Double-click **glb-optimizer-offline.html** (works with no internet; everything is inside the file).
   - `glb-optimizer.html` is the same app in readable form; it loads three.js etc. from a CDN, so it needs internet.
2. Click **Open GLB…** (or drag a .glb onto the viewer). "Load sample" gives a test model.
3. Adjust settings, press **Apply**, compare with the **Original / Result** toggle, then **Download GLB**.

Works in current Chrome, Edge, Firefox and Safari. No server, no install.

## Controls
- **Target faces / %**: below 100% decimates (meshoptimizer). Above 100% it subdivides (Loop) and trims to the exact count.
- **Subdivision levels/type**: Auto picks the number of levels; "Flat" adds faces without changing the shape.
- **Max shape error**: how much decimation may deform the model. Raise it if the face target is not reached.
- **Lock borders**: keep open edges (holes, mesh seams) in place while decimating.
- **Surface smoothing**: Taubin smoothing passes (smooths without shrinking).
- **Shading / normals**: keep, smooth, flat, or auto with a crease angle.
- **Fit to target size**: reduces faces until the exported GLB fits the MB target.
- **Max texture size / format**: textures are often most of the file size; JPEG + 1024 shrinks a lot.

## Notes
- Skinned (animated) and morph-target meshes are decimated but not subdivided or smoothed, so animation keeps working.
- Draco-compressed input loads only when online (decoder comes from Google's CDN). Meshopt-compressed input works offline.
- Output is an uncompressed GLB; textures are re-encoded by the browser.

## Editing
Edit `glb-optimizer.html` directly (open it in the browser to test, needs internet). To regenerate the offline file:
`npm i three@0.170.0 meshoptimizer@1.3.0 three-subdivide@1.1.5 esbuild && node build.mjs`
