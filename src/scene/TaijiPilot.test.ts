import * as THREE from 'three';
import { applyTaijiPilot, createPilotMaterials } from './TaijiPilot';
import { imperialPrecincts } from '../data/imperialCity';
import { createHistoricalMaterialLibrary } from './HistoricalAssets';
import { createImperialPrecinctSet } from './ImperialAssets';
import {TAIJI_NEIGHBOR_OFFICE_IDS} from './TaijiNeighborOffices';

it('rebuilds only Taiji with curved roofs, preserving layout, surrounding meshes and reversible visibility', () => {
  const root = createImperialPrecinctSet(createHistoricalMaterialLibrary(), imperialPrecincts);
  const originals = new Map<THREE.Object3D, { matrix: number[]; visible: boolean; material?: THREE.Material | THREE.Material[] }>();
  root.traverse(child => { child.updateMatrix(); originals.set(child, { matrix: child.matrix.toArray(), visible: child.visible, material: child instanceof THREE.Mesh ? child.material : undefined }); });
  const textures = { stone: new THREE.Texture(), roof: new THREE.Texture(), wood: new THREE.Texture(), wall: new THREE.Texture(), earth: new THREE.Texture() };
  const pilot = applyTaijiPilot(root, createPilotMaterials(textures));
  const importedTrees=new THREE.Group();const disposeTrees=vi.fn();
  pilot.installTrees({group:importedTrees,foliageMaterial:new THREE.MeshStandardMaterial(),dispose:disposeTrees});
  const originalHall = root.getObjectByName('imperial-hall-taiji-hall')!;
  const originalOffice=root.getObjectByName('imperial-hall-west-chancellery')!;
  const rebuilt = root.getObjectByName('taiji-architecture-v2')!;
  expect(rebuilt).toBeDefined();
  expect(rebuilt.position.toArray()).toEqual([194, 0, 208]);
  expect(originalHall.visible).toBe(false);
  expect(originalOffice.visible).toBe(false);
  expect(root.getObjectByName('taiji-neighbor-offices-v1')).toBeDefined();
  const roof = rebuilt.getObjectByName('curved-hip-roof') as THREE.Mesh;
  expect((roof.material as THREE.MeshStandardMaterial).map).toBe(textures.roof);
  expect(roof.geometry.getAttribute('position').count).toBeGreaterThan(1000);
  expect(rebuilt.getObjectByName('individual-clay-tiles')).toBeInstanceOf(THREE.InstancedMesh);
  for (const [object, previous] of originals) {
    object.updateMatrix();
    expect(object.matrix.toArray()).toEqual(previous.matrix);
    if (object instanceof THREE.Mesh) expect(object.material).toBe(previous.material);
    if (object !== originalHall && ![...TAIJI_NEIGHBOR_OFFICE_IDS,'liangyi-hall','liangyi-west-wing','liangyi-east-wing','chengtian-gate','taiji-west-wing','taiji-east-wing','front-court-west-gallery','front-court-east-gallery','inner-court-garden','garden-west-pavilion','garden-east-pavilion'].some(id=>object.name==='imperial-hall-'+id) && !['taiji-great-court', 'chengtian-forecourt','liangyi-court','inner-garden-pool'].includes(object.userData.courtyardId)) expect(object.visible).toBe(previous.visible);
  }
  pilot.setEnabled(false);
  expect(originalHall.visible).toBe(true);
  expect(originalOffice.visible).toBe(true);
  for(const [object,previous] of originals) if(object instanceof THREE.Mesh) expect(object.material).toBe(previous.material);
  expect(rebuilt.visible).toBe(false);
  expect(importedTrees.visible).toBe(false);
  for(const [object,previous] of originals) expect(object.visible).toBe(previous.visible);
  pilot.setEnabled(true);
  expect(rebuilt.visible).toBe(true);
  expect(importedTrees.visible).toBe(true);
  expect(originalHall.visible).toBe(false);
  pilot.dispose();
  expect(originalHall.visible).toBe(true);expect(originalOffice.visible).toBe(true);
  expect(disposeTrees).toHaveBeenCalledOnce();
  pilot.dispose();expect(disposeTrees).toHaveBeenCalledOnce();
});

it('keeps original garden trees until replacement succeeds and restores them with original mode',()=>{
  const root=new THREE.Group(),garden=new THREE.Group();garden.name='courtyard-tree';garden.position.set(148,0,268);root.add(garden);
  const textures={stone:new THREE.Texture(),roof:new THREE.Texture(),wood:new THREE.Texture(),wall:new THREE.Texture(),earth:new THREE.Texture()};
  const pilot=applyTaijiPilot(root,createPilotMaterials(textures));
  expect(garden.visible).toBe(true);
  pilot.installTrees({group:new THREE.Group(),foliageMaterial:new THREE.MeshStandardMaterial(),dispose:vi.fn()});
  expect(garden.visible).toBe(false);
  pilot.setEnabled(false);expect(garden.visible).toBe(true);
  pilot.setEnabled(true);expect(garden.visible).toBe(false);
  pilot.dispose();
});

it('keeps landscape data textures linear and exposes an earthy fallback',()=>{
  const textures={stone:new THREE.Texture(),roof:new THREE.Texture(),wood:new THREE.Texture(),wall:new THREE.Texture(),earth:new THREE.Texture(),landscapeColor:new THREE.Texture(),landscapeNormal:new THREE.Texture(),landscapeRoughness:new THREE.Texture()};
  const m=createPilotMaterials(textures);
  expect(m.landscape.map).toBe(textures.landscapeColor);
  expect(m.landscape.normalMap).toBe(textures.landscapeNormal);
  expect(textures.landscapeColor.colorSpace).toBe(THREE.SRGBColorSpace);
  expect(textures.landscapeNormal.colorSpace).toBe(THREE.NoColorSpace);
  expect(textures.landscapeRoughness.colorSpace).toBe(THREE.NoColorSpace);
  const {landscapeColor,landscapeNormal,landscapeRoughness,...base}=textures;
  expect(createPilotMaterials(base).landscape.map).toBe(textures.earth);
});

it('keeps north-gate compact batches installed across tree loading and mode switches',()=>{
  const root=new THREE.Group(),geometry=new THREE.BoxGeometry(),material=new THREE.MeshStandardMaterial();
  const source=new THREE.InstancedMesh(geometry,material,2);source.name='city-source';source.userData.sourceIds=['full-city-gatehouse:north',null];root.add(source);
  const textures={stone:new THREE.Texture(),roof:new THREE.Texture(),wood:new THREE.Texture(),wall:new THREE.Texture(),earth:new THREE.Texture()};
  const pilot=applyTaijiPilot(root,createPilotMaterials(textures));
  const compact=root.getObjectByName('compacted-without-full-city-gatehouse:north')!;
  const borrowed=root.getObjectByName('compacted-city-source') as THREE.InstancedMesh;
  const releaseGeometry=vi.spyOn(geometry,'dispose'),releaseMaterial=vi.spyOn(material,'dispose');
  expect(borrowed.count).toBe(1);expect(source.visible).toBe(false);
  pilot.installTrees({group:new THREE.Group(),foliageMaterial:new THREE.MeshStandardMaterial(),dispose:vi.fn()});
  expect(compact.parent?.uuid).toBe(root.uuid);expect(source.visible).toBe(false);
  pilot.setEnabled(false);expect(source.visible).toBe(true);expect(compact.visible).toBe(false);
  pilot.setEnabled(true);expect(source.visible).toBe(false);expect(compact.visible).toBe(true);expect(compact.parent?.uuid).toBe(root.uuid);
  pilot.dispose();expect(source.visible).toBe(true);expect(compact.parent).toBeNull();
  expect(releaseGeometry).not.toHaveBeenCalled();expect(releaseMaterial).not.toHaveBeenCalled();
});
