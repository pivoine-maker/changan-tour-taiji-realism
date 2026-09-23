import * as THREE from 'three';
import { bakeCitySurfaceInstances } from './CitySurfaceGeometry';
import { NORTH_GATE_SOURCE_ID } from './TaijiInstanceFilter';

it('preserves world bounds and gate identities while giving ordinary walls metric UVs',()=>{
 const geometry=new THREE.BoxGeometry(),material=new THREE.MeshStandardMaterial();
 const source=new THREE.InstancedMesh(geometry,material,2);
 source.setMatrixAt(0,new THREE.Matrix4().makeTranslation(10,2,20).multiply(new THREE.Matrix4().makeRotationY(.4)).multiply(new THREE.Matrix4().makeScale(12,4,6)));
 source.setMatrixAt(1,new THREE.Matrix4().makeTranslation(30,3,40).scale(new THREE.Vector3(6,6,6)));
 source.userData.sourceIds=[null,NORTH_GATE_SOURCE_ID];source.castShadow=true;
 const gd=vi.spyOn(geometry,'dispose'),md=vi.spyOn(material,'dispose');
 const result=bakeCitySurfaceInstances(source,'wall');
 const oldBounds=new THREE.Box3().setFromObject(source),newBounds=new THREE.Box3().setFromObject(result);
 expect(newBounds.min.distanceTo(oldBounds.min)).toBeLessThan(.00001);expect(newBounds.max.distanceTo(oldBounds.max)).toBeLessThan(.00001);
 const gate=result.children.find(x=>x instanceof THREE.InstancedMesh) as THREE.InstancedMesh;
 expect(gate.count).toBe(1);expect(gate.userData.sourceIds).toEqual([NORTH_GATE_SOURCE_ID]);
 const baked=result.children.find(x=>!(x instanceof THREE.InstancedMesh)) as THREE.Mesh;
 const uv=baked.geometry.getAttribute('uv');expect(Math.max(...Array.from(uv.array))).toBeGreaterThan(1.9);
 expect(baked.geometry.getAttribute('color')).toBeDefined();expect(baked.castShadow).toBe(true);
 expect(material.vertexColors).toBe(false);expect(baked.material).not.toBe(material);
 expect(gd).not.toHaveBeenCalled();expect(md).not.toHaveBeenCalled();
});
it('orients long-axis wood grain and keeps UVs finite on narrow roof pieces',()=>{
 for(const kind of ['wood','roof'] as const){
  const mesh=new THREE.InstancedMesh(new THREE.BoxGeometry(),new THREE.MeshStandardMaterial(),1);
  mesh.setMatrixAt(0,new THREE.Matrix4().makeScale(18,.15,.2));
  const group=bakeCitySurfaceInstances(mesh,kind);const baked=group.children[0] as THREE.Mesh;
  expect(Array.from(baked.geometry.getAttribute('uv').array).every(Number.isFinite)).toBe(true);
 }
});
it('separates vertical gable faces from roof tiles without losing triangles',async()=>{
 const {createCityRoofGeometry}=await import('./CityArchitecture');
 const geometry=createCityRoofGeometry('gable'),roof=new THREE.MeshStandardMaterial(),wall=new THREE.MeshStandardMaterial();
 const mesh=new THREE.InstancedMesh(geometry,roof,1);mesh.setMatrixAt(0,new THREE.Matrix4().makeScale(12,2,5));
 const group=bakeCitySurfaceInstances(mesh,'roof',wall);
 const gable=group.children.find(m=>m.name.endsWith('-gable-plaster')) as THREE.Mesh;
 expect(gable).toBeDefined();expect(gable.material).not.toBe(roof);
 let count=0;for(const object of group.children)count+=(object as THREE.Mesh).geometry.getAttribute('position').count;
 expect(count).toBe(geometry.getAttribute('position').count);
 const uv=gable.geometry.getAttribute('uv');expect(new Set(Array.from({length:uv.count},(_,i)=>uv.getY(i))).size).toBeGreaterThan(1);
});
