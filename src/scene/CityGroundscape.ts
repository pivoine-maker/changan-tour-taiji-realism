import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { ChanganCityModel } from '../data/changanCity';

function noise(x:number,z:number):number {
 const ix=Math.floor(x),iz=Math.floor(z),fx=x-ix,fz=z-iz;
 const hash=(a:number,b:number)=>{const v=Math.sin(a*127.1+b*311.7)*43758.5453;return v-Math.floor(v);};
 const u=fx*fx*(3-2*fx),v=fz*fz*(3-2*fz);
 return THREE.MathUtils.lerp(THREE.MathUtils.lerp(hash(ix,iz),hash(ix+1,iz),u),THREE.MathUtils.lerp(hash(ix,iz+1),hash(ix+1,iz+1),u),v);
}
/** Real geometry and vertex colours are shared by raster and static lighting. */
export function createCityGroundscape(city:ChanganCityModel,earth:THREE.Texture):THREE.Group {
 const group=new THREE.Group();group.name='city-groundscape';const b=city.bounds;
 const soil=new THREE.Color(0xd6c6aa),dust=new THREE.Color(0xe9dfcc),field=new THREE.Color(0x929b75);
 const make=(minX:number,maxX:number,minZ:number,maxZ:number,inside:boolean)=>{
  const g=new THREE.PlaneGeometry(maxX-minX,maxZ-minZ,Math.ceil((maxX-minX)/10),Math.ceil((maxZ-minZ)/10));g.rotateX(-Math.PI/2);g.translate((minX+maxX)/2,inside?.115:-.045,(minZ+maxZ)/2);
  const p=g.getAttribute('position'),uv=g.getAttribute('uv'),colors:number[]=[];
  for(let i=0;i<p.count;i++){
   const x=p.getX(i),z=p.getZ(i),large=noise(x*.035,z*.035),small=noise(x*.17+9,z*.17-7);
   const c=soil.clone().lerp(dust,.25+.65*large);
   if(!inside){
    const wallDistance=Math.max(b.minX-x,x-b.maxX,b.minZ-z,z-b.maxZ,0);
    const pathDistance=x<b.minX||x>b.maxX?Math.abs(z+36):Math.abs(x-194);
    const track=1-THREE.MathUtils.smoothstep(pathDistance,6,16);
    const green=THREE.MathUtils.smoothstep(wallDistance,6,48)*(1-track)*(.18+.72*noise(x*.012+3,z*.012+8));
    c.lerp(field,green);c.multiplyScalar(.86+.12*small);
   }else c.multiplyScalar(.92+.08*small);
   colors.push(c.r,c.g,c.b);uv.setXY(i,x/4,z/4);
  }
  g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));return g;
 };
 const material=()=>new THREE.MeshStandardMaterial({map:earth,vertexColors:true,roughness:1});
 const inside=new THREE.Mesh(make(b.minX,b.maxX,b.minZ,b.maxZ,true),material());inside.name='city-soil-tones';inside.receiveShadow=true;group.add(inside);
 const margin=520,parts=[make(b.minX-margin,b.minX,b.minZ-margin,b.maxZ+margin,false),make(b.maxX,b.maxX+margin,b.minZ-margin,b.maxZ+margin,false),make(b.minX,b.maxX,b.minZ-margin,b.minZ,false),make(b.minX,b.maxX,b.maxZ,b.maxZ+margin,false)];
 const outside=new THREE.Mesh(mergeGeometries(parts)!,material());parts.forEach(g=>g.dispose());outside.name='city-exterior-plain';outside.receiveShadow=true;group.add(outside);
 return group;
}
