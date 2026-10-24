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
- **Max texture size / format**: textures are often most of the file size; JPEG or WebP + 512/1024 shrinks a lot. WebP is written with `EXT_texture_webp` declared, as glTF requires. **Keep** writes the original image bytes back unchanged when no resize is needed (it used to re-encode them as PNG, which made files bigger).
- **Base colour only**: drops normal, roughness, metal, AO and emissive maps on export and sets roughness 1, metal 0.
- **Face budget**: presets Prop 1,500, Standard 4,500, Hero tree 6,000, Character 5,000. A preset never adds faces to a model that is already under it. A face target more than 4× the model (and above 20,000), or above 1,000,000, asks before running.
- **Transform**: pivot to base centre (base on y 0, footprint centred on x/z 0), rotate 90° about Y, Z-up → Y-up, scale to a height in metres, and bake transforms into the vertices. These change the model; press Apply again afterwards.
- **Scale aids** (viewer toolbar): metre grid centred on the origin with a ruler, the bounding box with W × D × H, a 1.8 m figure beside the model, and a +Z arrow showing the front. They are not exported.
- **Batch**: **Batch folder…**, or drop a folder or several models at once. Every .glb/.gltf runs with the current settings (face budget from the preset, else the % slider) and a zip downloads with the results, `report.json` and `report.txt`.

## Game profile: Embers of Valdren
Set **Profile** to *Embers game-ready* to prepare models for the game (`embers/conventions.md` has the rules).

- Target sizes load live from the game repo's `src/env/targets.json`; without internet the copy built into the page (`embers/targets.json`) is used. **Load targets.json…** (or dropping a .json) uses another copy.
- The id comes from the file name (`oak-a.glb`, also `Oak_A.glb` or `oak-a_optimized.glb`); type another in **Id**. Downloads are saved as `<id>.glb`.
- The verdict list uses the same pass/fail rules as the game's `tools/env-pass/check-glb.mjs`: size against the target (driver axis ±15%, the others ±110%), base at y 0, footprint centre near 0, at most 10,000 triangles and 1.5 MB. Warnings show what the ingest would still change: width/depth that would need more than its 15% stretch once scaled to the target height (a CAP line), more than 4,500 triangles, extra or large textures, skins and animations. Ids in the `proportion` table are fitted exactly by the ingest, so their width and depth are not checked.
- **Make game-ready** scales to the target height, moves the pivot to the base centre, sets the Standard face budget (if no preset is chosen), 512 px WebP base-colour textures and a 25% shape error limit, then applies. Facing (+Z is the front) is still yours to check against the arrow.
- Batch with the profile on fits each file to its target and adds the verdict to the report.

## Notes and limitations
- Skinned (animated) and morph-target meshes are decimated but not subdivided or smoothed, so animation keeps working.
- Draco-compressed input loads only when online (the decoder comes from Google's CDN). Meshopt-compressed input works offline.
- A `.gltf` with external `.bin`/texture files: select or drop all of its files together.
- Output is an uncompressed GLB. Textures are re-encoded by the browser when they are resized or change format; Safari before 17 cannot write WebP and falls back to PNG (the log says so).
- three.js 0.170 is used here while the game uses 0.168; GLB files are version-neutral, so that is fine.

## Mystical character generator
`character-generator-offline.html` (offline) / `character-generator.html` (CDN) makes fantasy characters procedurally and saves them as GLB. It needs no account or API key and runs entirely in the browser.

- **Archetype**: wizard, elf ranger, stone golem, demon, fairy, forest spirit, specter, celestial. Each has its own proportions, likely parts and palette.
- **Seed / Randomize**: the same archetype + seed always gives the same character (and name). **New colors** rerolls only the palette.
- **Body**: height in metres (top of the head), build, head size, limb length, and pose. Use **T-pose** if you want to auto-rig the model (for example in Mixamo or Blender).
- **Parts**: outfit, hair, ears, beard, horns, headwear, wings, held item, tail, aura, glowing eyes. Any part works with any archetype.
- **KayKit chibi look** (off by default): big head and short legs like the KayKit Adventurers, with the hips, legs, shoulders, arms and neck exactly on the KayKit skeleton's rest pose. Build then only changes girth and head size only the head; limb length is locked.
- **Output**: smooth or low-poly style, detail level (low, medium, high, or **game budget**: the most detail that stays at or under 4,000 triangles), combine parts per material (few meshes) or keep every part as its own named mesh, and an optional idle animation (spinning aura, bobbing for floating characters).
- **KayKit skeleton (41 bones)**: rigs the body on the KayKit Adventurers bones (same names, hierarchy and rest rotations, T rest pose, facing +Z), each part rigidly skinned to one bone (torso and robe blend from hips to chest). The held item is a plain mesh under `handslot.r`, like KayKit's weapons, so a game can hide or swap it; `handslot.l` is free. With the chibi look the bone offsets are KayKit's own, so KayKit clips (which key translations on every bone) play as they are. On a realistic body the bones move onto its joints; play KayKit clips with their bone translation tracks removed (except the hips). Works with or without the chibi look.
- **One material (palette texture)**: every colour in one small nearest-filtered texture (roughness 1, metallic 0), plus one emissive Glow material if the character glows.

Every export keeps the archetype, seed, name and all settings in the root node's glTF `extras`, so a character can be regenerated.

The exported GLB opens in the viewer above, so you can then smooth it, change its face count or fit it to a file size. Glow parts use emissive materials (with `KHR_materials_emissive_strength`); the glow halo in the preview is a screen effect and is not part of the file. Without the KayKit skeleton option the body is not rigged.

Why procedural instead of AI text-to-3D: services such as Meshy, Tripo or Hunyuan3D give more detailed sculpted models but need an account, an API key (which would be readable inside a shared HTML file), internet and per-model credits, and take from 30 seconds to minutes per model. The procedural generator is instant, free, offline and reproducible.

## Embers of Valdren game data (`embers/`)
Reference files from the game repo [MostafaFarouk90/OpenWorld](https://github.com/MostafaFarouk90/OpenWorld), so the viewer's game mode and the props page export game-ready models:
- `embers/conventions.md`: file rules (Y up, 1 unit = 1 m, base-centre pivot, front +Z, `<id>.glb`, about 4.5k faces, 512 px textures), palette, and what the game's ingest step does.
- `embers/targets.json`: target size in metres per object id, tolerances and budgets. It changes as the game's map tiles are designed, so the tools should load the live copy from `https://raw.githubusercontent.com/MostafaFarouk90/OpenWorld/main/src/env/targets.json` and fall back to this file offline.
- `embers/environment-needs-prompts.md`: the list of missing objects with sizes and one-line descriptions.

## Fantasy props generator
`props-generator-offline.html` (offline) / `props-generator.html` (CDN) makes props for the characters procedurally and saves them as GLB, the same way as the character generator.

- **Type**: 28 categories in four groups. Weapons and gear: sword, axe/hammer/mace, bow, magic staff, shield. Loot and magic: potion, treasure chest, spellbook, treasure pile. Camp, road and tavern: barrel, crate, lantern/torch/candles, post/gibbet/cage, fence or gate, flagstones or ground patch, camp clutter (bones, bedroll, cache, sacks). Nature: crystal cluster, giant mushroom, tree/stump/fallen log, boulder, gravestone, rune stone or altar, portal, campfire. Ash country: basalt columns, slag/ore/rubble heap, cairn, smelter chimney.
- Each type has its own **variant** dropdowns (blade shape, bottle, lid, kind, condition…), plus **Enchanted** for glowing runes, ember veins and the like.
- **Seed / Randomize / New colors** work as in the character generator. **Size** is the longest side or the height, in metres.
- **Output**: smooth or low-poly, detail level, combine per material, idle animation (flickering flames, spinning portals and orbiting runes), and for weapons and torches **Origin at the handle**, so the file can be attached to a hand. Every prop is centred on its base and faces +Z. **Seed variants** downloads several seeds of the same prop as a .zip.

### Game ids (Embers of Valdren)
The **Game id** list holds the objects from the game's missing-objects list that suit procedural props: Dead Road posts and fire ring, ash-country basalt, ember rocks, slag heap, ore pile, charred stump, dead ash trees, scorched fence and smelter chimney, the village cairn, flagstone circle, ash patch and field gate, stumps, fallen log, mushrooms and boulders, and provisional stand-ins for the Act 2 points of interest and Cinderreach structures. Picking one:

- uses the game's palette (field or ash country) and the right variants,
- fits the prop to the id's target box from `targets.json` (driver axis exact, the other axes stretched towards the target by at most 1.6x) and shows the target box and a 1.8 m figure next to it,
- picks the highest detail level within the triangle budget (1,500 for small props, 4,500 otherwise),
- exports game-ready: file named `<id>.glb`, roughness 1, metallic 0, opaque, emissive colour kept for embers, no animation, origin at the base centre.

The size table is fetched live from the game repo when online; the page also carries a built-in copy and has a **Load targets.json** button. Ids not in `targets.json` yet use the size from the missing-objects list (section F) or an estimate (the provisional section G ids).

## Structures kit generator
`structures-generator-offline.html` (offline) / `structures-generator.html` (CDN) makes modular structure pieces procedurally and saves them as GLB, the same way as the props page. It is a kit for the odd pieces the KayKit packs lack, not a whole-building generator.

- **Type**: 20 piece types in six groups. Building kit: wall module (stone, plaster and timber, planks or logs; plain, door, window, two windows or archway; intact, ruined or burnt), corner post or pillar, roof (gable, lean-to, hipped or cone; thatch, clay tiles, slate, planks or iron; holed and burnt states), chimney stack. Yard and street: porch or awning, stairs or ladder, scaffold, deck, jetty or walkway, gateway (stone arch, roofed timber gate, palisade gate), palisade module. Mine and forge works: headframe with turning sheaves, lift cage, forge, furnace or kiln, mine entrance. Shrines and wells: wayside niche, post, bellows, anvil, forge and waystone shrines; roofed, boarded or ruined well. Carts: wagon, cart or hand cart (canvas, torn canvas, crates, sacks, hay, brazier or ore; wrecked and burnt states), mine cart. Small buildings: a cottage, hut or open shelter assembled from the wall and roof modules.
- **Scale: As designed** (the default) builds every piece at real size in metres: a door is 2.1 m high, walls are 2, 3 or 4 m long and 2.8 or 3.6 m high. Wall modules have flat ends and their length exactly as chosen, so they tile along X, and a corner post and a roof of the same size fit them. **Longest side** or **Height** scale the piece with the Size slider instead.
- **Download kit .zip**: the current wall once per opening, corner once per form or roof once per shape, as `<name>-door.glb`, `<name>-window.glb`…, all at the same scale. **Seed variants** works as on the props page.
- Every piece is centred on its footprint with its base at y 0, the front (door side, open side) towards +Z. The idle animation turns headframe sheaves and lift pulleys and flickers fires and candles; game ids export without it.

### Game ids (Embers of Valdren)
cottage-thatch-b (section B, a cottage built from the kit and fitted to the target box), wagon-wreck-a, wagon-burnt and roadside-shrine-a (section C) and mine-cart (section D) use their sizes from `targets.json`. The provisional section G stand-ins use estimated sizes until the game names them: headframe and lift-cage (Oldsmoke, `oldsmokeArt.ts`), brazier-cart, the Cinderreach shrines (shrine-weeping-bellows, shrine-hushed-anvil, shrine-forge, shrine-waystone), cinder-boarded-well, cinder-forge, cinder-smelter and oldsmoke-adit. Picking an id works as on the props page: game palette, target-box fit (driver axis exact, the others stretched by at most 1.6x), the highest detail within the triangle budget, and game-ready export to `<id>.glb`.

## Texture and decal generator
`texture-generator-offline.html` (offline) / `texture-generator.html` (CDN) makes stylised base-colour textures and ground decals procedurally, in the game palette, at 512 px by default. Like the other generators it needs no account and runs in the browser.

- **Tiling textures** (repeat with no seam): thatch, wood planks, cobblestones, stone blocks, roof tiles (clay or slate), bark, grass ground, moss, dirt with pebbles, ash ground, scorched cracked earth. The Tiling line in the stats measures the seam.
- **Decals** (alpha, transparent at the border): ash patch, scorch mark or fire-pit ring, flagstone circle (grass or open gaps), puddle, moss patch, ground cracks (optionally glowing), fallen leaves. The colour under transparent pixels is the decal's own, so the edge never filters to black.
- **Seed / Randomize / New colors** as in the other generators. **Palette**: game field and village, game ash country, or random. **Density**, **Contrast**, **Flat bands** (toon look), **Edge softness**, per-type variant and **Ember specks**.
- **Download image**: PNG (written by the page itself, with exact alpha), JPEG for textures, or WebP; 256, 512 or 1024 px.
- **Download GLB**: a flat square at y 0, centred on x 0, z 0, top of the image towards −Z, roughness 1, metallic 0, base colour only. A decal uses its W × D in metres and Blend or Mask alpha; a texture gives one tile of **Tile size**.
- **Texture pack (.zip)**: every texture and decal with the current seed and palette as PNG, plus `manifest.json` with the settings that regenerate each one, for the game or the other generators.
- **Game id**: `ash-patch-decal` (3 × 3 m, about 60 placements on the east edge) and `waystone-flagstones` (9 m paving circle). Picking one sets the decal, the palette and the size (from the live `targets.json` once the game adds the id there, otherwise from the missing-objects list) and names the file `<id>.glb`. The props page still has a geometry version of both if the game prefers meshes.
- **Palette atlas**: open a GLB with several materials and press **Build atlas**. Flat colours become swatches and textures whose UVs stay inside 0 to 1 are copied into one atlas image (textures that repeat use their average colour, and the log says which); UVs move onto the atlas, every material becomes one `Atlas` material (plus one per glow colour, since the game keeps emissive colours but not emissive maps), roughness 1, metallic 0. Skins and animations are kept. **Download atlas GLB** keeps the original file name.

Every export keeps the type, seed, palette and settings in glTF `extras` (or in the manifest).

## Vegetation generator
`vegetation-generator-offline.html` (offline) / `vegetation-generator.html` (CDN) makes trees, bushes, hedges, grass, ferns, flowers and reeds in a chunky low-poly style (solid leaf clusters, no alpha leaf cards) and saves them as GLB.

- **Type**: tree (oak, broadleaf, ash or elm, birch, poplar, willow; round, layered or open crown; big roots or flared base; optional spring blossom), bush (leafy, flowering, holly with berries), hedge module (straight piece with flat ends that join, or corner post; neat or shaggy), grass clump (tall or spreading, optional seed heads), fern (6 to 10 fronds), flower patch (daisies, tulips or bluebells, one or two colours) and reeds (with or without cattails).
- **Seed / Randomize / New colors / Size / Seed variants** work as in the props generator. Size measures the height by default. **Palette** offers the game's summer greens and an autumn set; birch, poplar, willow and holly bring their own bark or leaf colours.
- **LODs**: **Download LODs** saves `name.glb`, `name.lod1.glb` and `name.lod2.glb` in a zip (default 25% and 5% of the faces, so a 6,000-face oak gives about 1,500 and 300). Each LOD is the same plant rebuilt coarser (same layout, simplest leaf clusters, fewer blossoms and marks) and then simplified with meshoptimizer while leaf clusters keep their volume, so small plants can stay above the percentage. **Show** above the view previews LOD 1 and 2, and the variants zip can include LODs too. The game does not load LOD files yet; the `.lodN.glb` naming is a proposal.

### Game ids (Embers of Valdren)
The **Game id** list holds the 27 vegetation ids from the missing-objects list that were not covered yet: oak-a/b/c, birch-a/b, elm-or-ash-a, autumn-tree-a/b, poplar-a, willow-a, bush-round-a/b, bush-flowering-a/b, bush-holly-a, hedge-straight, hedge-corner, grass-clump-a/b/c, fern-a, flower-patch-yellow/white/purple/red and reeds-a/b (stumps, logs, mushrooms and boulders stay in the props generator). Picking one works as in the props generator: game palette and variants, the target box from `targets.json` (willow-a and bush-holly-a use the sizes from the list until the game adds them), the highest detail within the triangle budget (6,000 for trees, 1,500 for bushes and the hedge corner, 1,000 for grass, ferns and flowers, 4,500 otherwise) and a game-ready `<id>.glb`. Ids that share a seed still get different shapes (oak-a, oak-b and oak-c differ).

## Editing / development
`index.html`, `character-generator.html`, `props-generator.html`, `texture-generator.html`, `vegetation-generator.html` and `structures-generator.html` are the sources. `glb-viewer-offline.html`, `character-generator-offline.html`, `props-generator-offline.html`, `texture-generator-offline.html`, `vegetation-generator-offline.html` and `structures-generator-offline.html` are generated from them by `tools/build.mjs` (esbuild inlines the libraries pinned in `package.json`, which must match the versions in the importmap).

```sh
npm install      # dev tools only: three, meshoptimizer, three-subdivide, esbuild, Playwright
npm run build    # regenerate the *-offline.html files
npm test         # Playwright tests (Chromium) against the CDN pages and their offline files
```

**After editing a source page, run `npm run build` and commit the regenerated offline file together with it.** When `embers/targets.json` changes, paste it into the `embersTargets` block of `index.html` (and of the two generator pages) too (a test checks they match). Tests run offline: CDN requests from the source pages are served from `node_modules`, and the offline file is checked to make no CDN requests. Set `PW_CHROMIUM_PATH` to use a specific Chromium binary.

There is intentionally no CI: build and test locally before committing.
