import * as THREE from 'three';
import type { BuildingBlock } from '../data/world';
import type { ChanganCityModel } from '../data/changanCity';
import { createGatePassageSegments } from '../data/cityLayout';
import type { HistoricalMaterialLibrary } from './HistoricalAssets';
import { northGateSourceId } from './TaijiInstanceFilter';

type Shape='box'|'hip'|'gable';
interface Part { x:number;y:number;z:number;w:number;h:number;d:number;rotation:number;rotationX:number;sourceId:string|null }

/** Closed, hard-normal roof with a shallow flared eave and steeper upper run. */
export function createCityRoofGeometry(type:'hip'|'gable'):THREE.BufferGeometry {
  const outer=[[-.5,0,-.5],[.5,0,-.5],[.5,0,.5],[-.5,0,.5]];
  const x=type==='hip'?.43:.5;
  const inner=[[-x,.25,-.40],[x,.25,-.40],[x,.25,.40],[-x,.25,.40]];
  const ridge=[[-(type==='hip'?.24:.5),1,0],[(type==='hip'?.24:.5),1,0]];
  const positions:number[]=[]; const uv:number[]=[];
  const triangle=(a:number[],b:number[],c:number[])=>{for(const p of [a,b,c]){positions.push(...p);uv.push(p[0]+.5,p[2]+.5);}};
  for(let i=0;i<4;i++){const n=(i+1)%4;triangle(outer[i],inner[i],inner[n]);triangle(outer[i],inner[n],outer[n]);}
  triangle(inner[0],ridge[0],ridge[1]);triangle(inner[0],ridge[1],inner[1]);
  triangle(inner[1],ridge[1],inner[2]);
  triangle(inner[2],ridge[1],ridge[0]);triangle(inner[2],ridge[0],inner[3]);
  triangle(inner[3],ridge[0],inner[0]);
  triangle(outer[0],outer[1],outer[2]);triangle(outer[0],outer[2],outer[3]);
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.computeVertexNormals();return geometry;
}

export function createCityArchitecture(materials:HistoricalMaterialLibrary,city:ChanganCityModel):THREE.Group {
  const root=new THREE.Group();root.name='city-realistic-architecture';
  const layers=new Map<string,{shape:Shape;material:THREE.Material;parts:Part[]}>();
  // Lazily owned per-tone materials are attached to meshes, so CityRealism's normal
  // disposal traversal collects them. Texture ownership stays with the caller.
  const wallTones:Record<BuildingBlock['tone'],number>={sand:0xe8e2d6,clay:0xc9bba3,umber:0xb3a592,dark:0x928a7c};
  const wallMaterials=new Map<BuildingBlock['tone'],THREE.MeshStandardMaterial>();
  const ordinaryWall=(tone:BuildingBlock['tone'])=>{
    let material=wallMaterials.get(tone);
    if(!material){
      material=(tone==='sand'?materials.plaster:tone==='dark'?materials.wallDark:materials.wall).clone();
      material.name='city-owned-wall-'+tone;material.color.setHex(wallTones[tone]);
      wallMaterials.set(tone,material);
    }
    return material;
  };
  function add(name:string,shape:Shape,material:THREE.Material,b:BuildingBlock,x:number,y:number,z:number,w:number,h:number,d:number,sourceId:string|null,rotationX=0){
    const rotation=b.rotation??0;const item=layers.get(name)??{shape,material,parts:[]};
    item.parts.push({x:b.x+x*Math.cos(rotation)+z*Math.sin(rotation),y,z:b.z-x*Math.sin(rotation)+z*Math.cos(rotation),w,h,d,rotation,rotationX,sourceId});layers.set(name,item);
  }
  const buildings=city.wards.flatMap(w=>w.buildings);root.userData.buildingCount=buildings.length+city.gatehouses.length;
  [...buildings,...city.gatehouses].forEach((source,index)=>{
    const isGate=index>=buildings.length;const sourceId=northGateSourceId(source,city.gatehouses)??null;
    // Roof ridge follows the long building axis; rotating the local frame preserves
    // the exact body footprint and collision model. Gate frames stay canonical.
    const b=!isGate&&source.depth>source.width
      ? {...source,width:source.depth,depth:source.width,rotation:(source.rotation??0)+Math.PI/2}
      : source;
    const wall=isGate?(b.tone==='sand'?materials.plaster:b.tone==='dark'?materials.wallDark:materials.wall):ordinaryWall(b.tone);
    const roofY=b.height+.3, roofRise=Math.max(1.15,b.depth*.25), roofW=b.width+1.05, roofD=b.depth+1.05;
    const type=b.roof==='flat'?'gable':'hip';
    if(isGate){
      for(const segment of createGatePassageSegments(b)){
        add('gate-wing','box',materials.wall,{...b,x:segment.x,z:segment.z,rotation:0},0,segment.height/2,0,segment.width,segment.height,segment.depth,sourceId);
      }
      add('gate-head-beam','box',materials.woodDark,b,0,b.height-.24,0,b.width,.48,b.depth,sourceId);
    }else{
      add('wall-'+b.tone,'box',wall,b,0,b.height/2+.28,0,b.width,b.height,b.depth,sourceId);
      add('foundation','box',materials.stone,b,0,.25,0,b.width+.35,.46,b.depth+.35,sourceId);
    }
    add('roof-'+type,type,materials.roofTile,b,0,roofY,0,roofW,roofRise,roofD,sourceId);
    add('ridge','box',materials.roofRidge,b,0,roofY+roofRise+.07,0,roofW*(type==='hip'?.52:1.02),.18,.19,sourceId);
    for(const side of [-1,1]){
      add('eave-fascia','box',materials.woodDark,b,0,roofY-.07,side*roofD/2,roofW,.2,.16,sourceId);
      add('eave-tile-edge','box',materials.roofRidge,b,0,roofY+.025,side*roofD/2,roofW,.085,.24,sourceId);
      // Two raised tile courses follow the upper pitch; no individual tile meshes.
      for(const t of [.42,.70]){
        const z=side*roofD*.4*(1-t), y=roofY+roofRise*(.25+.75*t);
        const courseW=roofW*(type==='hip'?.86-.38*t:1);
        add('roof-tile-course','box',materials.roofRidge,b,0,y+.025,z,courseW,.045,.09,sourceId,side*Math.atan2(roofRise*.75,roofD*.4));
      }
      const facade=side*(b.depth/2+.045);
      // Short cantilever ends remain under the existing half-metre eave.
      for(const ratio of (isGate?[-.44,.44]:[-.4,0,.4]))
        add('eave-bracket','box',materials.wood,b,b.width*ratio,roofY-.25,side*(b.depth/2+.20),.22,.18,.53,sourceId);
      for(const ratio of (isGate ? [-.44,.44] : [-.44,-.18,.18,.44]))add('timber-column','box',materials.woodDark,b,b.width*ratio,(b.height+.25)/2,facade,.18,b.height+.1,.18,sourceId);
      add('lintel','box',materials.wood,b,0,b.height-.18,facade,b.width,.18,.16,sourceId);
      if(!isGate){
        add('door','box',materials.woodDark,b,0,1.16,facade,Math.min(1.35,b.width*.23),1.8,.12,sourceId);
        for(const ratio of [-.31,.31]){
          const wx=b.width*ratio, windowW=Math.min(1.25,b.width*.19);
          add('window-recess','box',materials.charcoal,b,wx,1.56,facade,windowW,.92,.12,sourceId);
          for(const offset of [0])add('window-lattice','box',materials.wood,b,wx+offset*windowW,1.56,facade+side*.075,.052,.9,.045,sourceId);
          for(const offset of [0])add('window-lattice','box',materials.wood,b,wx,1.56+offset,facade+side*.08,windowW,.052,.045,sourceId);
        }
      }
    }
    if(b.roof==='tower'){
      const upperY=isGate&&!sourceId?roofY+roofRise+.08:roofY+roofRise*.65;
      add('tower-upper','box',wall,b,0,upperY+.65,0,b.width*.5,1.3,b.depth*.48,sourceId);
      add('tower-upper-roof','hip',materials.roofTile,b,0,upperY+1.3,0,b.width*.64,roofRise*.66,b.depth*.67,sourceId);
    }
  });
  for(const [name,{shape,material,parts}]of layers){
    const geometry=shape==='box'?new THREE.BoxGeometry(1,1,1):createCityRoofGeometry(shape);
    const mesh=new THREE.InstancedMesh(geometry,material,parts.length);mesh.name='city-'+name;
    parts.forEach((p,i)=>mesh.setMatrixAt(i,new THREE.Matrix4().makeTranslation(p.x,p.y,p.z).multiply(new THREE.Matrix4().makeRotationY(p.rotation)).multiply(new THREE.Matrix4().makeRotationX(p.rotationX)).multiply(new THREE.Matrix4().makeScale(p.w,p.h,p.d))));
    mesh.userData.sourceIds=parts.map(p=>p.sourceId);mesh.castShadow=!name.includes('window');mesh.receiveShadow=true;mesh.instanceMatrix.needsUpdate=true;root.add(mesh);
  }
  return root;
}

/** Volumetric twig cards with an uneven lobed silhouette and soft crown normals.
 * 72 indexed cards retain the existing 288 vertices; the texture supplies leaf gaps.
 */
export function createCityCrownGeometry():THREE.BufferGeometry {
  const positions:number[]=[],normals:number[]=[],uv:number[]=[],indices:number[]=[];
  for(let i=0;i<72;i++){
    const angle=i*2.3999632297, height=1-2*(i+.5)/72;
    // Alternating interior sprays avoid a hollow shell; low-frequency lobes break
    // the sphere while small, differently tilted sprays break up its contour.
    const lobe=1+.11*Math.sin(angle*3+height*2)+.07*Math.cos(angle*5-height*3);
    const radius=Math.sqrt(1-height*height)*(i%4===0?.48:1)*lobe;
    const center=new THREE.Vector3(Math.cos(angle)*radius*1.04,height*.92+.08*Math.sin(angle*2),Math.sin(angle)*radius*1.04);
    const rotation=new THREE.Matrix4().makeRotationY(angle+.32*Math.sin(i*1.7)).multiply(new THREE.Matrix4().makeRotationX(.25+(i%7)*.23)).multiply(new THREE.Matrix4().makeRotationY(.35*Math.cos(i*2.3)));
    const width=.33+.09*(.5+.5*Math.sin(i*3.7)),length=.40+.12*(.5+.5*Math.cos(i*2.1));
    for(const [x,z,u,v] of [[-width,-length,0,0],[width,-length,1,0],[width,length,1,1],[-width,length,0,1]]){
      const p=new THREE.Vector3(x,0,z).applyMatrix4(rotation).add(center);
      // Reserve horizontal headroom for per-tree scale and keep branches out of lanes.
      const r=Math.hypot(p.x,p.z);if(r>1.49){p.x*=1.49/r;p.z*=1.49/r;}
      const normal=new THREE.Vector3(p.x*.65,.85+Math.max(0,p.y)*.35,p.z*.65).normalize();
      positions.push(p.x,p.y,p.z);normals.push(normal.x,normal.y,normal.z);uv.push(u,v);
    }
    const n=i*4;indices.push(n,n+2,n+1,n,n+3,n+2);
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geometry.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.setIndex(indices);return geometry;
}

export function createCityTrees(materials:HistoricalMaterialLibrary,city:ChanganCityModel):THREE.Group {
  const root=new THREE.Group();root.name='city-realistic-trees';const trees=city.wards.flatMap(w=>w.trees);
  const trunks=new THREE.InstancedMesh(new THREE.CylinderGeometry(.09,.18,2.6,6),materials.wood,trees.length);
  trunks.name='city-tree-trunks';
  const branches=new THREE.InstancedMesh(new THREE.CylinderGeometry(.027,.075,1,5),materials.wood,trees.length*4);branches.name='city-tree-branches';
  const forks=new THREE.InstancedMesh(new THREE.CylinderGeometry(.013,.035,1,4),materials.wood,trees.length*4);forks.name='city-tree-forks';
  const leaves=new THREE.InstancedMesh(createCityCrownGeometry(),materials.foliage,trees.length);leaves.name='city-tree-leaf-clusters';
  const up=new THREE.Vector3(0,1,0);
  const segment=(mesh:THREE.InstancedMesh,index:number,start:THREE.Vector3,end:THREE.Vector3)=>{
    const delta=end.clone().sub(start);
    mesh.setMatrixAt(index,new THREE.Matrix4().compose(start.clone().add(end).multiplyScalar(.5),new THREE.Quaternion().setFromUnitVectors(up,delta.clone().normalize()),new THREE.Vector3(1,delta.length(),1)));
  };
  trees.forEach((tree,i)=>{
    // Spatial hashing keeps an individual tree's silhouette stable if the list changes.
    const seed=Math.sin(tree.x*12.9898+tree.z*78.233)*43758.5453,variation=seed-Math.floor(seed);
    const angle=variation*Math.PI*2,scale=.92+variation*.14,heightScale=.96+variation*.14;
    trunks.setMatrixAt(i,new THREE.Matrix4().makeTranslation(tree.x,1.48,tree.z));
    const crown=new THREE.Matrix4().makeTranslation(tree.x,3.03,tree.z).multiply(new THREE.Matrix4().makeRotationY(angle)).multiply(new THREE.Matrix4().makeScale(scale,heightScale,scale));
    leaves.setMatrixAt(i,crown);
    for(let b=0;b<4;b++){
      const direction=b*Math.PI/2+.24*Math.sin(b*2.3),reach=.76+.12*Math.sin(b*1.9);
      const start=new THREE.Vector3(tree.x,2.08+b*.13,tree.z);
      const end=new THREE.Vector3(Math.cos(direction)*reach,.12+(b%2)*.28,Math.sin(direction)*reach).applyMatrix4(crown);
      segment(branches,i*4+b,start,end);
      const forkStart=start.clone().lerp(end,.67);
      const forkEnd=new THREE.Vector3(Math.cos(direction+.56)*.97,-.02+(b%2)*.20,Math.sin(direction+.56)*.97).applyMatrix4(crown);
      segment(forks,i*4+b,forkStart,forkEnd);
    }
  });
  for(const mesh of [trunks,branches,forks,leaves]){mesh.castShadow=true;mesh.receiveShadow=true;mesh.instanceMatrix.needsUpdate=true;root.add(mesh);}return root;
}
