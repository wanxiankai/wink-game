import * as THREE from "three";

export interface FlyModelParts {
  root: THREE.Group;
  body: THREE.Group;
  leftWing: THREE.Group;
  rightWing: THREE.Group;
  legs: THREE.Group[];
  antennae: THREE.Group[];
  materials: THREE.Material[];
}

const shinyBody = new THREE.MeshStandardMaterial({
  color: "#1f271d",
  roughness: 0.38,
  metalness: 0.42
});

const darkBody = new THREE.MeshStandardMaterial({
  color: "#10110f",
  roughness: 0.5,
  metalness: 0.24
});

const abdomenBand = new THREE.MeshStandardMaterial({
  color: "#6f7a4d",
  roughness: 0.32,
  metalness: 0.55
});

const eyeMaterial = new THREE.MeshStandardMaterial({
  color: "#8f1727",
  roughness: 0.2,
  metalness: 0.15,
  emissive: "#27030a",
  emissiveIntensity: 0.28
});

const wingMaterial = new THREE.MeshPhysicalMaterial({
  color: "#d9f1ee",
  roughness: 0.16,
  metalness: 0,
  transparent: true,
  opacity: 0.34,
  side: THREE.DoubleSide,
  depthWrite: false,
  transmission: 0.18
});

const veinMaterial = new THREE.LineBasicMaterial({
  color: "#3d493e",
  transparent: true,
  opacity: 0.42
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

export function createRealisticFlyModel(): FlyModelParts {
  const root = new THREE.Group();
  root.name = "video-inspired-realistic-fly";

  const body = new THREE.Group();
  root.add(body);

  const abdomen = createEllipsoid(7.4, 11.8, 5.1, darkBody, 32);
  abdomen.name = "segmented-metallic-abdomen";
  abdomen.position.set(0, -6.8, 0);
  abdomen.rotation.x = -0.06;
  body.add(abdomen);

  for (let i = 0; i < 4; i++) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(5.4 - i * 0.18, 0.35, 8, 48, Math.PI * 1.38), abdomenBand);
    band.name = "olive-abdomen-cross-band";
    band.position.set(0, -11.2 + i * 2.6, 0.2);
    band.rotation.set(Math.PI / 2, 0, Math.PI * 0.81);
    band.scale.set(1.08, 0.52, 1);
    body.add(band);
  }

  const thorax = createEllipsoid(7.2, 7.8, 5.8, shinyBody, 32);
  thorax.name = "olive-black-armored-thorax";
  thorax.position.set(0, 3.6, 0.5);
  thorax.rotation.x = 0.18;
  body.add(thorax);

  const scutum = createEllipsoid(5.6, 4.6, 1.2, abdomenBand, 24);
  scutum.name = "metallic-green-dorsal-plate";
  scutum.position.set(0, 6.2, 5.0);
  scutum.rotation.x = 0.22;
  body.add(scutum);

  const head = createEllipsoid(5.4, 4.8, 4.6, darkBody, 32);
  head.name = "compact-head";
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

  body.add(createBristles());

  const proboscis = createSegment(new THREE.Vector3(0, 15, -0.9), new THREE.Vector3(0, 18.5, -1.8), 0.34, legMaterial);
  proboscis.name = "short-mouthpart";
  body.add(proboscis);

  const leftWing = createWing(-1);
  const rightWing = createWing(1);
  body.add(leftWing, rightWing);

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
    legs,
    antennae,
    materials: collectMaterials(root)
  };
}

function createWing(side: -1 | 1): THREE.Group {
  const group = new THREE.Group();
  group.name = side < 0 ? "left-translucent-veined-wing" : "right-translucent-veined-wing";
  group.position.set(side * 4.2, 4.5, 4.8);
  group.rotation.set(0.2, side * -0.18, side * 0.68);

  const shape = new THREE.Shape();
  shape.moveTo(0, 0);
  shape.bezierCurveTo(side * 8.2, 2.4, side * 18.8, 7.7, side * 23.8, 15.8);
  shape.bezierCurveTo(side * 16.8, 18.8, side * 5.8, 14.6, side * 0.8, 2.4);
  shape.bezierCurveTo(side * 0.4, 1.2, 0, 0.4, 0, 0);

  const wing = new THREE.Mesh(new THREE.ShapeGeometry(shape), wingMaterial.clone());
  wing.name = "transparent-membrane";
  group.add(wing);

  const veinPoints = [
    [new THREE.Vector3(0, 0, 0.04), new THREE.Vector3(side * 22.2, 14.9, 0.04)],
    [new THREE.Vector3(side * 2.4, 1.6, 0.05), new THREE.Vector3(side * 20.2, 15.8, 0.05)],
    [new THREE.Vector3(side * 4.2, 2.4, 0.06), new THREE.Vector3(side * 10.8, 14.6, 0.06)],
    [new THREE.Vector3(side * 7.2, 4.7, 0.07), new THREE.Vector3(side * 15.8, 16.0, 0.07)],
    [new THREE.Vector3(side * 5.5, 5.4, 0.08), new THREE.Vector3(side * 17.8, 9.2, 0.08)],
    [new THREE.Vector3(side * 9.0, 8.2, 0.09), new THREE.Vector3(side * 21.2, 12.6, 0.09)]
  ];

  for (const [start, end] of veinPoints) {
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints([start, end]), veinMaterial.clone());
    line.name = "wing-vein";
    group.add(line);
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
    materials.push(...objectMaterials);
  });
  return materials;
}
