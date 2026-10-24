// Scene aids for the generator previews (never exported): the 1.8 m scale figure (the game's knight height) and
// the box of a game id's target size.
(function (kit) {
  // A grey capsule with a head, standing on y 0, 1.8 m tall. Hidden until the page shows it.
  kit.scaleFigure = () => {
    const THREE = kit.need('THREE');
    const knight = new THREE.Group(); knight.visible = false;
    const m = new THREE.MeshStandardMaterial({ color: 0x5a6070, roughness: 0.9 });
    const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.95, 4, 12), m); body.position.y = 0.2 + 0.475 + 0.05; body.scale.z = 0.7;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), m); head.position.y = 1.8 - 0.17;
    knight.add(body, head);
    return knight;
  };
  // Outline of a target box; setTargetBox() puts it on y 0, centred on x/z 0, like a game-ready model.
  kit.targetBox = (color = 0xe8a33d) => {
    const THREE = kit.need('THREE');
    const helper = new THREE.Box3Helper(new THREE.Box3(), color); helper.visible = false;
    return helper;
  };
  kit.setTargetBox = (helper, b) => {
    const THREE = kit.need('THREE');
    helper.box.set(new THREE.Vector3(-b.w / 2, 0, -b.d / 2), new THREE.Vector3(b.w / 2, b.h, b.d / 2));
  };
})(window.EmbersKit = window.EmbersKit || {});
