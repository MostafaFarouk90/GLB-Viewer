<!-- Published copy of the project's missing-objects list, for tools outside this repo (Mostafa's GLB-Viewer reads it live from
     https://raw.githubusercontent.com/MostafaFarouk90/OpenWorld/main/docs/env/environment-needs-prompts.md). Target sizes live in
     src/env/targets.json. A change to the list lands here in the same PR as the code that needs it. -->
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
| lift-cage, deepgate-headframe | Oldsmoke surface lift cage with iron posts and rope, mine headframe with wheel | src/oldsmoke/oldsmokeArt.ts:75-143 |
| poi-props set | bones, eggs, bedroll, net, fire-ring, cave-mouth, cache, lore-stone | src/world/poi/proc.ts:20-104 |
| cinderreach-shrines | Weeping Bellows, Hushed Anvil, forge and waystone shrines | src/shrine/*.visuals.ts |
| cinderreach-structures | cage, cairn, rune stone, trial ring, ledger desk, boarded well, marker | src/cinderreach/cinderreachArt.ts:87-212 |

## H. Hand-held weapon props (added 2026-10-24 by the polish pass; the game keeps procedural stand-ins until they arrive)
Grip origin at the hand, point toward +Z, Y up, 1 unit = 1 m, one file per id.
| id | size (w x d x h as length along z) | description |
|---|---|---|
| spear-hunter | 0.1 x 2.2 x 0.1 | hunter's hand spear, plain ash shaft, leaf-shaped iron blade, leather wrap at the grip, no decoration |
| lance-redmane | 0.25 x 3.2 x 0.25 | Redmane's mounted lance, long shaft with a round vamplate (hand guard) in front of the grip, narrow steel head, weathered red-brown pennon optional |

## I. B3 asset gaps (added 2026-10-24 by the B3 builder; the game uses stand-ins until these arrive)
| id | what | stand-in now | size (w x d x h) |
|---|---|---|---|
| tent | a real tent shape: canvas ridge tent (A-frame), sagging guy ropes, a flap door, weathered off-white canvas with a patched brown panel | none: the two carters' tents were dropped because the KayKit tent renders as an open canopy on legs; a second cart load stands in their place | 2.4 x 3.0 x 1.6 |
| toll-post art | the toll post at the Hollin ford (enemies module actor): a stout post with a lowered bar, a hanging lantern and a strongbox, painted warning stripes | none (the toll-post actor has no art) | 0.6 x 2.4 x 2.2 |
| willow-a | weeping willow with a drooping crown, thin trailing branches to near the ground | elm-or-ash-a squashed to 0.7 height with a yellow-green tint (no droop) | 7 x 7 x 7.5 |
| bush-holly-a | holly bush, dark glossy leaves, red berries, rounded | bush-round-a tinted green (no berries) | 1.6 x 1.6 x 1.6 |
| reeds-a, reeds-b | tall reed stems with brown seed heads, two clump shapes | grass-clump stretched 2.5x and 3x in height | 0.7 x 0.7 x 1.8 |
| field-gate-a | a wooden field gate for hedge gaps | hedge-corner posts either side of each gap | 3.0 x 0.15 x 1.2 |


## I. Added by the H1/H2 designer (2026-10-24)
| id | target size (W x D x H, m) | OBJECT line | used for | rows H1 / H2 | stand-in until the glb exists | priority |
| --- | --- | --- | --- | --- | --- | --- |
| fruit-tree-a | 4.5 x 4.5 x 5 | small apple tree, short crooked trunk, round crown of chunky leaf clusters dotted with red apples | allotment corners, orchards (south-east, main street, cider orchard), gardens | 26 / 209 | VARIANT oak-a scale 0.42, tint mul 0xd8f0b0 | 1 |
| fruit-tree-b | 4.5 x 4.5 x 5 | small blossoming cherry tree, short trunk, round crown of pale pink blossom clusters | same | 24 / 125 | VARIANT oak-a scale 0.42, tint hue 300 sat 0.5 mul 0xffd8e0 | 1 |
| refugee-tent-a | 3.0 x 2.4 x 2.0 | low A-frame canvas tent, patched off-white and brown cloth over a pole frame, a bedroll and a bundle at the open end | both refugee camps (M06 context) | 24 / 0 | KAYKIT hex/tent (fitHeight 2.0) | 1 |
| handcart-a | 2.2 x 1.2 x 1.0 | small two-wheeled wooden handcart with long handles, loaded with sacks and a rolled blanket | camps, gate square north end | 9 / 0 | hex/wheelbarrow scale 1.6 | 1 |
| cart-goods-a | 3.4 x 1.7 x 1.9 | four-wheeled wooden goods wagon, no horse, shafts down, loaded with crates and barrels under a tied canvas | carters at the gate, carters' yard, market outer ring, repair yard | 6 / 4 | haycart-a | 1 |
| horse-standing | 0.7 x 2.2 x 1.7 | — (use the imported Quaternius horse, idle pose, static) | stables paddock | 2 / 0 | KAYKIT entry to the imported `horse` model, first frame of idle, no animation | 2 |
| planter-box-a | 1.2 x 0.5 x 0.6 | long wooden planter box with red and yellow flowers | main street kerb, fountain, door props | 0 / 37 | hex/crate_open scale 0.8 + flower tint | 2 |
| notice-board-a | 2.0 x 0.3 x 2.2 | wooden notice board on two posts with a small shingle roof, pinned papers | gate square (M06 rules) | 1 / 0 | hal/fence_pillar | 2 |
| dye-vat-a | 1.2 x 1.2 x 0.9 | wide wooden vat bound with iron hoops, filled with deep blue dye, a paddle leaning in it | dyers' yard | 0 / 5 | hex/barrel scale 1.3, tint mul 0x6070c0 | 3 |
| basket-goods-a | 0.6 x 0.6 x 0.4 | wicker basket of apples and turnips | market goods, refugee bundles | 1 / 0 | hex/sack | 3 |
| keg-a | 1.4 x 1.6 x 1.6 | large ale keg on a wooden cradle with a brass tap | Guildhall door (R03 brewing copper) | 0 / 1 | hex/barrel scale 1.5 | 3 |
| crates-stacked-a | 1.6 x 1.1 x 1.7 | three wooden crates stacked unevenly, one with a cloth over it | market outer ring | 0 / 5 | hex/crate_A_big scale 1.2 | 3 |

Order for Mostafa: refugee-tent-a and handcart-a first (the Dead Road wants them too), then the other priority 1 items.

## K. Added by the H3/H4 designer (2026-10-24)
| id | target size (W x D x H, m) | OBJECT line | used for | rows H3 / H4 | stand-in until the glb exists | priority |
| --- | --- | --- | --- | --- | --- | --- |
| forge-hearth-a | 2.4 x 1.8 x 1.6 | open-air smith's hearth: a waist-high stone and brick forge with a hooded chimney stub, glowing orange coals in the fire pit, a leather bellows on the side | one hearth in each Forge Row yard (M07 and R22 context; Act 1 heat) | 0 / 9 | hex/building_well_red is wrong (it has a roof). Use rock-cluster-a at scale 0.8 with an emissive orange point light, or `campfire-ring` | 1 |
| anvil-a | 0.9 x 0.4 x 0.9 | black iron anvil on a squat oak stump, a hammer and tongs resting on it | beside every hearth | 0 / 9 | stump-a with a hex/crate_A_small, tinted 0x2b2b2b | 1 |
| coal-heap-a | 2.0 x 2.0 x 0.8 | low heap of black coal and charcoal lumps, a shovel stuck in it | Forge Row yards, back lane, charcoal yard | 0 / 19 | ore-pile tinted 0x2b2b2b (or rock-cluster-a tinted) | 1 |
| iron-stock-a | 2.4 x 0.8 x 1.2 | wooden rack with iron bar stock and rods leaning in it, rust-brown | Forge Row yards, iron merchant's yard | 0 / 21 | hex/weaponrack | 2 |
| grindstone-a | 1.0 x 0.8 x 1.1 | treadle grindstone: a round sandstone wheel on a wooden frame, a water trough below | some Forge Row yards | 0 / 5 | hex/barrel on its side | 3 |
| charcoal-clamp-a | 4.0 x 4.0 x 2.0 | smouldering charcoal clamp: a dome of stacked logs sealed with turf and earth, thin smoke vents, a few glowing cracks | charcoal yard that feeds Forge Row | 0 / 4 | haystack-round tinted 0x5a4a3a | 2 |
| brazier-standing-a | 0.7 x 0.7 x 1.4 | iron brazier bowl on three legs, burning with an orange flame | Tilted Anvil door, the Hearthkeepers' chapel door (what burns at the chapel) | 0 / 3 | the game's own keep-road brazier mesh, if one can be reused; otherwise hal/lantern_standing | 2 |
| chimney-stack-a | 1.2 x 0.8 x 2.2 | brick chimney stack with two clay pots, soot-stained at the top | Rooftop Ward roofline (deck annex only, ruling 4) | (152) / 0 | hex/crate_long_A on end, tinted 0x8a4a3a | 2 |
| market-stall-a, -b | 3.0 x 1.8 x 2.6 | — (H1/H2 already place these: -a red awning, -b undyed awning) | ward market at the stair foot | 31 / 0 | as shipped | — |

## L. Act 2 industry ids used inside Harrowmark in Act 1 (added 2026-10-24 by the H3/H4 designer; sizes from src/env/targets.json)
Forge Row, the old smelter yard and the charcoal yard (tile H4) place these six section D ids. Until each glb arrives, the game uses the stand-in in the right-hand column. Per the coordinator's ruling, an id that an eye camera sees within 56 m gets a tinted VARIANT of a shipped model, and the others keep their placeholder.
| id | target size (W x D x H, m) | OBJECT line | used for | rows H4 | stand-in until the glb exists | priority |
| --- | --- | --- | --- | --- | --- | --- |
| slag-heap | 5.0 x 5.0 x 2.5 | low sprawling heap of black glassy slag and grey clinker, lumpy and cracked, a few dull orange cracks near the base | old smelter yard, spoil along the D02 ore track | 32 | VARIANT rock-cluster-a scale 2.0, tint sat 0.1 mul 0x48423c | 1 |
| ore-pile | 2.0 x 2.0 x 1.0 | heap of dark iron ore chunks, rust-brown and charcoal grey with copper-coloured flecks, a few lumps rolled loose | Forge Row yards, smelter yard, iron merchant's yard | 64 | VARIANT rock-cluster-a scale 0.8, tint sat 0.5 mul 0x7a6450 | 1 |
| mine-cart | 1.8 x 1.0 x 1.0 | small rusty iron ore cart on four flanged wheels, riveted box body heaped with dark ore | smelter yard (abandoned), Forge Row ore deliveries | 20 | VARIANT haycart-a scale 0.56, tint sat 0.3 mul 0x5a5048 | 1 |
| smelter-chimney | 2.0 x 2.0 x 9.0 | tall square stack of soot-blackened stone with iron bands, a flared brick top, a small arched flue opening at the base | five forge stacks behind Forge Row (at 0.8 scale), the old smelter's cold stack | 6 | the placeholder post (no eye camera within 56 m) | 2 |
| charred-stump | 1.2 x 1.2 x 0.8 | burnt tree stump, black and split, with ash-grey edges and faint glowing orange cracks | smelter yard, soot scatter round Forge Row | 21 | VARIANT stump-a scale 1.33, tint sat 0.1 mul 0x403a34 | 2 |
| scorched-fence | 3.4 x 0.3 x 1.6 | blackened wooden plank fence module, two rails on three posts, charred ends, leaning slightly, one plank missing | the fenced ore track to the Underways door, smelter yard | 67 | already KAYKIT hex/fence_wood_straight (fitHeight 1.6), which is not a box; tinting it needs a `tint` on KAYKIT entries | 2 |

## M. Act 3 traversal props (added 2026-10-24 by K7, water, diving and the ferry; the game uses scripted stand-ins until these arrive)
| id | what | stand-in now | size (w x d x h) |
|---|---|---|---|
| prop.greyfen.ferry-punt | Dudda's flat-bottomed fen ferry punt: tarred planks, low side rails, a plank bench, a long punting pole leaning at the stern, a hanging lantern on a short post at the bow; the deck sits about 0.35 m above the waterline; front +Z is the bow | box hull, two rails, a bench and a pole | 1.8 x 5.0 x 0.8 (pole to 4.2 m) |
| prop.dragonspine.supply-sled | a mountain supply sled: two curved wooden runners, a slatted bed, a lashed crate and a grain sack, frost on the ropes, a rope trace at the front for the hauler; front +Z | runners, a bed, a crate box and a sack box | 0.9 x 1.9 x 0.8 |

Known gap: no swim animation clip exists for the Adventurers bodies; diving uses the idle/walk clips under water until a swim clip (looping breaststroke, about 1.2 s) arrives.

## N. Greyfen places (added 2026-10-24 by K3, Greyfen places; the game shows greybox boxes until these arrive)
Each id is one file under public/assets/env (Y up, 1 unit = 1 m, base-centre pivot, front +Z). Silver-green fen palette (plan Part 11): weathered grey timber, reed thatch, peat-brown mud, lichen.
| id | what | used for | greybox now | size (w x d x h, m) |
|---|---|---|---|---|
| greyfen-stilt-house | small reed-thatched timber house on short stilt legs, a plank porch and three steps at the front, a smoke hole in the thatch | Reedgate (10) | box | 7 x 7 x 6 |
| greyfen-plank-walk | straight plank walkway section, 1.6 m wide, planks across two stringers, a few planks warped | Reedgate's walks and landing deck (tiles to length) | thin slab | 1.6 x 4 x 0.15 |
| greyfen-jetty | plank jetty section on round piles, 3 m wide, mooring post at the end, rope coil | the four ferry stops (tiles to length; the game uses the built-in bridge greybox) | plank deck with rails | 3 x 4 x 1 (piles below) |
| greyfen-boathouse | open-fronted timber boathouse with reed roof, a punt rack inside | Reedgate Ferry landing | box | 8 x 6 x 4 |
| greyfen-ranger-platform | square ranger lookout: plank platform on four stilt legs with a rail, a signal-fire brazier in one corner, a ladder on the east side | the four Greywatch posts | box (stairs of 0.4 m steps stand in for the ladder) | 6 x 6 x 4 (platform top) |
| greyfen-reed-bed | dense stand of tall green-gold reeds in shallow water, uneven top | R12's five beds | flat panel | 30 x 30 x 2.2 |
| greyfen-reed-bed-charred | the same bed burnt: black stubble, ash on the water, a few smouldering stalks | R12 burned | flat panel | 30 x 30 x 0.6 |
| greyfen-stocks | wooden stocks with head and wrist holes, iron hasp | R14 at the Greywatch waystone | box | 2 x 0.8 x 1.4 |
| greyfen-stilt-hut | the peat-witch's hut: crooked timber hut on stilts, turf roof with herbs growing, hanging bundles and bones by the door, a cauldron smoke stack | Mireweather Hut (Gytha) | box | 12 x 9 x 5 |
| greyfen-herb-bed | small fenced herb bed in boggy ground: bog myrtle, sundew, a pale mire-lily | M25 (3) | flat panel | 6 x 4 x 0.5 |
| greyfen-chapel-ruin | front of a drowned stone chapel: a gable wall with an arched door, sunk to the sill in mud, ivy and water stains | R13's door | box | 16 x 10 x 7 |
| greyfen-bell-tower | stump of a square bell tower, broken top, a bell rope hanging out of a window | R13's far exit | box | 4 x 4 x 9 |
| greyfen-monastery-ruin | front of a drowned monastery: a cloister arcade half under mud, a collapsed east wall | D05's door and arena exit | box | 20 x 12 x 6 |
| greyfen-marker | causeway way-marker: a leaning post with a carved reed sign and a rag tied on | the three causeways (every 150 m) | box | 0.4 x 0.4 x 1.6 |
| interior: cauldron, herb rack, salve shelf, spear rack, sluice wheel, drowned altar, hymn board | small interior props for the hut, the chapel and the Deeps (the interiors are greybox boxes until then) | M25, R13, D05 | boxes | as in src/greyfen/*Interior.ts |

## O. Dragonspine lower slopes (added 2026-10-25 by K4, Dragonspine places; the game shows greybox until these arrive)

| id | prompt | where | greybox now | size (m, w x d x h) |
| --- | --- | --- | --- | --- |
| dragonspine-hawk-nest | large rime hawk nest of twigs and frosted bones on a rock ledge, white down feathers, room for three pale blue speckled eggs | Hawk Cliffs nest shelf (3) | flattened cylinder | 2.5 x 2.5 x 0.8 |
| dragonspine-trophy-wall | timber porch wall hung with hunting trophies: a huge curved dragon tooth, an old barbed harpoon, a child's charcoal drawing on bark, a hide map of roosts, a notched tally stick | Rime Pass shelter (Eadgyth's porch) | slab with boxes | 4 x 0.4 x 2.5 |
| dragonspine-prayer-cairn | knee-high stacked-stone cairn with a carved hammer-and-flame mark and a wax-stained top | Rime Pass bends, M28 cairns | stacked boxes | 1 x 1 x 1.2 |
| dragonspine-lean-to | snow-laden hide lean-to on two poles over a log bench, firewood stacked inside | Rime Pass shelter, the egg thief's camp | sloped slab | 3 x 2 x 1.8 |
| dragonspine-carving-stone | weathered standing stone with a smith's carving (hammer, anvil, dragon wing) in shallow relief, frost in the grooves | the Last Anvil shoulder (6) | box | 1 x 0.5 x 1.8 |
| dragonspine-sled-shed | open timber shed with a snow roof, sled runners and rope coils on pegs | Wyrmwatch Lodge yard (R15 depot) | box | 8 x 5 x 3.5 |
| dragonspine-rockfall | jumble of fallen boulders filling a cave passage to the roof | collapsed cave (R16) | box | 4 x 2 x 3 |

## P. GLB-Viewer generator ids (added 2026-10-25 with their target sizes in src/env/targets.json)
Mostafa's GLB-Viewer generators (props, structures, rocks, texture, creature pages; `tools/export-ids.mjs`) export these ids. Their sizes are now in `src/env/targets.json`, so `tools/env-pass/ingest.mjs` takes the files. Sizes marked *game* come from the game's own layout for that structure (its footprint and height), so a model replaces the procedural stand-in at the same size. The rest are the generator's estimates, accepted as they are. One rename: the generator's `headframe` is **`deepgate-headframe`**, the game's structure kind (10 x 8 x 14 m, not 5 x 5 x 9.5). Ingest refuses an id the game already ships unless `--replace` is given, so generated files never replace Mostafa's own models (oak-a, birch-a, hedge-straight, stump-a, boulder-large-a and the rest of the manifest). A decal must have some thickness: a flat quad with no height is refused, so use the props page's mesh version of `ash-patch-decal` and `waystone-flagstones`.

| group | id | w x d x h (m) |
|---|---|---|
| Ash country, Dead Road and decals | field-gate-a | 3.4 x 0.2 x 1.2 |
| Ash country, Dead Road and decals | ash-patch-decal | 3 x 3 x 0.02 |
| Ash country, Dead Road and decals | waystone-flagstones | 9 x 9 x 0.1 |
| Section G: points of interest (src/world/poi/proc.ts) | poi-bedroll | 0.8 x 2 x 0.3 |
| Section G: points of interest (src/world/poi/proc.ts) | poi-bones | 1.2 x 1 x 0.35 |
| Section G: points of interest (src/world/poi/proc.ts) | poi-cache | 1.2 x 0.92 x 0.8 |
| Section G: points of interest (src/world/poi/proc.ts) | poi-cave-mouth | 4 x 3 x 3 |
| Section G: points of interest (src/world/poi/proc.ts) | poi-fire-ring | 1.2 x 1.2 x 0.5 |
| Section G: points of interest (src/world/poi/proc.ts) | poi-lore-stone | 0.8 x 0.78 x 1.8 |
| Section G: Cinderreach structures and shrines | brazier-cart | 2.4 x 1.2 x 1.7 |
| Section G: Cinderreach structures and shrines | cinder-boarded-well | 4 x 4 x 1.6 (game) |
| Section G: Cinderreach structures and shrines | cinder-cage | 3 x 3 x 2.4 (game) |
| Section G: Cinderreach structures and shrines | cinder-cairn | 2.4 x 2.4 x 1.6 (game) |
| Section G: Cinderreach structures and shrines | cinder-forge | 4.6 x 3.6 x 4.4 |
| Section G: Cinderreach structures and shrines | cinder-marker | 0.5 x 0.5 x 1.6 |
| Section G: Cinderreach structures and shrines | cinder-rune-stone | 1.4 x 0.8 x 2.4 (game) |
| Section G: Cinderreach structures and shrines | cinder-smelter | 3 x 3 x 4.5 |
| Section G: Cinderreach structures and shrines | cinder-trial-ring | 16 x 16 x 0.35 (game) |
| Section G: Cinderreach structures and shrines | shrine-forge | 2.4 x 1.4 x 2.8 |
| Section G: Cinderreach structures and shrines | shrine-hushed-anvil | 2.2 x 2.2 x 1.6 |
| Section G: Cinderreach structures and shrines | shrine-waystone | 1.8 x 1.8 x 3.4 |
| Section G: Cinderreach structures and shrines | shrine-weeping-bellows | 2.4 x 2 x 2.4 |
| Section G: Oldsmoke and the golem | deepgate-headframe | 10 x 8 x 14 (game) |
| Section G: Oldsmoke and the golem | lift-cage | 2.8 x 2 x 4.6 |
| Section G: Oldsmoke and the golem | oldsmoke-adit | 4.5 x 4.5 x 3.6 |
| Section G: Oldsmoke and the golem | golem-rock-chunks | 2.4 x 1.3 x 2.8 |
| Cliffs and rock features (no tile uses them yet) | ash-cliff-corner-a | 3 x 3 x 6 |
| Cliffs and rock features (no tile uses them yet) | ash-cliff-face-a | 6 x 3 x 6 |
| Cliffs and rock features (no tile uses them yet) | ash-scree-a | 6 x 5 x 2.5 |
| Cliffs and rock features (no tile uses them yet) | basalt-field-a | 8 x 8 x 1.2 |
| Cliffs and rock features (no tile uses them yet) | cave-mouth-a | 7 x 5 x 5 |
| Cliffs and rock features (no tile uses them yet) | cliff-corner-a | 3 x 3 x 6 |
| Cliffs and rock features (no tile uses them yet) | cliff-face-a | 6 x 3 x 6 |
| Cliffs and rock features (no tile uses them yet) | cliff-face-b | 6 x 3 x 6 |
| Cliffs and rock features (no tile uses them yet) | cliff-face-tall-a | 6 x 3.5 x 10 |
| Cliffs and rock features (no tile uses them yet) | cliff-ledge-a | 6 x 2.5 x 1.6 |
| Cliffs and rock features (no tile uses them yet) | cliff-overhang-a | 6 x 4 x 6 |
| Cliffs and rock features (no tile uses them yet) | crag-spire-a | 2.5 x 2.5 x 7 |
| Cliffs and rock features (no tile uses them yet) | ember-crag-a | 4 x 4 x 4 |
| Cliffs and rock features (no tile uses them yet) | obsidian-shards-a | 2 x 2 x 1.8 |
| Cliffs and rock features (no tile uses them yet) | rock-arch-a | 6 x 2 x 5 |
| Cliffs and rock features (no tile uses them yet) | scree-slope-a | 6 x 5 x 2.5 |
| Section E animals and creature stand-ins (static scenery only; enemies keep their procedural rigs) | hen-a | 0.24 x 0.4 x 0.42 |
| Section E animals and creature stand-ins (static scenery only; enemies keep their procedural rigs) | goat-a | 0.34 x 1.2 x 1 |
| Section E animals and creature stand-ins (static scenery only; enemies keep their procedural rigs) | crow-a | 0.13 x 0.42 x 0.27 |
| Section E animals and creature stand-ins (static scenery only; enemies keep their procedural rigs) | wolf-a | 0.44 x 1.75 x 0.95 |
| Section E animals and creature stand-ins (static scenery only; enemies keep their procedural rigs) | boar-a | 0.56 x 1.32 x 0.85 |
| Section E animals and creature stand-ins (static scenery only; enemies keep their procedural rigs) | fox-a | 0.19 x 1.1 x 0.5 |
| Section E animals and creature stand-ins (static scenery only; enemies keep their procedural rigs) | deer-a | 0.4 x 1.68 x 1.75 |
| Section E animals and creature stand-ins (static scenery only; enemies keep their procedural rigs) | rat-a | 0.1 x 0.45 x 0.12 |
| Section E animals and creature stand-ins (static scenery only; enemies keep their procedural rigs) | bat-a | 0.7 x 0.24 x 0.15 |
| Section E animals and creature stand-ins (static scenery only; enemies keep their procedural rigs) | spider-giant-a | 1.8 x 1.45 x 0.6 |
| Section E animals and creature stand-ins (static scenery only; enemies keep their procedural rigs) | ember-hound | 0.38 x 2.1 x 1.05 |
| Section E animals and creature stand-ins (static scenery only; enemies keep their procedural rigs) | kindling-fox | 0.2 x 1.22 x 0.55 |
| Section E animals and creature stand-ins (static scenery only; enemies keep their procedural rigs) | slag-crawler | 1.95 x 1.7 x 0.7 |
| Section E animals and creature stand-ins (static scenery only; enemies keep their procedural rigs) | wyrmling | 1.55 x 3.5 x 1.1 |
