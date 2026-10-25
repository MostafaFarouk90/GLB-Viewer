// The game's palette (embers/conventions.md, from the missing-objects list). Pages build their own colour slots
// from these swatches.
(function (kit) {
  kit.SWATCHES = {
    grass: '#5a8c44', bark: '#6b4a2b', warmStone: '#8a8578', thatch: '#d1b25a', redRoof: '#a83a2c', // field (Act 1)
    charcoal: '#2b2b2b', ashGrey: '#8d8780', ember: '#ff5a0f', scorched: '#4a3722', // ash country (Act 2)
    fenTimber: '#8a8a7e', reedThatch: '#b8a468', peat: '#4a3a2a', lichen: '#8fa07a', // Greyfen (Act 3, silver-green fen)
    frostStone: '#9aa4ac', snow: '#e8eef2', hide: '#7a5a3e', darkTimber: '#4a3a2c', // Dragonspine lower slopes
  };
})(window.EmbersKit = window.EmbersKit || {});
