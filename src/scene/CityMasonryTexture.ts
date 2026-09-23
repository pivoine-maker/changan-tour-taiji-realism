import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** Bake modest wall batches once, sharing the caller's material and matching path/raster UVs. */
export function createMeterScaledMasonry(source:THREE.InstancedMesh,metresPerRepeat=3):THREE.Mesh {
  const parts:THREE.BufferGeometry[]=[],matrix=new THREE.Matrix4();
  for(let index=0;index<source.count;index++) {
    source.getMatrixAt(index,matrix);
    const geometry=source.geometry.clone().applyMatrix4(matrix);
    const p=geometry.getAttribute('position'),n=geometry.getAttribute('normal'),uv=geometry.getAttribute('uv');
    for(let i=0;i<p.count;i++) {
      const top=Math.abs(n.getY(i))>.5;
      uv.setXY(i,(top||Math.abs(n.getZ(i))>.5?p.getX(i):p.getZ(i))/metresPerRepeat,(top?p.getZ(i):p.getY(i))/metresPerRepeat);
    }
    parts.push(geometry);
  }
  const merged=mergeGeometries(parts);parts.forEach(g=>g.dispose());
  if(!merged)throw new Error('Cannot combine city wall geometry');
  const result=new THREE.Mesh(merged,source.material);result.name=source.name+'-metric';
  result.position.copy(source.position);result.quaternion.copy(source.quaternion);result.scale.copy(source.scale);
  result.castShadow=source.castShadow;result.receiveShadow=source.receiveShadow;
  return result;
}
