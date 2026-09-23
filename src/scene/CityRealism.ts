import * as THREE from 'three';
import { bakeCitySurfaceInstances, type CitySurfaceKind } from './CitySurfaceGeometry';
import { changanCity } from '../data/changanCity';
import { westMarketWorld } from '../data/world';
import { createMeterScaledMasonry } from './CityMasonryTexture';
import { createCityApproachLandscape } from './CityApproachLandscape';
import { createCityCourtyardEnvironment } from './CityCourtyardEnvironment';
import { createCityGroundscape } from './CityGroundscape';
import { createCityGateCraft } from './CityGateCraft';
import { createCityGroundContact } from './CityGroundContact';
import { createCityResidents } from './CityResidents';
import { createCityTrees } from './CityArchitecture';
import { createFullCitySet } from './FullCityAssets';
import { createTangBuilding, type HistoricalMaterialLibrary } from './HistoricalAssets';
import { batchStaticArchitecture } from './StaticBatch';
import type { PilotTextures } from './TaijiPilot';

/** Owns replacement resources; the caller retains texture ownership. */
export function applyCityRealism(root: THREE.Group, base: HistoricalMaterialLibrary, textures: PilotTextures, leaf: THREE.Texture) {
  const materials = Object.fromEntries(Object.entries(base).map(([key, value]) => [key, value.clone()])) as unknown as HistoricalMaterialLibrary;
  const surface = (keys: (keyof HistoricalMaterialLibrary)[], map: THREE.Texture, color: number) => keys.forEach(key => {
    const material = materials[key];
    material.map = map; material.normalMap = null; material.roughnessMap = null; material.bumpMap = null;
    material.color.set(color); material.roughness = .92; material.needsUpdate = true;
  });
  surface(['earth', 'packedEarth'], textures.cityEarth??textures.earth, 0xe4dfd3);
  materials.packedEarth.color.set(0xd6cfc0);
  surface(['wall', 'plaster'], textures.cityPlaster??textures.stone, 0xe4ded0);
  surface(['wallDark'], textures.cityPlaster??textures.wall, 0xb3a591);
  surface(['wood'], textures.cityTimber??textures.wood, 0xd2c3b1);
  surface(['woodDark'], textures.cityTimber??textures.wood, 0x988976);
  surface(['roofTile', 'roofRidge'], textures.cityRoof??textures.roof, 0x9d9f9a);
  materials.roofRidge.map=textures.roof;materials.roofRidge.color.set(0x797d78);
  surface(['stone'], textures.stone, 0xb5afa2);
  const ownedHeights:THREE.Texture[]=[];
  for(const key of ['wall','plaster','wallDark','wood','woodDark','roofTile','roofRidge','earth','packedEarth'] as const){
    const m=materials[key],height=m.map!.clone();height.colorSpace=THREE.NoColorSpace;height.needsUpdate=true;ownedHeights.push(height);
    m.bumpMap=height;m.bumpScale=key.startsWith('roof')?.055:key.startsWith('wood')?.012:.022;
    m.roughness=key.startsWith('wood')?.83:.94;
  }
  for (const key of ['foliage', 'foliageLight'] as const) {
    materials[key].map = leaf; materials[key].side = THREE.DoubleSide; materials[key].alphaTest = .4; materials[key].transparent = false; materials[key].roughness = .9;
    materials[key].color.set(key === 'foliage' ? 0xb8c2ac : 0xd0d8bd);
  }
  const classic = root.getObjectByName('full-changan-city')!;
  // Keep the classic batches out of Taiji's source compaction pass.
  classic.removeFromParent();
  const city = createFullCitySet(materials, changanCity, { realistic: true });
  city.name = 'realistic-changan-city'; root.add(city);
  const residentBodies=city.getObjectByName('ordinary-ward-resident-bodies') as THREE.InstancedMesh;
  const residentHeads=city.getObjectByName('ordinary-ward-resident-heads') as THREE.InstancedMesh;
  const residents=createCityResidents(residentBodies,residentHeads,materials);
  residentBodies.parent!.add(residents.group); residentBodies.visible=residentHeads.visible=false;
  const architecture=city.getObjectByName('city-realistic-architecture')!;
  for(const object of [...architecture.children]){
    if(!(object instanceof THREE.InstancedMesh))continue;
    // The generated tile image supplies overlap detail; old placeholder cross-bars obscure it.
    if(object.name==='city-roof-tile-course'){object.removeFromParent();object.geometry.dispose();object.dispose();continue;}
    if(object.name==='city-window-recess'&&textures.cityWindow)object.material=new THREE.MeshStandardMaterial({map:textures.cityWindow,color:0xd5c7b4,roughness:.92});
    const kind:CitySurfaceKind=object.name==='city-window-recess'?'window':object.name.includes('roof')||object.name==='city-ridge'||object.name==='city-eave-tile-edge'?'roof':object.name.startsWith('city-wall-')?'wall':object.name==='city-foundation'?'stone':'wood';
    const replacement=bakeCitySurfaceInstances(object,kind,materials.plaster);
    architecture.add(replacement);object.removeFromParent();object.geometry.dispose();object.dispose();
  }
  city.add(createCityCourtyardEnvironment(changanCity, materials, {...textures,earth:textures.cityEarth??textures.earth}).group);
  // The new soil mesh replaces the old top surface; close coplanar layers flicker at city scale.
  city.getObjectByName('full-city-ground')!.visible=false;
  city.add(createCityGroundscape(changanCity,textures.cityEarth??textures.earth));
  const gateCraft=createCityGateCraft(changanCity,materials);
  for(const object of [...gateCraft.children])if(object instanceof THREE.InstancedMesh){
    const kind:CitySurfaceKind=object.name.includes('plinth')||object.name.includes('reveal')?'stone':'wood';
    gateCraft.add(bakeCitySurfaceInstances(object,kind));object.removeFromParent();object.geometry.dispose();object.dispose();
  }
  city.add(gateCraft);
  city.add(createCityGroundContact(changanCity,textures.cityEarth??textures.earth));
  city.add(createCityApproachLandscape(changanCity, materials));
  for(const name of ['outer-city-wall-bodies','full-city-ward-walls-bodies','outer-city-wall-caps','full-city-ward-walls-caps','ordinary-ward-inner-lanes','ordinary-ward-courtyard-paving']) {
    const original=city.getObjectByName(name) as THREE.InstancedMesh;
    if(!original)continue;
    const replacement=createMeterScaledMasonry(original);
    if(name.endsWith('-bodies')&&textures.cityRammed) replacement.material=new THREE.MeshStandardMaterial({map:textures.cityRammed,color:0xddd1b9,roughness:1});
    if(name.endsWith('-caps'))replacement.material=materials.roofRidge;
    original.parent!.add(replacement);original.removeFromParent();original.geometry.dispose();original.dispose();
  }
  // Ground/road UVs use metres, avoiding a single stretched image across 584 metres.
  for (const name of ['full-city-ground', 'full-city-east-west-roads', 'full-city-north-south-roads', 'full-city-zhuque-axis']) {
    const mesh = city.getObjectByName(name) as THREE.Mesh;
    const p = mesh.geometry.getAttribute('position'), n = mesh.geometry.getAttribute('normal'), uv = mesh.geometry.getAttribute('uv');
    for (let i = 0; i < p.count; i++) {
      const horizontal = Math.abs(n.getY(i)) > .5;
      uv.setXY(i, (horizontal || Math.abs(n.getZ(i)) > .5 ? p.getX(i) : p.getZ(i)) / 4, (horizontal ? p.getZ(i) : p.getY(i)) / 4);
    }
    uv.needsUpdate = true;
  }
  const originalBuildings = root.children.filter(child => child.name === 'tang-building');
  const buildings = new THREE.Group(); buildings.name = 'realistic-market-districts';
  westMarketWorld.buildings.forEach((block, index) => {
    const building = createTangBuilding(block, materials, index); batchStaticArchitecture(building); buildings.add(building);
  });
  const substitutions: { mesh: THREE.Mesh; original: THREE.Material | THREE.Material[]; replacement: THREE.Material | THREE.Material[] }[] = [];
  const map = new Map<THREE.Material, THREE.Material>(Object.keys(base).map(key => [base[key as keyof HistoricalMaterialLibrary], materials[key as keyof HistoricalMaterialLibrary]]));
  root.traverse(object => {
    if (!(object instanceof THREE.Mesh) || city.getObjectById(object.id)) return;
    const original = object.material;
    const replacement = Array.isArray(original) ? original.map(item => map.get(item) ?? item) : map.get(original) ?? original;
    if (replacement !== original) substitutions.push({ mesh: object, original, replacement });
  });
  const originalTrees: THREE.Object3D[] = [];
  const treePositions: {x:number; z:number}[] = [];
  root.updateMatrixWorld(true);
  root.traverse(object => {
    if (object.name !== 'courtyard-tree') return;
    const position = object.getWorldPosition(new THREE.Vector3()); root.worldToLocal(position);
    if (position.x >= 138 && position.x <= 250 && position.z >= 150) return;
    originalTrees.push(object); treePositions.push({x:position.x,z:position.z});
  });
  const streetTrees = createCityTrees(materials, {...changanCity, wards:[{...changanCity.wards[0], trees:treePositions}]});
  streetTrees.name = 'realistic-district-street-trees'; city.add(streetTrees);
  root.add(buildings);
  const setEnabled = (enabled: boolean) => {
    classic.visible = !enabled; city.visible = buildings.visible = enabled;
    originalBuildings.forEach(object => object.visible = !enabled);
    originalTrees.forEach(object => object.visible = !enabled);
    substitutions.forEach(item => item.mesh.material = enabled ? item.replacement : item.original);
  };
  setEnabled(true);
  return { finishInstallation() { root.add(classic); }, setEnabled, dispose() {
    setEnabled(false); residents.dispose(); city.removeFromParent(); buildings.removeFromParent();
    const geometries = new Set<THREE.BufferGeometry>(); const ownedMaterials = new Set<THREE.Material>(Object.values(materials));
    for (const group of [city, buildings]) group.traverse(object => { if (object instanceof THREE.Mesh) { geometries.add(object.geometry); for (const material of [object.material].flat()) ownedMaterials.add(material); } });
    geometries.forEach(item => item.dispose()); ownedMaterials.forEach(item => item.dispose());ownedHeights.forEach(item=>item.dispose());
  } };
}
