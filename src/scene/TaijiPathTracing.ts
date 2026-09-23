import {createPathTraceEnvironment} from './PathTraceEnvironment';
import { disposePathTracer023 } from './PathTracerDisposal';
import * as THREE from 'three';
import { WebGLPathTracer } from 'three-gpu-pathtracer';
import { GenerateMeshBVHWorker } from 'three-mesh-bvh/src/workers/GenerateMeshBVHWorker.js';
import { copyGeometryAttributes, expandInstancedGeometry } from './PathTraceGeometry';

export interface TaijiPathTracingController {
  readonly samples:number;
  readonly failed:boolean;
  render():boolean;
  dispose():void;
}

const MAX_VERTICES=8_000_000;
const IDLE_MS=500;
const textureSlots=['map','normalMap','roughnessMap','metalnessMap','alphaMap','emissiveMap','aoMap'] as const;
const changed=(a:THREE.Matrix4,b:THREE.Matrix4)=>a.elements.some((v,i)=>Math.abs(v-b.elements[i])>1e-5);

/** Genuine progressive light transport; all original raster resources remain separately owned. */
export async function createTaijiPathTracing(
  renderer:THREE.WebGLRenderer,source:THREE.Scene,camera:THREE.Camera,
  environment:THREE.Texture,actor:THREE.Object3D,onStatus:(message:string)=>void,signal:AbortSignal
):Promise<TaijiPathTracingController> {
  signal.throwIfAborted();
  source.updateMatrixWorld(true);
  const initialActorMatrix=actor.matrixWorld.clone();
  const meshes:THREE.Mesh[]=[];
  let vertices=0;
  source.traverseVisible(object=>{
    if(!(object instanceof THREE.Mesh)||object.name==='walk-plane')return;
    const list=Array.isArray(object.material)?object.material:[object.material];
    if(!list.every(m=>m instanceof THREE.MeshStandardMaterial))return;
    const count=object.geometry.attributes.position?.count??0;
    vertices+=count*(object instanceof THREE.InstancedMesh?object.count:1);meshes.push(object);
  });
  if(vertices>MAX_VERTICES)throw new Error(`场景需要展开${Math.round(vertices/1e6*10)/10}百万顶点，超出本次光照试验的内存上限。`);
  const scene=new THREE.Scene();
  scene.background=source.background instanceof THREE.Color?source.background.clone():new THREE.Color(0xb8c5cb);
  scene.environment=environment;scene.environmentIntensity=source.environmentIntensity;
  scene.environmentRotation.copy(source.environmentRotation);
  const hemispheres:THREE.HemisphereLight[]=[];
    source.traverseVisible(object=>{
      if(object instanceof THREE.HemisphereLight){const light=object.clone();light.position.copy(object.getWorldPosition(new THREE.Vector3()));hemispheres.push(light);return;}
      if(!(object instanceof THREE.DirectionalLight))return;
      const light=object.clone();light.position.copy(object.getWorldPosition(new THREE.Vector3()));
      light.target.position.copy(object.target.getWorldPosition(new THREE.Vector3()));scene.add(light,light.target);
    });
  const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>(),textures=new Set<THREE.Texture>();
  const materialCache=new Map<string,THREE.MeshStandardMaterial>();
  const textureCache=new Map<THREE.Texture,THREE.Texture>();
  const actorCopies:{source:THREE.Mesh;copy:THREE.Mesh}[]=[];
  let tracer:WebGLPathTracer|undefined,worker:GenerateMeshBVHWorker|undefined,disposed=false,failed=false;
  const dispose=()=>{
    if(disposed)return;disposed=true;
    signal.removeEventListener('abort',dispose);
    worker?.dispose();if(tracer)disposePathTracer023(tracer);geometries.forEach(g=>g.dispose());
    materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());scene.clear();
  };
  signal.addEventListener('abort',dispose,{once:true});
  const copyMaterial=(material:THREE.Material,colors:boolean,castShadow:boolean)=>{
    const key=material.uuid+':'+colors+':'+castShadow;
    const cached=materialCache.get(key);if(cached)return cached;
    const result=(material as THREE.MeshStandardMaterial).clone();
    // 0.0.23 enumerates every material texture into a sampler2D atlas, including
    // envMap, although its material model only supports scene.environment.
    // The raster pool's cube render target cannot be rebound as TEXTURE_2D.
    // Traced reflections use the copied scene geometry and HDR environment;
    // leave the raster reflection texture and its owner completely untouched.
    // The pinned path material supports normal maps, not bump maps.
    // Avoid uploading unused height proxies; raster ownership and relief stay intact.
    result.envMap=null;result.bumpMap=null;
    result.vertexColors=colors;(result as THREE.MeshStandardMaterial&{castShadow:boolean}).castShadow=castShadow;
    for(const slot of textureSlots){
      const original=result[slot];if(!original)continue;
      let texture=textureCache.get(original);
      if(!texture){texture=original.clone();texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.needsUpdate=true;textureCache.set(original,texture);textures.add(texture);}
      result[slot]=texture;
    }
    materials.add(result);materialCache.set(key,result);return result;
  };
  const build=async()=>{
    let timer:ReturnType<typeof setTimeout>|undefined;
    try {
      await Promise.race([
        tracer!.setSceneAsync(scene,camera,{onProgress:p=>{if(!disposed)onStatus(`正在准备光照 ${Math.round(p*100)}%`);}}),
        new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error('光照准备超过45秒，已保留实时画面。')),45000);})
      ]);
    } finally {if(timer)clearTimeout(timer);}
  };
  try {
    if(hemispheres.length){
      const converted=createPathTraceEnvironment(environment as THREE.DataTexture,hemispheres,source.environmentIntensity,source.environmentRotation);
      textures.add(converted.texture);scene.environment=converted.texture;scene.environmentIntensity=converted.environmentIntensity;
    }
    onStatus('正在准备静观光照');
    for(let i=0;i<meshes.length;i++){
      signal.throwIfAborted();
      const original=meshes[i];
      const geometry=original instanceof THREE.InstancedMesh?expandInstancedGeometry(original,MAX_VERTICES):copyGeometryAttributes(original.geometry);
      geometries.add(geometry);
      const color=!!geometry.getAttribute('color');
      const material=Array.isArray(original.material)?original.material.map(m=>copyMaterial(m,color,original.castShadow)):copyMaterial(original.material,color,original.castShadow);
      const copy=new THREE.Mesh(geometry,material);copy.name=original.name;
      if(!(original instanceof THREE.InstancedMesh)){copy.matrix.copy(original.matrixWorld);copy.matrixAutoUpdate=false;}
      scene.add(copy);
      let parent:THREE.Object3D|null=original;
      while(parent&&parent!==actor)parent=parent.parent;
      if(parent===actor)actorCopies.push({source:original,copy});
      if(i%32===0)await new Promise<void>(resolve=>setTimeout(resolve,0));
    }
    signal.throwIfAborted();
    tracer=new WebGLPathTracer(renderer);worker=new GenerateMeshBVHWorker();tracer.setBVHWorker(worker);
    tracer.bounces=3;tracer.tiles.set(3,3);tracer.textureSize.set(1024,1024);
    tracer.minSamples=5;tracer.fadeDuration=0;tracer.renderDelay=0;
    tracer.rasterizeScene=false;tracer.dynamicLowRes=false;tracer.renderScale=1;
    await build();
    signal.throwIfAborted();
    tracer.updateCamera();
    const cameraMatrix=camera.matrixWorld.clone(),projection=camera.projectionMatrix.clone(),actorMatrix=actor.matrixWorld.clone();
    let lastMotion=performance.now(),actorDirty=changed(initialActorMatrix,actor.matrixWorld),rebuilding=false,lastStatus=-1;
    onStatus('静止后逐步细化光照');
    return {
      get samples(){return tracer?.samples??0;},get failed(){return failed;},dispose,
      render(){
        if(disposed||failed)return false;
        camera.updateMatrixWorld();actor.updateWorldMatrix(true,false);
        const cameraMoved=changed(camera.matrixWorld,cameraMatrix)||changed(camera.projectionMatrix,projection);
        const actorMoved=changed(actor.matrixWorld,actorMatrix);
        if(cameraMoved||actorMoved){
          lastMotion=performance.now();actorDirty ||= actorMoved;
          cameraMatrix.copy(camera.matrixWorld);projection.copy(camera.projectionMatrix);actorMatrix.copy(actor.matrixWorld);
          tracer!.updateCamera();tracer!.reset();
          if(lastStatus!==-1)onStatus('实时移动 · 静止后重新细化光照');
          lastStatus=-1;return false;
        }
        if(performance.now()-lastMotion<IDLE_MS||rebuilding)return false;
        if(actorDirty){
          source.updateMatrixWorld(true);actorCopies.forEach(pair=>{pair.copy.matrix.copy(pair.source.matrixWorld);pair.copy.matrixWorldNeedsUpdate=true;});
          actorDirty=false;rebuilding=true;
          void build().then(()=>{rebuilding=false;lastMotion=performance.now();}).catch(error=>{failed=true;onStatus(String(error));dispose();});
          return false;
        }
        try {
          tracer!.pausePathTracing=tracer!.samples>=128;tracer!.renderSample();
          const sample=Math.floor(tracer!.samples);
          if(sample!==lastStatus){lastStatus=sample;onStatus(sample>=128?'光照已细化 · 移动后重新计算':`正在细化光照 ${sample}/128`);}
          return tracer!.samples>=tracer!.minSamples;
        } catch(error){failed=true;onStatus(`静观光照不可用，已回到实时画面：${String(error)}`);dispose();return false;}
      }
    };
  } catch(error){dispose();throw error;}
}
