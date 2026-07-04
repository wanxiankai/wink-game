import * as THREE from "three";

export interface FlyModelParts {
  root: THREE.Group;
  body: THREE.Group;
  leftWing: THREE.Group;
  rightWing: THREE.Group;
  foldedWings: THREE.Group[];
  legs: THREE.Group[];
  antennae: THREE.Group[];
  shadow: THREE.Mesh;
  materials: THREE.Material[];
}

const shinyBody = new THREE.MeshStandardMaterial({
  color: "#171816",
  roughness: 0.26,
  metalness: 0.72
});

const darkBody = new THREE.MeshStandardMaterial({
  color: "#070707",
  roughness: 0.34,
  metalness: 0.5
});

const abdomenBand = new THREE.MeshStandardMaterial({
  color: "#242424",
  roughness: 0.28,
  metalness: 0.82
});

const chromeMaterial = new THREE.MeshStandardMaterial({
  color: "#b7c1bd",
  roughness: 0.18,
  metalness: 0.92
});

const armorEdgeMaterial = new THREE.MeshStandardMaterial({
  color: "#050505",
  roughness: 0.2,
  metalness: 0.86
});

const eyeMaterial = new THREE.MeshStandardMaterial({
  color: "#5f211d",
  roughness: 0.2,
  metalness: 0.32,
  emissive: "#180604",
  emissiveIntensity: 0.22
});

const wingMaterial = new THREE.MeshPhysicalMaterial({
  color: "#202827",
  roughness: 0.16,
  metalness: 0,
  transparent: true,
  opacity: 0.26,
  side: THREE.DoubleSide,
  depthWrite: false,
  transmission: 0.18
});

const veinMaterial = new THREE.LineBasicMaterial({
  color: "#c8d3d0",
  transparent: true,
  opacity: 0.72
});

const legMaterial = new THREE.MeshStandardMaterial({
  color: "#11100f",
  roughness: 0.64,
  metalness: 0.08
});

const hairMaterial = new THREE.LineBasicMaterial({
  color: "#d7d4c9",
  transparent: true,
  opacity: 0.42
});

const shadowMaterial = new THREE.MeshBasicMaterial({
  color: "#000000",
  transparent: true,
  opacity: 0.1,
  depthWrite: false
});

export function createRealisticFlyModel(): FlyModelParts {
  const root = new THREE.Group();
  root.name = "meshy-inspired-dorsal-mecha-fly";

  const shadow = new THREE.Mesh(new THREE.CircleGeometry(18, 40), shadowMaterial.clone());
  shadow.name = "screen-contact-shadow";
  shadow.scale.set(0.66, 0.28, 1);
  shadow.position.set(0, -1, -13);
  root.add(shadow);

  const body = new THREE.Group();
  root.add(body);

  const abdomen = createEllipsoid(7.4, 11.8, 5.1, darkBody, 32);
  abdomen.name = "segmented-metallic-abdomen";
  abdomen.position.set(0, -6.8, 0);
  abdomen.rotation.x = -0.06;
  body.add(abdomen);

  for (let i = 0; i < 5; i++) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(5.6 - i * 0.24, 0.28, 8, 56, Math.PI * 1.46), abdomenBand.clone());
    band.name = "black-abdomen-armor-cross-band";
    band.position.set(0, -12.2 + i * 2.25, 0.65);
    band.rotation.set(Math.PI / 2, 0, Math.PI * 0.81);
    band.scale.set(1.12, 0.52, 1);
    body.add(band);
  }

  body.add(createDorsalSpine());

  const thorax = createEllipsoid(7.2, 7.8, 5.8, shinyBody, 32);
  thorax.name = "gloss-black-armored-thorax";
  thorax.position.set(0, 3.6, 0.5);
  thorax.rotation.x = 0.18;
  body.add(thorax);

  const scutum = createEllipsoid(5.6, 4.6, 1.2, chromeMaterial, 24);
  scutum.name = "silver-dorsal-machine-plate";
  scutum.position.set(0, 6.2, 5.0);
  scutum.rotation.x = 0.22;
  body.add(scutum);

  body.add(createThoraxPanels());

  const head = createEllipsoid(5.4, 4.8, 4.6, darkBody, 32);
  head.name = "compact-armored-head";
  head.position.set(0, 11.8, -0.15);
  body.add(head);

  const leftEye = createEllipsoid(2.9, 3.7, 2.6, eyeMaterial, 24);
  leftEye.name = "left-red-compound-eye";
  leftEye.position.set(-3.8, 12.2, 0.8);
  leftEye.rotation.z = -0.26;
  body.add(leftEye);

  const rightEye = leftEye.clone();
  rightEye.name = "right-red-compound-eye";
  rightEye.position.x = 3.8;
  rightEye.rotation.z = 0.26;
  body.add(rightEye);

  body.add(createEyeFacetLines(-1));
  body.add(createEyeFacetLines(1));

  body.add(createBristles());

  const proboscis = createSegment(new THREE.Vector3(0, 15, -0.9), new THREE.Vector3(0, 18.5, -1.8), 0.34, legMaterial);
  proboscis.name = "short-mouthpart";
  body.add(proboscis);

  const leftWing = createWing(-1);
  const rightWing = createWing(1);
  body.add(leftWing, rightWing);

  const foldedWings = [createFoldedWing(-1), createFoldedWing(1)];
  foldedWings.forEach((wing) => body.add(wing));

  const legs = createLegs();
  legs.forEach((leg) => body.add(leg));

  const antennae = createAntennae();
  antennae.forEach((antenna) => body.add(antenna));

  root.rotation.x = -0.74;

  return {
    root,
    body,
    leftWing,
    rightWing,
    foldedWings,
    legs,
    antennae,
    shadow,
    materials: collectMaterials(root)
  };
}

function createFoldedWing(side: -1 | 1): THREE.Group {
  const group = new THREE.Group();
  group.name = side < 0 ? "left-folded-back-wing" : "right-folded-back-wing";
  group.position.set(side * 0.32, 2.0, 6.2);
  group.rotation.set(0.02, side * 0.012, side * 0.01);

  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(side * 0.22, -3.4, side * 0.18, -9.6, side * 0.04, -15.2);
  shape.bezierCurveTo(side * -0.16, -9.8, side * -0.12, -3.2, 0, 0);

  const material = wingMaterial.clone();
  material.color = new THREE.Color("#151918");
  material.opacity = 0.045;
  const folded = new THREE.Mesh(new THREE.ShapeGeometry(shape), material);
  folded.name = "folded-translucent-wing-membrane";
  group.add(folded);

  const vein = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, -1, 0.03), new THREE.Vector3(side * 0.2, -16.2, 0.03)]),
    new THREE.LineBasicMaterial({ color: "#66706c", transparent: true, opacity: 0.08 })
  );
  vein.name = "folded-wing-center-vein";
  group.add(vein);

  return group;
}

function createDorsalSpine(): THREE.Group {
  const group = new THREE.Group();
  group.name = "central-silver-mechanical-spine";

  const rail = createSegment(new THREE.Vector3(0, -12.6, 5.3), new THREE.Vector3(0, 10.5, 5.9), 0.34, chromeMaterial);
  rail.name = "raised-central-rail";
  group.add(rail);

  for (let i = 0; i < 7; i++) {
    const plate = new THREE.Mesh(new THREE.BoxGeometry(3.3 - i * 0.12, 0.72, 0.38), chromeMaterial.clone());
    plate.name = "stacked-spine-armor-plate";
    plate.position.set(0, -9.6 + i * 3.2, 6.1);
    plate.rotation.z = i % 2 === 0 ? 0.06 : -0.06;
    group.add(plate);
  }

  return group;
}

function createThoraxPanels(): THREE.Group {
  const group = new THREE.Group();
  group.name = "black-mechanical-thorax-panel-lines";

  for (const side of [-1, 1] as const) {
    const sidePlate = new THREE.Mesh(new THREE.BoxGeometry(1.0, 6.4, 0.34), armorEdgeMaterial.clone());
    sidePlate.name = "side-armor-panel";
    sidePlate.position.set(side * 3.6, 4.0, 6.0);
    sidePlate.rotation.z = side * 0.28;
    group.add(sidePlate);

    for (let i = 0; i < 3; i++) {
      const rivet = new THREE.Mesh(new THREE.SphereGeometry(0.42, 12, 8), chromeMaterial.clone());
      rivet.name = "small-metal-rivet";
      rivet.position.set(side * (2.0 + i * 1.0), 6.9 - i * 2.2, 6.3);
      rivet.scale.z = 0.42;
      group.add(rivet);
    }
  }

  return group;
}

function createWing(side: -1 | 1): THREE.Group {
  const group = new THREE.Group();
  group.name = side < 0 ? "left-translucent-veined-wing" : "right-translucent-veined-wing";
  group.position.set(side * 4.2, 4.5, 4.8);
  group.rotation.set(0.2, side * -0.18, side * 0.68);

  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(side * 7.4, -1.0, side * 19.8, 3.8, side * 25.4, 13.6);
  shape.bezierCurveTo(side * 19.0, 18.4, side * 6.6, 14.8, side * 0.8, 2.4);
  shape.bezierCurveTo(side * 0.4, 1.2, 0, 0.4, 0, 0);

  const wing = new THREE.Mesh(new THREE.ShapeGeometry(shape), wingMaterial.clone());
  wing.name = "transparent-membrane";
  group.add(wing);

  const veinPoints = [
    [new THREE.Vector3(0, 0, 0.04), new THREE.Vector3(side * 22.2, 14.9, 0.04)],
    [new THREE.Vector3(side * 1.5, 0.8, 0.05), new THREE.Vector3(side * 20.8, 2.7, 0.05)],
    [new THREE.Vector3(side * 2.4, 1.6, 0.06), new THREE.Vector3(side * 20.2, 15.8, 0.06)],
    [new THREE.Vector3(side * 4.2, 2.4, 0.07), new THREE.Vector3(side * 10.8, 14.6, 0.07)],
    [new THREE.Vector3(side * 7.2, 4.7, 0.08), new THREE.Vector3(side * 15.8, 16.0, 0.08)],
    [new THREE.Vector3(side * 5.5, 5.4, 0.09), new THREE.Vector3(side * 17.8, 9.2, 0.09)],
    [new THREE.Vector3(side * 9.0, 8.2, 0.1), new THREE.Vector3(side * 21.2, 12.6, 0.1)],
    [new THREE.Vector3(side * 12.5, 4.2, 0.11), new THREE.Vector3(side * 23.5, 11.8, 0.11)]
  ];

  for (const [start, end] of veinPoints) {
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([start, end]), veinMaterial.clone());
    line.name = "wing-vein";
    group.add(line);
  }

  return group;
}

function createEyeFacetLines(side: -1 | 1): THREE.Group {
  const group = new THREE.Group();
  group.name = side < 0 ? "left-compound-eye-facet-lines" : "right-compound-eye-facet-lines";
  const material = new THREE.LineBasicMaterial({ color: "#c48a7a", transparent: true, opacity: 0.32 });
  for (let i = -2; i <= 2; i++) {
    const points = [
      new THREE.Vector3(side * 3.05, 12.2 + i * 0.7, 3.45),
      new THREE.Vector3(side * 5.25, 12.5 + i * 0.46, 2.85)
    ];
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material.clone()));
  }
  return group;
}

function createLegs(): THREE.Group[] {
  const anchors = [
    { y: 8.2, z: 1.0, reach: 14, forward: 9 },
    { y: 3.8, z: 0.2, reach: 13, forward: 0 },
    { y: -2.6, z: -0.2, reach: 14, forward: -9 }
  ];

  const legs: THREE.Group[] = [];
  for (const side of [-1, 1] as const) {
    for (const [index, anchor] of anchors.entries()) {
      const leg = new THREE.Group();
      leg.name = `${side < 0 ? "left" : "right"}-jointed-leg-${index + 1}`;
      leg.position.set(side * 4.8, anchor.y, anchor.z);

      const hip = new THREE.Vector3(0, 0, 0);
      const knee = new THREE.Vector3(side * 6.2, anchor.forward * 0.28, -3.3);
      const foot = new THREE.Vector3(side * anchor.reach, anchor.forward, -8.0);
      leg.add(createSegment(hip, knee, 0.33, legMaterial));
      leg.add(createSegment(knee, foot, 0.23, legMaterial));
      leg.add(createSegment(foot, foot.clone().add(new THREE.Vector3(side * 3.1, 1.7, -0.2)), 0.12, legMaterial));
      legs.push(leg);
    }
  }
  return legs;
}

function createAntennae(): THREE.Group[] {
  return [-1, 1].map((side) => {
    const antenna = new THREE.Group();
    antenna.name = side < 0 ? "left-antenna" : "right-antenna";
    const base = new THREE.Vector3(side * 2.2, 14.8, 1.0);
    const tip = new THREE.Vector3(side * 5.5, 18.0, 0.25);
    antenna.add(createSegment(base, tip, 0.1, legMaterial));
    antenna.add(createEllipsoid(0.5, 0.8, 0.38, legMaterial, 10).translateX(tip.x).translateY(tip.y).translateZ(tip.z));
    return antenna;
  });
}

function createBristles(): THREE.Group {
  const group = new THREE.Group();
  group.name = "fine-body-bristles";
  const seeds = [
    [-4.2, 8.2, 4.9, -6.0, 9.2, 7.0],
    [4.2, 8.2, 4.9, 6.0, 9.2, 7.0],
    [-3.8, 12.4, 3.9, -5.8, 13.8, 5.0],
    [3.8, 12.4, 3.9, 5.8, 13.8, 5.0],
    [-2.4, -1.2, 5.4, -4.4, -1.8, 7.1],
    [2.4, -1.2, 5.4, 4.4, -1.8, 7.1],
    [-2.8, -8.4, 4.6, -4.4, -9.8, 6.0],
    [2.8, -8.4, 4.6, 4.4, -9.8, 6.0]
  ];
  for (const seed of seeds) {
    const points = [new THREE.Vector3(seed[0], seed[1], seed[2]), new THREE.Vector3(seed[3], seed[4], seed[5])];
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), hairMaterial.clone()));
  }
  return group;
}

function createEllipsoid(
  radiusX: number,
  radiusY: number,
  radiusZ: number,
  material: THREE.Material,
  segments: number
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, segments, Math.max(12, Math.floor(segments * 0.6))), material.clone());
  mesh.scale.set(radiusX, radiusY, radiusZ);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function createSegment(start: THREE.Vector3, end: THREE.Vector3, radius: number, material: THREE.Material): THREE.Mesh {
  const direction = end.clone().sub(start);
  const length = direction.length();
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 0.76, length, 8), material.clone());
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  mesh.castShadow = true;
  return mesh;
}

function collectMaterials(root: THREE.Object3D): THREE.Material[] {
  const materials: THREE.Material[] = [];
  root.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (!mesh.material) return;
    const objectMaterials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of objectMaterials) {
      material.userData.baseOpacity = material.opacity;
    }
    materials.push(...objectMaterials);
  });
  return materials;
}
