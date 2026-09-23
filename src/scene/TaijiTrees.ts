import {generateCrownVolume,createCrownLeafMatrix} from './TaijiCrownVolume';
import {boundaryTreePositions} from './TaijiBoundaryLandscape';
import {calculateLeafFrame,type TaijiLeafPlacement} from './TaijiLeafPlacement';
import {calculateFarLeafAreaScale,createTaijiLeafGeometry,createTaijiFarLeafGeometry,FAR_LEAF_RETENTION_STRIDE} from './TaijiLeafGeometry';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { taijiTreePositions,taijiGardenTreePositions } from './TaijiTreePositions';
import {calculateTaijiTreeFrame} from './TaijiTreeFrame';

/** Poly Haven / Rico Cilliers CC0 asset, simplified offline and shared across instances. */
export async function loadTaijiTrees() {
  const asset=await new GLTFLoader().loadAsync(`${import.meta.env.BASE_URL}models/taiji/tree-small-02-wood.glb`);
  const [leafMap,leafNormal]=await Promise.all(['leaf-diff.jpg','leaf-nor_gl.jpg'].map(file=>new THREE.TextureLoader().loadAsync(`${import.meta.env.BASE_URL}models/taiji/${file}`)));
  let leafData:{sourceComponents:number;leaves:TaijiLeafPlacement[]};
  try {
    const response=await fetch(`${import.meta.env.BASE_URL}models/taiji/tree-small-02-leaf-placements.json`);
    if(!response.ok)throw new Error('Branch-aligned leaf placements unavailable');
    leafData=await response.json();
    if(!leafData.leaves.length||leafData.leaves.length>16000||!Number.isFinite(leafData.sourceComponents)||leafData.sourceComponents<leafData.leaves.length)throw new Error('Invalid leaf placement budget');
  } catch(error){
    leafMap.dispose();leafNormal.dispose();
    const released=new Set<THREE.Texture>();
    asset.scene.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material]){for(const value of Object.values(m))if(value instanceof THREE.Texture&&!released.has(value)){released.add(value);value.dispose();}m.dispose();}}});
    throw error;
  }
  leafMap.colorSpace=THREE.SRGBColorSpace;
  const foliageMaterial=new THREE.MeshStandardMaterial({map:leafMap,normalMap:leafNormal,roughness:.92,side:THREE.DoubleSide});
  asset.scene.updateMatrixWorld(true);
  const bounds=new THREE.Box3().setFromObject(asset.scene);
  const height=bounds.max.y-bounds.min.y;
  const treePositions=[...taijiTreePositions,...taijiGardenTreePositions,...boundaryTreePositions];
  const outerStart=taijiTreePositions.length+taijiGardenTreePositions.length;
  // Courtyard planters, garden soil and outside verges have different actual surface elevations.
  const groundHeight=(i:number)=>i<taijiTreePositions.length?.45:i<taijiTreePositions.length+taijiGardenTreePositions.length?.3425:.265;
  const group=new THREE.Group();group.name='taiji-authored-trees';
  const geometries=new Set<THREE.BufferGeometry>();
  const materials=new Set<THREE.Material>();
  const textures=new Set<THREE.Texture>([leafMap,leafNormal]);
  materials.add(foliageMaterial);
  asset.scene.traverse(object=>{
    if(!(object instanceof THREE.Mesh)||Array.isArray(object.material))return;
    const geometry=object.geometry.clone().applyMatrix4(object.matrixWorld);
    geometry.translate(0,-bounds.min.y,0);geometries.add(geometry);
    object.geometry.dispose();
    const material=object.material as THREE.MeshStandardMaterial;
    material.roughness=Math.max(.82,material.roughness);
    material.side=THREE.DoubleSide;materials.add(material);
    for(const value of Object.values(material))if(value instanceof THREE.Texture){value.anisotropy=4;textures.add(value);}
    const mesh=new THREE.InstancedMesh(geometry,material,treePositions.length);
    mesh.name='instanced-authored-tree-'+material.name;
    mesh.castShadow=mesh.receiveShadow=true;
    treePositions.forEach(([x,z],i)=>{
      mesh.setMatrixAt(i,calculateTaijiTreeFrame([x,z],i,height,groundHeight(i),outerStart).worldMatrix);
    });
    group.add(mesh);
  });
  const leafGeometry=createTaijiLeafGeometry();geometries.add(leafGeometry);
  const farLeafGeometry=createTaijiFarLeafGeometry();geometries.add(farLeafGeometry);
  const farLeafScale=calculateFarLeafAreaScale(leafGeometry,farLeafGeometry);
  const foliageRoot=new THREE.Group();foliageRoot.name='branch-aligned-foliage';
  const fringe=leafData.leaves.filter((_,index)=>index%8===0);
  const crownFill=generateCrownVolume(leafData.leaves);
  const retention=leafData.leaves.length/leafData.sourceComponents;
  treePositions.forEach(([x,z],i)=>{
    const frame=calculateTaijiTreeFrame([x,z],i,height,groundHeight(i),outerStart);
    const lod=new THREE.LOD();lod.position.copy(frame.groundPosition);
    // Close views retain every authored branch leaf. Smaller fill leaves add depth
    // without turning crown lobes into large, near-solid leaf-card clusters.
    const near=new THREE.InstancedMesh(leafGeometry,foliageMaterial,leafData.leaves.length+crownFill.length);
    const far=new THREE.InstancedMesh(farLeafGeometry,foliageMaterial,fringe.length+Math.ceil(crownFill.length/FAR_LEAF_RETENTION_STRIDE));
    near.name='close-leaf-canopy';far.name='distant-leaf-canopy';
    near.castShadow=near.receiveShadow=far.castShadow=far.receiveShadow=true;
    const tint=(j:number)=>{const shade=.76+((j*13+i*5)%97)/96*.22;return new THREE.Color(shade,shade,shade*.94);};
    for(let j=0;j<leafData.leaves.length;j++){
      near.setMatrixAt(j,calculateLeafFrame(leafData.leaves[j],frame.localMatrix,bounds.min.y,retention));
      near.setColorAt(j,tint(j));
    }
    for(let j=0;j<fringe.length;j++){
      const matrix=calculateLeafFrame(fringe[j],frame.localMatrix,bounds.min.y,retention/4);
      matrix.scale(new THREE.Vector3(farLeafScale,farLeafScale,farLeafScale));
      far.setMatrixAt(j,matrix);far.setColorAt(j,tint(j*8));
    }
    for(let j=0;j<crownFill.length;j++){
      const matrix=createCrownLeafMatrix(crownFill[j],frame.localMatrix,bounds.min.y,j+i*crownFill.length)
        .scale(new THREE.Vector3(.55,.55,.55));
      const color=tint(j);
      near.setMatrixAt(leafData.leaves.length+j,matrix);
      near.setColorAt(leafData.leaves.length+j,color);
      if(j%FAR_LEAF_RETENTION_STRIDE===0){
        matrix.scale(new THREE.Vector3(farLeafScale,farLeafScale,farLeafScale));
        far.setMatrixAt(fringe.length+j/FAR_LEAF_RETENTION_STRIDE,matrix);far.setColorAt(fringe.length+j/FAR_LEAF_RETENTION_STRIDE,color);
      }
    }
    lod.addLevel(near,0);lod.addLevel(far,38,.1);foliageRoot.add(lod);
  });
  group.add(foliageRoot);
  return {group,foliageMaterial,dispose(){group.traverse(o=>{if(o instanceof THREE.InstancedMesh)o.dispose();});group.removeFromParent();geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());}};
}
