# Missing 3D objects and image-generation prompts (environment pass)

Mostafa: generate a reference image per object with image AI, turn each into a .glb, and drop them in /mnt/project-files/uploads/ (or tell me where). What we already have is in assets/object-grids/ (grid-hex.png, grid-hal.png, grid-fur.png, grid-dun.png; cells show name and WxDxH in metres at game scale). The existing KayKit Hexagon buildings stay as the baseline; this list adds density: vegetation, clutter, village dressing, road and Act 2 dressing.

## What the grids show we lack
- Trees: only two conifers (5 m) and three dead trees (3 to 4 m). No broadleaf trees, no bushes, hedges, flowers, grass, reeds, stumps or logs.
- Rocks: three small rocks (1 to 1.5 m). No boulders, cliffs or scree.
- Village dressing: barrel, crates, sack, bucket, wheelbarrow, lumber. No haystack, cart, trough, garden bed, washing line, signpost, stalls, beehive, stable or barn.
- Act 2 (ash and ember country): nothing.

## Shared rules for every file (so it drops in without rescaling)
- Format .glb, glTF 2.0, Y up, 1 unit = 1 metre, authored at the target size below (our loader then uses factor 1).
- Pivot at the centre of the base, lowest point at y = 0. The front (door side, open side or the face the player sees first) faces +Z. No rotation baked into the mesh.
- Style: KayKit low-poly: chunky simple shapes, flat colours with soft shading, no photoreal textures, one small colour-atlas texture or vertex colours, no transparency cards except foliage if needed, 300 to 4,000 triangles (hero trees to 6,000).
- Palette: saturated but warm (grass green 5a8c44, bark 6b4a2b, warm stone 8a8578, thatch d1b25a, red roof a83a2c); Act 2 ash palette: charcoal 2b2b2b, ash grey 8d8780, ember orange ff5a0f, scorched brown 4a3722.
- One object per file, named `<id>.glb` with the id from the table. Collision is added by us, so no collider meshes.
- Variants: where the table says xN, make N different silhouettes (the game places them with random yaw and +-10% scale).

## Prompt template (paste, then add the object line)
"Single game asset, stylized low-poly medieval fantasy in the style of KayKit asset packs, chunky simple shapes, flat saturated colours with soft shading, clean silhouette, three-quarter view from front-left and slightly above, centered, whole object visible, plain light grey background, no ground shadow, no text, no characters. OBJECT:"

## A. Vegetation (priority 1)
| id | target size (W x D x H, m) | OBJECT line |
| --- | --- | --- |
| oak-a, oak-b, oak-c (x3) | 8 x 8 x 11 to 13 x 13 x 15 | large broadleaf oak, thick trunk with two big roots, round layered crown of 4 to 6 chunky leaf clusters, green |
| birch-a, birch-b (x2) | 3 x 3 x 8 | slender birch, white trunk with dark bands, light airy green crown |
| elm-or-ash-a (x1) | 6 x 6 x 10 | tall ash tree, open crown, yellow-green |
| autumn-tree-a, autumn-tree-b | 6 x 6 x 9 | broadleaf tree with orange and rust crown |
| bush-round-a, bush-round-b | 1.4 x 1.4 x 1.1 | round leafy bush, dense, two shades of green |
| bush-flowering-a, -b | 1.4 x 1.4 x 1.2 | bush covered in small white and pink blossoms |
| hedge-straight | 3.4 x 0.9 x 1.6 | trimmed hedge block, one module long, flat ends so modules join, leafy surface |
| hedge-corner | 1.2 x 1.2 x 1.6 | corner post of the same hedge |
| grass-clump-a, -b, -c | 0.6 x 0.6 x 0.5 | clump of tall grass blades, 12 to 20 chunky blades, two greens |
| fern-a | 0.9 x 0.9 x 0.7 | fern with 8 fronds |
| flower-patch-yellow, -white, -purple, -red | 0.7 x 0.7 x 0.4 | cluster of small flowers on short stems with leaves, one colour |
| reeds-a, reeds-b | 0.8 x 0.8 x 1.8 | clump of tall reeds with brown cattail heads |
| stump-a, stump-b | 0.9 x 0.9 x 0.6 | tree stump with cut top and rings, moss on one side |
| log-fallen-a | 3.0 x 0.8 x 0.7 | fallen tree log with broken end and a few mushrooms |
| mushrooms-a | 0.5 x 0.5 x 0.3 | small group of red and brown mushrooms |
| boulder-large-a, -b | 3 x 3 x 2.4 | large mossy boulder, angular facets, grey with green moss on top |
| rock-cluster-a | 2.5 x 2 x 1 | three to five stones of different sizes, partly buried |

## B. Village and farm dressing (priority 1)
| id | target size (m) | OBJECT line |
| --- | --- | --- |
| haystack-round | 2.4 x 2.4 x 2.6 | round haystack with a pointed top, tied with a rope band |
| haybale-a | 1.2 x 0.8 x 0.7 | rectangular hay bale tied with twine |
| haycart-a | 3.2 x 1.6 x 1.8 | wooden two-wheeled farm cart loaded with hay |
| woodpile-chop | 2.0 x 1.2 x 1.3 | stacked firewood against a chopping block with an axe stuck in it |
| trough-a | 2.0 x 0.7 x 0.7 | wooden water trough on legs |
| garden-bed-a, -b | 2.0 x 1.4 x 0.5 | fenced vegetable bed with cabbages and rows of green, one with beans on poles |
| beehive-skep | 0.7 x 0.7 x 0.8 | straw beehive skep on a wooden stand |
| washing-line | 4.0 x 0.3 x 2.2 | two wooden posts with a rope line and hanging cloths |
| signpost-a | 1.2 x 0.4 x 2.4 | wooden road signpost with two arrow boards, no text |
| milestone-a | 0.6 x 0.4 x 1.1 | worn stone road marker |
| picket-fence | 3.4 x 0.2 x 1.1 | low white-washed picket fence module |
| wattle-fence | 3.4 x 0.3 x 1.2 | woven wattle fence module, hazel colour |
| stonewall-low | 3.4 x 0.7 x 1.0 | dry-stone field wall module with moss |
| market-stall-a, -b | 3.0 x 2.4 x 2.8 | wooden market stall with red-white awning, crates and baskets of fruit; second with green-cream awning and cloth bolts |
| well-bucket-rope | 0.4 x 0.4 x 0.5 | wooden well bucket on a rope (optional) |
| barn-a | 8 x 12 x 7 | big wooden barn with large double doors and a hayloft door, red-brown planks |
| stable-a | 7 x 5 x 4 | open-fronted wooden horse stable with three stalls |
| cottage-thatch-a, -b | 4.6 x 5 x 5 | small cottage with thatched roof, white plaster, dark timber, chimney (variety next to the red-roof houses; optional) |

## C. Dead Road and Cinder Road dressing (priority 2)
| id | target size (m) | OBJECT line |
| --- | --- | --- |
| wagon-wreck-a | 4.0 x 2.0 x 2.2 | broken wagon with a missing wheel, tilted, torn cover |
| wagon-burnt | 4.0 x 2.0 x 2.0 | burnt wagon, charred black planks, ash |
| roadside-shrine-a | 1.2 x 1.2 x 2.2 | small stone wayside shrine with a niche and a candle |
| gibbet-post | 1.0 x 1.0 x 3.6 | wooden post with an iron hook and chain, no figures |
| campfire-ring | 1.6 x 1.6 x 0.6 | stone fire ring with logs and ash (no flame; we add fire) |
| crow-perch-post | 0.4 x 0.4 x 1.6 | weathered fence post (we add crows) |

## D. Act 2 ash and ember country (priority 2)
| id | target size (m) | OBJECT line |
| --- | --- | --- |
| ash-tree-dead-a, -b | 3 x 3 x 8 | charred leafless tree, black trunk, a few bare branches |
| charred-stump | 1.2 x 1.2 x 0.8 | burnt stump with glowing orange cracks |
| basalt-columns-a | 3 x 3 x 4 | cluster of hexagonal basalt columns, dark grey |
| ember-rock-a, -b | 2.5 x 2.5 x 2 | dark volcanic rock with orange glowing veins |
| slag-heap | 5 x 5 x 2.5 | heap of black slag and clinker with a few orange cracks |
| mine-cart | 1.8 x 1.0 x 1.0 | rusty iron mine cart with ore |
| ore-pile | 2 x 2 x 1 | heap of dark ore chunks with copper-coloured flecks |
| scorched-fence | 3.4 x 0.3 x 1.6 | blackened wooden fence module, leaning |
| smelter-chimney | 2 x 2 x 9 | tall stone and iron chimney stack with a flared top |

## E. Optional animals (priority 3)
Cow, sheep and pig already exist in the Quaternius farm-animals re-host (only the horse is imported); I will import them in G0b. Wanted from image-gen: hen, goat, crow (low-poly, rigged is a bonus, static is fine).

## F. Added by the B2 designer (2026-10-23)
Same rules as above; the stand-in column is what the game shows until your glb arrives.
| id | target size (W x D x H, m) | OBJECT line | used for | stand-in until the glb exists | priority |
| --- | --- | --- | --- | --- | --- |
| poplar-a | 2.5 x 2.5 x 14 | tall slim poplar, narrow upright oval crown of many small leaf clusters, pale trunk, windbreak tree | road windbreak, z 240 to 295 (3 rows) and skyline marker | birch-a scaled 1.75 in height, 0.8 in width, tint 8fb04e | 1 |
| cairn-a | 1.2 x 1.2 x 1.3 | small stacked stone cairn, five flat grey stones, one small moss patch | flanking the north waystone plaza | rock-cluster-a scaled 0.5 | 2 |
| waystone-flagstones | 9 x 9 x 0.1 | round flagstone paving circle, worn warm-grey slabs with grass between, a flat ground piece (a decal or a flat mesh) | plaza under waystone.north (r 4.5 m) | flat disc, tint 969078 | 2 |
| ash-patch-decal | 3 x 3 x 0.02 | flat scorched ground patch, ash-grey with a few black grass stubs, soft irregular edge, alpha edge | east edge scatter (about 60 would carry the greying; not in the rows yet) | none (ground splat covers it) | 2 |
| field-gate-a | 3.4 x 0.2 x 1.2 | wooden five-bar field gate in a hazel frame, shut, no sign | filling selected hedge gaps (optional, not in the rows yet) | wattle-fence | 3 |

B3 additions (2026-10-23; columns as in the B3 sheet, stand-ins are scripted until your glb arrives):
| bush-holly-a | 1.5 x 1.5 x 1.3 | dense holly bush, glossy dark green spiky leaves, a scatter of red berries, round chunky shape | variant of bush-round-a: scale 1.05, tint mul 0x7fa070, hue -20, sat 0.9 (add to VARIANTS in resolve.ts) |
| willow-a | 7 x 7 x 8 | weeping willow, thick gnarled trunk, wide drooping curtain of long pale-green leaf strands almost to the ground, rounded silhouette | variant of elm-or-ash-a: scale 0.85, tint mul 0xc8dcaa (a poor stand-in because the drooping silhouette is the point; flag it as a visual gap) |

## Priority and count
Priority 1 (A and B) is about 60 files and is what lifts the density in Brightwater and Harrowmark. Priority 2 (C, D) is needed for the Dead Road and Cinderreach and can wait until those tiles. A minimum starter set that already changes the look: oak-a/b/c, birch-a, bush-round-a/b, bush-flowering-a, hedge-straight, grass-clump-a/b, flower-patch x3, stump-a, log-fallen-a, boulder-large-a, rock-cluster-a, haystack-round, haybale-a, haycart-a, woodpile-chop, trough-a, garden-bed-a, signpost-a, picket-fence, stonewall-low, market-stall-a (about 30 files).

## When files arrive
Put them anywhere under /mnt/project-files/uploads/ with the id as the file name. A check script (tools/env-pass in G0a) renders each in a grid like assets/object-grids/ with measured size against the target, flags pivot, facing and scale problems, and I re-render them for your review before they go into the game.
Until files arrive I script low-poly stand-ins with the same ids (ruling 2 of the review), so placements never change when your glb replaces a stand-in.

Fit rule (default of tools/env-pass/ingest.mjs from batch 2): each model is scaled uniformly so its HEIGHT equals the target height, then width and depth are stretched by at most 15% towards the target footprint. Anything needing more stays at the cap and is printed as a CAP line (and stored under `capped` in public/assets/env/manifest.json) with measured size, target and the factor still needed, so the model can be re-made closer to the table's proportions. Output is about 5k triangles, 512 px textures.

## Known gap
The farm-animals grid (grid-animals.png) rendered blank: the horse is a skinned model the grid script does not handle. Not fixed now; the horse is already used in the game.

## Batch 2 status
Arrived and ingested (19, all at about 4.5k to 5.4k triangles, under 0.35 MB each): barn-a, beehive-skep, cottage-thatch-a (covers B "cottage-thatch-a, -b" only for -a), garden-bed-a (not -b), haybale-a, haycart-a, haystack-round, market-stall-a, market-stall-b, milestone-a, picket-fence, signpost-a, stable-a, stonewall-low, trough-a, washing-line, wattle-fence, well-bucket-rope, woodpile-chop. That is all of section B except cottage-thatch-b and garden-bed-b (both can be variants of -a). Still missing: all of A vegetation not shipped in batch 1, C, D, E, and F (poplar-a, cairn-a, waystone-flagstones, ash-patch-decal, field-gate-a, bush-holly-a, willow-a). Render: assets/renders/env-pass/batch2/grid-batch2.png. Notes: fences and stone wall come out taller than target (picket 1.8 m vs 1.1, wattle 2.0 vs 1.2, stonewall 1.95 vs 1.0), barn is 7.2 x 8.8 x 7 (target 8 x 12 x 7), washing-line and signpost are deeper than target.

Batch 2 proportion fix (branch fix-batch2-proportions): the shipped light copies were width-short (not too tall) for the long pieces: stonewall-low 2.0 x 0.69 x 1.0, wattle-fence 2.31 x 0.30 x 1.2, picket-fence 2.40 x 0.28 x 1.1, garden-bed-a 0.87 x 1.35 x 0.5, signpost-a 1.2 x 1.16 x 2.4, washing-line 3.67 x 0.62 x 2.2, barn-a 7.99 x 10.14 x 7 (the numbers above in the Notes line were rough). Ingest now has a `proportion` table in src/env/targets.json: listed ids are fitted exactly (height first, then width and depth, no 15% cap), and `tile: 2` repeats the model twice along x first (stonewall, wattle, picket, garden bed) so the stretch stays under 30%. New sizes (w x d x h): stonewall-low 3.39 x 0.69 x 0.99, wattle-fence 3.38 x 0.30 x 1.2, picket-fence 3.40 x 0.20 x 1.1, garden-bed-a 1.99 x 1.39 x 0.50, signpost-a 1.2 x 0.40 x 2.4, washing-line 4.0 x 0.30 x 2.2, barn-a 7.99 x 11.98 x 6.99. Mostafa's originals are untouched (staging-assets/batch 2 in git history, commit fbb962d). Render: assets/renders/env-pass/batch2/grid-batch2-fixed.png (with a 1.8 m Knight silhouette). Signpost depth is squashed to 0.29x and the washing-line posts to 0.48x: if they look too thin in game, re-make those two with less depth.

## G. Act 2 stand-ins requested by the polish-pass thread (2026-10-24, not swapped in the polish pass)
Detail with file:line in plans/polish-pass/art-sound-inventory.md (section 1a). All priority 2, needed for Cinderreach and Oldsmoke; sizes to be fixed with the object's designer before prompting.
| id (provisional) | what | replaces |
|---|---|---|
| golem-rock-chunks | 3 to 4 rough rock chunks (limb and torso pieces) for the Cinder Golem rig | src/enemies/golem/rig.ts icosahedra |
| brazier-cart | iron brazier on a hand cart, embers glowing | Cinderreach brazier cart (cinderreachArt.ts) |
| lift-cage, headframe | Oldsmoke surface lift cage with iron posts and rope, mine headframe with wheel | src/oldsmoke/oldsmokeArt.ts:75-143 |
| poi-props set | bones, eggs, bedroll, net, fire-ring, cave-mouth, cache, lore-stone | src/world/poi/proc.ts:20-104 |
| cinderreach-shrines | Weeping Bellows, Hushed Anvil, forge and waystone shrines | src/shrine/*.visuals.ts |
| cinderreach-structures | cage, cairn, rune stone, trial ring, ledger desk, boarded well, marker | src/cinderreach/cinderreachArt.ts:87-212 |
