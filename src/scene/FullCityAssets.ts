import * as THREE from 'three';
import type { BuildingBlock, WallSegment } from '../data/world';
import type { ChanganCityModel } from '../data/changanCity';
import type { HistoricalMaterialLibrary } from './HistoricalAssets';
import { createOrdinaryWardDetails } from './OrdinaryWardAssets';
import { createWardWallSegments } from '../data/cityLayout';
import { createCityArchitecture, createCityTrees } from './CityArchitecture';
import {northGateSourceId} from './TaijiInstanceFilter';

export function createFullCitySet(
  materials: HistoricalMaterialLibrary,
  city: ChanganCityModel,
  options: { realistic?: boolean } = {}
): THREE.Group {
  const root = new THREE.Group();
  root.name = 'full-changan-city';

  root.add(createGround(city, materials));
  root.add(createRoads(city, materials));
  root.add(createWalls(city.outerWalls, materials, 'outer-city-wall'));
  root.add(createWardWalls(city, materials));
  root.add(options.realistic ? createCityArchitecture(materials, city) : createBuildings(city, materials));
  root.add(options.realistic ? createCityTrees(materials, city) : createTrees(city, materials));
  root.add(createOrdinaryWardDetails(materials, city, options));

  return root;
}

function createGround(city: ChanganCityModel, materials: HistoricalMaterialLibrary): THREE.Mesh {
  const width = city.bounds.maxX - city.bounds.minX;
  const depth = city.bounds.maxZ - city.bounds.minZ;
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, 0.18, depth), materials.earth);
  mesh.name = 'full-city-ground';
  mesh.position.set((city.bounds.minX + city.bounds.maxX) / 2, 0.02, (city.bounds.minZ + city.bounds.maxZ) / 2);
  mesh.receiveShadow = true;
  return mesh;
}

function createRoads(city: ChanganCityModel, materials: HistoricalMaterialLibrary): THREE.Group {
  const group = new THREE.Group();
  group.name = 'full-city-road-grid';
  const width = city.bounds.maxX - city.bounds.minX;
  const depth = city.bounds.maxZ - city.bounds.minZ;
  const centerX = (city.bounds.minX + city.bounds.maxX) / 2;
  const centerZ = (city.bounds.minZ + city.bounds.maxZ) / 2;

  const eastWestRoads = new THREE.InstancedMesh(new THREE.BoxGeometry(width, 0.08, 3.4), materials.packedEarth, city.roadZs.length);
  eastWestRoads.name = 'full-city-east-west-roads';
  city.roadZs.forEach((z, index) => setInstance(eastWestRoads, index, centerX, 0.19, z));
  group.add(eastWestRoads);

  const northSouthRoads = new THREE.InstancedMesh(new THREE.BoxGeometry(3.4, 0.08, depth), materials.packedEarth, city.roadXs.length);
  northSouthRoads.name = 'full-city-north-south-roads';
  city.roadXs.forEach((x, index) => setInstance(northSouthRoads, index, x, 0.2, centerZ));
  group.add(northSouthRoads);

  const zhuqueRoad = new THREE.Mesh(new THREE.BoxGeometry(18, 0.1, depth), materials.packedEarth);
  zhuqueRoad.name = 'full-city-zhuque-axis';
  zhuqueRoad.position.set(194, 0.24, centerZ);
  zhuqueRoad.receiveShadow = true;
  group.add(zhuqueRoad);

  return group;
}

function createWalls(walls: WallSegment[], materials: HistoricalMaterialLibrary, name: string): THREE.Group {
  const group = new THREE.Group();
  group.name = name;
  const wallMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), materials.earth, walls.length);
  wallMesh.name = `${name}-bodies`;
  const capMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), materials.roofTile, walls.length);
  capMesh.name = `${name}-caps`;
  const matrix = new THREE.Matrix4();
  const scale = new THREE.Matrix4();
  const translation = new THREE.Matrix4();

  walls.forEach((wall, index) => {
    translation.makeTranslation(wall.x, wall.height / 2, wall.z);
    scale.makeScale(wall.width, wall.height, wall.depth);
    matrix.multiplyMatrices(translation, scale);
    wallMesh.setMatrixAt(index, matrix);

    translation.makeTranslation(wall.x, wall.height + 0.16, wall.z);
    scale.makeScale(wall.width + 0.25, 0.24, wall.depth + 0.25);
    matrix.multiplyMatrices(translation, scale);
    capMesh.setMatrixAt(index, matrix);
  });

  wallMesh.instanceMatrix.needsUpdate = true;
  capMesh.instanceMatrix.needsUpdate = true;
  wallMesh.castShadow = true;
  wallMesh.receiveShadow = true;
  capMesh.castShadow = true;
  group.add(wallMesh, capMesh);
  return group;
}

function createWardWalls(city: ChanganCityModel, materials: HistoricalMaterialLibrary): THREE.Group {
  const walls = city.wards.flatMap(ward => createWardWallSegments(ward.bounds));
  return createWalls(walls, materials, 'full-city-ward-walls');
}

function createBuildings(city: ChanganCityModel, materials: HistoricalMaterialLibrary): THREE.Group {
  const group = new THREE.Group();
  group.name = 'full-city-buildings';
  const buildings = city.wards.flatMap((ward) => ward.buildings);
  const toneGroups: Record<BuildingBlock['tone'], BuildingBlock[]> = {
    clay: [],
    umber: [],
    sand: [],
    dark: []
  };
  for (const building of [...buildings, ...city.gatehouses]) {
    toneGroups[building.tone].push(building);
  }

  const materialByTone: Record<BuildingBlock['tone'], THREE.Material> = {
    clay: materials.wall,
    umber: materials.wallDark,
    sand: materials.plaster,
    dark: materials.woodDark
  };

  for (const [tone, toneBuildings] of Object.entries(toneGroups) as Array<[BuildingBlock['tone'], BuildingBlock[]]>) {
    const bodies = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), materialByTone[tone], toneBuildings.length);
    bodies.name = `full-city-building-body-${tone}`;
    const roofs = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), materials.roofTile, toneBuildings.length);
    roofs.name = `full-city-building-roof-${tone}`;
    toneBuildings.forEach((building, index) => {
      setScaledInstance(bodies, index, building.x, building.height / 2 + 0.28, building.z, building.width, building.height, building.depth, building.rotation ?? 0);
      setScaledInstance(roofs, index, building.x, building.height + 0.65, building.z, building.width + 1.1, 0.78, building.depth + 1.1, building.rotation ?? 0);
    });
    const sourceIds=toneBuildings.map(building=>northGateSourceId(building,city.gatehouses)??null);
    bodies.userData.sourceIds=sourceIds;roofs.userData.sourceIds=[...sourceIds];
    bodies.castShadow = true;
    bodies.receiveShadow = true;
    roofs.castShadow = true;
    bodies.instanceMatrix.needsUpdate = true;
    roofs.instanceMatrix.needsUpdate = true;
    group.add(bodies, roofs);
  }

  return group;
}

function createTrees(city: ChanganCityModel, materials: HistoricalMaterialLibrary): THREE.Group {
  const group = new THREE.Group();
  group.name = 'full-city-trees';
  const trees = city.wards.flatMap((ward) => ward.trees);
  const trunks = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.12, 0.18, 1.6, 6), materials.wood, trees.length);
  trunks.name = 'full-city-tree-trunks';
  const crowns = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.86, 0), materials.foliage, trees.length);
  crowns.name = 'full-city-tree-crowns';
  trees.forEach((tree, index) => {
    setInstance(trunks, index, tree.x, 0.92, tree.z);
    setScaledInstance(crowns, index, tree.x, 2.05, tree.z, 1, 0.82, 1, 0);
  });
  trunks.castShadow = true;
  crowns.castShadow = true;
  trunks.instanceMatrix.needsUpdate = true;
  crowns.instanceMatrix.needsUpdate = true;
  group.add(trunks, crowns);
  return group;
}

function setInstance(mesh: THREE.InstancedMesh, index: number, x: number, y: number, z: number): void {
  const matrix = new THREE.Matrix4().makeTranslation(x, y, z);
  mesh.setMatrixAt(index, matrix);
}

function setScaledInstance(
  mesh: THREE.InstancedMesh,
  index: number,
  x: number,
  y: number,
  z: number,
  width: number,
  height: number,
  depth: number,
  rotation: number
): void {
  const translation = new THREE.Matrix4().makeTranslation(x, y, z);
  const rotationMatrix = new THREE.Matrix4().makeRotationY(rotation);
  const scale = new THREE.Matrix4().makeScale(width, height, depth);
  const matrix = new THREE.Matrix4().multiplyMatrices(translation, rotationMatrix).multiply(scale);
  mesh.setMatrixAt(index, matrix);
}
