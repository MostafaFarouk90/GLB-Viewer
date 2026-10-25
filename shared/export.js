// GLB export helpers shared by the generators.
(function (kit) {
  // Writes root as a binary glTF (GLB) ArrayBuffer. options go to GLTFExporter.parseAsync (animations, …). Nodes are
  // written as translation/rotation/scale, never as a matrix: glTF requires TRS on nodes that clips animate (bones),
  // and strict validators and clip bakers reject a matrix there.
  kit.writeGLB = (root, options = {}) => new (kit.need('GLTFExporter'))().parseAsync(root, { binary: true, trs: true, ...options });

  // Frees an export copy: every geometry, and every material that is not one of the preview's own (keep).
  kit.disposeExport = (root, keep = {}) => {
    const kept = new Set(Array.isArray(keep) ? keep : Object.values(keep));
    root.traverse((o) => {
      if (!o.isMesh) return;
      o.geometry.dispose();
      for (const m of [o.material].flat()) if (!kept.has(m)) m.dispose();
    });
  };

  // Merges parts that share a material into one mesh, keeping only the listed attributes (parts with no uv get
  // zeros), with vertices welded.
  kit.mergeParts = (geos, attrs = ['position', 'normal', 'uv']) => {
    const THREE = kit.need('THREE'), mergeGeometries = kit.need('mergeGeometries'), mergeVertices = kit.need('mergeVertices');
    const clean = geos.map((g0) => {
      const g1 = g0.index ? g0.toNonIndexed() : g0, g2 = new THREE.BufferGeometry();
      for (const a of attrs) g2.setAttribute(a, a === 'uv' && !g1.attributes.uv ? new THREE.Float32BufferAttribute(new Float32Array(g1.attributes.position.count * 2), 2) : g1.attributes[a]);
      return g2;
    });
    return mergeVertices(mergeGeometries(clean), 1e-5);
  };

  // Game materials, as the game's ingest wants them: flat colour, roughness 1, metallic 0, opaque, emissive colour
  // kept. Returns matFor(material), which gives one game copy per preview material (or the material itself when
  // on is false). keepSide copies the material's side (front, back or double).
  kit.gameMaterials = (on = true, { keepSide = true, emissive = true } = {}) => {
    const THREE = kit.need('THREE'), flat = new Map();
    return (m) => {
      if (!on) return m;
      if (!flat.has(m)) {
        const p = { name: m.name, color: m.color, roughness: 1, metalness: 0 };
        if (emissive) Object.assign(p, { emissive: m.emissive, emissiveIntensity: m.emissiveIntensity });
        if (keepSide) p.side = m.side;
        flat.set(m, new THREE.MeshStandardMaterial(p));
      }
      return flat.get(m);
    };
  };

  // Node names glTF and three.js both accept ("Iron Lantern" -> "Iron_Lantern").
  kit.nodeName = (s, fallback = 'Model') => kit.need('THREE').PropertyBinding.sanitizeNodeName(s.replace(/\s+/g, '_')) || fallback;
})(window.EmbersKit = window.EmbersKit || {});
