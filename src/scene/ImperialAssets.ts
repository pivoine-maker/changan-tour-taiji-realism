import * as THREE from 'three';
import { batchStaticArchitecture } from './StaticBatch';
import type { ImperialCourtyard, ImperialHall, ImperialPrecinct } from '../data/imperialCity';
import { createTangBuilding, type HistoricalMaterialLibrary } from './HistoricalAssets';

export function createImperialPrecinctSet(
  materials: HistoricalMaterialLibrary,
  precincts: ImperialPrecinct[]
): THREE.Group {
  const root = new THREE.Group();
  root.name = 'imperial-precinct-set';
  let variant = 900;

  for (const precinct of precincts) {
    const precinctGroup = new THREE.Group();
    precinctGroup.name = `imperial-precinct-${precinct.id}`;

    for (const courtyard of precinct.courtyards) {
      precinctGroup.add(createCourtyard(courtyard, materials));
    }

    for (const hall of [...precinct.halls, ...precinct.annexes]) {
      const hallGroup = createImperialHall(hall, materials, variant);
      batchStaticArchitecture(hallGroup);
      precinctGroup.add(hallGroup);
      variant += 1;
    }

    root.add(precinctGroup);
  }

  return root;
}

function createImperialHall(
  hall: ImperialHall,
  materials: HistoricalMaterialLibrary,
  variant: number
): THREE.Group {
  if (hall.role === 'gate') {
    return createPassableGate(hall, materials, variant);
  }

  const group = new THREE.Group();
  group.name = `imperial-hall-${hall.id}`;
  const podiumHeight = hall.role === 'audience' ? 1.8 : hall.role === 'residential' ? 1.25 : 0.82;
  const podium = createBox(
    'palace-podium',
    [hall.width + 5.2, podiumHeight, hall.depth + 5.5],
    materials.stone,
    [hall.x, podiumHeight / 2 + 0.08, hall.z]
  );
  group.add(podium);

  const building = createTangBuilding(hall, materials, variant);
  building.position.y = podiumHeight;
  group.add(building);
  addMonumentalStairs(group, hall, podiumHeight, materials);

  if (hall.role !== 'office') {
    addStoneBalustrade(group, hall, podiumHeight, materials);
  }

  if (hall.role === 'audience') {
    addRoofFinialCrest(group, hall, podiumHeight, materials);
  }

  return group;
}

function createPassableGate(
  hall: ImperialHall,
  materials: HistoricalMaterialLibrary,
  variant: number
): THREE.Group {
  const gate = new THREE.Group();
  gate.name = `imperial-hall-${hall.id}`;
  const openingWidth = Math.min(14, hall.width * 0.38);
  const wingWidth = (hall.width - openingWidth) / 2;

  for (const side of [-1, 1]) {
    const wing = createTangBuilding(
      {
        ...hall,
        x: hall.x + side * (openingWidth / 2 + wingWidth / 2),
        width: wingWidth,
        height: hall.height * 0.72,
        roof: 'tower'
      },
      materials,
      variant + side + 2
    );
    gate.add(wing);
  }

  const upperHall = createTangBuilding(
    {
      ...hall,
      width: openingWidth + 7,
      depth: hall.depth * 0.82,
      height: 3.4,
      roof: 'hip'
    },
    materials,
    variant + 10
  );
  upperHall.position.y = hall.height * 0.68;
  gate.add(upperHall);

  for (const x of [hall.x - openingWidth / 2, hall.x + openingWidth / 2]) {
    gate.add(createCylinder('gate-timber-column', 0.36, 0.46, hall.height * 0.72, materials.woodDark, [x, hall.height * 0.36, hall.z]));
  }
  gate.add(createBox('gate-crossbeam', [openingWidth + 1.6, 0.8, hall.depth * 0.72], materials.woodDark, [hall.x, hall.height * 0.68, hall.z]));
  gate.add(createBox('gate-threshold', [openingWidth, 0.16, hall.depth * 0.7], materials.stone, [hall.x, 0.08, hall.z]));

  return gate;
}

function createCourtyard(
  courtyard: ImperialCourtyard,
  materials: HistoricalMaterialLibrary
): THREE.Group {
  const group = new THREE.Group();
  group.name = courtyard.id === 'inner-garden-pool' ? 'inner-garden-pool' : 'imperial-courtyard';
  group.userData.courtyardId = courtyard.id;

  if (courtyard.surface === 'water') {
    const frame = createBox(
      'pool-stone-frame',
      [courtyard.width + 1.8, 0.3, courtyard.depth + 1.8],
      materials.stone,
      [courtyard.x, 0.22, courtyard.z]
    );
    const water = new THREE.Mesh(
      new THREE.BoxGeometry(courtyard.width, 0.16, courtyard.depth),
      new THREE.MeshStandardMaterial({ color: 0x315f65, roughness: 0.22, metalness: 0.08, transparent: true, opacity: 0.82 })
    );
    water.name = 'garden-water';
    water.position.set(courtyard.x, 0.43, courtyard.z);
    water.receiveShadow = true;
    group.add(frame, water);
    return group;
  }

  const material = courtyard.surface === 'stone'
    ? materials.stone
    : courtyard.surface === 'garden'
      ? materials.earth
      : materials.packedEarth;
  const surface = createBox(
    'courtyard-surface',
    [courtyard.width, 0.16, courtyard.depth],
    material,
    [courtyard.x, 0.13, courtyard.z]
  );
  group.add(surface);

  if (courtyard.surface === 'stone') {
    const slabCount = Math.max(3, Math.floor(courtyard.width / 10));
    for (let index = 1; index < slabCount; index += 1) {
      const x = courtyard.x - courtyard.width / 2 + courtyard.width * index / slabCount;
      group.add(createBox('paving-joint', [0.08, 0.03, courtyard.depth], materials.charcoal, [x, 0.225, courtyard.z]));
    }
  }

  if (courtyard.surface === 'garden') {
    group.add(createBox('garden-path', [courtyard.width, 0.12, 3.4], materials.stone, [courtyard.x, 0.24, courtyard.z]));
    group.add(createBox('garden-path', [3.4, 0.12, courtyard.depth], materials.stone, [courtyard.x, 0.24, courtyard.z]));
  }

  return group;
}

function addMonumentalStairs(
  group: THREE.Group,
  hall: ImperialHall,
  podiumHeight: number,
  materials: HistoricalMaterialLibrary
): void {
  const stairWidth = Math.min(hall.width * 0.52, 14);
  const stepCount = Math.max(3, Math.round(podiumHeight / 0.3));
  for (let index = 0; index < stepCount; index += 1) {
    const progress = index / Math.max(1, stepCount - 1);
    const height = 0.18 + progress * podiumHeight;
    const depth = 0.8 + (stepCount - index) * 0.38;
    group.add(createBox(
      'palace-step',
      [stairWidth + (1 - progress) * 2, height, depth],
      materials.stone,
      [hall.x, height / 2, hall.z + hall.depth / 2 + 2.4 + index * 0.16]
    ));
  }
}

function addStoneBalustrade(
  group: THREE.Group,
  hall: ImperialHall,
  podiumHeight: number,
  materials: HistoricalMaterialLibrary
): void {
  const postCount = Math.max(6, Math.floor(hall.width / 4));
  for (const z of [hall.z - hall.depth / 2 - 2.2, hall.z + hall.depth / 2 + 2.2]) {
    for (let index = 0; index < postCount; index += 1) {
      const x = THREE.MathUtils.lerp(hall.x - hall.width / 2 - 1.8, hall.x + hall.width / 2 + 1.8, index / (postCount - 1));
      group.add(createBox('stone-balustrade-post', [0.34, 1.1, 0.34], materials.stone, [x, podiumHeight + 0.55, z]));
    }
    group.add(createBox('stone-balustrade-rail', [hall.width + 3.6, 0.22, 0.2], materials.stone, [hall.x, podiumHeight + 0.78, z]));
  }
}

function addRoofFinialCrest(
  group: THREE.Group,
  hall: ImperialHall,
  podiumHeight: number,
  materials: HistoricalMaterialLibrary
): void {
  for (const x of [hall.x - hall.width * 0.28, hall.x, hall.x + hall.width * 0.28]) {
    const finial = new THREE.Mesh(new THREE.ConeGeometry(0.34, 1.2, 8), materials.bronze);
    finial.name = 'imperial-roof-finial';
    finial.position.set(x, podiumHeight + hall.height + 5.1, hall.z);
    finial.castShadow = true;
    group.add(finial);
  }
}

function createBox(
  name: string,
  size: [number, number, number],
  material: THREE.Material,
  position: [number, number, number]
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.name = name;
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function createCylinder(
  name: string,
  radiusTop: number,
  radiusBottom: number,
  height: number,
  material: THREE.Material,
  position: [number, number, number]
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, 12), material);
  mesh.name = name;
  mesh.position.set(...position);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}
