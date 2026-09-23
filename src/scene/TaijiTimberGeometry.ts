import * as THREE from 'three';

/** A small physical edge bevel keeps structural timber from reading as perfect boxes. */
export function createTimberBeamGeometry(size:[number,number,number]):THREE.BufferGeometry{
  const alongX=size[0]>=size[2],length=alongX?size[0]:size[2];
  const width=alongX?size[2]:size[0],height=size[1];
  const bevel=Math.min(.012,width*.08,height*.08);
  const x=width/2-bevel,y=height/2-bevel;
  const section=new THREE.Shape();
  section.moveTo(-x,-y);section.lineTo(x,-y);section.lineTo(x,y);section.lineTo(-x,y);section.closePath();
  const g=new THREE.ExtrudeGeometry(section,{depth:length-2*bevel,steps:1,bevelEnabled:true,bevelSize:bevel,bevelThickness:bevel,bevelSegments:1,curveSegments:1});
  g.translate(0,0,-length/2+bevel);
  if(alongX)g.rotateY(Math.PI/2);
  return g;
}
