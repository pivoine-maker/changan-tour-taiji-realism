import * as THREE from 'three';
import {createTaijiNorthGate,createTaijiSurroundings} from './TaijiArchitecture';
import {createPilotMaterials} from './TaijiPilot';

const materials=()=>createPilotMaterials({stone:new THREE.Texture(),roof:new THREE.Texture(),wood:new THREE.Texture(),wall:new THREE.Texture(),earth:new THREE.Texture()});

it('visibly covers both existing collision footprints, including the garden hall protrusion',()=>{
  const gate=createTaijiNorthGate(materials());gate.updateMatrixWorld(true);
  const ray=new THREE.Raycaster();
  for(const [minX,maxX,minZ,maxZ] of [[181,207,283,291],[185,203,281.5,290.5]]) {
    for(const x of [minX+.01,(minX+maxX)/2,maxX-.01])for(const z of [minZ+.01,(minZ+maxZ)/2,maxZ-.01]) {
      ray.set(new THREE.Vector3(x,30,z),new THREE.Vector3(0,-1,0));
      expect(ray.intersectObject(gate,true).some(hit=>hit.point.y>=.77)).toBe(true);
    }
  }
});

it('creates one northern building and removes the deeply overlapping refined garden hall',()=>{
  const root=createTaijiSurroundings(materials());
  expect(root.getObjectByName('refined-north-gate')).toBeDefined();
  expect(root.getObjectByName('refined-inner-court-garden')).toBeUndefined();
  const gate=root.getObjectByName('refined-north-gate')!;root.updateMatrixWorld(true);
  const box=new THREE.Box3().setFromObject(gate);
  expect(box.max.y).toBeLessThan(22);
  expect(box.min.x).toBeGreaterThan(179);expect(box.max.x).toBeLessThan(209);
  expect(box.min.z).toBeGreaterThanOrEqual(281.49);expect(box.max.z).toBeLessThan(292.2);
});
