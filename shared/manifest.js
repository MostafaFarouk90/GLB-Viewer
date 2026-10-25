// The game's shipped environment objects (public/assets/env/manifest.json in the game repo, written by its ingest):
// ids that already have a model in the game, most of them Mostafa's own. A generator must never save over one, so
// the Download buttons save a shipped id as <id>-gen.glb and tools/export-ids.mjs skips shipped ids by default.
// Pages load the live manifest when they can; shared/manifest-data.js (made from embers/manifest.json by the build)
// is the offline fallback.
(function (kit) {
  kit.MANIFEST_URL = 'https://raw.githubusercontent.com/MostafaFarouk90/OpenWorld/main/public/assets/env/manifest.json';
  kit.shipped = new Set(kit.EMBEDDED_SHIPPED || []);
  kit.shippedFrom = 'built-in copy';

  // Loads the live manifest into kit.shipped. Rejects (keeping the built-in list) when offline, on a timeout or an
  // HTTP error. The request stays in kit.liveShipped, so tools/export-ids.mjs can wait for it.
  kit.fetchShipped = ({ timeout = 6000, cache = 'no-store' } = {}) => kit.liveShipped = (async () => {
    const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), timeout);
    try {
      const res = await fetch(kit.MANIFEST_URL, { cache, signal: ctl.signal });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const j = await res.json();
      if (!j || typeof j.objects !== 'object') throw new Error('not a manifest.json (no "objects")');
      kit.shipped = new Set(Object.keys(j.objects)); kit.shippedFrom = 'the game repo';
      return kit.shipped;
    } finally { clearTimeout(t); }
  })();

  kit.isShipped = (id) => kit.shipped.has(id);
  // File name base for a download: <base>-gen when the game already ships an id called base, so the generated file
  // never replaces the game's own model when it is dropped into the game's staging folder.
  kit.genBase = (base) => kit.shipped.has(base) ? base + '-gen' : base;
  // A log line for the bases that genBase renamed, or null when none was.
  kit.shippedNote = (bases) => {
    const s = [...new Set(bases)].filter((b) => kit.shipped.has(b));
    if (!s.length) return null;
    return `${s.join(', ')} already ship${s.length > 1 ? '' : 's'} in the game (list from ${kit.shippedFrom}), so the file${s.length > 1 ? 's were' : ' was'} saved as `
      + `${s.map((b) => b + '-gen').join(', ')} and will not replace the game's own model. Rename it to replace that model on purpose.`;
  };
})(window.EmbersKit = window.EmbersKit || {});
