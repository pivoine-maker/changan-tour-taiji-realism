import * as THREE from 'three';

export interface TaijiTreeFrame {
  groundPosition:THREE.Vector3;
  localMatrix:THREE.Matrix4;
  worldMatrix:THREE.Matrix4;
  targetHeight:number;
}

/** One deterministic frame shared by the woody mesh and its branch-aligned foliage. */
export function calculateTaijiTreeFrame(
  position:readonly [number,number],index:number,sourceHeight:number,groundY:number,outerStart:number
):TaijiTreeFrame {
  if(!(sourceHeight>0&&Number.isFinite(sourceHeight)))throw new Error('Tree source height must be positive');
  const mature=index>=outerStart;
  const targetHeight=mature?9.8+(index*13%7)*.38:6.4+(index*13%7)*.26;
  const scale=targetHeight/sourceHeight;
  const rotation=new THREE.Quaternion().setFromEuler(new THREE.Euler(0,index*2.399,0));
  const localMatrix=new THREE.Matrix4().compose(
    new THREE.Vector3(),rotation,new THREE.Vector3(scale*(1.55+(index%3)*.05),scale,scale*1.45)
  );
  const groundPosition=new THREE.Vector3(position[0],groundY,position[1]);
  const worldMatrix=new THREE.Matrix4().makeTranslation(...groundPosition.toArray()).multiply(localMatrix);
  return {groundPosition,localMatrix,worldMatrix,targetHeight};
}
