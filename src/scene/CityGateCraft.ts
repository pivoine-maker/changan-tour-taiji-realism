import * as THREE from 'three';
import type { ChanganCityModel } from '../data/changanCity';
import { createGatePassageSegments } from '../data/cityLayout';
import type { HistoricalMaterialLibrary } from './HistoricalAssets';
import { northGateSourceId } from './TaijiInstanceFilter';

/** Additive joinery for the three ordinary gates; dedicated palace gate is excluded.
 * All ground-level details sit on existing solid wings, never inside the passage.
 * Materials/textures are borrowed; each batch owns its geometry only.
 */
export function createCityGateCraft(city:ChanganCityModel,materials:HistoricalMaterialLibrary):THREE.Group {
  const root=new THREE.Group(); root.name='city-gate-craft';
  const batches=new Map<string,{material:THREE.Material; matrices:THREE.Matrix4[];gateIndices:number[]}>();
  let gateCount=0;
  city.gatehouses.forEach((gate,id)=>{
    if(northGateSourceId(gate,city.gatehouses))return;
    if(createGatePassageSegments(gate).length!==2)return;
    gateCount++;
    const transform=new THREE.Matrix4().makeTranslation(gate.x,0,gate.z).multiply(new THREE.Matrix4().makeRotationY(gate.rotation??0));
    const add=(name:string,material:THREE.Material,x:number,y:number,z:number,w:number,h:number,d:number)=>{
      const batch=batches.get(name)??{material,matrices:[],gateIndices:[]};
      batch.matrices.push(transform.clone().multiply(new THREE.Matrix4().makeTranslation(x,y,z)).multiply(new THREE.Matrix4().makeScale(w,h,d)));
      batch.gateIndices.push(id);batches.set(name,batch);
    };
    const opening=Math.min(gate.width,Math.max(4.8,Math.min(14,gate.width*.6)));
    const wing=(gate.width-opening)/2;
    for(const side of [-1,1]){
      const x=side*(opening/2+wing/2);
      for(const face of [-1,1]){
        const z=face*(gate.depth/2+.09);
        // Raised stone plinth edges stop exactly at the opening boundary.
        add('plinth',materials.stone,x,.19,z,wing,.38,.22);
        for(let y=.65;y<gate.height-.6;y+=.72)
          add('reveal',materials.stone,side*(opening/2+.16),y,z,.30,.61,.24);
        add('pier-column',materials.woodDark,side*(gate.width/2-.27),gate.height/2,z,.26,gate.height,.24);
        add('capital',materials.wood,x,gate.height-.45,z,Math.max(.5,wing-.12),.24,.30);
        // Stepped corbels, small enough to remain beneath existing eaves.
        for(const cx of [side*(opening/2+.29),side*(gate.width/2-.3)]){
          add('bracket',materials.wood,cx,gate.height-.13,face*(gate.depth/2+.23),.36,.18,.50);
          add('bracket',materials.woodDark,cx,gate.height+.06,face*(gate.depth/2+.23),.55,.16,.54);
        }
      }
    }
    if(gate.roof!=='tower')return;
    const rise=Math.max(1.15,gate.depth*.25), upperBase=gate.height+.3+rise+.08;
    const upperWidth=gate.width*.5,upperDepth=gate.depth*.48;
    for(const face of [-1,1]){
      const z=face*(upperDepth/2+.035);
      add('upper-sill',materials.woodDark,0,upperBase+.13,z,upperWidth+.12,.16,.16);
      add('upper-lintel',materials.woodDark,0,upperBase+1.20,z,upperWidth+.12,.15,.17);
      const bays=Math.max(2,Math.floor(upperWidth/1.5)),bay=upperWidth/bays;
      for(let k=0;k<=bays;k++)
        add('upper-column',materials.woodDark,-upperWidth/2+k*bay,upperBase+.67,z,.14,1.18,.18);
      for(let k=0;k<bays;k++){
        const x=-upperWidth/2+(k+.5)*bay, w=bay-.25;
        add('window-shadow',materials.charcoal,x,upperBase+.73,z,w,.68,.065);
        for(const offset of [-.28,0,.28])
          add('window-lattice',materials.wood,x+offset*w,upperBase+.73,z+face*.052,.045,.70,.045);
        for(const offset of [-.22,.10])
          add('window-lattice',materials.wood,x,upperBase+.73+offset,z+face*.057,w,.045,.045);
        add('upper-panel',materials.wood,x,upperBase+.29,z,w,.15,.085);
      }
    }
  });
  let instanceCount=0;
  for(const [name,batch] of batches){
    const mesh=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),batch.material,batch.matrices.length);
    mesh.name='city-gate-craft-'+name;mesh.userData.gateIndices=batch.gateIndices;
    batch.matrices.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));
    mesh.instanceMatrix.needsUpdate=true;mesh.castShadow=true;mesh.receiveShadow=true;root.add(mesh);instanceCount+=mesh.count;
  }
  root.userData.gateCount=gateCount;root.userData.instanceCount=instanceCount;root.userData.expandedTriangleVertices=instanceCount*36;
  return root;
}
