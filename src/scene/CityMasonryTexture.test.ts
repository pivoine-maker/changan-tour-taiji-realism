import * as THREE from 'three';
import { createMeterScaledMasonry } from './CityMasonryTexture';
it('bakes wall texture coordinates in metres while preserving instance bounds and borrowed material',()=>{
  const material=new THREE.MeshStandardMaterial(),geometry=new THREE.BoxGeometry(1,1,1);
  const source=new THREE.InstancedMesh(geometry,material,2);
  source.setMatrixAt(0,new THREE.Matrix4().makeScale(60,6,2));
  source.setMatrixAt(1,new THREE.Matrix4().makeTranslation(35,0,20).scale(new THREE.Vector3(2,6,40)));
  source.castShadow=true;
  const result=createMeterScaledMasonry(source,3);
  source.computeBoundingBox();result.geometry.computeBoundingBox();
  expect(result.geometry.boundingBox?.min.distanceTo(source.boundingBox!.min)).toBeLessThan(.001);
  expect(result.geometry.boundingBox?.max.distanceTo(source.boundingBox!.max)).toBeLessThan(.001);
  const uv=result.geometry.getAttribute('uv');expect(Math.max(...Array.from({length:uv.count},(_,i)=>Math.abs(uv.getX(i))))).toBeGreaterThan(9);
  expect(result.material).toBe(material);expect(result.castShadow).toBe(true);
  expect(geometry.getAttribute('position').count).toBe(24);
});
