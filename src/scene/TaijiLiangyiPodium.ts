import * as THREE from 'three';
import {createTaijiPodiumGeometry} from './TaijiPodiumGeometry';

export const LIANGYI_PODIUM_TOP=1.575;
const BOTTOM=.34,WIDTH=31,DEPTH=14,STAIR_INNER=6.65,STAIR_OUTER=9.23,STAIR_WIDTH=8,STEPS=8,COURT_Y=.43;

function createCheek(side:number,xSide:number):THREE.BufferGeometry {
  const run=STAIR_OUTER-STAIR_INNER,shape=new THREE.Shape();
  shape.moveTo(0,BOTTOM);shape.lineTo(run,BOTTOM);shape.lineTo(run,COURT_Y);shape.lineTo(0,LIANGYI_PODIUM_TOP);shape.closePath();
  const geometry=new THREE.ExtrudeGeometry(shape,{depth:.3,steps:1,bevelEnabled:false});
  geometry.rotateY(side>0?-Math.PI/2:Math.PI/2);geometry.computeBoundingBox();
  const box=geometry.boundingBox!,centerX=(box.min.x+box.max.x)/2;
  geometry.translate(xSide*(STAIR_WIDTH/2-.15)-centerX,0,side*STAIR_INNER);
  geometry.computeVertexNormals();return geometry;
}

export function createLiangyiPodium(material:THREE.Material):THREE.Group {
  const root=new THREE.Group();root.name='liangyi-profiled-podium';
  const profile=createTaijiPodiumGeometry();
  const scaleY=(LIANGYI_PODIUM_TOP-BOTTOM)/(2.07-.28);
  profile.scale(WIDTH/43.8,scaleY,DEPTH/21.8);profile.translate(0,BOTTOM-.28*scaleY,0);
  const podium=new THREE.Mesh(profile,material);podium.name='liangyi-profiled-stone';podium.castShadow=podium.receiveShadow=true;root.add(podium);
  const rise=(LIANGYI_PODIUM_TOP-COURT_Y)/STEPS,run=STAIR_OUTER-STAIR_INNER;
  for(const side of [-1,1])for(let step=0;step<STEPS;step++) {
    const outer=STAIR_OUTER-step*run/STEPS,top=COURT_Y+(step+1)*rise;
    const geometry=new THREE.BoxGeometry(STAIR_WIDTH,top-BOTTOM,outer-STAIR_INNER);
    const mesh=new THREE.Mesh(geometry,material);mesh.name='liangyi-stair-tread';
    mesh.position.set(0,BOTTOM+(top-BOTTOM)/2,side*(STAIR_INNER+outer)/2);mesh.castShadow=mesh.receiveShadow=true;mesh.userData.top=top;root.add(mesh);
  }
  for(const side of [-1,1])for(const xSide of [-1,1]) {
    const cheek=new THREE.Mesh(createCheek(side,xSide),material);cheek.name='liangyi-stair-cheek';cheek.castShadow=cheek.receiveShadow=true;root.add(cheek);
  }
  return root;
}
