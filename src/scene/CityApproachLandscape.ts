import * as THREE from 'three';
import type { ChanganCityModel } from '../data/changanCity';
import type { Point2 } from '../data/world';
import type { HistoricalMaterialLibrary } from './HistoricalAssets';
import { createCityTrees } from './CityArchitecture';
import { batchStaticArchitecture } from './StaticBatch';

/** Avenue shoulder planting ends before the dedicated market and imperial precincts. */
export function createApproachTreePositions(city:ChanganCityModel):Point2[] {
  const trees:Point2[]=[];
  for(let z=-262;z<=-78;z+=16) {
    if(city.roadZs.some(road=>Math.abs(z-road)<=5))continue;
    trees.push({x:180.5,z},{x:208.5,z});
  }
  return trees;
}
export function createCityApproachLandscape(city:ChanganCityModel,materials:HistoricalMaterialLibrary):THREE.Group {
  const root=new THREE.Group();root.name='city-avenue-approaches';
  const positions=createApproachTreePositions(city);
  const trees=createCityTrees(materials,{...city,wards:[{...city.wards[0],trees:positions}]});
  root.add(trees);
  const plane=(x:number,z:number,w:number,d:number,material:THREE.Material,y=.15)=>{
    const g=new THREE.PlaneGeometry(w,d);g.rotateX(-Math.PI/2);
    const p=g.getAttribute('position'),uv=g.getAttribute('uv');
    for(let i=0;i<p.count;i++)uv.setXY(i,p.getX(i)/2,p.getZ(i)/2);
    const mesh=new THREE.Mesh(g,material);mesh.position.set(x,y,z);mesh.receiveShadow=true;root.add(mesh);
  };
  for(const p of positions) {
    plane(p.x,p.z,3.7,5.5,materials.stone);
    plane(p.x,p.z,3.2,5,materials.earth,.17);
  }
  // Low stone aprons visually connect the side openings to the city's road surface.
  for(const gate of city.gatehouses.filter(g=>g.z<0)) {
    if(gate.x===194) plane(194,-277,24,7,materials.stone);
    else plane(gate.x<194?gate.x+5:gate.x-5,gate.z,7,18,materials.stone);
  }
  batchStaticArchitecture(root);
  for(const child of [...root.children])if(child instanceof THREE.Mesh&&!child.visible){child.removeFromParent();child.geometry.dispose();}
  return root;
}
