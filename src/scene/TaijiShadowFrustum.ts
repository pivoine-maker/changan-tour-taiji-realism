import * as THREE from 'three';

export const TAIJI_SHADOW_BOUNDS=new THREE.Box3(
  new THREE.Vector3(120,0,95),
  new THREE.Vector3(270,22,298)
);

/** Fits only the shadow projection; the authored sun and target pose stay unchanged. */
export function fitDirectionalShadowToBounds(
  light:THREE.DirectionalLight,
  bounds:THREE.Box3=TAIJI_SHADOW_BOUNDS,
  margin=5
):THREE.OrthographicCamera {
  light.updateMatrixWorld(true);light.target.updateMatrixWorld(true);
  light.shadow.updateMatrices(light);
  const camera=light.shadow.camera;
  const inverse=camera.matrixWorld.clone().invert();
  let minX=Infinity,maxX=-Infinity,minY=Infinity,maxY=-Infinity,minZ=Infinity,maxZ=-Infinity;
  const point=new THREE.Vector3();
  for(const x of [bounds.min.x,bounds.max.x])for(const y of [bounds.min.y,bounds.max.y])for(const z of [bounds.min.z,bounds.max.z]){
    point.set(x,y,z).applyMatrix4(inverse);
    minX=Math.min(minX,point.x);maxX=Math.max(maxX,point.x);
    minY=Math.min(minY,point.y);maxY=Math.max(maxY,point.y);
    minZ=Math.min(minZ,point.z);maxZ=Math.max(maxZ,point.z);
  }
  camera.left=minX-margin;camera.right=maxX+margin;
  camera.bottom=minY-margin;camera.top=maxY+margin;
  camera.near=Math.max(.1,-maxZ-margin);camera.far=Math.max(camera.near+.1,-minZ+margin);
  camera.updateProjectionMatrix();
  return camera;
}
