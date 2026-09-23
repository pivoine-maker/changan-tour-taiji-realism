import * as THREE from 'three';
import type { ChanganCityModel } from '../data/changanCity';

/** A single low soil transition batch, contained under each existing eave. */
export function createCityGroundContact(city:ChanganCityModel,map:THREE.Texture) {
 const positions:number[]=[],uvs:number[]=[],colors:number[]=[];
 const buildings=city.wards.flatMap(w=>w.buildings);
 for(const [index,b] of buildings.entries()) {
  const rotation=b.rotation??0,cos=Math.cos(rotation),sin=Math.sin(rotation);
  const corners=[[-1,-1],[1,-1],[1,1],[-1,1]];
  const vertex=(corner:number,outer:boolean)=>{
   const [sx,sz]=corners[corner%4];
   const spread=outer?.36+.12*(.5+.5*Math.sin(index*2.7+corner*4.1)):.17;
   const x=sx*(b.width/2+spread),z=sz*(b.depth/2+spread);
   const wx=b.x+x*cos+z*sin,wz=b.z-x*sin+z*cos;
   positions.push(wx,.14,wz);uvs.push(wx/4,wz/4);
   colors.push(.52,.46,.36,outer?0:.32);
  };
  for(let side=0;side<4;side++) {
   for(const [corner,outer] of [[side,0],[side+1,1],[side,1],[side,0],[side+1,0],[side+1,1]])vertex(corner,!!outer);
  }
 }
 const geometry=new THREE.BufferGeometry();
 geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
 geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
 geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,4));geometry.computeVertexNormals();
 const material=new THREE.MeshStandardMaterial({map,vertexColors:true,transparent:true,depthWrite:false,roughness:1,side:THREE.DoubleSide});
 const mesh=new THREE.Mesh(geometry,material);mesh.name='city-foundation-soil-transitions';mesh.receiveShadow=true;
 mesh.userData.buildingCount=buildings.length;mesh.userData.maxLocalOverhang=.48;
 return mesh;
}
