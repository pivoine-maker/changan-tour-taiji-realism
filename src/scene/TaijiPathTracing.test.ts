import * as THREE from 'three';
import {beforeEach, expect, it, vi} from 'vitest';
// Exercise the installed dependency's actual texture enumeration contract.
// @ts-expect-error Pinned dependency exposes no declarations for this internal utility.
import {getTextures} from 'three-gpu-pathtracer/src/core/utils/sceneUpdateUtils.js';
import {createTaijiPathTracing} from './TaijiPathTracing';

const prepared=vi.hoisted(()=>({scene:null as THREE.Scene|null}));
vi.mock('three-gpu-pathtracer',()=>({WebGLPathTracer:class {
  tiles=new THREE.Vector2();textureSize=new THREE.Vector2();
  setBVHWorker(){}
  async setSceneAsync(scene:THREE.Scene){prepared.scene=scene;}
  updateCamera(){}
}}));
vi.mock('three-mesh-bvh/src/workers/GenerateMeshBVHWorker.js',()=>({GenerateMeshBVHWorker:class {dispose(){}}}));
vi.mock('./PathTracerDisposal',()=>({disposePathTracer023:vi.fn()}));
beforeEach(()=>{prepared.scene=null;});

it('keeps raster cube reflections out of the sampler2D atlas while preserving traced environment and surface maps',async()=>{
  const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(),actor=new THREE.Object3D();
  const reflection=new THREE.WebGLCubeRenderTarget(2);
  const map=new THREE.DataTexture(new Uint8Array([255,255,255,255]),1,1);
  const environment=new THREE.DataTexture(new Float32Array([1,1,1,1]),1,1,THREE.RGBAFormat,THREE.FloatType);
  const bump=new THREE.Texture();
  const material=new THREE.MeshStandardMaterial({map,bumpMap:bump,envMap:reflection.texture,roughness:.24,metalness:.12});
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(2,2),material);scene.add(mesh);
  const cubeDispose=vi.spyOn(reflection.texture,'dispose'),mapDispose=vi.spyOn(map,'dispose'),environmentDispose=vi.spyOn(environment,'dispose');
  const controller=await createTaijiPathTracing({} as THREE.WebGLRenderer,scene,camera,environment,actor,()=>{},new AbortController().signal);
  const copy=prepared.scene!.children.find(child=>child instanceof THREE.Mesh) as THREE.Mesh<THREE.BufferGeometry,THREE.MeshStandardMaterial>;
  const atlasTextures=getTextures([copy.material]) as THREE.Texture[];
  // CubeRenderTarget textures are already bound to TEXTURE_CUBE_MAP by the raster pass.
  // Passing one to the dependency's sampler2D copy pass triggers INVALID_OPERATION.
  expect(atlasTextures.some(texture=>(texture as THREE.CubeTexture).isCubeTexture)).toBe(false);
  expect(copy.material.envMap).toBeNull();expect(copy.material.bumpMap).toBeNull();expect(material.bumpMap).toBe(bump);
  expect(copy.material.roughness).toBe(.24);expect(copy.material.metalness).toBe(.12);
  expect(copy.material.map).not.toBe(map);expect(copy.material.map!.image).toBe(map.image);
  expect(atlasTextures).toEqual([copy.material.map]);
  expect(prepared.scene!.environment).toBe(environment);
  expect(material.envMap).toBe(reflection.texture);expect(material.map).toBe(map);
  const ownedMapDispose=vi.spyOn(copy.material.map!,'dispose');
  controller.dispose();controller.dispose();
  expect(ownedMapDispose).toHaveBeenCalledOnce();
  expect(cubeDispose).not.toHaveBeenCalled();expect(mapDispose).not.toHaveBeenCalled();expect(environmentDispose).not.toHaveBeenCalled();
});
