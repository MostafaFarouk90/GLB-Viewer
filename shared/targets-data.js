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
  "barn-a": {}
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
  }
 },
 "maxTriangles": 10000,
 "maxFileMB": 1.5,
 "proportionTolerance": 1.1
};
