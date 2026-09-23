import * as THREE from 'three';
import type { BuildingBlock, DetailAnchor } from '../data/world';

export interface HistoricalMaterialLibrary {
  earth: THREE.MeshStandardMaterial;
  packedEarth: THREE.MeshStandardMaterial;
  wall: THREE.MeshStandardMaterial;
  wallDark: THREE.MeshStandardMaterial;
  plaster: THREE.MeshStandardMaterial;
  wood: THREE.MeshStandardMaterial;
  woodDark: THREE.MeshStandardMaterial;
  roofTile: THREE.MeshStandardMaterial;
  roofRidge: THREE.MeshStandardMaterial;
  stone: THREE.MeshStandardMaterial;
  bronze: THREE.MeshStandardMaterial;
  pottery: THREE.MeshStandardMaterial;
  fabricRed: THREE.MeshStandardMaterial;
  fabricOchre: THREE.MeshStandardMaterial;
  fabricIndigo: THREE.MeshStandardMaterial;
  foliage: THREE.MeshStandardMaterial;
  foliageLight: THREE.MeshStandardMaterial;
  skin: THREE.MeshStandardMaterial;
  charcoal: THREE.MeshStandardMaterial;
}

interface TextureRecipe {
  color: [number, number, number];
  noise: number;
  pattern: 'earth' | 'wood' | 'tile' | 'stone' | 'cloth';
  seed: number;
}

const BUILDING_TONES: Record<BuildingBlock['tone'], THREE.ColorRepresentation> = {
  clay: 0xa84f31,
  umber: 0x74402e,
  sand: 0xb98a55,
  dark: 0x58352a
};

export function createHistoricalMaterialLibrary(): HistoricalMaterialLibrary {
  const earthMaps = createPbrTextureSet({ color: [156, 111, 66], noise: 28, pattern: 'earth', seed: 17 });
  const packedEarthMaps = createPbrTextureSet({ color: [105, 76, 50], noise: 22, pattern: 'earth', seed: 31 });
  const wallMaps = createPbrTextureSet({ color: [170, 99, 58], noise: 24, pattern: 'earth', seed: 47 });
  const plasterMaps = createPbrTextureSet({ color: [202, 171, 121], noise: 18, pattern: 'earth', seed: 53 });
  const woodMaps = createPbrTextureSet({ color: [88, 49, 31], noise: 18, pattern: 'wood', seed: 67 });
  const darkWoodMaps = createPbrTextureSet({ color: [48, 31, 25], noise: 14, pattern: 'wood', seed: 71 });
  const roofMaps = createPbrTextureSet({ color: [64, 56, 47], noise: 18, pattern: 'tile', seed: 89 });
  const stoneMaps = createPbrTextureSet({ color: [112, 101, 83], noise: 20, pattern: 'stone', seed: 97 });
  const potteryMaps = createPbrTextureSet({ color: [128, 66, 42], noise: 20, pattern: 'earth', seed: 113 });
  const redClothMaps = createPbrTextureSet({ color: [126, 44, 35], noise: 12, pattern: 'cloth', seed: 127 });
  const ochreClothMaps = createPbrTextureSet({ color: [181, 119, 47], noise: 12, pattern: 'cloth', seed: 131 });
  const indigoClothMaps = createPbrTextureSet({ color: [50, 69, 74], noise: 12, pattern: 'cloth', seed: 137 });

  return {
    earth: createPbrMaterial(earthMaps, 0.96, 0.13),
    packedEarth: createPbrMaterial(packedEarthMaps, 0.98, 0.1),
    wall: createPbrMaterial(wallMaps, 0.9, 0.12),
    wallDark: createPbrMaterial(wallMaps, 0.94, 0.16, 0x744029),
    plaster: createPbrMaterial(plasterMaps, 0.91, 0.09),
    wood: createPbrMaterial(woodMaps, 0.78, 0.1),
    woodDark: createPbrMaterial(darkWoodMaps, 0.82, 0.08),
    roofTile: createPbrMaterial(roofMaps, 0.72, 0.16),
    roofRidge: createPbrMaterial(roofMaps, 0.68, 0.12, 0x453a31),
    stone: createPbrMaterial(stoneMaps, 0.94, 0.08),
    bronze: new THREE.MeshStandardMaterial({ color: 0x7b5d34, roughness: 0.52, metalness: 0.5 }),
    pottery: createPbrMaterial(potteryMaps, 0.7, 0.1),
    fabricRed: createPbrMaterial(redClothMaps, 0.92, 0.06),
    fabricOchre: createPbrMaterial(ochreClothMaps, 0.92, 0.06),
    fabricIndigo: createPbrMaterial(indigoClothMaps, 0.92, 0.06),
    foliage: new THREE.MeshStandardMaterial({ color: 0x435a36, roughness: 0.92 }),
    foliageLight: new THREE.MeshStandardMaterial({ color: 0x657447, roughness: 0.92 }),
    skin: new THREE.MeshStandardMaterial({ color: 0xb9825e, roughness: 0.85 }),
    charcoal: new THREE.MeshStandardMaterial({ color: 0x2f2621, roughness: 0.9 })
  };
}

export function createTangBuilding(
  block: BuildingBlock,
  materials: HistoricalMaterialLibrary,
  variant = 0
): THREE.Group {
  const building = new THREE.Group();
  building.name = 'tang-building';
  building.position.set(block.x, 0, block.z);
  building.rotation.y = block.rotation ?? 0;

  const bodyMaterial = createTintedMaterial(materials.wall, BUILDING_TONES[block.tone]);
  addFoundation(building, block, materials);
  addWallBody(building, block, bodyMaterial, materials, variant);
  addTimberFrame(building, block, materials, variant);
  addFacadeOpenings(building, block, materials, variant);
  addBracketSets(building, block, materials);
  addRoof(building, block, materials, variant);
  addStepsAndCourtyardEdge(building, block, materials, variant);

  return building;
}

export function createMarketDetailSet(
  materials: HistoricalMaterialLibrary,
  anchors?: DetailAnchor[]
): THREE.Group {
  if (anchors) {
    return createAnchoredDetailSet(materials, anchors);
  }

  const details = new THREE.Group();
  details.name = 'market-detail-set';

  const stallPlans: Array<[number, number, number, THREE.Material]> = [
    [-27, -3, 0, materials.fabricRed],
    [-25, 3, Math.PI, materials.fabricOchre],
    [-11, 2.7, Math.PI, materials.fabricIndigo],
    [9, 2.8, Math.PI, materials.fabricRed],
    [27, 2.8, Math.PI, materials.fabricOchre],
    [24.5, -2.8, 0, materials.fabricIndigo],
    [8.5, -2.8, 0, materials.fabricOchre]
  ];

  stallPlans.forEach(([x, z, rotation, fabric], index) => {
    const stall = createMarketStall(materials, fabric, index);
    stall.name = 'market-stall';
    stall.position.set(x, 0.18, z);
    stall.rotation.y = rotation;
    details.add(stall);
  });

  const cargoPlans: Array<[number, number, number]> = [
    [-32, -6.3, 0],
    [-20.5, 7.3, 1],
    [-4.5, -7.2, 2],
    [4.5, 7.1, 3],
    [20.5, -7.2, 4],
    [32, 7.1, 5],
    [23, 15.1, 6],
    [-8, 15.1, 7]
  ];

  cargoPlans.forEach(([x, z, variant]) => {
    const cargo = createCargoCluster(materials, variant);
    cargo.name = 'cargo-cluster';
    cargo.position.set(x, 0.18, z);
    details.add(cargo);
  });

  const personPlans: Array<[number, number, number, number]> = [
    [-33, -2, 0.3, 0],
    [-30, 3, -0.7, 1],
    [-23, -1, 1.4, 2],
    [-18, 4, -1.1, 3],
    [-13, -3, 0.7, 4],
    [-7, 3, -0.4, 5],
    [-2, -3, 1.2, 6],
    [5, 3, -1.7, 7],
    [11, -3, 0.5, 8],
    [17, 3, -0.2, 9],
    [22, -3, 1.1, 10],
    [29, 3, -1.3, 11],
    [-18, -14, 0.4, 12],
    [-3, 15, -0.6, 13],
    [17, 15, 1.5, 14],
    [32, -14, -1.5, 15],
    [32, 15, 0.2, 16],
    [-31, 15, -0.9, 17]
  ];

  personPlans.forEach(([x, z, rotation, variant]) => {
    const person = createMarketPerson(materials, variant);
    person.name = 'market-person';
    person.position.set(x, 0.2, z);
    person.rotation.y = rotation;
    details.add(person);
  });

  const treePlans: Array<[number, number, number]> = [
    [-34, -25, 0],
    [-17, -25, 1],
    [2, -25, 2],
    [34, -25, 3],
    [-33, 25, 4],
    [17, 25, 5],
    [35, 25, 6]
  ];

  treePlans.forEach(([x, z, variant]) => {
    const tree = createCourtyardTree(materials, variant);
    tree.name = 'courtyard-tree';
    tree.position.set(x, 0.2, z);
    details.add(tree);
  });

  const cart = createMerchantCart(materials);
  cart.name = 'merchant-cart';
  cart.position.set(-33, 0.55, 8.2);
  cart.rotation.y = Math.PI * 0.08;
  details.add(cart);

  const camel = createPackCamel(materials);
  camel.name = 'pack-camel';
  camel.position.set(-34, 0.2, 13.5);
  camel.rotation.y = -0.25;
  details.add(camel);

  const banners: Array<[number, number, number, THREE.Material]> = [
    [-36, -5.5, 0, materials.fabricRed],
    [-20, -5.5, 0, materials.fabricOchre],
    [0, 5.5, Math.PI, materials.fabricIndigo],
    [20, -5.5, 0, materials.fabricRed],
    [35, 5.5, Math.PI, materials.fabricOchre]
  ];
  banners.forEach(([x, z, rotation, material]) => {
    const banner = createStreetBanner(materials, material);
    banner.position.set(x, 0.18, z);
    banner.rotation.y = rotation;
    details.add(banner);
  });

  return details;
}

function createAnchoredDetailSet(
  materials: HistoricalMaterialLibrary,
  anchors: DetailAnchor[]
): THREE.Group {
  const details = new THREE.Group();
  details.name = 'city-detail-set';
  const fabrics = [materials.fabricRed, materials.fabricOchre, materials.fabricIndigo];

  for (const anchor of anchors) {
    let asset: THREE.Group;
    switch (anchor.kind) {
      case 'stall':
        asset = createMarketStall(materials, fabrics[anchor.variant % fabrics.length], anchor.variant);
        asset.name = 'market-stall';
        break;
      case 'cargo':
        asset = createCargoCluster(materials, anchor.variant);
        asset.name = 'cargo-cluster';
        break;
      case 'person':
        asset = createMarketPerson(materials, anchor.variant);
        asset.name = 'market-person';
        break;
      case 'tree':
        asset = createCourtyardTree(materials, anchor.variant);
        asset.name = 'courtyard-tree';
        break;
      case 'cart':
        asset = createMerchantCart(materials);
        asset.name = 'merchant-cart';
        break;
      case 'camel':
        asset = createPackCamel(materials);
        asset.name = 'pack-camel';
        break;
      case 'banner':
        asset = createStreetBanner(materials, fabrics[anchor.variant % fabrics.length]);
        asset.name = 'street-banner';
        break;
    }

    asset.position.set(anchor.x, 0.18, anchor.z);
    asset.rotation.y = anchor.rotation ?? 0;
    details.add(asset);
  }

  return details;
}

export function createMarketGate(materials: HistoricalMaterialLibrary): THREE.Group {
  const gate = new THREE.Group();
  gate.name = 'market-gate';

  const leftPier = createGatePier(materials);
  leftPier.position.z = -4.15;
  gate.add(leftPier);

  const rightPier = createGatePier(materials);
  rightPier.position.z = 4.15;
  gate.add(rightPier);

  const beam = createBox('gate-crossbeam', [2.2, 0.8, 10.8], materials.woodDark, [0, 4.7, 0]);
  gate.add(beam);

  const roof = createRoofLayer(4.8, 11.7, 5.15, materials, 0.8);
  roof.rotation.y = Math.PI / 2;
  gate.add(roof);

  const plaque = createBox('gate-plaque', [0.38, 1.2, 3.3], materials.fabricIndigo, [-1.23, 4.35, 0]);
  gate.add(plaque);

  return gate;
}

function addFoundation(group: THREE.Group, block: BuildingBlock, materials: HistoricalMaterialLibrary): void {
  group.add(createBox('stone-plinth', [block.width + 0.9, 0.42, block.depth + 0.9], materials.stone, [0, 0.21, 0]));
  group.add(createBox('rammed-earth-platform', [block.width + 0.45, 0.32, block.depth + 0.45], materials.earth, [0, 0.58, 0]));
}

function addWallBody(
  group: THREE.Group,
  block: BuildingBlock,
  bodyMaterial: THREE.MeshStandardMaterial,
  materials: HistoricalMaterialLibrary,
  variant: number
): void {
  group.add(createBox('painted-wall-body', [block.width, block.height, block.depth], bodyMaterial, [0, block.height / 2 + 0.72, 0]));

  const panelWidth = Math.max(1.15, block.width / 4.4);
  const panels = Math.max(3, Math.floor(block.width / panelWidth));
  for (let panelIndex = 0; panelIndex < panels; panelIndex += 1) {
    const x = -block.width / 2 + panelWidth * (panelIndex + 0.5);
    const panelMaterial = (panelIndex + variant) % 3 === 0 ? materials.plaster : bodyMaterial;
    const frontPanel = createBox('wall-inset-panel', [panelWidth * 0.72, block.height * 0.56, 0.08], panelMaterial, [x, block.height * 0.54 + 0.65, block.depth / 2 + 0.045]);
    group.add(frontPanel);
  }
}

function addTimberFrame(
  group: THREE.Group,
  block: BuildingBlock,
  materials: HistoricalMaterialLibrary,
  variant: number
): void {
  const columnCount = Math.max(4, Math.round(block.width / 2.25));
  for (let columnIndex = 0; columnIndex < columnCount; columnIndex += 1) {
    const t = columnCount === 1 ? 0.5 : columnIndex / (columnCount - 1);
    const x = THREE.MathUtils.lerp(-block.width / 2 + 0.18, block.width / 2 - 0.18, t);
    const frontColumn = createCylinder('timber-column', 0.16, 0.2, block.height + 0.45, materials.woodDark, [x, block.height / 2 + 0.77, block.depth / 2 + 0.17]);
    group.add(frontColumn);

    if ((columnIndex + variant) % 2 === 0) {
      const rearColumn = frontColumn.clone();
      rearColumn.name = 'timber-column';
      rearColumn.position.z = -block.depth / 2 - 0.17;
      group.add(rearColumn);
    }
  }

  group.add(createBox('timber-beam', [block.width + 0.6, 0.27, 0.28], materials.woodDark, [0, block.height + 0.78, block.depth / 2 + 0.18]));
  group.add(createBox('timber-beam', [block.width + 0.6, 0.27, 0.28], materials.woodDark, [0, block.height + 0.78, -block.depth / 2 - 0.18]));
  group.add(createBox('timber-beam', [block.width + 0.28, 0.18, 0.22], materials.wood, [0, 1.55, block.depth / 2 + 0.2]));
}

function addFacadeOpenings(
  group: THREE.Group,
  block: BuildingBlock,
  materials: HistoricalMaterialLibrary,
  variant: number
): void {
  const door = new THREE.Group();
  door.name = 'painted-door';
  door.position.set(0, 0.72, block.depth / 2 + 0.16);
  door.add(createBox('door-leaf', [1.35, 2.25, 0.16], materials.woodDark, [0, 1.13, 0]));
  door.add(createCylinder('door-stud', 0.06, 0.06, 0.11, materials.bronze, [-0.34, 1.15, 0.13], [Math.PI / 2, 0, 0]));
  door.add(createCylinder('door-stud', 0.06, 0.06, 0.11, materials.bronze, [0.34, 1.15, 0.13], [Math.PI / 2, 0, 0]));
  group.add(door);

  const windowOffset = Math.min(block.width * 0.27, 2.9);
  group.add(createLatticeWindow(materials, [-windowOffset, block.height * 0.56 + 0.45, block.depth / 2 + 0.18], variant));
  group.add(createLatticeWindow(materials, [windowOffset, block.height * 0.56 + 0.45, block.depth / 2 + 0.18], variant + 1));
}

function createLatticeWindow(
  materials: HistoricalMaterialLibrary,
  position: [number, number, number],
  variant: number
): THREE.Group {
  const window = new THREE.Group();
  window.name = 'lattice-window';
  window.position.set(...position);

  window.add(createBox('window-shadow', [1.18, 1.1, 0.08], materials.charcoal, [0, 0, 0]));
  const frameMaterial = variant % 2 === 0 ? materials.wood : materials.woodDark;
  window.add(createBox('lattice-frame', [1.36, 0.12, 0.12], frameMaterial, [0, 0.57, 0.08]));
  window.add(createBox('lattice-frame', [1.36, 0.12, 0.12], frameMaterial, [0, -0.57, 0.08]));
  window.add(createBox('lattice-frame', [0.12, 1.25, 0.12], frameMaterial, [-0.68, 0, 0.08]));
  window.add(createBox('lattice-frame', [0.12, 1.25, 0.12], frameMaterial, [0.68, 0, 0.08]));
  for (const x of [-0.42, -0.14, 0.14, 0.42]) {
    window.add(createBox('lattice-bar', [0.055, 1.08, 0.08], frameMaterial, [x, 0, 0.1]));
  }
  for (const y of [-0.28, 0.28]) {
    window.add(createBox('lattice-bar', [1.14, 0.055, 0.08], frameMaterial, [0, y, 0.1]));
  }

  return window;
}

function addBracketSets(group: THREE.Group, block: BuildingBlock, materials: HistoricalMaterialLibrary): void {
  const bracketCount = Math.max(4, Math.floor(block.width / 2.2));
  for (let bracketIndex = 0; bracketIndex < bracketCount; bracketIndex += 1) {
    const x = THREE.MathUtils.lerp(-block.width / 2 + 0.45, block.width / 2 - 0.45, bracketIndex / Math.max(1, bracketCount - 1));
    for (const z of [block.depth / 2 + 0.38, -block.depth / 2 - 0.38]) {
      const bracket = new THREE.Group();
      bracket.name = 'bracket-set';
      bracket.position.set(x, block.height + 0.96, z);
      bracket.add(createBox('bracket-arm', [0.72, 0.18, 0.2], materials.woodDark, [0, 0, 0]));
      bracket.add(createBox('bracket-block', [0.25, 0.42, 0.25], materials.wood, [0, -0.17, 0]));
      bracket.add(createBox('bracket-cap', [0.95, 0.13, 0.25], materials.woodDark, [0, 0.18, 0]));
      group.add(bracket);
    }
  }
}

function addRoof(
  group: THREE.Group,
  block: BuildingBlock,
  materials: HistoricalMaterialLibrary,
  variant: number
): void {
  if (block.roof === 'tower') {
    const upperLevelHeight = Math.max(2.4, block.height * 0.58);
    group.add(createBox('tower-upper-storey', [block.width * 0.56, upperLevelHeight, block.depth * 0.62], materials.wallDark, [0, block.height + upperLevelHeight / 2 + 1.5, 0]));
    const upperColumns = 4;
    for (let columnIndex = 0; columnIndex < upperColumns; columnIndex += 1) {
      const x = columnIndex < 2 ? -block.width * 0.26 : block.width * 0.26;
      const z = columnIndex % 2 === 0 ? -block.depth * 0.29 : block.depth * 0.29;
      group.add(createCylinder('timber-column', 0.14, 0.17, upperLevelHeight + 0.5, materials.woodDark, [x, block.height + upperLevelHeight / 2 + 1.5, z]));
    }
    group.add(createRoofLayer(block.width * 0.78, block.depth * 0.82, block.height + upperLevelHeight + 1.6, materials, 0.86));
    group.add(createRoofLayer(block.width + 1.8, block.depth + 1.5, block.height + 1.12, materials, 0.72));
    return;
  }

  if (block.roof === 'flat') {
    const canopy = createRoofLayer(block.width + 1.35, block.depth + 1.1, block.height + 1.04, materials, 0.38);
    canopy.scale.y = 0.72;
    group.add(canopy);
    addRoofFinials(group, block, materials, variant);
    return;
  }

  group.add(createRoofLayer(block.width + 1.4, block.depth + 1.2, block.height + 1.05, materials, 0.66));
  addRoofFinials(group, block, materials, variant);
}

function createRoofLayer(
  width: number,
  depth: number,
  baseY: number,
  materials: HistoricalMaterialLibrary,
  riseScale: number
): THREE.Group {
  const roof = new THREE.Group();
  roof.name = 'tiled-roof';
  const halfDepth = depth / 2 + 0.55;
  const rise = Math.max(1, depth * 0.32 * riseScale);
  const slopeLength = Math.sqrt(halfDepth * halfDepth + rise * rise);
  const slopeAngle = Math.atan2(rise, halfDepth);

  const frontSlope = createBox('roof-slope', [width + 1.5, 0.24, slopeLength], materials.roofTile, [0, baseY + rise / 2, halfDepth / 2], [slopeAngle, 0, 0]);
  const backSlope = createBox('roof-slope', [width + 1.5, 0.24, slopeLength], materials.roofTile, [0, baseY + rise / 2, -halfDepth / 2], [-slopeAngle, 0, 0]);
  roof.add(frontSlope, backSlope);

  const tileRows = Math.max(7, Math.floor(width / 0.62));
  for (let rowIndex = 0; rowIndex < tileRows; rowIndex += 1) {
    const x = THREE.MathUtils.lerp(-width / 2 - 0.42, width / 2 + 0.42, rowIndex / Math.max(1, tileRows - 1));
    const frontTile = createCylinderBetween(
      'roof-tile-row',
      new THREE.Vector3(x, baseY + rise + 0.18, 0.02),
      new THREE.Vector3(x, baseY + 0.08, halfDepth + 0.22),
      0.11,
      materials.roofRidge
    );
    const backTile = createCylinderBetween(
      'roof-tile-row',
      new THREE.Vector3(x, baseY + rise + 0.18, -0.02),
      new THREE.Vector3(x, baseY + 0.08, -halfDepth - 0.22),
      0.11,
      materials.roofRidge
    );
    roof.add(frontTile, backTile);
  }

  roof.add(createCylinderBetween('roof-ridge', new THREE.Vector3(-width / 2 - 0.8, baseY + rise + 0.24, 0), new THREE.Vector3(width / 2 + 0.8, baseY + rise + 0.24, 0), 0.2, materials.roofRidge));
  roof.add(createCylinderBetween('eave-ridge', new THREE.Vector3(-width / 2 - 0.65, baseY + 0.04, halfDepth + 0.26), new THREE.Vector3(width / 2 + 0.65, baseY + 0.04, halfDepth + 0.26), 0.14, materials.roofRidge));
  roof.add(createCylinderBetween('eave-ridge', new THREE.Vector3(-width / 2 - 0.65, baseY + 0.04, -halfDepth - 0.26), new THREE.Vector3(width / 2 + 0.65, baseY + 0.04, -halfDepth - 0.26), 0.14, materials.roofRidge));

  return roof;
}

function addRoofFinials(
  group: THREE.Group,
  block: BuildingBlock,
  materials: HistoricalMaterialLibrary,
  variant: number
): void {
  if (variant % 3 !== 0) {
    return;
  }

  const y = block.height + 2.2;
  for (const x of [-block.width / 2 - 0.45, block.width / 2 + 0.45]) {
    const finial = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.7, 8), materials.roofRidge);
    finial.name = 'roof-finial';
    finial.position.set(x, y, 0);
    finial.castShadow = true;
    group.add(finial);
  }
}

function addStepsAndCourtyardEdge(
  group: THREE.Group,
  block: BuildingBlock,
  materials: HistoricalMaterialLibrary,
  variant: number
): void {
  const stepWidth = Math.min(3.2, block.width * 0.42);
  group.add(createBox('entry-step', [stepWidth, 0.22, 1.05], materials.stone, [0, 0.44, block.depth / 2 + 0.65]));
  group.add(createBox('entry-step', [stepWidth * 0.78, 0.18, 0.65], materials.stone, [0, 0.18, block.depth / 2 + 1.02]));

  if (variant % 2 === 0) {
    const jar = createAmphora(materials, 0.72);
    jar.position.set(block.width / 2 - 0.65, 0.85, block.depth / 2 + 0.62);
    group.add(jar);
  }
}

function createMarketStall(
  materials: HistoricalMaterialLibrary,
  fabricMaterial: THREE.Material,
  variant: number
): THREE.Group {
  const stall = new THREE.Group();
  const width = 4.2;
  const depth = 2.6;
  for (const x of [-width / 2, width / 2]) {
    for (const z of [-depth / 2, depth / 2]) {
      stall.add(createCylinder('stall-post', 0.09, 0.12, 2.8, materials.woodDark, [x, 1.4, z]));
    }
  }

  const canopy = createBox('woven-canopy', [width + 0.45, 0.11, depth + 0.55], fabricMaterial, [0, 2.85, 0], [0.06, 0, variant % 2 === 0 ? -0.025 : 0.025]);
  stall.add(canopy);
  stall.add(createBox('vendor-table', [width * 0.82, 0.22, 0.9], materials.wood, [0, 1.05, 0.55]));
  stall.add(createBox('vendor-table-leg', [0.16, 1, 0.16], materials.woodDark, [-1.25, 0.52, 0.55]));
  stall.add(createBox('vendor-table-leg', [0.16, 1, 0.16], materials.woodDark, [1.25, 0.52, 0.55]));

  for (let basketIndex = 0; basketIndex < 4; basketIndex += 1) {
    const basket = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.38, 0.35, 12), materials.earth);
    basket.name = 'market-basket';
    basket.position.set(-1.2 + basketIndex * 0.8, 1.34, 0.53);
    basket.castShadow = true;
    stall.add(basket);
  }

  return stall;
}

function createCargoCluster(materials: HistoricalMaterialLibrary, variant: number): THREE.Group {
  const cluster = new THREE.Group();
  const crate = createBox('cargo-crate', [1.1, 0.9, 0.9], materials.wood, [0, 0.45, 0]);
  cluster.add(crate);

  const sackGeometry = new THREE.SphereGeometry(0.48, 12, 8);
  for (let sackIndex = 0; sackIndex < 3; sackIndex += 1) {
    const sack = new THREE.Mesh(sackGeometry, sackIndex % 2 === 0 ? materials.fabricOchre : materials.fabricIndigo);
    sack.name = 'cargo-sack';
    sack.scale.set(0.85, 1.25, 0.75);
    sack.position.set(-0.7 + sackIndex * 0.62, 0.55 + (sackIndex === 1 ? 0.28 : 0), 0.72);
    sack.rotation.z = (sackIndex - 1) * 0.18;
    sack.castShadow = true;
    cluster.add(sack);
  }

  const jar = createAmphora(materials, 0.72 + (variant % 3) * 0.08);
  jar.position.set(0.9, 0.68, -0.25);
  cluster.add(jar);
  return cluster;
}

function createAmphora(materials: HistoricalMaterialLibrary, scale: number): THREE.Group {
  const amphora = new THREE.Group();
  amphora.name = 'ceramic-amphora';
  const profile = [
    new THREE.Vector2(0.05, 0),
    new THREE.Vector2(0.32, 0.12),
    new THREE.Vector2(0.48, 0.52),
    new THREE.Vector2(0.4, 0.9),
    new THREE.Vector2(0.2, 1.08),
    new THREE.Vector2(0.18, 1.34),
    new THREE.Vector2(0.28, 1.39)
  ];
  const vessel = new THREE.Mesh(new THREE.LatheGeometry(profile, 20), materials.pottery);
  vessel.scale.setScalar(scale);
  vessel.castShadow = true;
  amphora.add(vessel);
  return amphora;
}

function createMarketPerson(materials: HistoricalMaterialLibrary, variant: number): THREE.Group {
  const person = new THREE.Group();
  const robeMaterials = [materials.fabricRed, materials.fabricOchre, materials.fabricIndigo, materials.plaster];
  const robeMaterial = robeMaterials[variant % robeMaterials.length];
  const robe = new THREE.Mesh(new THREE.ConeGeometry(0.43, 1.55, 10), robeMaterial);
  robe.name = 'traveler-robe';
  robe.position.y = 0.9;
  robe.castShadow = true;
  person.add(robe);

  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.31, 0.39, 0.82, 10), robeMaterial);
  torso.name = 'traveler-torso';
  torso.position.y = 1.75;
  torso.castShadow = true;
  person.add(torso);

  const head = new THREE.Mesh(new THREE.SphereGeometry(0.25, 12, 9), materials.skin);
  head.name = 'traveler-head';
  head.position.y = 2.38;
  head.castShadow = true;
  person.add(head);

  const cap = new THREE.Mesh(
    variant % 4 === 0 ? new THREE.ConeGeometry(0.32, 0.48, 12) : new THREE.CylinderGeometry(0.27, 0.3, 0.23, 12),
    materials.charcoal
  );
  cap.name = 'traveler-headwear';
  cap.position.y = variant % 4 === 0 ? 2.72 : 2.6;
  cap.castShadow = true;
  person.add(cap);

  const armAngle = variant % 2 === 0 ? 0.28 : -0.28;
  for (const side of [-1, 1]) {
    const arm = createCylinder('traveler-arm', 0.09, 0.12, 0.78, robeMaterial, [side * 0.4, 1.72, 0], [0, 0, side * (0.35 + armAngle)]);
    person.add(arm);
  }

  person.scale.setScalar(0.78 + (variant % 3) * 0.04);
  return person;
}

function createCourtyardTree(materials: HistoricalMaterialLibrary, variant: number): THREE.Group {
  const tree = new THREE.Group();
  const trunk = createCylinder('tree-trunk', 0.22, 0.38, 3.6, materials.wood, [0, 1.8, 0]);
  tree.add(trunk);

  const crownGeometry = new THREE.IcosahedronGeometry(1.35, 1);
  const crownPositions: Array<[number, number, number]> = [
    [0, 4.2, 0],
    [-0.85, 3.82, 0.2],
    [0.82, 3.86, -0.1],
    [0.15, 3.72, 0.88],
    [-0.1, 4.25, -0.7]
  ];
  crownPositions.forEach((position, crownIndex) => {
    const crown = new THREE.Mesh(crownGeometry, (crownIndex + variant) % 2 === 0 ? materials.foliage : materials.foliageLight);
    crown.name = 'tree-foliage';
    crown.position.set(...position);
    crown.scale.set(1, 0.82 + crownIndex * 0.03, 1);
    crown.castShadow = true;
    tree.add(crown);
  });
  return tree;
}

function createMerchantCart(materials: HistoricalMaterialLibrary): THREE.Group {
  const cart = new THREE.Group();
  cart.add(createBox('cart-bed', [3.6, 0.42, 2], materials.wood, [0, 1.35, 0]));
  cart.add(createBox('cart-rail', [3.6, 0.45, 0.12], materials.woodDark, [0, 1.75, -0.94]));
  cart.add(createBox('cart-rail', [3.6, 0.45, 0.12], materials.woodDark, [0, 1.75, 0.94]));
  cart.add(createBox('cart-shaft', [4.8, 0.16, 0.16], materials.woodDark, [-3.8, 1.1, -0.65]));
  cart.add(createBox('cart-shaft', [4.8, 0.16, 0.16], materials.woodDark, [-3.8, 1.1, 0.65]));

  for (const x of [-1.25, 1.25]) {
    for (const z of [-1.1, 1.1]) {
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.82, 0.11, 8, 24), materials.woodDark);
      wheel.name = 'cart-wheel';
      wheel.position.set(x, 0.85, z);
      wheel.rotation.x = Math.PI / 2;
      wheel.castShadow = true;
      cart.add(wheel);
      for (let spokeIndex = 0; spokeIndex < 6; spokeIndex += 1) {
        const spoke = createBox('wheel-spoke', [1.45, 0.06, 0.06], materials.wood, [x, 0.85, z], [0, spokeIndex * Math.PI / 3, 0]);
        cart.add(spoke);
      }
    }
  }

  const cargo = createCargoCluster(materials, 3);
  cargo.position.set(0, 1.58, 0);
  cargo.scale.setScalar(0.8);
  cart.add(cargo);
  return cart;
}

function createPackCamel(materials: HistoricalMaterialLibrary): THREE.Group {
  const camel = new THREE.Group();
  const camelMaterial = new THREE.MeshStandardMaterial({ color: 0x8c633d, roughness: 0.92 });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.7, 1.4, 6, 12), camelMaterial);
  body.name = 'camel-body';
  body.rotation.z = Math.PI / 2;
  body.position.y = 1.7;
  body.castShadow = true;
  camel.add(body);

  for (const x of [-0.55, 0.5]) {
    const hump = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 8), camelMaterial);
    hump.name = 'camel-hump';
    hump.scale.set(0.8, 1.1, 0.75);
    hump.position.set(x, 2.25, 0);
    hump.castShadow = true;
    camel.add(hump);
  }

  const neck = createCylinder('camel-neck', 0.24, 0.36, 1.8, camelMaterial, [-1.2, 2.25, 0], [0, 0, -0.42]);
  camel.add(neck);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.36, 12, 8), camelMaterial);
  head.name = 'camel-head';
  head.scale.set(1.35, 0.75, 0.72);
  head.position.set(-1.62, 3, 0);
  head.castShadow = true;
  camel.add(head);

  for (const x of [-0.82, 0.75]) {
    for (const z of [-0.42, 0.42]) {
      camel.add(createCylinder('camel-leg', 0.11, 0.16, 1.45, camelMaterial, [x, 0.72, z]));
    }
  }

  const blanket = createBox('camel-blanket', [1.6, 0.16, 1.35], materials.fabricRed, [0.1, 2.08, 0]);
  camel.add(blanket);
  return camel;
}

function createStreetBanner(
  materials: HistoricalMaterialLibrary,
  bannerMaterial: THREE.Material
): THREE.Group {
  const banner = new THREE.Group();
  banner.name = 'street-banner';
  banner.add(createCylinder('banner-pole', 0.07, 0.11, 4.3, materials.woodDark, [0, 2.15, 0]));
  const cloth = createBox('banner-cloth', [1.05, 1.95, 0.055], bannerMaterial, [0.62, 3.08, 0]);
  banner.add(cloth);
  const tassel = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.45, 8), materials.fabricOchre);
  tassel.name = 'banner-tassel';
  tassel.position.set(0.62, 1.9, 0);
  banner.add(tassel);
  return banner;
}

function createGatePier(materials: HistoricalMaterialLibrary): THREE.Group {
  const pier = new THREE.Group();
  pier.add(createBox('gate-stone-base', [2.9, 0.5, 3.1], materials.stone, [0, 0.25, 0]));
  pier.add(createBox('gate-wall-pier', [2.45, 3.7, 2.65], materials.wallDark, [0, 2.05, 0]));
  for (const x of [-0.95, 0.95]) {
    for (const z of [-1.05, 1.05]) {
      pier.add(createCylinder('timber-column', 0.13, 0.17, 3.9, materials.woodDark, [x, 2.2, z]));
    }
  }
  return pier;
}

function createPbrMaterial(
  maps: { map: THREE.DataTexture; roughnessMap: THREE.DataTexture; bumpMap: THREE.DataTexture },
  roughness: number,
  bumpScale: number,
  color: THREE.ColorRepresentation = 0xffffff
): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    map: maps.map,
    roughness,
    roughnessMap: maps.roughnessMap,
    bumpMap: maps.bumpMap,
    bumpScale,
    metalness: 0
  });
}

function createPbrTextureSet(recipe: TextureRecipe): {
  map: THREE.DataTexture;
  roughnessMap: THREE.DataTexture;
  bumpMap: THREE.DataTexture;
} {
  const size = 128;
  const colorData = new Uint8Array(size * size * 4);
  const roughnessData = new Uint8Array(size * size * 4);
  const bumpData = new Uint8Array(size * size * 4);
  const random = createSeededRandom(recipe.seed);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4;
      const randomNoise = (random() - 0.5) * recipe.noise;
      const pattern = samplePattern(recipe.pattern, x, y);
      const brightness = randomNoise + pattern.color;
      colorData[index] = clampByte(recipe.color[0] + brightness);
      colorData[index + 1] = clampByte(recipe.color[1] + brightness * 0.78);
      colorData[index + 2] = clampByte(recipe.color[2] + brightness * 0.58);
      colorData[index + 3] = 255;

      const roughness = clampByte(210 + randomNoise * 0.75 + pattern.roughness);
      roughnessData[index] = roughness;
      roughnessData[index + 1] = roughness;
      roughnessData[index + 2] = roughness;
      roughnessData[index + 3] = 255;

      const bump = clampByte(128 + randomNoise * 1.6 + pattern.bump);
      bumpData[index] = bump;
      bumpData[index + 1] = bump;
      bumpData[index + 2] = bump;
      bumpData[index + 3] = 255;
    }
  }

  const map = createDataTexture(colorData, size, true);
  const roughnessMap = createDataTexture(roughnessData, size, false);
  const bumpMap = createDataTexture(bumpData, size, false);
  return { map, roughnessMap, bumpMap };
}

function samplePattern(
  pattern: TextureRecipe['pattern'],
  x: number,
  y: number
): { color: number; roughness: number; bump: number } {
  if (pattern === 'wood') {
    const grain = Math.sin(x * 0.34 + Math.sin(y * 0.09) * 2.3) * 6;
    const seam = x % 31 < 2 ? -18 : 0;
    return { color: grain + seam, roughness: -grain, bump: grain * 2 + seam };
  }
  if (pattern === 'tile') {
    const row = Math.floor(y / 16);
    const offset = row % 2 === 0 ? 0 : 9;
    const grout = y % 16 < 2 || (x + offset) % 18 < 2;
    const curvedHighlight = Math.cos(((x + offset) % 18) / 18 * Math.PI * 2) * 5;
    return { color: curvedHighlight + (grout ? -18 : 0), roughness: grout ? 20 : -3, bump: curvedHighlight * 2 + (grout ? -35 : 0) };
  }
  if (pattern === 'stone') {
    const seam = x % 32 < 2 || y % 24 < 2;
    return { color: seam ? -12 : 0, roughness: seam ? 10 : 0, bump: seam ? -28 : 0 };
  }
  if (pattern === 'cloth') {
    const weave = (x % 4 === 0 ? 5 : 0) + (y % 4 === 0 ? -4 : 0);
    return { color: weave, roughness: 8, bump: weave * 2 };
  }

  const strata = Math.sin(y * 0.18 + Math.sin(x * 0.11)) * 5;
  const pebble = ((x * 17 + y * 13) % 47 === 0) ? -15 : 0;
  return { color: strata + pebble, roughness: 6, bump: strata * 1.8 + pebble };
}

function createDataTexture(data: Uint8Array, size: number, isColor: boolean): THREE.DataTexture {
  const texture = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(3, 3);
  texture.magFilter = THREE.LinearFilter;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.generateMipmaps = true;
  if (isColor) {
    texture.colorSpace = THREE.SRGBColorSpace;
  }
  texture.needsUpdate = true;
  return texture;
}

function createTintedMaterial(
  source: THREE.MeshStandardMaterial,
  color: THREE.ColorRepresentation
): THREE.MeshStandardMaterial {
  const material = source.clone();
  material.color.set(color);
  return material;
}

function createBox(
  name: string,
  size: [number, number, number],
  material: THREE.Material,
  position: [number, number, number],
  rotation: [number, number, number] = [0, 0, 0]
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), material);
  mesh.name = name;
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
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
  position: [number, number, number],
  rotation: [number, number, number] = [0, 0, 0]
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, 12), material);
  mesh.name = name;
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function createCylinderBetween(
  name: string,
  start: THREE.Vector3,
  end: THREE.Vector3,
  radius: number,
  material: THREE.Material
): THREE.Mesh {
  const direction = new THREE.Vector3().subVectors(end, start);
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, direction.length(), 10), material);
  mesh.name = name;
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}

function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 0xffffffff;
  };
}

function clampByte(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}
