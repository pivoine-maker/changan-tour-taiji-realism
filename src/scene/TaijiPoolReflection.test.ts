import * as THREE from 'three';
import { afterEach, vi } from 'vitest';
import { createPoolReflectionProbe } from './TaijiPoolReflection';

afterEach(() => vi.restoreAllMocks());

function rendererStub() {
  let target: THREE.WebGLRenderTarget | null = new THREE.WebGLRenderTarget(1, 1);
  let face = 3;
  let mip = 2;
  return {
    coordinateSystem: THREE.WebGLCoordinateSystem,
    xr: { enabled: true },
    shadowMap: { needsUpdate: false },
    getRenderTarget: () => target,
    getActiveCubeFace: () => face,
    getActiveMipmapLevel: () => mip,
    setRenderTarget: (next: THREE.WebGLRenderTarget | null, nextFace = 0, nextMip = 0) => {
      target = next;
      face = nextFace;
      mip = nextMip;
    },
    state: () => ({ target, face, mip }),
  };
}

it('captures once from the pool center while temporarily hiding exclusions', () => {
  const renderer = rendererStub();
  const scene = new THREE.Scene();
  const lod = new THREE.LOD();
  const near = new THREE.Object3D();
  const far = new THREE.Object3D();
  lod.addLevel(near, 0);
  lod.addLevel(far, 10);
  near.visible = false;
  far.visible = true;
  scene.add(lod);
  const water = new THREE.Mesh(new THREE.PlaneGeometry(), new THREE.MeshBasicMaterial());
  const traveler = new THREE.Group();
  water.visible = true;
  traveler.visible = false;
  const update = vi.spyOn(THREE.CubeCamera.prototype, 'update').mockImplementation(function (this: THREE.CubeCamera) {
    expect(this.position.toArray()).toEqual([187.65, 0.34, 271.5]);
    expect(this.matrixWorld.elements[13]).toBeCloseTo(0.34);
    expect(water.visible).toBe(false);
    expect(traveler.visible).toBe(false);
    expect(lod.autoUpdate).toBe(false);
    expect([near.visible, far.visible]).toEqual([false, true]);
  });

  const probe = createPoolReflectionProbe(
    renderer as unknown as THREE.WebGLRenderer,
    scene,
    water,
    [traveler],
  );
  expect(update).toHaveBeenCalledTimes(1);
  expect(water.visible).toBe(true);
  expect(traveler.visible).toBe(false);
  expect(lod.autoUpdate).toBe(true);
  expect([near.visible, far.visible]).toEqual([false, true]);
  expect(probe.texture.type).toBe(THREE.HalfFloatType);
  expect(probe.texture.generateMipmaps).toBe(true);
  expect(probe.texture.image).toHaveLength(6);
});

it('restores renderer and visibility state even when capture throws', () => {
  const renderer = rendererStub();
  const initial = renderer.state();
  const water = new THREE.Mesh();
  const traveler = new THREE.Group();
  const scene = new THREE.Scene();
  const lod = new THREE.LOD();
  const lodChild = new THREE.Object3D();
  lod.addLevel(lodChild, 0);
  lod.autoUpdate = true;
  lodChild.visible = false;
  scene.add(lod);
  traveler.visible = true;
  vi.spyOn(THREE.CubeCamera.prototype, 'update').mockImplementation(() => {
    water.visible = false;
    traveler.visible = false;
    renderer.xr.enabled = false;
    renderer.setRenderTarget(new THREE.WebGLCubeRenderTarget(2), 5, 1);
    expect(lod.autoUpdate).toBe(false);
    expect(lodChild.visible).toBe(false);
    throw new Error('capture failed');
  });

  expect(() => createPoolReflectionProbe(
    renderer as unknown as THREE.WebGLRenderer,
    scene,
    water,
    [traveler],
  )).toThrow('capture failed');
  expect(water.visible).toBe(true);
  expect(traveler.visible).toBe(true);
  expect(renderer.xr.enabled).toBe(true);
  expect(renderer.state()).toEqual(initial);
  expect(renderer.shadowMap.needsUpdate).toBe(true);
  expect(lod.autoUpdate).toBe(true);
  expect(lodChild.visible).toBe(false);
});

it('disposes only its render target and is idempotent', () => {
  vi.spyOn(THREE.CubeCamera.prototype, 'update').mockImplementation(() => undefined);
  const disposeTarget = vi.spyOn(THREE.WebGLCubeRenderTarget.prototype, 'dispose');
  const renderer = rendererStub();
  const waterGeometry = new THREE.PlaneGeometry();
  const waterMaterial = new THREE.MeshPhysicalMaterial();
  const water = new THREE.Mesh(waterGeometry, waterMaterial);
  const probe = createPoolReflectionProbe(
    renderer as unknown as THREE.WebGLRenderer,
    new THREE.Scene(),
    water,
  );
  const disposeGeometry = vi.spyOn(waterGeometry, 'dispose');
  const disposeMaterial = vi.spyOn(waterMaterial, 'dispose');
  probe.dispose();
  probe.dispose();
  expect(disposeTarget).toHaveBeenCalledTimes(1);
  expect(disposeGeometry).not.toHaveBeenCalled();
  expect(disposeMaterial).not.toHaveBeenCalled();
});
