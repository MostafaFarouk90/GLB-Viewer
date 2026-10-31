// The links between the toolkit pages: a row of every page, put right under the page's <h1>, with the page itself
// marked. Each page loads it with a classic script tag (src="shared/nav.js"); loaded that way it links the CDN pages; the
// offline build inlines it (no src), and then it links the *-offline.html pages, so an offline copy stays offline.
// coverage.html and readme.html have no offline build, so they are linked as they are from both.
(function (kit) {
  kit.PAGES = [
    ['GLB viewer', 'index.html', 'glb-viewer-offline.html'],
    ['Characters', 'character-generator.html', 'character-generator-offline.html'],
    ['Creatures', 'creature-generator.html', 'creature-generator-offline.html'],
    ['Animation', 'animation-preview.html', 'animation-preview-offline.html'],
    ['Props', 'props-generator.html', 'props-generator-offline.html'],
    ['Structures', 'structures-generator.html', 'structures-generator-offline.html'],
    ['Rocks', 'rocks-generator.html', 'rocks-generator-offline.html'],
    ['Vegetation', 'vegetation-generator.html', 'vegetation-generator-offline.html'],
    ['Textures', 'texture-generator.html', 'texture-generator-offline.html'],
    ['Coverage', 'coverage.html', 'coverage.html'],
    ['README', 'readme.html', 'readme.html'],
  ];
  const offline = !document.currentScript.src;

  function addNav() {
    const h1 = document.querySelector('h1');
    if (!h1 || document.querySelector('nav.kit-nav')) return;
    const style = document.createElement('style');
    style.textContent = `
      nav.kit-nav { display: flex; flex-wrap: wrap; gap: 2px 10px; margin: 0 0 10px; font-size: 12px; }
      nav.kit-nav a { color: var(--muted); text-decoration: none; }
      nav.kit-nav a:hover { color: var(--accent); text-decoration: underline; }
      nav.kit-nav a[aria-current] { color: var(--text); font-weight: 600; }`;
    document.head.appendChild(style);
    const here = decodeURIComponent(location.pathname.split('/').pop()) || 'index.html';
    const nav = document.createElement('nav');
    nav.className = 'kit-nav';
    nav.setAttribute('aria-label', 'Toolkit pages');
    for (const [label, online, off] of kit.PAGES) {
      const a = document.createElement('a');
      a.textContent = label;
      a.href = offline ? off : online;
      if (here === online || here === off) a.setAttribute('aria-current', 'page');
      nav.appendChild(a);
    }
    h1.after(nav);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addNav);
  else addNav();
})(window.EmbersKit = window.EmbersKit || {});
