import * as THREE from 'three';
import type { ChanganCityModel } from '../data/changanCity';
import type { WardCharacter } from '../data/wardComposition';
import type { HistoricalMaterialLibrary } from './HistoricalAssets';
import type { PilotTextures } from './TaijiPilot';
import { batchStaticArchitecture } from './StaticBatch';

type SurfaceMaterial='stone'|'earth'|'garden'|'border'|'cloth'|'brick';
export interface CourtSurfaceSpec {
  wardId:string; courtIndex:number; kind:WardCharacter; material:SurfaceMaterial;
  x:number;z:number;y:number;width:number;depth:number;
}

/** Low, walkable yard surfaces; rectangles stay inside data's roof-clear court bounds. */
export function createCourtSurfaceSpecs(city:ChanganCityModel):CourtSurfaceSpec[] {
  const specs:CourtSurfaceSpec[]=[];
  for(const ward of city.wards) (ward.courts??[]).forEach((court,courtIndex)=>{
    const w=court.bounds.maxX-court.bounds.minX,d=court.bounds.maxZ-court.bounds.minZ;
    const add=(material:SurfaceMaterial,x:number,z:number,width:number,depth:number,y=.15)=>{
      if(width>.05&&depth>.05)specs.push({wardId:ward.id,courtIndex,kind:court.kind,material,x,z,width,depth,y});
    };
    add(court.kind==='courtyard'?'stone':'earth',court.x,court.z,w,d);
    if(court.kind==='courtyard') {
      for(const side of [-1,1]) {
        add('border',court.x+side*(w/2-.1),court.z,.18,d,.17);
        add('border',court.x,court.z+side*(d/2-.1),w,.18,.17);
      }
      if(w>4&&d>5) add('garden',court.x,court.z,Math.min(2.8,w*.45),Math.min(3.6,d*.36),.18);
      for(let z=court.bounds.minZ+1;z<court.bounds.maxZ;z+=1.6) add('border',court.x,z,w-.3,.055,.18);
    } else if(court.kind==='garden') {
      add('garden',court.x+w*.08,court.z,w*.75,d*.76,.17);
      add('stone',court.bounds.minX+.5,court.z,Math.min(.8,w*.2),d,.18);
      for(const k of [-1,0,1]) add('earth',court.x+w*.08,court.z+k*d*.21,w*.75,.16,.18);
    } else if(court.kind==='artisan') {
      add('brick',court.x,court.z,w*.94,d*.88,.16);
      add('stone',court.bounds.minX+Math.min(.55,w*.16),court.z,Math.min(.8,w*.25),d,.18);
      // Flat drying cloth in a working yard, below any step or collision threshold.
      if(w>4&&d>5) {
        add('cloth',court.x+w*.19,court.z+d*.13,Math.min(2,w*.38),Math.min(3.1,d*.38),.19);
        add('earth',court.x+w*.19,court.z-d*.25,Math.min(2,w*.38),Math.min(1.8,d*.25),.19);
      }
    } else {
      add('stone',court.x,court.z,w,Math.min(1,d*.3),.17);
      if(w>4&&d>4) add('garden',court.x+w*.27,court.z+d*.28,w*.35,d*.26,.18);
    }
  });
  return specs;
}

export function createCityCourtyardEnvironment(city:ChanganCityModel,base:HistoricalMaterialLibrary,textures:PilotTextures) {
  const material=(map:THREE.Texture,color:number)=>new THREE.MeshStandardMaterial({map,color,roughness:.96});
  const materials:Record<SurfaceMaterial,THREE.MeshStandardMaterial>={
    stone:material(textures.stone,0xada898),earth:material(textures.earth,0xaa9475),
    garden:material(textures.earth,0xffffff),
    border:material(textures.stone,0xc6bda6),cloth:base.fabricOchre.clone(),brick:material(textures.stone,0x8b8270)
  };
  materials.garden.vertexColors=true;
  materials.cloth.color.setHex(0xb29b71);
  const group=new THREE.Group();group.name='city-courtyard-environment';
  for(const spec of createCourtSurfaceSpecs(city)) {
    const geometry=new THREE.PlaneGeometry(spec.width,spec.depth,spec.material==='garden'?8:1,spec.material==='garden'?8:1);
    geometry.rotateX(-Math.PI/2);
    const p=geometry.getAttribute('position'),uv=geometry.getAttribute('uv');
    for(let i=0;i<p.count;i++)uv.setXY(i,(p.getX(i)+spec.x)/2,(p.getZ(i)+spec.z)/2);
    if(spec.material==='garden') {
      const colors:number[]=[],soil=new THREE.Color(0xaa9475),green=new THREE.Color(0x83916b);
      for(let i=0;i<p.count;i++){
        const x=p.getX(i),z=p.getZ(i),edge=Math.min(spec.width/2-Math.abs(x),spec.depth/2-Math.abs(z));
        const variation=.70+.30*Math.sin((x+spec.x)*.71)*Math.cos((z+spec.z)*.57);
        const mix=THREE.MathUtils.smoothstep(edge,.02,.65)*variation;
        const c=soil.clone().lerp(green,mix);colors.push(c.r,c.g,c.b);
      }
      geometry.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
    }
    const mesh=new THREE.Mesh(geometry,materials[spec.material]);mesh.position.set(spec.x,spec.y,spec.z);mesh.receiveShadow=true;group.add(mesh);
  }
  batchStaticArchitecture(group);
  // Specs retain inspectability; discard hidden pre-merge surface meshes.
  for(const child of [...group.children]) if(child instanceof THREE.Mesh && !child.visible) { child.removeFromParent(); child.geometry.dispose(); }
  return {group,dispose(){group.removeFromParent();group.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});Object.values(materials).forEach(m=>m.dispose());}};
}
