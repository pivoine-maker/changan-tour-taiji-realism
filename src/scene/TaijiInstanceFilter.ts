import * as THREE from 'three';
import type {BuildingBlock} from '../data/world';

export const NORTH_GATE_SOURCE_ID='full-city-gatehouse:north';

export function northGateSourceId(building:BuildingBlock,gatehouses:BuildingBlock[]):string|undefined {
  const north=gatehouses.reduce((best,item)=>item.z>best.z?item:best,gatehouses[0]);
  return building===north?NORTH_GATE_SOURCE_ID:undefined;
}

export interface CompactedInstanceReplacement {
  group:THREE.Group;
  originals:Array<{mesh:THREE.InstancedMesh;visible:boolean}>;
  restore():void;
}

/** Creates borrowed-resource compact copies and hides only batches containing the requested source. */
export function compactInstancesExcluding(root:THREE.Object3D,sourceId:string):CompactedInstanceReplacement {
  root.updateMatrixWorld(true);const inverseRoot=root.matrixWorld.clone().invert(),group=new THREE.Group();
  group.name='compacted-without-'+sourceId;
  const originals:Array<{mesh:THREE.InstancedMesh;visible:boolean}>=[],matrix=new THREE.Matrix4();
  root.traverse(object=>{
    if(!(object instanceof THREE.InstancedMesh))return;
    const ids=object.userData.sourceIds as Array<string|null>|undefined;if(!ids?.includes(sourceId))return;
    const keep=ids.map((id,index)=>({id,index})).filter(item=>item.id!==sourceId);
    const copy=new THREE.InstancedMesh(object.geometry,object.material,keep.length);copy.name='compacted-'+object.name;
    copy.matrix.copy(inverseRoot).multiply(object.matrixWorld);copy.matrixAutoUpdate=false;copy.visible=object.visible;copy.castShadow=object.castShadow;copy.receiveShadow=object.receiveShadow;
    keep.forEach((item,index)=>{object.getMatrixAt(item.index,matrix);copy.setMatrixAt(index,matrix);if(object.instanceColor){const color=new THREE.Color();object.getColorAt(item.index,color);copy.setColorAt(index,color);}});
    copy.userData.sourceIds=keep.map(item=>item.id);copy.instanceMatrix.needsUpdate=true;group.add(copy);
    originals.push({mesh:object,visible:object.visible});object.visible=false;
  });
  let restored=false;return {group,originals,restore(){if(restored)return;restored=true;originals.forEach(item=>item.mesh.visible=item.visible);}};
}
