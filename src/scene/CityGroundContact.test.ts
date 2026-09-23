import * as THREE from 'three';
import { createFullCitySet } from './FullCityAssets';
import { createHistoricalMaterialLibrary } from './HistoricalAssets';
import { changanCity } from '../data/changanCity';
import { createCityGroundContact } from './CityGroundContact';
it('keeps every foundation transition below paths and within the roof footprint',()=>{
 const map=new THREE.Texture(), mesh=createCityGroundContact(changanCity,map);
 const full=createFullCitySet(createHistoricalMaterialLibrary(),changanCity);
 const ground=full.getObjectByName('full-city-ground') as THREE.Mesh;ground.updateMatrixWorld(true);
 const groundTop=new THREE.Box3().setFromObject(ground).max.y;
 const p=mesh.geometry.getAttribute('position'), c=mesh.geometry.getAttribute('color');
 expect(mesh.userData.buildingCount).toBe(756);expect(p.count).toBeLessThan(40000);
 expect(c.itemSize).toBe(4);expect(mesh.material.map).toBe(map);
 for(const [j,b] of changanCity.wards.flatMap(w=>w.buildings).entries()) {
  const angle=b.rotation??0;
  for(let i=j*24;i<(j+1)*24;i++){
   const x=p.getX(i)-b.x,z=p.getZ(i)-b.z;
   const localX=x*Math.cos(angle)-z*Math.sin(angle),localZ=x*Math.sin(angle)+z*Math.cos(angle);
   expect(Math.abs(localX)).toBeLessThan(b.width/2+.525);
   expect(Math.abs(localZ)).toBeLessThan(b.depth/2+.525);
  }
 }
 for(let i=0;i<p.count;i++){expect(Number.isFinite(p.getX(i))).toBe(true);expect(p.getY(i)).toBeGreaterThan(groundTop);expect(p.getY(i)).toBeLessThan(.15);}
 expect(Array.from(c.array).some((v,i)=>i%4===3&&v===0)).toBe(true);
});
