import * as THREE from 'three';
import { changanCity } from '../data/changanCity';
import { createCityGroundscape } from './CityGroundscape';
it('extends continuous terrain outside the walls without covering streets or changing walkable bounds',()=>{
 const texture=new THREE.Texture(), group=createCityGroundscape(changanCity,texture);
 expect(group.children.length).toBe(2);
 let total=0;for(const child of group.children){
  const mesh=child as THREE.Mesh<THREE.BufferGeometry,THREE.MeshStandardMaterial>;
  expect(mesh.material.map).toBe(texture);expect(mesh.material.transparent).toBe(false);
  const p=mesh.geometry.getAttribute('position');total+=p.count;
  for(let i=0;i<p.count;i++){
   expect(Number.isFinite(p.getX(i))).toBe(true);
   if(mesh.name==='city-soil-tones') expect(p.getY(i)).toBeCloseTo(.115);
   else {expect(p.getY(i)).toBeLessThan(0);expect(p.getX(i)<=changanCity.bounds.minX||p.getX(i)>=changanCity.bounds.maxX||p.getZ(i)<=changanCity.bounds.minZ||p.getZ(i)>=changanCity.bounds.maxZ).toBe(true);}
  }
  const color=mesh.geometry.getAttribute('color');expect(Math.max(...Array.from(color.array))-Math.min(...Array.from(color.array))).toBeGreaterThan(.1);
 }
 expect(total).toBeLessThan(50000);
});
