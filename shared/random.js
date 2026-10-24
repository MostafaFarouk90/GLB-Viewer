// Seeded random numbers: the same seed string always gives the same sequence (and so the same model).
(function (kit) {
  function hashSeed(str) {
    let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++) { h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = (h << 13) | (h >>> 19); }
    h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909);
    return (h ^ (h >>> 16)) >>> 0;
  }
  function makeRng(str) {
    let a = hashSeed(str);
    const next = () => { // mulberry32
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
    return {
      next,
      range: (lo, hi) => lo + (hi - lo) * next(),
      int: (lo, hi) => lo + Math.floor(next() * (hi - lo + 1)),
      pick: (arr) => arr[Math.floor(next() * arr.length)],
      chance: (p) => next() < p,
      // {a: 3, b: 1} -> 'a' three times as often as 'b'
      weighted: (w) => {
        const keys = Object.keys(w); let sum = 0; for (const k of keys) sum += w[k];
        let x = next() * sum; for (const k of keys) { x -= w[k]; if (x < 0) return k; }
        return keys[keys.length - 1];
      },
    };
  }
  const SEED_WORDS = ['ember', 'frost', 'moon', 'rune', 'ash', 'star', 'thorn', 'mist', 'void', 'dawn', 'storm', 'shade', 'oak', 'opal', 'wyrm', 'glyph'];
  // A fresh seed such as "moon-ash-417", from the page's own word list.
  function randomSeed(words = SEED_WORDS) {
    const r = makeRng(String(Math.random()) + Date.now());
    return r.pick(words) + '-' + r.pick(words) + '-' + r.int(10, 999);
  }
  Object.assign(kit, { hashSeed, makeRng, randomSeed, SEED_WORDS });
})(window.EmbersKit = window.EmbersKit || {});
