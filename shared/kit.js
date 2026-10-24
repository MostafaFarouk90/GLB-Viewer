// Shared code for the toolkit pages, on window.EmbersKit. Every file in shared/ is a classic script, not an ES
// module, because browsers block module imports from file:// URLs and the pages must keep working when opened
// straight from disk. A page loads the files it needs with one classic script tag each (src="shared/….js"), before
// its module script; the offline build (tools/build.mjs) inlines them.
//
// Helpers that need three.js take it from EmbersKit.use({ THREE, GLTFExporter, … }), which the page's module
// script calls first, so the page and the shared code always use the same three.js copy.
(function (kit) {
  kit.lib = kit.lib || {};
  kit.use = (libs) => { Object.assign(kit.lib, libs); return kit; };
  kit.need = (name) => {
    if (!kit.lib[name]) throw new Error(`EmbersKit: call EmbersKit.use({ ${name} }) first`);
    return kit.lib[name];
  };

  // Pages that make game ids register here, so tools/export-ids.mjs can export them headless:
  //   ids()                 the game ids the page can make
  //   files(id, seed, { lods })  builds the id and resolves to [{ name, data: ArrayBuffer }] (what Download would
  //                         save; with lods also the LOD files, on pages that make them)
  //   targets()             the size table the page is using now
  // The name is the page's file name without -generator.html (props-generator.html registers 'props').
  kit.generators = kit.generators || {};
  kit.registerGenerator = (name, api) => { kit.generators[name] = api; };
})(window.EmbersKit = window.EmbersKit || {});
