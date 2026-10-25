// Made by tools/build.mjs from embers/targets.json (the game's src/env/targets.json): do not edit, edit that file
// and run "npm run build". The offline copy of the size table; see shared/targets.js.
(window.EmbersKit = window.EmbersKit || {}).EMBEDDED_TARGETS = {
 "$comment": "Target sizes in metres (width x, depth z, height y) for environment objects, from assets/environment-needs-prompts.md. Used by src/env/scaleTable.ts and tools/env-pass/check-glb.mjs.",
 "tolerance": 0.15,
 "knightHeight": 1.8,
 "proportion": {
  "$comment": "Ids ingested with an exact fit to the target size (tools/env-pass/ingest.mjs): uniform scale to the height, optional tile = repeat the model n times along x, then width/depth scaled to the target without the 15% cap. For artist models whose shape is far from the table (batch 2).",
  "stonewall-low": {
   "tile": 2
  },
  "wattle-fence": {
   "tile": 2
  },
  "picket-fence": {
   "tile": 2
  },
  "garden-bed-a": {
   "tile": 2
  },
  "signpost-a": {},
  "washing-line": {},
  "barn-a": {},
  "ash-patch-decal": {},
  "waystone-flagstones": {}
 },
 "objects": {
  "oak-a": {
   "w": 10.5,
   "d": 10.5,
   "h": 13
  },
  "oak-b": {
   "w": 10.5,
   "d": 10.5,
   "h": 13
  },
  "oak-c": {
   "w": 10.5,
   "d": 10.5,
   "h": 13
  },
  "birch-a": {
   "w": 3,
   "d": 3,
   "h": 8
  },
  "poplar-a": {
   "w": 2.5,
   "d": 2.5,
   "h": 14
  },
  "cairn-a": {
   "w": 1.2,
   "d": 1.2,
   "h": 1.3
  },
  "birch-b": {
   "w": 3,
   "d": 3,
   "h": 8
  },
  "elm-or-ash-a": {
   "w": 6,
   "d": 6,
   "h": 10
  },
  "autumn-tree-a": {
   "w": 6,
   "d": 6,
   "h": 9
  },
  "autumn-tree-b": {
   "w": 6,
   "d": 6,
   "h": 9
  },
  "bush-round-a": {
   "w": 1.4,
   "d": 1.4,
   "h": 1.1
  },
  "bush-round-b": {
   "w": 1.4,
   "d": 1.4,
   "h": 1.1
  },
  "bush-flowering-a": {
   "w": 1.4,
   "d": 1.4,
   "h": 1.2
  },
  "bush-flowering-b": {
   "w": 1.4,
   "d": 1.4,
   "h": 1.2
  },
  "hedge-straight": {
   "w": 3.4,
   "d": 0.9,
   "h": 1.6
  },
  "hedge-corner": {
   "w": 1.2,
   "d": 1.2,
   "h": 1.6
  },
  "grass-clump-a": {
   "w": 0.6,
   "d": 0.6,
   "h": 0.5
  },
  "grass-clump-b": {
   "w": 0.6,
   "d": 0.6,
   "h": 0.5
  },
  "grass-clump-c": {
   "w": 0.6,
   "d": 0.6,
   "h": 0.5
  },
  "fern-a": {
   "w": 0.9,
   "d": 0.9,
   "h": 0.7
  },
  "flower-patch-yellow": {
   "w": 0.7,
   "d": 0.7,
   "h": 0.4
  },
  "flower-patch-white": {
   "w": 0.7,
   "d": 0.7,
   "h": 0.4
  },
  "flower-patch-purple": {
   "w": 0.7,
   "d": 0.7,
   "h": 0.4
  },
  "flower-patch-red": {
   "w": 0.7,
   "d": 0.7,
   "h": 0.4
  },
  "reeds-a": {
   "w": 0.8,
   "d": 0.8,
   "h": 1.8
  },
  "reeds-b": {
   "w": 0.8,
   "d": 0.8,
   "h": 1.8
  },
  "stump-a": {
   "w": 0.9,
   "d": 0.9,
   "h": 0.6
  },
  "stump-b": {
   "w": 0.9,
   "d": 0.9,
   "h": 0.6
  },
  "log-fallen-a": {
   "w": 3,
   "d": 0.8,
   "h": 0.7
  },
  "mushrooms-a": {
   "w": 0.5,
   "d": 0.5,
   "h": 0.3
  },
  "boulder-large-a": {
   "w": 3,
   "d": 3,
   "h": 2.4
  },
  "boulder-large-b": {
   "w": 3,
   "d": 3,
   "h": 2.4
  },
  "rock-cluster-a": {
   "w": 2.5,
   "d": 2,
   "h": 1
  },
  "haystack-round": {
   "w": 2.4,
   "d": 2.4,
   "h": 2.6
  },
  "haybale-a": {
   "w": 1.2,
   "d": 0.8,
   "h": 0.7
  },
  "haycart-a": {
   "w": 3.2,
   "d": 1.6,
   "h": 1.8
  },
  "woodpile-chop": {
   "w": 2,
   "d": 1.2,
   "h": 1.3
  },
  "trough-a": {
   "w": 2,
   "d": 0.7,
   "h": 0.7
  },
  "garden-bed-a": {
   "w": 2,
   "d": 1.4,
   "h": 0.5
  },
  "garden-bed-b": {
   "w": 2,
   "d": 1.4,
   "h": 0.5
  },
  "beehive-skep": {
   "w": 0.7,
   "d": 0.7,
   "h": 0.8
  },
  "washing-line": {
   "w": 4,
   "d": 0.3,
   "h": 2.2
  },
  "signpost-a": {
   "w": 1.2,
   "d": 0.4,
   "h": 2.4
  },
  "milestone-a": {
   "w": 0.6,
   "d": 0.4,
   "h": 1.1
  },
  "picket-fence": {
   "w": 3.4,
   "d": 0.2,
   "h": 1.1
  },
  "wattle-fence": {
   "w": 3.4,
   "d": 0.3,
   "h": 1.2
  },
  "stonewall-low": {
   "w": 3.4,
   "d": 0.7,
   "h": 1
  },
  "market-stall-a": {
   "w": 3,
   "d": 2.4,
   "h": 2.8
  },
  "market-stall-b": {
   "w": 3,
   "d": 2.4,
   "h": 2.8
  },
  "well-bucket-rope": {
   "w": 0.4,
   "d": 0.4,
   "h": 0.5
  },
  "barn-a": {
   "w": 8,
   "d": 12,
   "h": 7
  },
  "stable-a": {
   "w": 7,
   "d": 5,
   "h": 4
  },
  "cottage-thatch-a": {
   "w": 4.6,
   "d": 5,
   "h": 5
  },
  "cottage-thatch-b": {
   "w": 4.6,
   "d": 5,
   "h": 5
  },
  "wagon-wreck-a": {
   "w": 4,
   "d": 2,
   "h": 2.2
  },
  "wagon-burnt": {
   "w": 4,
   "d": 2,
   "h": 2
  },
  "roadside-shrine-a": {
   "w": 1.2,
   "d": 1.2,
   "h": 2.2
  },
  "gibbet-post": {
   "w": 1,
   "d": 1,
   "h": 3.6
  },
  "campfire-ring": {
   "w": 1.6,
   "d": 1.6,
   "h": 0.6
  },
  "crow-perch-post": {
   "w": 0.4,
   "d": 0.4,
   "h": 1.6
  },
  "ash-tree-dead-a": {
   "w": 3,
   "d": 3,
   "h": 8
  },
  "ash-tree-dead-b": {
   "w": 3,
   "d": 3,
   "h": 8
  },
  "charred-stump": {
   "w": 1.2,
   "d": 1.2,
   "h": 0.8
  },
  "basalt-columns-a": {
   "w": 3,
   "d": 3,
   "h": 4
  },
  "ember-rock-a": {
   "w": 2.5,
   "d": 2.5,
   "h": 2
  },
  "ember-rock-b": {
   "w": 2.5,
   "d": 2.5,
   "h": 2
  },
  "slag-heap": {
   "w": 5,
   "d": 5,
   "h": 2.5
  },
  "mine-cart": {
   "w": 1.8,
   "d": 1,
   "h": 1
  },
  "ore-pile": {
   "w": 2,
   "d": 2,
   "h": 1
  },
  "scorched-fence": {
   "w": 3.4,
   "d": 0.3,
   "h": 1.6
  },
  "smelter-chimney": {
   "w": 2,
   "d": 2,
   "h": 9
  },
  "bush-holly-a": {
   "w": 1.5,
   "d": 1.5,
   "h": 1.3
  },
  "willow-a": {
   "w": 7,
   "d": 7,
   "h": 8
  },
  "oak-ash-a": {
   "w": 10,
   "d": 10,
   "h": 12.4
  },
  "bush-round-ash": {
   "w": 1.4,
   "d": 1.4,
   "h": 1.1
  },
  "grass-clump-ash": {
   "w": 0.57,
   "d": 0.57,
   "h": 0.48
  },
  "fruit-tree-a": {
   "w": 4.5,
   "d": 4.5,
   "h": 5
  },
  "fruit-tree-b": {
   "w": 4.5,
   "d": 4.5,
   "h": 5
  },
  "refugee-tent-a": {
   "w": 3,
   "d": 2.4,
   "h": 2
  },
  "handcart-a": {
   "w": 2.2,
   "d": 1.2,
   "h": 1
  },
  "cart-goods-a": {
   "w": 3.4,
   "d": 1.7,
   "h": 1.9
  },
  "horse-standing": {
   "w": 0.7,
   "d": 2.2,
   "h": 1.7
  },
  "notice-board-a": {
   "w": 2,
   "d": 0.3,
   "h": 2.2
  },
  "basket-goods-a": {
   "w": 0.6,
   "d": 0.6,
   "h": 0.4
  },
  "ash-cliff-corner-a": {
   "w": 3,
   "d": 3,
   "h": 6
  },
  "ash-cliff-face-a": {
   "w": 6,
   "d": 3,
   "h": 6
  },
  "ash-patch-decal": {
   "w": 3,
   "d": 3,
   "h": 0.02
  },
  "ash-scree-a": {
   "w": 6,
   "d": 5,
   "h": 2.5
  },
  "basalt-field-a": {
   "w": 8,
   "d": 8,
   "h": 1.2
  },
  "bat-a": {
   "w": 0.7,
   "d": 0.24,
   "h": 0.15
  },
  "boar-a": {
   "w": 0.56,
   "d": 1.32,
   "h": 0.85
  },
  "brazier-cart": {
   "w": 2.4,
   "d": 1.2,
   "h": 1.7
  },
  "cave-mouth-a": {
   "w": 7,
   "d": 5,
   "h": 5
  },
  "cinder-boarded-well": {
   "w": 4,
   "d": 4,
   "h": 1.6
  },
  "cinder-cage": {
   "w": 3,
   "d": 3,
   "h": 2.4
  },
  "cinder-cairn": {
   "w": 2.4,
   "d": 2.4,
   "h": 1.6
  },
  "cinder-forge": {
   "w": 4.6,
   "d": 3.6,
   "h": 4.4
  },
  "cinder-marker": {
   "w": 0.5,
   "d": 0.5,
   "h": 1.6
  },
  "cinder-rune-stone": {
   "w": 1.4,
   "d": 0.8,
   "h": 2.4
  },
  "cinder-smelter": {
   "w": 3,
   "d": 3,
   "h": 4.5
  },
  "cinder-trial-ring": {
   "w": 16,
   "d": 16,
   "h": 0.35
  },
  "cliff-corner-a": {
   "w": 3,
   "d": 3,
   "h": 6
  },
  "cliff-face-a": {
   "w": 6,
   "d": 3,
   "h": 6
  },
  "cliff-face-b": {
   "w": 6,
   "d": 3,
   "h": 6
  },
  "cliff-face-tall-a": {
   "w": 6,
   "d": 3.5,
   "h": 10
  },
  "cliff-ledge-a": {
   "w": 6,
   "d": 2.5,
   "h": 1.6
  },
  "cliff-overhang-a": {
   "w": 6,
   "d": 4,
   "h": 6
  },
  "crag-spire-a": {
   "w": 2.5,
   "d": 2.5,
   "h": 7
  },
  "crow-a": {
   "w": 0.13,
   "d": 0.42,
   "h": 0.27
  },
  "deer-a": {
   "w": 0.4,
   "d": 1.68,
   "h": 1.75
  },
  "ember-crag-a": {
   "w": 4,
   "d": 4,
   "h": 4
  },
  "ember-hound": {
   "w": 0.38,
   "d": 2.1,
   "h": 1.05
  },
  "field-gate-a": {
   "w": 3.4,
   "d": 0.2,
   "h": 1.2
  },
  "fox-a": {
   "w": 0.19,
   "d": 1.1,
   "h": 0.5
  },
  "goat-a": {
   "w": 0.34,
   "d": 1.2,
   "h": 1
  },
  "golem-rock-chunks": {
   "w": 2.4,
   "d": 1.3,
   "h": 2.8
  },
  "hen-a": {
   "w": 0.24,
   "d": 0.4,
   "h": 0.42
  },
  "kindling-fox": {
   "w": 0.2,
   "d": 1.22,
   "h": 0.55
  },
  "lift-cage": {
   "w": 2.8,
   "d": 2,
   "h": 4.6
  },
  "obsidian-shards-a": {
   "w": 2,
   "d": 2,
   "h": 1.8
  },
  "oldsmoke-adit": {
   "w": 4.5,
   "d": 4.5,
   "h": 3.6
  },
  "poi-bedroll": {
   "w": 0.8,
   "d": 2,
   "h": 0.3
  },
  "poi-bones": {
   "w": 1.2,
   "d": 1,
   "h": 0.35
  },
  "poi-cache": {
   "w": 1.2,
   "d": 0.92,
   "h": 0.8
  },
  "poi-cave-mouth": {
   "w": 4,
   "d": 3,
   "h": 3
  },
  "poi-fire-ring": {
   "w": 1.2,
   "d": 1.2,
   "h": 0.5
  },
  "poi-lore-stone": {
   "w": 0.8,
   "d": 0.78,
   "h": 1.8
  },
  "rat-a": {
   "w": 0.1,
   "d": 0.45,
   "h": 0.12
  },
  "rock-arch-a": {
   "w": 6,
   "d": 2,
   "h": 5
  },
  "scree-slope-a": {
   "w": 6,
   "d": 5,
   "h": 2.5
  },
  "shrine-forge": {
   "w": 2.4,
   "d": 1.4,
   "h": 2.8
  },
  "shrine-hushed-anvil": {
   "w": 2.2,
   "d": 2.2,
   "h": 1.6
  },
  "shrine-waystone": {
   "w": 1.8,
   "d": 1.8,
   "h": 3.4
  },
  "shrine-weeping-bellows": {
   "w": 2.4,
   "d": 2,
   "h": 2.4
  },
  "slag-crawler": {
   "w": 1.95,
   "d": 1.7,
   "h": 0.7
  },
  "spider-giant-a": {
   "w": 1.8,
   "d": 1.45,
   "h": 0.6
  },
  "waystone-flagstones": {
   "w": 9,
   "d": 9,
   "h": 0.1
  },
  "wolf-a": {
   "w": 0.44,
   "d": 1.75,
   "h": 0.95
  },
  "wyrmling": {
   "w": 1.55,
   "d": 3.5,
   "h": 1.1
  },
  "deepgate-headframe": {
   "w": 10,
   "d": 8,
   "h": 14
  }
 },
 "maxTriangles": 10000,
 "maxFileMB": 1.5,
 "proportionTolerance": 1.1
};
