// Geometry helpers shared by the generators.
(function (kit) {
  // Tube along a smooth curve whose radius goes from r0 to r1 (r1 = 0 makes a point), with a cap at the base.
  kit.taperTube = (points, r0, r1, tubular, radial) => {
    const THREE = kit.need('THREE');
    const curve = new THREE.CatmullRomCurve3(points);
    const fr = curve.computeFrenetFrames(tubular, false);
    const pos = [], uv = [], idx = [];
    const P = new THREE.Vector3();
    for (let i = 0; i <= tubular; i++) {
      const u = i / tubular; curve.getPointAt(u, P);
      const N = fr.normals[i], B = fr.binormals[i], r = r0 + (r1 - r0) * u;
      for (let j = 0; j <= radial; j++) {
        const v = (j / radial) * Math.PI * 2, s = Math.sin(v), c = -Math.cos(v); // same convention as THREE.TubeGeometry
        pos.push(P.x + r * (c * N.x + s * B.x), P.y + r * (c * N.y + s * B.y), P.z + r * (c * N.z + s * B.z));
        uv.push(j / radial, u);
      }
    }
    for (let i = 0; i < tubular; i++) for (let j = 0; j < radial; j++) {
      const a = i * (radial + 1) + j, b = (i + 1) * (radial + 1) + j;
      idx.push(a, b, a + 1, b, b + 1, a + 1);
    }
    const c0 = curve.getPointAt(0), center = pos.length / 3;
    pos.push(c0.x, c0.y, c0.z); uv.push(0.5, 0);
    for (let j = 0; j < radial; j++) idx.push(center, j + 1, j);
    if (r1 > 0) { // tip cap
      const c1 = curve.getPointAt(1), tip = pos.length / 3, last = tubular * (radial + 1);
      pos.push(c1.x, c1.y, c1.z); uv.push(0.5, 1);
      for (let j = 0; j < radial; j++) idx.push(tip, last + j, last + j + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
    g.setIndex(idx); g.computeVertexNormals();
    return g;
  };
  // Repeatable noise in [0, 1) from a position and a salt; equal positions give equal values, so displacing by it
  // keeps shared corners closed.
  kit.hash3 = (x, y, z, s) => {
    const h = Math.sin(Math.round(x * 1e4) * 0.1271 + Math.round(y * 1e4) * 0.3117 + Math.round(z * 1e4) * 0.0747 + s * 13.37) * 43758.5453;
    return h - Math.floor(h);
  };
})(window.EmbersKit = window.EmbersKit || {});
