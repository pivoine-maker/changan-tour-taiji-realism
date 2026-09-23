import {compactInstancesExcluding,NORTH_GATE_SOURCE_ID} from './TaijiInstanceFilter';
import { batchStaticArchitecture } from './StaticBatch';
import * as THREE from 'three';
import { createTaijiArchitecture, createTaijiNeighborOffices, createTaijiPaving, createTaijiSurroundings } from './TaijiArchitecture';
import {TAIJI_NEIGHBOR_OFFICE_IDS} from './TaijiNeighborOffices';

export interface PilotTextures { cityRammed?:THREE.Texture; cityWindow?:THREE.Texture;cityRoof?:THREE.Texture;cityPlaster?:THREE.Texture;cityTimber?:THREE.Texture;cityEarth?:THREE.Texture; stone: THREE.Texture; roof: THREE.Texture; wood: THREE.Texture; wall: THREE.Texture; earth: THREE.Texture; painted?:THREE.Texture;landscapeColor?:THREE.Texture;landscapeNormal?:THREE.Texture;landscapeRoughness?:THREE.Texture }
export function createPilotMaterials(textures: PilotTextures) {
  for (const [name,texture] of Object.entries(textures)) {
    texture.colorSpace = name==='landscapeNormal'||name==='landscapeRoughness'?THREE.NoColorSpace:THREE.SRGBColorSpace;
    texture.wrapS = texture.wrapT = (name.startsWith('landscape')||name.startsWith('city'))?THREE.RepeatWrapping:THREE.MirroredRepeatWrapping;

  }
  // Low-amplitude height detail is derived at runtime from the AI surface luminance.
  // These are approximations, not separately generated or measured normal maps.
  const height = (texture: THREE.Texture) => { const copy=texture.clone();copy.colorSpace=THREE.NoColorSpace;copy.needsUpdate=true;return copy; };
  const stoneHeight=height(textures.stone),roofHeight=height(textures.roof),woodHeight=height(textures.wood);
  const wood = new THREE.MeshStandardMaterial({ map: textures.wood, color: new THREE.Color(0xd3c6b5).multiplyScalar(.62), roughness: .74, bumpMap: woodHeight, bumpScale: .008 });
  wood.userData.grain = true;
  const materials = {
    stone: new THREE.MeshStandardMaterial({ map: textures.stone, color: 0xb7afa0, roughness: .92, bumpMap: stoneHeight, bumpScale: .02 }),
    roof: new THREE.MeshStandardMaterial({ map: textures.roof, color: new THREE.Color(.85, .84, .80), roughness: .92, bumpMap: roofHeight, bumpScale: .014, side: THREE.DoubleSide }),
    wood,
    painted:new THREE.MeshStandardMaterial({map:textures.painted??textures.wood,color:0xc2b59e,roughness:.94}),
    wall: new THREE.MeshStandardMaterial({ map:textures.wall,color:0xb3a99a,roughness:.96 }),
    landscape:new THREE.MeshStandardMaterial({map:textures.landscapeColor??textures.earth,normalMap:textures.landscapeNormal??null,normalScale:new THREE.Vector2(.35,.35),roughnessMap:textures.landscapeRoughness??null,roughness:1,vertexColors:true}),
    earth: new THREE.MeshStandardMaterial({ map:textures.earth,color:0xb7b09b,roughness:1 }),
    darkWood: new THREE.MeshStandardMaterial({ map: textures.wood, color: new THREE.Color(0x948678).multiplyScalar(.8), roughness: .81, side: THREE.DoubleSide }),
    plaster: new THREE.MeshStandardMaterial({ map:textures.stone, color: 0xaaa18d, roughness: .96, bumpMap:stoneHeight,bumpScale:.006 }),
    water: new THREE.MeshPhysicalMaterial({color:0x152d25,roughness:.08,metalness:0,ior:1.333}),
    shadow: new THREE.MeshStandardMaterial({ color: 0x282521, roughness: 1 }),
    bark: new THREE.MeshStandardMaterial({ color: 0x615243, roughness: 1 }),
    foliage: new THREE.MeshStandardMaterial({ color: 0x73845d, roughness: .88, side: THREE.DoubleSide }),
    ochre: new THREE.MeshStandardMaterial({ color: 0x8a784c, roughness: .8 })
  };
  materials.painted.userData.frieze=true;
  Object.entries(materials).forEach(([name,material])=>material.name=name);
  for (const material of [materials.stone, materials.roof, materials.wood, materials.darkWood]) {
    material.onBeforeCompile = shader => {
      shader.fragmentShader = shader.fragmentShader.replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        float surfaceVariation = texture2D(map, vMapUv).g;
        roughnessFactor = clamp(roughnessFactor + (surfaceVariation - 0.45) * 0.28, 0.48, 0.98);`);
      if (material === materials.wood || material === materials.darkWood) {
        shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
          float pigmentLight = dot(diffuseColor.rgb, vec3(.2126,.7152,.0722));
          diffuseColor.rgb = mix(diffuseColor.rgb, vec3(pigmentLight), .24) * .94;`);
      }
      if (material === materials.stone) {
        shader.vertexShader = 'varying vec3 vTaijiWorld;\n' + shader.vertexShader;
        shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
          vec4 weatherPosition=vec4(transformed,1.0);
          #ifdef USE_INSTANCING
            weatherPosition=instanceMatrix*weatherPosition;
          #endif
          vTaijiWorld=(modelMatrix*weatherPosition).xyz;`);
        shader.fragmentShader='varying vec3 vTaijiWorld;\n'+shader.fragmentShader;
        shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>', `#include <map_fragment>
          if(vTaijiWorld.y < 0.65) {
            float patina=sin(vTaijiWorld.x*.43+sin(vTaijiWorld.z*.21))*sin(vTaijiWorld.z*.31);
            float edgeDust=exp(-abs(vTaijiWorld.x-153.0)*.45)+exp(-abs(vTaijiWorld.x-235.0)*.45);
            float wornPath=exp(-pow((vTaijiWorld.x-194.0)*.25,2.0));
            diffuseColor.rgb *= .94 + .055*patina - .12*edgeDust + .04*wornPath;
          }`);
      }
    };
    material.customProgramCacheKey = () => 'taiji-natural-roughness-v3-' + material.name;
  }
  return materials;
}

export function applyTaijiPilot(root: THREE.Object3D, materials: ReturnType<typeof createPilotMaterials>) {
  const hidden: {object: THREE.Object3D; visible: boolean}[] = [];
  root.traverse(object => {
    const replaceTree=object.name==='courtyard-tree' && object.position.x>=138 && object.position.x<=250 && object.position.z>=232 && object.position.z<=262;
    if (replaceTree || [...TAIJI_NEIGHBOR_OFFICE_IDS,'liangyi-hall','liangyi-west-wing','liangyi-east-wing','taiji-hall','chengtian-gate','taiji-west-wing','taiji-east-wing','front-court-west-gallery','front-court-east-gallery','inner-court-garden','garden-west-pavilion','garden-east-pavilion'].some(id=>object.name==='imperial-hall-'+id) || ['taiji-great-court', 'chengtian-forecourt','liangyi-court','inner-garden-pool'].includes(object.userData.courtyardId)) {
      hidden.push({object,visible:object.visible}); object.visible = false;
    }
  });
  const architecture = createTaijiArchitecture(materials), paving = createTaijiPaving(materials), surroundings=createTaijiSurroundings(materials),offices=createTaijiNeighborOffices(root,materials);
  batchStaticArchitecture(architecture);
  batchStaticArchitecture(surroundings);
  const northGateSources=compactInstancesExcluding(root,NORTH_GATE_SOURCE_ID);
  root.add(architecture,paving,surroundings,offices,northGateSources.group);
  let importedTrees: {group:THREE.Group;dispose:()=>void}|undefined;
  let active=true,disposed=false;
  let meshCount=0; architecture.traverse(o=>{if(o instanceof THREE.Mesh) meshCount++;});
  return {
    meshCount,
    installTrees(trees:{group:THREE.Group;foliageMaterial:THREE.MeshStandardMaterial;dispose:()=>void}) {
      importedTrees?.dispose();importedTrees=trees;
      // Keep original garden trees as a load-failure fallback; replace them only once the asset is ready.
      root.traverse(object=>{
        if(object.name==='courtyard-tree'&&object.position.x>=138&&object.position.x<=250&&object.position.z>262&&object.position.z<=288&&!hidden.some(entry=>entry.object===object)){
          const visible=object.visible;hidden.push({object,visible});object.visible=active?false:visible;
        }
      });
      const procedural=paving.getObjectByName('procedural-courtyard-trees')!;
      procedural.traverse(o=>{if(o instanceof THREE.Mesh && !Array.isArray(o.material) && o.material.name==='bark')o.visible=false;});
      const oldFoliage=procedural.getObjectByName('courtyard-foliage') as THREE.Mesh;
      oldFoliage.material=trees.foliageMaterial;
      if(trees.group.getObjectByName('branch-aligned-foliage'))oldFoliage.visible=false;
      root.add(trees.group);trees.group.visible=active;
    },
    setEnabled(enabled: boolean) {
      active=enabled;if(importedTrees)importedTrees.group.visible=enabled;
      architecture.visible=paving.visible=surroundings.visible=offices.visible=enabled;
      northGateSources.group.visible=enabled;
      northGateSources.originals.forEach(({mesh,visible})=>mesh.visible=enabled?false:visible);
      hidden.forEach(({object,visible})=>object.visible=enabled?false:visible);
    },
    dispose() {
      if(disposed)return;disposed=true;active=false;
      importedTrees?.dispose();
      northGateSources.restore();
      northGateSources.group.traverse(o=>{if(o instanceof THREE.InstancedMesh)o.dispose();});northGateSources.group.removeFromParent();
      hidden.forEach(({object,visible})=>object.visible=visible);
      for(const group of [architecture,paving,surroundings,offices]) { group.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();if(o instanceof THREE.InstancedMesh)o.dispose();}); group.removeFromParent(); }
      const heights = new Set(Object.values(materials).map(m=>m.bumpMap).filter((t): t is THREE.Texture=>!!t));
      heights.forEach(t=>t.dispose());
      Object.values(materials).forEach(m=>m.dispose());
    }
  };
}

export async function loadPilotTextures(maxAnisotropy: number): Promise<PilotTextures> {
  const loader = new THREE.TextureLoader();
  const base = `${import.meta.env.BASE_URL}textures/taiji-ai/`;
  const [stone, roof, wood, wall, earth, painted] = await Promise.all(['limestone-surface-v2.png', 'clay-surface-v2.png', 'weathered-vermilion-v3.png','red-lime-plaster-v4.png','compacted-earth-v4.png','painted-beam-v8.png'].map(file => loader.loadAsync(base + file)));
  for (const texture of [stone, roof, wood, wall, earth, painted]) texture.anisotropy = Math.min(8, maxAnisotropy);
  const cityRammed=await loader.loadAsync(`${import.meta.env.BASE_URL}textures/city-ai-v35/rammed-earth.png`);
  const [cityRoof,cityPlaster,cityTimber,cityEarth,cityWindow]=await Promise.all(['roof','plaster','timber','earth','window'].map(name=>loader.loadAsync(`${import.meta.env.BASE_URL}textures/city-ai-v33/${name}.png`)));
  for(const texture of [cityRammed,cityRoof,cityPlaster,cityTimber,cityEarth,cityWindow]){texture.anisotropy=Math.min(8,maxAnisotropy);texture.colorSpace=THREE.SRGBColorSpace;texture.wrapS=texture.wrapT=THREE.RepeatWrapping;}
  const baseTextures={cityRammed,stone,roof,wood,wall,earth,painted,cityRoof,cityPlaster,cityTimber,cityEarth,cityWindow};
  const landscapeResults=await Promise.allSettled(['diff','nor_gl','rough'].map(kind=>loader.loadAsync(`${import.meta.env.BASE_URL}textures/taiji-landscape/grass_ground_${kind}_1k.jpg`)));
  if(landscapeResults.some(result=>result.status==='rejected')){
    for(const result of landscapeResults)if(result.status==='fulfilled')result.value.dispose();
    return baseTextures;
  }
  const [landscapeColor,landscapeNormal,landscapeRoughness]=landscapeResults.map(result=>(result as PromiseFulfilledResult<THREE.Texture>).value);
  for(const texture of [landscapeColor,landscapeNormal,landscapeRoughness])texture.anisotropy=Math.min(8,maxAnisotropy);
  return {...baseTextures,landscapeColor,landscapeNormal,landscapeRoughness};
}
