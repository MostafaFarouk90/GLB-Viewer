# Embers of Valdren: how a model arrives game-ready

For the GLB-Viewer project (viewer game mode and props page). Source of truth is the game repo https://github.com/MostafaFarouk90/OpenWorld, branch main.

## Load the size table live, do not copy it

`targets.json` changes as each map tile is designed (new ids, adjusted sizes). Load it at runtime from:

`https://raw.githubusercontent.com/MostafaFarouk90/OpenWorld/main/src/env/targets.json`

It is public and sent with `Access-Control-Allow-Origin: *`, so a page can `fetch()` it directly. Keep the copy in this folder only as an offline fallback, plus a "load file" button. The copy here is newer than main for now: it includes the `proportion` table from the environment branch, which reaches main with the next environment-tile PR.

The missing-objects list (`environment-needs-prompts.md`, sections A to G: ids, sizes, one-line object descriptions and the image prompt template) lives only in our project files, not in the game repo, so this folder's copy is the one to use. We refresh it here when it changes.

## targets.json fields

- `objects.<id>`: `{ w, d, h }` in metres. w = width along X, d = depth along Z, h = height along Y.
- `tolerance` (0.15): allowed deviation on the driver axis. The driver is the height, or the longest footprint side when max(w, d) > 1.8 x h (walls, fences, carts).
- `proportionTolerance` (1.1): allowed deviation on the other two axes. It is deliberately generous because the target proportions are estimates.
- `maxTriangles` (10,000) and `maxFileMB` (1.5): hard caps. A file over either fails.
- `knightHeight` (1.8): the player's height in metres. Use it for the scale figure.
- `proportion.<id>`: ids that ingest fits **exactly** to the target box (uniform scale to the height, then width and depth scaled without the 15% cap; `tile: n` repeats the model n times along X first, for fence and wall modules). For these ids the viewer must not flag the original's width or depth as an error; show the fitted result instead. Today: stonewall-low, wattle-fence, picket-fence, garden-bed-a (tile 2), signpost-a, washing-line, barn-a.

## File rules

| Rule | Value |
| --- | --- |
| Format | .glb, glTF 2.0, one object per file |
| File name | `<id>.glb`, id exactly as in targets.json (for example `basalt-columns-a.glb`) |
| Axes and units | Y up, 1 unit = 1 metre, authored at the target size |
| Pivot | centre of the footprint at x 0, z 0; lowest point at y 0 |
| Facing | front (door side, open side, the face the player sees first) towards +Z |
| Transforms | baked: no rotation or scale left on nodes |
| Face target | about 4,500 triangles (small props 300 to 1,500; hero trees up to 6,000) |
| Textures | base colour only, one small atlas or vertex colours, 512 px, JPEG or WebP (PNG only where alpha is needed, such as leaf cards) |
| WebP | only with `EXT_texture_webp` declared in `extensionsUsed` and on the texture; otherwise use JPEG |
| Materials | flat colours with soft shading; roughness 1, metallic 0 |
| Not wanted | normal, roughness, metallic, AO or emissive maps (dropped anyway), collider meshes (we add collision), skins or animations (scenery is static), transparency except foliage |
| Variants | an id marked xN in the list means N different silhouettes; the game also places each with random yaw and plus or minus 10% scale |

Emissive glow for ember props: use an emissive colour on the material, not an emissive texture (textures other than base colour are dropped).

## Palette (from the missing-objects list)

| Use | Hex |
| --- | --- |
| Grass green | 5a8c44 |
| Bark | 6b4a2b |
| Warm stone | 8a8578 |
| Thatch | d1b25a |
| Red roof | a83a2c |
| Act 2 charcoal | 2b2b2b |
| Act 2 ash grey | 8d8780 |
| Act 2 ember orange | ff5a0f |
| Act 2 scorched brown | 4a3722 |

Style: KayKit low-poly, chunky simple shapes, flat saturated colours, clean silhouettes.

## What our ingest does, so the viewer can skip it or match it

The game runs `tools/env-pass/ingest.mjs` on every file before it ships. It:

1. Bakes node transforms (a Z-up export becomes Y-up).
2. Scales uniformly so the height matches the target height, then stretches width and depth by at most 15% towards the target footprint. Anything that needs more is reported as a CAP line for the artist to fix. So **proportions are the part the viewer should check hardest**. A model that is right in height but too narrow gets only 15% of help.
3. Moves the base to y 0 and the footprint centre to x 0, z 0.
4. Welds and simplifies to about 4,500 triangles. A file already at or under that passes through untouched.
5. Drops every texture except base colour, sets roughness 1 and metallic 0, and resizes textures to 512 px WebP.
6. Fails on more than 10,000 triangles or more than 1.5 MB.

**So the viewer can skip:** WebP conversion, stripping extra maps and the final decimation, since ingest redoes them. It still helps to do them: Mostafa's repo stays small, and he sees the real result. **The viewer should own:** the right proportions against the target, the facing towards +Z, the file name, and a visual check next to the 1.8 m figure. Those are the things ingest cannot fix.

The game's own checker, `tools/env-pass/check-glb.mjs` in the repo, is the reference for the verdict lines (size per axis against target, pivot, triangles, MB). A viewer check that gives the same pass or fail as that script is ideal.

## Characters (later)

Generated characters are not used yet. If they become NPCs, they need the KayKit Adventurers skeleton (41 bones: root, hips, spine, chest, upperarm.l/r, lowerarm.l/r, wrist.l/r, hand.l/r, handslot.l/r, head, upperleg.l/r, lowerleg.l/r, foot.l/r, toes.l/r plus IK helpers), with each part rigidly skinned to one bone. They would face +Z, use one or two materials and about 3,000 to 7,000 triangles. Whether they should match KayKit's chibi proportions is still Mostafa's open call.
