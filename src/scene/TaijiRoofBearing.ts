import * as THREE from 'three';
import {calculateRoofHeight,type TaijiRoofProfile} from './TaijiRoofProfile';

export interface RoofBearingOptions {
  roofWidth:number;roofDepth:number;roofBase:number;roofRise:number;
  centerX:number;centerZ:number;width:number;depth:number;bottom:number;profile:TaijiRoofProfile;
}

export function calculateRoofUndersideAt(options:RoofBearingOptions,x:number,z:number):number {
  const ridge=Math.max(.1,(options.roofWidth-options.roofDepth)*.5);
  const frontT=THREE.MathUtils.clamp(Math.abs(z)/(options.roofDepth/2),0,1);
  const sideT=THREE.MathUtils.clamp((Math.abs(x)-ridge)/(options.roofWidth/2-ridge),0,1);
  const useSide=sideT>frontT;
  const t=useSide?sideT:frontT;
  const half=useSide?options.roofDepth/2*t:THREE.MathUtils.lerp(ridge,options.roofWidth/2,t);
  const cross=useSide?z:x;
  const u=THREE.MathUtils.clamp((cross/Math.max(half,1e-6)+1)/2,0,1);
  return calculateRoofHeight(options.roofBase,options.roofRise,u,t,options.profile)-.16;
}

/** A flat-bottom timber bearing whose four top corners meet the roof underside. */
export function createRoofBearingGeometry(options:RoofBearingOptions):THREE.BufferGeometry {
  const hx=options.width/2,hz=options.depth/2;
  const corners:[number,number][]=[[-hx,-hz],[hx,-hz],[hx,hz],[-hx,hz]];
  const positions:number[]=[];
  for(const [x,z] of corners)positions.push(x,options.bottom,z);
  for(const [x,z] of corners)positions.push(x,calculateRoofUndersideAt(options,options.centerX+x,options.centerZ+z),z);
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,1,1,0,1,0,0,1,0,1,1,0,1],2));
  geometry.setIndex([0,1,2,0,2,3,4,6,5,4,7,6,0,5,1,0,4,5,1,6,2,1,5,6,2,7,3,2,6,7,3,4,0,3,7,4]);
  geometry.computeVertexNormals();return geometry;
}
