import * as THREE from 'three';

const SEGMENTS=4,OUTER_RADIUS=.08,THICKNESS=.014;

/** Low-cost open-bottom cover shell for repeated subsidiary roof runs. */
export function createSimpleRoofCoverGeometry():THREE.BufferGeometry {
  const positions:number[]=[],normals:number[]=[],uvs:number[]=[],indices:number[]=[];
  const rings=[{z:-.5,r:OUTER_RADIUS},{z:.43,r:OUTER_RADIUS},{z:.5,r:.087}];
  const add=(z:number,r:number,inner:boolean,frontNormal=false)=>{
    for(let i=0;i<=SEGMENTS;i++) {
      const theta=i/SEGMENTS*Math.PI,x=-Math.cos(theta)*r,y=Math.sin(theta)*r;
      positions.push(x,y,z);
      if(frontNormal)normals.push(0,0,1);else normals.push((inner?1:-1)*Math.cos(theta),(inner?-1:1)*Math.sin(theta),0);
      uvs.push(i/SEGMENTS,z+.5);
    }
  };
  rings.forEach(ring=>add(ring.z,ring.r,false));
  const innerRings=[rings[0],rings[2]];
  innerRings.forEach(ring=>add(ring.z,ring.r-THICKNESS,true));
  const stride=SEGMENTS+1,outer=0,inner=rings.length*stride;
  for(let ring=0;ring<rings.length-1;ring++)for(let i=0;i<SEGMENTS;i++) {
    const a=outer+ring*stride+i,b=a+1,c=a+stride,d=c+1;
    indices.push(a,c,b,b,c,d);
  }
  for(let i=0;i<SEGMENTS;i++) {
    const a=inner+i,b=a+1,c=a+stride,d=c+1;
    indices.push(a,b,c,b,d,c);
  }
  // Duplicate the downstream rim so its molded thickness has a crisp forward normal.
  const frontOffset=positions.length/3;
  add(.5,.087,false,true);add(.5,.087-THICKNESS,true,true);
  for(let i=0;i<SEGMENTS;i++) {
    const a=frontOffset+i,b=a+1,c=frontOffset+stride+i,d=c+1;
    indices.push(a,c,b,b,c,d);
  }
  const geometry=new THREE.BufferGeometry();
  geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
  geometry.setIndex(indices);return geometry;
}

export function createSimpleRoofTileMatrix(a:THREE.Vector3,b:THREE.Vector3,seat=.02):THREE.Matrix4 {
  const forward=b.clone().sub(a);const length=forward.length();
  if(!(length>1e-6))throw new Error('Roof tile segment must have length');
  forward.multiplyScalar(1/length);
  const normal=new THREE.Vector3(0,1,0).addScaledVector(forward,-forward.y);
  if(normal.lengthSq()<1e-8)normal.set(0,0,1);else normal.normalize();
  const right=new THREE.Vector3().crossVectors(normal,forward).normalize();
  return new THREE.Matrix4().makeBasis(right,normal,forward)
    .scale(new THREE.Vector3(1,1,length))
    .setPosition(a.clone().add(b).multiplyScalar(.5).addScaledVector(normal,seat));
}
