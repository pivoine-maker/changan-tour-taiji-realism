import * as THREE from 'three';

export interface PoolReflectionProbe {
  texture: THREE.CubeTexture;
  dispose(): void;
}

/**
 * Captures one static, local reflection approximation for the Taiji garden pool.
 * The caller owns the returned probe and may assign its texture to a material.
 */
export function createPoolReflectionProbe(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  waterMesh: THREE.Object3D,
  exclusions: THREE.Object3D[] = [],
): PoolReflectionProbe {
  const renderTarget = new THREE.WebGLCubeRenderTarget(256, {
    type: THREE.HalfFloatType,
    generateMipmaps: true,
    minFilter: THREE.LinearMipmapLinearFilter,
  });
  renderTarget.texture.mapping = THREE.CubeReflectionMapping;

  const cubeCamera = new THREE.CubeCamera(0.05, 350, renderTarget);
  // Sample open water: the geometric pond center lies underneath the crossing stone path.
  cubeCamera.position.set(187.65, 0.34, 271.5);
  cubeCamera.updateMatrixWorld(true);

  const hidden = [...new Set<THREE.Object3D>([waterMesh, ...exclusions])];
  const visibility = hidden.map((object) => object.visible);
  const lods: THREE.LOD[] = [];
  scene.traverse((object) => { if (object instanceof THREE.LOD) lods.push(object); });
  const lodAutoUpdate = lods.map((lod) => lod.autoUpdate);
  const previousTarget = renderer.getRenderTarget();
  const previousCubeFace = renderer.getActiveCubeFace();
  const previousMipmapLevel = renderer.getActiveMipmapLevel();
  const previousXrEnabled = renderer.xr.enabled;
  const previousGenerateMipmaps = renderTarget.texture.generateMipmaps;

  let captureSucceeded = false;
  try {
    for (const object of hidden) object.visible = false;
    for (const lod of lods) lod.autoUpdate = false;
    cubeCamera.update(renderer, scene);
    captureSucceeded = true;
  } finally {
    hidden.forEach((object, index) => { object.visible = visibility[index]; });
    lods.forEach((lod, index) => { lod.autoUpdate = lodAutoUpdate[index]; });
    renderer.setRenderTarget(previousTarget, previousCubeFace, previousMipmapLevel);
    renderer.xr.enabled = previousXrEnabled;
    renderTarget.texture.generateMipmaps = previousGenerateMipmaps;
    // Hidden dynamic objects must be represented again when the frozen pilot
    // shadow cache is next rendered.
    renderer.shadowMap.needsUpdate = true;
    if (!captureSucceeded) renderTarget.dispose();
  }

  let disposed = false;
  return {
    texture: renderTarget.texture,
    dispose(): void {
      if (disposed) return;
      disposed = true;
      renderTarget.dispose();
    },
  };
}
