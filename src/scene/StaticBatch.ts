import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

/** Batch an immutable architectural group without deleting its inspectable source meshes. */
export function batchStaticArchitecture(root: THREE.Group): void {
  root.updateMatrixWorld(true);
  const inverse = root.matrixWorld.clone().invert();
  const batches = new Map<string, {material:THREE.Material;castShadow:boolean;receiveShadow:boolean;geometries: THREE.BufferGeometry[]; originals: THREE.Mesh[]}>();
  root.traverse(object => {
    if (!(object instanceof THREE.Mesh) || object instanceof THREE.InstancedMesh || !object.visible || Array.isArray(object.material)) return;
    const geometry=object.geometry.clone().applyMatrix4(new THREE.Matrix4().multiplyMatrices(inverse,object.matrixWorld));
    if(!geometry.index) geometry.setIndex(Array.from({length:geometry.attributes.position.count},(_,i)=>i));
    const key=object.material.uuid+':'+object.castShadow+':'+object.receiveShadow+':'+Object.keys(geometry.attributes).sort().join(',');
    const entry=batches.get(key) ?? {material:object.material,castShadow:object.castShadow,receiveShadow:object.receiveShadow,geometries:[] as THREE.BufferGeometry[], originals:[] as THREE.Mesh[]};
    entry.geometries.push(geometry);entry.originals.push(object);batches.set(key,entry);
  });
  for(const entry of batches.values()) {
    if(entry.geometries.length<2) { entry.geometries.forEach(g=>g.dispose());continue; }
    const geometry=mergeGeometries(entry.geometries);
    entry.geometries.forEach(g=>g.dispose());
    if(!geometry) continue;
    const mesh=new THREE.Mesh(geometry,entry.material);mesh.name='static-architecture-batch';mesh.castShadow=entry.castShadow;mesh.receiveShadow=entry.receiveShadow;
    root.add(mesh);entry.originals.forEach(o=>o.visible=false);
  }
}
