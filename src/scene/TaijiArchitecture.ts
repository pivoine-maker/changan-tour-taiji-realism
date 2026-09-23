import {createTaijiGardenPool} from './TaijiGardenPool';
import {createBoundaryGroundGeometry} from './TaijiBoundaryLandscape';
import {createDougongGeometry} from './TaijiDougong';
import {calculateRoofHeight,type TaijiRoofProfile} from './TaijiRoofProfile';
import {createTimberBeamGeometry} from './TaijiTimberGeometry';
import {createTaijiPodiumGeometry} from './TaijiPodiumGeometry';
import { createRoofTileGeometry } from './TaijiRoofTiles';
import { taijiTreePositions } from './TaijiTreePositions';
import * as THREE from 'three';
import {createPavingSlabGeometry} from './TaijiPavingGeometry';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { createPilotMaterials } from './TaijiPilot';
import { imperialPrecincts } from '../data/imperialCity';
import {getTaijiNeighborOffices,officeRoofFrame} from './TaijiNeighborOffices';
import {createRoofBearingGeometry} from './TaijiRoofBearing';
import {createSimpleRoofCoverGeometry,createSimpleRoofTileMatrix} from './TaijiSimpleRoofTile';
import {createLiangyiPodium} from './TaijiLiangyiPodium';

type Materials = ReturnType<typeof createPilotMaterials>;
type V3 = [number, number, number];

export const TAIJI_UPPER_STOREY_VERTICAL={bottom:9.35,height:3.6,center:11.15,roofBase:12.9,roofRise:3.3} as const;

// Details are merged by material; the thousands of tile pieces use instancing.
class Masonry {
  private batches = new Map<THREE.Material, THREE.BufferGeometry[]>();
  add(geometry: THREE.BufferGeometry, material: THREE.Material, position: V3 = [0, 0, 0]) {
    if(!geometry.index)geometry.setIndex(Array.from({length:geometry.attributes.position.count},(_,i)=>i));
    geometry.translate(...position);
    const list = this.batches.get(material) ?? [];
    list.push(geometry); this.batches.set(material, list);
  }
  box(size: V3, at: V3, material: THREE.Material) {
    const horizontalLength=Math.max(size[0],size[2]);
    const structuralTimber=(material.name==='wood'||material.name==='darkWood'||material.name==='painted')&&horizontalLength>=8&&Math.min(...size)>=.25&&horizontalLength/Math.max(size[1],Math.min(size[0],size[2]))>=10;
    const g = structuralTimber?createTimberBeamGeometry(size):new THREE.BoxGeometry(...size);
    const p = g.attributes.position, n = g.attributes.normal, uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) {
      const x = Math.abs(n.getX(i)), y = Math.abs(n.getY(i)), z = Math.abs(n.getZ(i));
      let u = x > y && x > z ? p.getZ(i) : p.getX(i);
      let v = y >= x && y >= z ? p.getZ(i) : p.getY(i);
      if (material.userData.grain && size[0] > size[1] * 2) [u, v] = [v, u];
      uv.setXY(i,u/3,material.userData.frieze?v/size[1]+.5:v/3);
    }
    this.add(g, material, at);
  }
  bracket(length:number,depth:number,height:number,at:V3,material:THREE.Material,rotation=0) {
    const shape=new THREE.Shape();
    shape.moveTo(-length/2,height*.4);shape.lineTo(-length/2,height*.65);
    shape.lineTo(-length*.35,height*.65);shape.lineTo(-length*.25,height*.2);
    shape.lineTo(length*.25,height*.2);shape.lineTo(length*.35,height*.65);
    shape.lineTo(length/2,height*.65);shape.lineTo(length/2,height*.4);
    shape.quadraticCurveTo(length*.24,-height*.4,0,-height*.4);
    shape.quadraticCurveTo(-length*.24,-height*.4,-length/2,height*.4);shape.closePath();
    const geometry=new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelSize:.015,bevelThickness:.015,bevelSegments:1,curveSegments:5,steps:1});
    geometry.translate(0,0,-depth/2);geometry.rotateY(rotation);
    this.add(geometry,material,at);
  }
  column(radius: number, height: number, at: V3, material: THREE.Material) {
    this.add(new THREE.CylinderGeometry(radius * .86, radius, height, 20), material, at);
  }
  finish(root: THREE.Group) {
    for (const [material, geometries] of this.batches) {
      const merged = mergeGeometries(geometries);
      if (!merged) throw new Error('Could not merge Taiji details');
      const mesh = new THREE.Mesh(merged, material);
      mesh.name = 'taiji-architectural-details'; mesh.castShadow = mesh.receiveShadow = true;
      root.add(mesh); geometries.forEach(g => g.dispose());
    }
  }
}

function roofPoint(w: number, d: number, base: number, rise: number, face: number, u: number, t: number, profile:TaijiRoofProfile='legacy') {
  const ridge = Math.max(.1,(w-d)*.5);
  let x: number, z: number;
  if (face < 2) {
    x = (u * 2 - 1) * THREE.MathUtils.lerp(ridge, w / 2, t);
    z = (face === 0 ? 1 : -1) * d / 2 * t;
  } else {
    x = (face === 2 ? 1 : -1) * THREE.MathUtils.lerp(ridge, w / 2, t);
    z = (u * 2 - 1) * d / 2 * t;
  }
  return new THREE.Vector3(x,calculateRoofHeight(base,rise,u,t,profile),z);
}

function addHipRoof(root: THREE.Group, w: number, d: number, base: number, rise: number, materials: Materials, profile:TaijiRoofProfile,crafted=false) {
  const positions: number[] = [], uvs: number[] = [], indices: number[] = [];
  const nu = d < 4 ? 20 : 48, nt = d < 4 ? 4 : 20;
  for (let face = 0; face < 4; face++) {
    const offset = positions.length / 3;
    for (let j = 0; j <= nt; j++) for (let i = 0; i <= nu; i++) {
      const p = roofPoint(w, d, base, rise, face, i / nu, j / nt,profile);
      positions.push(p.x, p.y, p.z); uvs.push(p.x / 4, p.z / 4);
    }
    for (let j = 0; j < nt; j++) for (let i = 0; i < nu; i++) {
      const a = offset + j * (nu + 1) + i, b = a + 1, c = a + nu + 1, e = c + 1;
      if (face === 0 || face === 3) indices.push(a, c, b, b, c, e);
      else indices.push(a, b, c, b, e, c);
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices); geometry.computeVertexNormals();
  const surface = new THREE.Mesh(geometry, materials.roof);
  surface.name = 'curved-hip-roof'; surface.castShadow = surface.receiveShadow = true; root.add(surface);
  const underside = new THREE.Mesh(geometry.clone(), materials.darkWood);
  underside.position.y = -.16; underside.castShadow = underside.receiveShadow = true; root.add(underside);

  if(crafted) addCraftedTiles(root,w,d,base,rise,materials,profile);
  else {
  const segments: [THREE.Vector3, THREE.Vector3][] = [];
  for (let face = 0; face < 4; face++) {
    const span=face<2?w:d,halfSpan=span/2,ridge=Math.max(.1,(w-d)*.5);
    const pitch=d<4?.58:.42;
    const columns=Math.max(1,Math.round(span/pitch));
    const rows=Math.max(1,Math.ceil(Math.min(d,w)/2/.68));
    const pointAt=(cross:number,t:number)=>{
      const half=face<2?THREE.MathUtils.lerp(ridge,w/2,t):d/2*t;
      return roofPoint(w,d,base,rise,face,(cross/half+1)/2,t,profile).add(new THREE.Vector3(0,d<4?.085:.065,0));
    };
    for (let i = 0; i <= columns; i++) {
      const cross=(i/columns*2-1)*halfSpan;
      const minT=face<2?Math.max(0,(Math.abs(cross)-ridge)/(w/2-ridge)):Math.abs(cross)/(d/2);
      for (let j = 0; j < rows; j++) {
        const t0=Math.max(.013,j/rows,minT+.001),t1=(j+(j===rows-1?1:.98))/rows;
        if(t1-t0<.02)continue;
        segments.push([pointAt(cross,t0),pointAt(cross,t1)]);
      }
    }
  }
  const tiles = new THREE.InstancedMesh(d<4?new THREE.CylinderGeometry(.10,.11,1,8):createSimpleRoofCoverGeometry(),materials.roof,segments.length);
  tiles.name = 'individual-clay-tiles'; tiles.castShadow = false; tiles.receiveShadow = true;
  const dummy = new THREE.Object3D(), up = new THREE.Vector3(0,1,0);
  segments.forEach(([a,b],i) => {
    if(d<4){
      dummy.position.copy(a).add(b).multiplyScalar(.5);
      dummy.quaternion.setFromUnitVectors(up,b.clone().sub(a).normalize());
      dummy.scale.set(1,a.distanceTo(b),1);dummy.updateMatrix();tiles.setMatrixAt(i,dummy.matrix);
    }else tiles.setMatrixAt(i,createSimpleRoofTileMatrix(a,b));
    const tone=.86+.08*Math.sin(a.x*.18+a.z*.23)+.03*((i*37%101)/100);
    tiles.setColorAt(i,new THREE.Color(tone,tone*.987,tone*.963));
  });
  root.add(tiles);
  }
  // Hip ribs and carved ridge ends remain real geometry from every viewing angle.
  const trimBatch=new Masonry();
  const addCurve = (points: THREE.Vector3[], radius: number, mat: THREE.Material) => {
    trimBatch.add(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),d<4?16:32,radius,6,false),mat);
  };
  for (const side of [0,1]) for (const u of [0,1]) {
    const points = Array.from({length:20},(_,i) => roofPoint(w,d,base,rise,side,u,i/19,profile).add(new THREE.Vector3(0,.12,0)));
    addCurve(points,.13,materials.roof);
  }
  addCurve(Array.from({length:17},(_,i) => new THREE.Vector3((i/16*2-1)*Math.max(.1,(w-d)*.5),base+rise+.20+.48*Math.pow(Math.abs(i/16*2-1),8),0)),.18,materials.roof);
  for (const side of [-1,1]) {
    const fin = new THREE.Shape();
    fin.moveTo(-.18,0); fin.lineTo(.65,0); fin.quadraticCurveTo(.66,.45,1.01,1.06);
    fin.quadraticCurveTo(.55,1.02,.30,.66); fin.quadraticCurveTo(.10,.26,-.18,.20); fin.closePath();
    const ornament = new THREE.Mesh(new THREE.ExtrudeGeometry(fin,{depth:.32,bevelEnabled:true,bevelSize:.05,bevelThickness:.045,bevelSegments:2,steps:1}),materials.roof);
    ornament.name='ceramic-ridge-end';ornament.position.set(side*Math.max(.1,(w-d)*.5),base+rise+.18,-.16);ornament.scale.x=side;
    ornament.castShadow=ornament.receiveShadow=true;root.add(ornament);
  }
  // Eaves follow the curved corner contour rather than straight box edges.
  for (let face=0;face<4;face++) addCurve(Array.from({length:40},(_,i)=>roofPoint(w,d,base,rise,face,i/39,1,profile).add(new THREE.Vector3(0,-.1,0))),.13,materials.darkWood);
  trimBatch.finish(root);
}


/** Tile shells sit in local surface frames; short overlaps interrupt the old continuous ribs. */
function addCraftedTiles(root:THREE.Group,w:number,d:number,base:number,rise:number,materials:Materials,profile:TaijiRoofProfile){
  type TilePlacement={matrix:THREE.Matrix4;color:THREE.Color};
  const covers:TilePlacement[]=[],pans:TilePlacement[]=[],ends:TilePlacement[]=[];
  const rafters=new Masonry(),up=new THREE.Vector3(0,1,0);
  const place=(a:THREE.Vector3,b:THREE.Vector3,widthScale=1)=>{
    const z=b.clone().sub(a).normalize();
    const x=up.clone().cross(z).normalize(),y=z.clone().cross(x).normalize();
    return new THREE.Matrix4().makeBasis(x,y,z).scale(new THREE.Vector3(widthScale,1,a.distanceTo(b)*1.09)).setPosition(a.clone().add(b).multiplyScalar(.5));
  };
  for(let face=0;face<4;face++){
    const cols=Math.round((face<2?w:d)/.42),rows=Math.ceil(d/2/.61);
    const halfSpan=(face<2?w:d)/2,ridge=Math.max(.1,(w-d)*.5);
    const segment=(cross:number,j:number)=>{
      const minT=face<2?Math.max(0,(Math.abs(cross)-ridge)/(w/2-ridge)):Math.abs(cross)/(d/2);
      const t0=Math.max(.025,j/rows,minT+.001),t1=(j+1)/rows;
      if(t1-t0<.025)return null;
      const at=(t:number)=>{
        const half=face<2?THREE.MathUtils.lerp(ridge,w/2,t):d/2*t;
        return roofPoint(w,d,base,rise,face,(cross/half+1)/2,t,profile).add(new THREE.Vector3(0,.045,0));
      };
      return [at(t0),at(t1)] as const;
    };
    for(let j=0;j<rows;j++)for(let i=0;i<=cols;i++){
      const cross=(i/cols*2-1)*halfSpan;
      const points=segment(cross,j);
      const tone=.88+.08*Math.sin(i*.81+j*.42)+.025*Math.sin(i*17+j*11);
      if(points){
        const [a,b]=points;
        covers.push({matrix:place(a,b),color:new THREE.Color(tone,tone*.99,tone*.97)});
        if(j===rows-1){
          const m=place(a,b);m.scale(new THREE.Vector3(1,1,1/(a.distanceTo(b)*1.09)));m.setPosition(b);
          ends.push({matrix:m,color:new THREE.Color(.84,.83,.80)});
        }
      }
      if(i<cols){
        const panPoints=segment(((i+.5)/cols*2-1)*halfSpan,j);
        if(panPoints)pans.push({matrix:place(panPoints[0],panPoints[1],halfSpan*2/cols/.34),color:new THREE.Color(tone*.96,tone*.95,tone*.93)});
      }
    }
    for(let i=0;i<=cols;i++){
      const u=i/cols;
      // Exposed primary round rafter and secondary square flying rafter follow the actual slope.
      if(i%2===0&&i>0&&i<cols){
        const a=roofPoint(w,d,base,rise,face,u,.68,profile),b=roofPoint(w,d,base,rise,face,u,1,profile);
        // Keep the straight structural member below the curved roof across its entire span.
        let clearance=.33;
        for(let sample=0;sample<=16;sample++){
          const f=sample/16,t=THREE.MathUtils.lerp(.68,1,f);
          clearance=Math.max(clearance,THREE.MathUtils.lerp(a.y,b.y,f)-roofPoint(w,d,base,rise,face,u,t,profile).y+.27);
        }
        a.y-=clearance;b.y-=clearance;
        const beam=new THREE.CylinderGeometry(.078,.095,a.distanceTo(b),8);
        const q=new THREE.Quaternion().setFromUnitVectors(up,b.clone().sub(a).normalize());
        beam.applyQuaternion(q);beam.translate(...a.clone().add(b).multiplyScalar(.5).toArray());rafters.add(beam,materials.darkWood);
        const c=roofPoint(w,d,base,rise,face,u,.87,profile),e=roofPoint(w,d,base,rise,face,u,1,profile);
        c.y-=.20;e.y-=.20;
        const fly=new THREE.BoxGeometry(.13,.105,1);fly.applyMatrix4(place(c,e));rafters.add(fly,materials.wood);
      }
    }
  }
  for(const [kind,list,name] of [['cover',covers,'individual-clay-tiles'],['pan',pans,'overlapping-pan-tiles'],['end',ends,'moulded-eave-tiles']] as const){
    const mesh=new THREE.InstancedMesh(createRoofTileGeometry(kind),materials.roof,list.length);mesh.name=name;
    mesh.castShadow=false;mesh.receiveShadow=true;
    list.forEach((item,index)=>{mesh.setMatrixAt(index,item.matrix);mesh.setColorAt(index,item.color);});root.add(mesh);
  }
  const frame=new THREE.Group();frame.name='exposed-eave-rafters';rafters.finish(frame);root.add(frame);
}

export function createTaijiArchitecture(materials: Materials): THREE.Group {
  const root = new THREE.Group(); root.name = 'taiji-architecture-v2'; root.position.set(194,0,208);
  const batch = new Masonry();
  // Original footprint and axis, with stone mouldings and a recessed timber hall.
  batch.add(createTaijiPodiumGeometry(),materials.stone);
  for (const z of [-10.43,10.43]) for(let x=-20;x<=20;x+=2.5) batch.box([2.46,.7,.07],[x,1.12,z],materials.stone);
  for (const x of [-21.43,21.43]) for(let z=-9;z<=9;z+=3)batch.box([.07,.7,2.94],[x,1.12,z],materials.stone);
  batch.box([35,5.5,10.8],[0,4.85,0],materials.plaster);
  // A shaded gallery creates depth, with full-size doors and fine lattice screens.
  for (const z of [-5.47,5.47]) for(let bay=-4;bay<=4;bay++) {
    const x=bay*3.8;
    batch.box([3.48,4.85,.13],[x,4.6,z],materials.darkWood);
    const isDoor = Math.abs(bay)<=1;
    const sill = isDoor ? materials.wood : materials.plaster;
    batch.box([3.16,isDoor?1.35:1.85,.16],[x,isDoor?2.9:3.15,z+Math.sign(z)*.10],sill);
    const windowHeight=isDoor?2.85:2.28, windowY=isDoor?5.03:5.28;
    batch.box([3.2,windowHeight,.10],[x,windowY,z+Math.sign(z)*.1],materials.shadow);
    for(let k=-5;k<=5;k++) batch.box([.058,windowHeight,.07],[x+k*.285,windowY,z+Math.sign(z)*.20],materials.wood);
    for(let k=-3;k<=3;k++) batch.box([3.18,.055,.07],[x,windowY+k*.29,z+Math.sign(z)*.21],materials.wood);
    if(isDoor) {
      batch.box([.10,4.85,.12],[x,4.6,z+Math.sign(z)*.29],materials.darkWood);
      for(const leaf of [-1,1]){
        const cx=x+leaf*.80,front=z+Math.sign(z)*.205;
        batch.box([1.27,.84,.05],[cx,2.91,front],materials.darkWood);
        batch.box([1.14,.72,.055],[cx,2.91,front+Math.sign(z)*.018],materials.wood);
        for(const dy of [-.45,.45])batch.box([1.37,.065,.08],[cx,2.91+dy,front+Math.sign(z)*.05],materials.wood);
        for(const dx of [-.67,.67])batch.box([.065,.94,.08],[cx+dx,2.91,front+Math.sign(z)*.05],materials.wood);
        const ring=new THREE.TorusGeometry(.085,.018,6,12);ring.rotateY(z<0?Math.PI:0);
        batch.add(ring,materials.ochre,[x+leaf*.16,3.65,front+Math.sign(z)*.11]);
      }
    }
    for(const dx of [-1.65,0,1.65]) batch.box([.11,4.85,.18],[x+dx,4.6,z+Math.sign(z)*.19],materials.wood);
    batch.box([3.48,.16,.21],[x,7.10,z],materials.wood);
  }
  for(const z of [-8,8]) for(let i=0;i<=9;i++) {
    const x=-19+i*38/9;
    const profile=[new THREE.Vector2(.50,0),new THREE.Vector2(.51,.05),new THREE.Vector2(.48,.09),new THREE.Vector2(.44,.12),new THREE.Vector2(.40,.22),new THREE.Vector2(.36,.29),new THREE.Vector2(.36,.33),new THREE.Vector2(.30,.36)];
    batch.add(new THREE.LatheGeometry(profile,24),materials.stone,[x,2.08,z]);
    batch.box([1.04,.07,1.04],[x,2.105,z],materials.stone);
    batch.column(.29,5.45,[x,5.11,z],materials.wood);

  }
  for(const z of [-8,8]) {
    batch.box([39,.36,.38],[0,7.65,z],materials.painted);
    batch.box([39,.30,.30],[0,8.27,z],materials.darkWood);
    batch.box([38,.14,.06],[0,8.02,z+Math.sign(z)*.24],materials.ochre);
  }
  for (const x of [-19,19]) {
    batch.box([.4,.4,16],[x,7.66,0],materials.wood);
    for(const z of [-4,0,4]) batch.column(.29,5.45,[x,5.11,z],materials.wood);
  }
  const bracketPositions:[number,number,number,number][]=[];
  for(const z of [-8,8])for(let i=0;i<=9;i++)bracketPositions.push([-19+i*38/9,7.62,z,0]);
  for(const x of [-19,19])for(const z of [-4,0,4])bracketPositions.push([x,7.62,z,Math.PI/2]);
  const brackets=new THREE.InstancedMesh(createDougongGeometry(),materials.wood,bracketPositions.length);
  brackets.name='crafted-column-dougong';brackets.castShadow=brackets.receiveShadow=true;
  const bracketTransform=new THREE.Object3D();
  bracketPositions.forEach(([x,y,z,rotation],i)=>{
    bracketTransform.position.set(x,y,z);bracketTransform.rotation.y=rotation;bracketTransform.updateMatrix();
    brackets.setMatrixAt(i,bracketTransform.matrix);
  });
  root.add(brackets);
  // The narrow upper storey keeps its existing footprint and rises from the lower roof nesting zone.
  batch.box([27.2,TAIJI_UPPER_STOREY_VERTICAL.height,9.8],[0,TAIJI_UPPER_STOREY_VERTICAL.center,0],materials.wood);
  for (const z of [-4.94,4.94]) {
    for(let x=-12;x<=12;x+=3) {
      batch.box([2.45,2.05,.08],[x,11.4,z],materials.shadow);
      for(let k=-4;k<=4;k++) batch.box([.06,2.1,.1],[x+k*.25,11.4,z+Math.sign(z)*.08],materials.wood);
      batch.box([.22,3.7,.27],[x+1.4,11.2,z],materials.wood);
    }
    batch.box([28,.3,.4],[0,TAIJI_UPPER_STOREY_VERTICAL.roofBase,z],materials.darkWood);
    batch.box([27.2,.36,.10],[0,9.94,z+Math.sign(z)*.03],materials.painted);
  }
  addHipRoof(root,40.8,19.2,8.55,2.9,materials,'steady-crafted',true);
  addHipRoof(root,30.8,13.0,TAIJI_UPPER_STOREY_VERTICAL.roofBase,TAIJI_UPPER_STOREY_VERTICAL.roofRise,materials,'steady-crafted',true);
  // Broad stairs retain the original front entry, with symmetric rear access.
  for(const direction of [-1,1]) for(let step=0;step<8;step++) {
    const h=.22*(step+1);
    batch.box([13.8,h,.57],[0,.30+h/2,direction*(14.45-step*.5)],materials.stone);
  }
  for(const direction of [-1,1])for(const side of [-1,1]){
    const shape=new THREE.Shape();shape.moveTo(10.5,.33);shape.lineTo(14.65,.33);shape.lineTo(14.65,.85);shape.lineTo(10.5,2.55);shape.closePath();
    const cheek=new THREE.ExtrudeGeometry(shape,{depth:.34,bevelEnabled:true,bevelSize:.025,bevelThickness:.025,bevelSegments:1,steps:1});
    cheek.translate(0,0,-.17);cheek.rotateY(direction<0?Math.PI/2:-Math.PI/2);
    batch.add(cheek,materials.stone,[side*6.62,0,0]);
  }
  for(const z of [-10.2,10.2]) for(const side of [-1,1]) {
    for(let i=0;i<6;i++) {
      const x=side*(7.8+i*2.6);
      batch.box([.29,1.03,.29],[x,2.6,z],materials.stone);
      batch.add(new THREE.LatheGeometry([new THREE.Vector2(.09,0),new THREE.Vector2(.15,.045),new THREE.Vector2(.17,.11),new THREE.Vector2(.12,.19),new THREE.Vector2(.025,.27),new THREE.Vector2(0,.28)],16),materials.stone,[x,3.08,z]);
      if(i<5) {
        batch.box([2.55,.17,.23],[x+side*1.3,3.00,z],materials.stone);
        for(const offset of [-.78,0,.78])batch.box([.14,.57,.14],[x+side*1.3+offset,2.58,z],materials.stone);
        batch.box([2.48,.13,.18],[x+side*1.3,2.26,z],materials.stone);
      }
    }
  }
  for(const x of [-21,21]) {
    batch.box([.23,.17,20.3],[x,3,0],materials.stone);
    for(let z=-10;z<=10;z+=2) batch.box([.29,1.03,.29],[x,2.6,z],materials.stone);
  }
  batch.finish(root);
  return root;
}

export function createTaijiPaving(materials: Materials): THREE.Group {
  const root=new THREE.Group(); root.name='taiji-paving-v2';
  const transforms: {x:number;z:number;w:number;d:number}[]=[];
  const addCourses=(minX:number,maxX:number,minZ:number,maxZ:number)=>{
    for(let row=0;row<Math.ceil((maxZ-minZ)/.6);row++){
      const near=minZ+row*.6,far=Math.min(maxZ,near+.6);
      for(let column=0;column<Math.ceil((maxX-minX)/1.2)+1;column++){
        const x=minX-(row%2)*.6+column*1.2,left=Math.max(minX,x),right=Math.min(maxX,x+1.2);
        if(right-left<.02)continue;
        transforms.push({x:(left+right)/2,z:(near+far)/2,w:right-left-.014,d:far-near-.012});
      }
    }
  };
  addCourses(152,236,163,221.5);addCourses(157,231,232,256);
  const slabs=new THREE.InstancedMesh(createPavingSlabGeometry(),materials.stone,transforms.length);
  slabs.name='individual-courtyard-slabs'; slabs.receiveShadow=true;
  const dummy=new THREE.Object3D();
  transforms.forEach((p,i)=>{
    dummy.position.set(p.x,.37+((i*19)%11)*.0006,p.z);dummy.scale.set(p.w,1,p.d);dummy.rotation.y=((i*7)%13-6)*.00035;dummy.updateMatrix();slabs.setMatrixAt(i,dummy.matrix);
    const v=.83+((i*53)%107)/107*.13; slabs.setColorAt(i,new THREE.Color(v,v*(.965+(i%3)*.012),v*(.92+(i%5)*.017)));
  });
  root.add(slabs);
  const batch=new Masonry();
  // Fine perimeter channels and broad stone borders frame the existing court.
  for(const x of [152.15,235.85]) {
    batch.box([.25,.025,58.4],[x,.446,192.25],materials.shadow);
    batch.box([.56,.12,58.4],[x+(x<194?.4:-.4),.43,192.25],materials.stone);
  }
  batch.finish(root);
  const treeGroup=new THREE.Group();treeGroup.name='procedural-courtyard-trees';
  addCourtyardTrees(treeGroup, materials);root.add(treeGroup);
  return root;
}


function addCourtyardTrees(root: THREE.Group, materials: Materials) {
  let seed=7721;
  const random=()=>{seed=(seed*1664525+1013904223)>>>0; return seed/4294967296;};
  const branches=new Masonry();
  const leaves: {p:THREE.Vector3;s:number;r:V3;tone:number}[]=[];
  for(const [x,z] of taijiTreePositions) {
    const centers:THREE.Vector3[]=[];
    branches.column(.20,4.1,[x,2.45,z],materials.bark);
    for(let branch=0;branch<9;branch++) {
      const angle=branch*2.399, reach=1.3+random()*1.3;
      const start=new THREE.Vector3(x,2.5+random()*1.4,z);
      const end=new THREE.Vector3(x+Math.cos(angle)*reach,4.7+random()*2.3,z+Math.sin(angle)*reach);
      const curve=new THREE.CatmullRomCurve3([start,start.clone().lerp(end,.5).add(new THREE.Vector3(0,.45,0)),end]);
      branches.add(new THREE.TubeGeometry(curve,6,.065,6,false),materials.bark);
      centers.push(end);
    }
    for(const center of centers) for(let i=0;i<360;i++) {
      const a=random()*Math.PI*2, v=random()*2-1, rr=Math.cbrt(random());
      const p=center.clone().add(new THREE.Vector3(Math.cos(a)*Math.sqrt(1-v*v)*rr*1.45,v*rr*.85,Math.sin(a)*Math.sqrt(1-v*v)*rr*1.45));
      leaves.push({p,s:.19+random()*.17,r:[random()*2.1,random()*Math.PI*2,random()*.8],tone:.57+random()*.48});
    }
    branches.box([2.2,.12,2.2],[x,.49,z],materials.bark);
    for(const side of [-1,1]) {
      branches.box([2.48,.23,.18],[x,.52,z+side*1.17],materials.stone);
      branches.box([.18,.23,2.48],[x+side*1.17,.52,z],materials.stone);
    }
  }
  const leaf=new THREE.BufferGeometry();
  leaf.setAttribute('position',new THREE.Float32BufferAttribute([0,0,-.6,-.33,.04,0,0,.10,.7,0,0,-.6,0,.10,.7,.33,.04,0],3));
  leaf.setAttribute('uv',new THREE.Float32BufferAttribute([.02,.59,.10,.56,.24,.68,.02,.59,.24,.68,.15,.70],2));leaf.computeVertexNormals();
  const mesh=new THREE.InstancedMesh(leaf,materials.foliage,leaves.length);mesh.name='courtyard-foliage';mesh.castShadow=mesh.receiveShadow=true;
  const dummy=new THREE.Object3D();
  leaves.forEach((l,i)=>{dummy.position.copy(l.p);dummy.scale.setScalar(l.s);dummy.rotation.set(...l.r);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);mesh.setColorAt(i,new THREE.Color(l.tone,l.tone*.98,l.tone*.85));});
  root.add(mesh);branches.finish(root);
}


/** One closed north gate replaces the overlapping city gate and garden hall. */
export function createTaijiNorthGate(materials:Materials):THREE.Group {
  const root=new THREE.Group();root.name='refined-north-gate';root.position.set(194,0,287);
  const batch=new Masonry();
  batch.box([26,.5,8],[0,.53,0],materials.stone);
  // Cover the original garden hall collision protrusion south of the city gate.
  batch.box([18,.5,1.5],[0,.53,-4.75],materials.stone);
  batch.box([25.4,6.9,7.0],[0,4.23,0],materials.wall);
  const roof={width:27.8,depth:9.55,base:7.95,rise:1.92};
  for(const side of [-1,1]) {
    const z=side*3.84,front=side*3.57;
    for(let i=0;i<=8;i++) {
      const x=-12.7+i*25.4/8;
      batch.column(.22,6.9,[x,4.23,z],materials.wood);
      batch.column(.29,.19,[x,.875,z],materials.stone);
      batch.add(createRoofBearingGeometry({roofWidth:roof.width,roofDepth:roof.depth,roofBase:roof.base,roofRise:roof.rise,centerX:x,centerZ:z,width:.84,depth:.64,bottom:7.60,profile:'steady-crafted'}),materials.darkWood,[x,0,z]);
    }
    batch.box([25.8,.26,.28],[0,7.58,z],materials.painted);
    for(let i=0;i<8;i++) {
      const x=-12.7+(i+.5)*25.4/8;
      batch.box([2.74,1.8,.12],[x,6.18,front],materials.shadow);
      for(let k=-4;k<=4;k++)batch.box([.065,1.82,.10],[x+k*.28,6.18,front+side*.07],materials.wood);
      for(const y of [5.27,6.18,7.09])batch.box([2.84,.12,.15],[x,y,front+side*.08],materials.wood);
    }
    // Closed door leaves communicate the retained solid collision, not a new passage.
    batch.box([5.2,4.15,.15],[0,2.90,front+side*.03],materials.darkWood);
    for(const leaf of [-1,1]) {
      batch.box([2.42,3.95,.14],[leaf*1.27,2.90,front+side*.12],materials.wood);
      for(const y of [1.03,2.90,4.78])batch.box([2.5,.15,.10],[leaf*1.27,y,front+side*.22],materials.darkWood);
    }
    for(const x of [-2.7,0,2.7])batch.box([.16,4.32,.24],[x,2.94,front+side*.22],materials.darkWood);
  }
  for(const side of [-1,1]) {
    batch.box([.22,.26,7.7],[side*12.79,7.58,0],materials.painted);
    for(const z of [-2,0,2])batch.box([.18,6.8,.2],[side*12.76,4.18,z],materials.wood);
  }
  batch.finish(root);addHipRoof(root,roof.width,roof.depth,roof.base,roof.rise,materials,'steady-crafted');
  return root;
}

export function createTaijiSurroundings(materials: Materials): THREE.Group {
  const root=new THREE.Group();root.name='taiji-surroundings-v4';root.add(createTaijiNorthGate(materials));
  const verges=new THREE.Mesh(createBoundaryGroundGeometry(),materials.landscape);verges.name='palace-side-verges';verges.receiveShadow=true;root.add(verges);
  root.add(createTaijiGardenPool(materials));
  const precinct=imperialPrecincts.find(p=>p.id==='taiji-palace')!;
  for(const hall of [...precinct.halls,...precinct.annexes].filter(h=>['taiji-west-wing','taiji-east-wing','front-court-west-gallery','front-court-east-gallery','liangyi-hall','liangyi-west-wing','liangyi-east-wing','garden-west-pavilion','garden-east-pavilion'].includes(h.id))) {
    const group=new THREE.Group();group.name='refined-'+hall.id;group.position.set(hall.x,0,hall.z);
    // Align the ridge to the LONG axis while preserving the source footprint and rotation.
    const w=Math.max(hall.width,hall.depth),d=Math.min(hall.width,hall.depth);
    group.rotation.y=(hall.rotation??0)+(hall.depth>hall.width?Math.PI/2:0);
    const foundationBatch=new Masonry();
    if(hall.id==='liangyi-hall')group.add(createLiangyiPodium(materials.stone));
    else foundationBatch.box([w+1.0,.45,d+1.0],[0,.55,0],materials.stone);
    foundationBatch.finish(group);
    const assembly=new THREE.Group();assembly.name='refined-'+hall.id+'-upper';assembly.position.y=hall.id==='liangyi-hall'?.8:0;group.add(assembly);
    const batch=new Masonry();
    batch.box([w-.6,hall.height-.4,d-1.8],[0,(hall.height-.4)/2+.78,0],hall.role==='residential'?materials.wall:materials.plaster);
    const roofWidth=w+1.2,roofDepth=d+1.5,roofBase=hall.height+.8,roofRise=Math.min(2.0,d*.21);
    const count=Math.max(4,Math.round(w/3.6));
    for(const side of [-1,1]) {
      const z=side*(d/2-.14);
      batch.box([w,.24,.26],[0,hall.height+.5,z],materials.darkWood);
      for(let i=0;i<=count;i++) {
        const x=-w/2+.25+(w-.5)*i/count;
        batch.column(hall.role==='residential'?.23:.17,hall.height,[x,hall.height/2+.8,z],materials.wood);
        batch.box([.6,.18,.48],[x,hall.height+.48,z],materials.darkWood);
        batch.add(createRoofBearingGeometry({roofWidth,roofDepth,roofBase,roofRise,centerX:x,centerZ:z,width:.92,depth:.64,bottom:hall.height+.56,profile:'steady-crafted'}),materials.wood,[x,0,z]);
        batch.box([.42,.32,.40],[x,hall.height+.22,z],materials.wood);
        batch.column(.25,.17,[x,.86,z],materials.stone);
      }
      for(let i=0;i<count;i++) {
        const x=-w/2+.25+(w-.5)*(i+.5)/count;
        const panelWidth=Math.min(2.8,w/count-.45);
        const panelHeight=Math.min(3.9,hall.height-1.8),panelCenter=1.75+panelHeight/2;
        batch.box([panelWidth,panelHeight,.10],[x,panelCenter,side*(d/2-.84)],materials.shadow);
        for(let k=-3;k<=3;k++)batch.box([.06,panelHeight+.04,.09],[x+k*panelWidth/8,panelCenter,side*(d/2-.76)],materials.wood);
        batch.box([panelWidth,.14,.13],[x,1.70,side*(d/2-.73)],materials.wood);
        for(let k=0;k<Math.ceil(panelHeight/.43);k++)batch.box([panelWidth,.045,.085],[x,1.85+k*.43,side*(d/2-.74)],materials.wood);
        batch.box([panelWidth,.15,.13],[x,1.75+panelHeight,side*(d/2-.73)],materials.wood);
        batch.box([panelWidth,.70,.16],[x,1.23,side*(d/2-.75)],materials.wall);
        if(hall.height>6) {
          batch.box([panelWidth,1,.1],[x,hall.height-.05,side*(d/2-.84)],materials.shadow);
          for(let k=-4;k<=4;k++)batch.box([.065,1,.12],[x+k*panelWidth/10,hall.height-.05,side*(d/2-.76)],materials.wood);
          batch.box([panelWidth,.16,.15],[x,hall.height-.62,side*(d/2-.74)],materials.darkWood);
        }
      }
    }
    addHipRoof(assembly,roofWidth,roofDepth,roofBase,roofRise,materials,'steady-crafted');
    batch.finish(assembly);root.add(group);
  }
  const gate=new THREE.Group();gate.name='refined-chengtian-gate';gate.position.set(194,0,164);
  const gateBatch=new Masonry();
  const gateRoof={width:42,depth:12.5,base:8.9,rise:2.7};
  // Keep the existing 40 x 11 gate footprint and central traversable opening.
  for(const side of [-1,1]) {
    gateBatch.box([17,.7,11],[side*11.5,.65,0],materials.stone);
    gateBatch.box([17,5.4,10.5],[side*11.5,3.7,0],materials.wall);
    gateBatch.box([17,.34,10.9],[side*11.5,6.55,0],materials.stone);
  }
  gateBatch.box([40,1.25,10.5],[0,6.2,0],materials.wall);
  for(const side of [-1,1]) {
    const z=side*5.4;
    for(let x=-18;x<=18;x+=3) {
      gateBatch.column(.2,2.5,[x,7.55,z],materials.wood);
      gateBatch.add(createRoofBearingGeometry({roofWidth:gateRoof.width,roofDepth:gateRoof.depth,roofBase:gateRoof.base,roofRise:gateRoof.rise,centerX:x,centerZ:z,width:.75,depth:.6,bottom:8.715,profile:'steady-crafted'}),materials.darkWood,[x,0,z]);
      if(Math.abs(x)>3) {
        gateBatch.box([2.5,1.5,.12],[x+1.3,7.55,side*5.3],materials.shadow);
        for(let j=0;j<5;j++) gateBatch.box([.07,1.5,.12],[x+.25+j*.46,7.55,side*5.42],materials.wood);
      }
    }
    gateBatch.box([40,.2,.28],[0,8.68,z],materials.wood);
    for(const x of [-3.1,3.1])gateBatch.box([.38,5.6,.5],[x,3.7,z],materials.stone);
  }
  addHipRoof(gate,gateRoof.width,gateRoof.depth,gateRoof.base,gateRoof.rise,materials,'steady-crafted');
  gateBatch.finish(gate);root.add(gate);
  // Re-clad only the court-facing wall interval, leaving gate openings and the rest of the city intact.
  const wallSegments=[
    {x:138,z:222,length:132,height:5.2,rotation:Math.PI/2,thickness:1.8},
    {x:250,z:222,length:132,height:5.2,rotation:Math.PI/2,thickness:1.8},
    {x:158,z:156,length:40,height:5.2,rotation:0,thickness:1.8},
    {x:230,z:156,length:40,height:5.2,rotation:0,thickness:1.8},
    {x:158,z:288,length:40,height:5.2,rotation:0,thickness:1.8},
    {x:230,z:288,length:40,height:5.2,rotation:0,thickness:1.8},
    {x:160,z:230,length:42,height:3.6,rotation:0,thickness:1.3},
    {x:228,z:230,length:42,height:3.6,rotation:0,thickness:1.3},
    {x:160,z:262,length:42,height:3.4,rotation:0,thickness:1.3},
    {x:228,z:262,length:42,height:3.4,rotation:0,thickness:1.3}
  ];
  for(const wall of wallSegments) {
    const group=new THREE.Group();group.position.set(wall.x,0,wall.z);group.rotation.y=wall.rotation;group.name='court-wall-cladding';
    const batch=new Masonry();
    batch.box([wall.length,.75,wall.thickness+.13],[0,.43,0],materials.stone);
    batch.box([wall.length,wall.height-.55,wall.thickness+.08],[0,(wall.height-.55)/2+.80,0],materials.wall);
    batch.box([wall.length,.24,wall.thickness+.16],[0,wall.height+.26,0],materials.plaster);
    addHipRoof(group,wall.length+.15,wall.thickness+.7,wall.height+.61,.31,materials,'legacy');
    batch.finish(group);root.add(group);
  }
  return root;
}

export function createTaijiNeighborOffices(sourceRoot:THREE.Object3D,materials:Materials):THREE.Group {
  const root=new THREE.Group();root.name='taiji-neighbor-offices-v1';
  sourceRoot.updateMatrixWorld(true);
  const inverseSourceRoot=sourceRoot.matrixWorld.clone().invert();
  for(const hall of getTaijiNeighborOffices()) {
    const office=new THREE.Group();office.name='refined-'+hall.id;office.position.set(hall.x,0,hall.z);
    const roof=officeRoofFrame(hall);office.rotation.y=roof.rotation;office.updateMatrixWorld(true);
    const inverseOffice=office.matrixWorld.clone().invert();
    const foundation=new THREE.Group();foundation.name='preserved-office-foundation';
    const sourceHall=sourceRoot.getObjectByName('imperial-hall-'+hall.id);
    if(!sourceHall)continue;
    sourceHall.traverse(object=>{
      if(!(object instanceof THREE.Mesh)||!['palace-podium','palace-step'].includes(object.name))return;
      const copy=new THREE.Mesh(object.geometry.clone(),materials.stone);copy.name=object.name;
      copy.matrix.copy(inverseOffice).multiply(inverseSourceRoot).multiply(object.matrixWorld);copy.matrixAutoUpdate=false;
      copy.castShadow=object.castShadow;copy.receiveShadow=object.receiveShadow;foundation.add(copy);
    });
    office.add(foundation);

    const podiumHeight=.82,bodyBottom=podiumHeight+.08;
    const long=Math.max(hall.width,hall.depth),short=Math.min(hall.width,hall.depth);
    const bodyHeight=hall.height-.35,bodyDepth=Math.max(3.8,short-3.4);
    const officeRoof={width:roof.width,depth:roof.depth,base:bodyBottom+bodyHeight+.38,rise:Math.min(2.15,short*.22)};
    const batch=new Masonry();
    batch.box([long-.65,bodyHeight,bodyDepth],[0,bodyBottom+bodyHeight/2,0],materials.plaster);
    const frontage=new THREE.Group();frontage.name='office-recessed-frontage';office.add(frontage);
    const bays=Math.max(5,Math.round(long/3.2));
    for(const side of [-1,1]) {
      const columnZ=side*(short/2-.38),panelZ=side*(bodyDepth/2+.055);
      batch.box([long-.15,.28,.32],[0,bodyBottom+bodyHeight+.05,columnZ],materials.darkWood);
      for(let index=0;index<=bays;index++) {
        const x=THREE.MathUtils.lerp(-long/2+.42,long/2-.42,index/bays);
        batch.column(.18,bodyHeight+.2,[x,bodyBottom+(bodyHeight+.2)/2,columnZ],materials.wood);
        batch.add(createRoofBearingGeometry({roofWidth:officeRoof.width,roofDepth:officeRoof.depth,roofBase:officeRoof.base,roofRise:officeRoof.rise,centerX:x,centerZ:columnZ,width:.72,depth:.50,bottom:bodyBottom+bodyHeight+.11,profile:'steady-crafted'}),materials.wood,[x,0,columnZ]);
      }
      for(let index=0;index<bays;index++) {
        const x=THREE.MathUtils.lerp(-long/2+.42,long/2-.42,(index+.5)/bays);
        const bayWidth=(long-.84)/bays-.32,isDoor=Math.abs(index-(bays-1)/2)<.75;
        batch.box([bayWidth,bodyHeight-1.15,.09],[x,bodyBottom+(bodyHeight-1.15)/2+.48,panelZ],materials.shadow);
        for(let bar=-2;bar<=2;bar++)batch.box([.055,bodyHeight-1.18,.07],[x+bar*bayWidth/6,bodyBottom+(bodyHeight-1.15)/2+.48,panelZ+side*.055],materials.wood);
        for(let bar=0;bar<5;bar++)batch.box([bayWidth,.045,.07],[x,bodyBottom+.65+bar*(bodyHeight-1.3)/4,panelZ+side*.06],materials.wood);
        if(isDoor)batch.box([bayWidth,.20,.13],[x,bodyBottom+.18,panelZ+side*.08],materials.darkWood);
      }
    }
    addHipRoof(office,officeRoof.width,officeRoof.depth,officeRoof.base,officeRoof.rise,materials,'steady-crafted');
    batch.finish(office);root.add(office);
  }
  return root;
}
