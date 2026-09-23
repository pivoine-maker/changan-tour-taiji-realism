import * as THREE from 'three';
import { batchStaticArchitecture } from './StaticBatch';

it('batches static geometry in local coordinates without changing material or world-space bounds', () => {
  const root=new THREE.Group();root.position.set(100,0,200);
  const material=new THREE.MeshStandardMaterial();
  const a=new THREE.Mesh(new THREE.BoxGeometry(2,2,2),material);
  const b=new THREE.Mesh(a.geometry.toNonIndexed(),material);a.position.set(1,1,0);b.position.set(5,1,0);root.add(a,b);
  batchStaticArchitecture(root);
  const batch=root.getObjectByName('static-architecture-batch') as THREE.Mesh;
  batch.geometry.computeBoundingBox();
  expect(batch.geometry.boundingBox!.min.toArray()).toEqual([0,0,-1]);
  expect(batch.geometry.boundingBox!.max.toArray()).toEqual([6,2,1]);
  expect(batch.material).toBe(material);
  expect(a.position.toArray()).toEqual([1,1,0]);expect(a.visible).toBe(false);
  expect(b.position.toArray()).toEqual([5,1,0]);expect(b.visible).toBe(false);
});

it('does not merge distinct shadow-receiving behavior',()=>{
  const root=new THREE.Group(),material=new THREE.MeshStandardMaterial();
  for(let i=0;i<4;i++){const mesh=new THREE.Mesh(new THREE.BoxGeometry(),material);mesh.castShadow=true;mesh.receiveShadow=i<2;root.add(mesh);}
  batchStaticArchitecture(root);
  const batches=root.children.filter(o=>o.name==='static-architecture-batch') as THREE.Mesh[];
  expect(batches).toHaveLength(2);expect(batches.map(m=>m.receiveShadow).sort()).toEqual([false,true]);
  expect(batches.every(m=>m.castShadow)).toBe(true);
});
