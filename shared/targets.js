// The game's size table (Embers of Valdren, src/env/targets.json): objects.<id> = { w, d, h } in metres (w along X,
// d along Z, h along Y), plus tolerance, proportionTolerance, maxTriangles, maxFileMB, knightHeight and proportion.
// Pages load the live file from the game repo when they can; the copy in shared/targets-data.js (made from
// embers/targets.json by the build) is the offline fallback.
(function (kit) {
  kit.TARGETS_URL = 'https://raw.githubusercontent.com/MostafaFarouk90/OpenWorld/main/src/env/targets.json';

  // A fresh copy of the built-in table, so a page can keep and change its own.
  kit.embeddedTargets = () => JSON.parse(JSON.stringify(kit.EMBEDDED_TARGETS));

  // The live targets.json as text. Rejects when offline, on a timeout (AbortError) or an HTTP error. The last
  // request stays in kit.liveTargets, so tools/export-ids.mjs can wait for it before exporting.
  kit.fetchLiveTargets = ({ timeout = 6000, cache = 'no-store' } = {}) => kit.liveTargets = (async () => {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), timeout);
    try {
      const res = await fetch(kit.TARGETS_URL, { cache, signal: ctl.signal });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      return await res.text();
    } finally { clearTimeout(t); }
  })();

  // As the game checks it: the driver axis is the height, or the longest footprint side for long low pieces.
  kit.driverAxis = (b) => Math.max(b.w, b.d) > 1.8 * b.h ? (b.w >= b.d ? 'x' : 'z') : 'y';

  // Scale factors [x, y, z] that bring a model of size sz ({ x, y, z }) to the target box: uniform on the driver
  // axis, then the other axes stretched towards the target by at most maxStretch either way, so the shape stays
  // recognisable.
  kit.fitToBox = (sz, b, maxStretch = 1.6) => {
    const tgt = { x: b.w, y: b.h, z: b.d }, drv = kit.driverAxis(b), k = tgt[drv] / sz[drv];
    const clamp = (f) => Math.min(maxStretch, Math.max(1 / maxStretch, f));
    return ['x', 'y', 'z'].map((a) => a === drv ? k : k * clamp(tgt[a] / (sz[a] * k)));
  };
})(window.EmbersKit = window.EmbersKit || {});
