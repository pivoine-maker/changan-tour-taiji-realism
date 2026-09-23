import * as THREE from 'three';
import {createSimpleRoofCoverGeometry,createSimpleRoofTileMatrix} from './TaijiSimpleRoofTile';

it('creates a bounded hollow half-round shell with a flared visible rim under the old vertex budget',()=>{
  const geometry=createSimpleRoofCoverGeometry();geometry.computeBoundingBox();
  expect(geometry.getAttribute('position').count).toBe(35);
  expect(geometry.boundingBox!.min.z).toBeCloseTo(-.5);expect(geometry.boundingBox!.max.z).toBeCloseTo(.5);
  expect(geometry.boundingBox!.min.y).toBeCloseTo(0);expect(geometry.boundingBox!.max.y).toBeGreaterThan(.075);
  expect(geometry.boundingBox!.max.x-geometry.boundingBox!.min.x).toBeGreaterThan(.16);
  expect(geometry.getIndex()!.count/3).toBe(32);
  const position=geometry.getAttribute('position'),normal=geometry.getAttribute('normal');
  for(const value of position.array)expect(Number.isFinite(value)).toBe(true);
  for(let i=0;i<normal.count;i++)expect(new THREE.Vector3().fromBufferAttribute(normal,i).length()).toBeCloseTo(1,5);
  expect(Array.from(normal.array).some((value,index)=>index%3===2&&value>.99)).toBe(true);
  // At the outer flare ring z=.43, the two-end-ring inner wall interpolates to radius .07251.
  const outerFlareRadius=position.getY(7);
  const innerAtFlare=.066+(.073-.066)*(.43+.5);
  expect(outerFlareRadius-innerAtFlare).toBeGreaterThan(.007);
  expect(outerFlareRadius-innerAtFlare).toBeLessThan(.008);
});

it('orients local Z along the roof fall and local Y along projected world up with a low seat',()=>{
  const a=new THREE.Vector3(2,5,3),b=new THREE.Vector3(4,3,7),matrix=createSimpleRoofTileMatrix(a,b);
  const origin=new THREE.Vector3().setFromMatrixPosition(matrix),x=new THREE.Vector3(),y=new THREE.Vector3(),z=new THREE.Vector3();
  matrix.extractBasis(x,y,z);
  expect(origin.distanceTo(a.clone().add(b).multiplyScalar(.5))).toBeCloseTo(.02,6);
  expect(z.normalize().dot(b.clone().sub(a).normalize())).toBeCloseTo(1,6);
  const expectedUp=new THREE.Vector3(0,1,0).projectOnPlane(b.clone().sub(a).normalize()).normalize();
  expect(y.normalize().dot(expectedUp)).toBeCloseTo(1,6);
  expect(x.normalize().dot(new THREE.Vector3().crossVectors(expectedUp,b.clone().sub(a).normalize()).normalize())).toBeCloseTo(1,6);
});
