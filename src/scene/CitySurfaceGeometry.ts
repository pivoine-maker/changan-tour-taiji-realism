import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export type CitySurfaceKind='wall'|'roof'|'wood'|'stone'|'window';
/** Bake only ordinary instances. Gate identities remain available for palace compaction.
 * Local metric UVs are actual geometry attributes, shared by raster and path rendering.
 * The caller owns all returned geometry and retains source/material ownership.
 */
export function bakeCitySurfaceInstances(source:THREE.InstancedMesh,kind:CitySurfaceKind,gableMaterial?:THREE.Material):THREE.Group {
 const result=new THREE.Group();result.name=source.name+'-surfaces';result.position.copy(source.position);result.quaternion.copy(source.quaternion);result.scale.copy(source.scale);
 const ids=(source.userData.sourceIds??[]) as (string|null)[];
 const retained:number[]=[],parts:THREE.BufferGeometry[]=[],matrix=new THREE.Matrix4();
 const position=new THREE.Vector3(),scale=new THREE.Vector3(),rotation=new THREE.Quaternion();
 for(let index=0;index<source.count;index++){
  if(ids[index]){retained.push(index);continue;}
  source.getMatrixAt(index,matrix);matrix.decompose(position,rotation,scale);
  const g=kind==='wall'?new THREE.BoxGeometry(1,1,1,1,8,1):source.geometry.clone();
  const p=g.getAttribute('position'),n=g.getAttribute('normal'),uv=g.getAttribute('uv');const colors:number[]=[];
  const variation=.91+.09*((index*0.61803398875)%1);
  for(let i=0;i<p.count;i++){
   const x=p.getX(i)*scale.x,y=p.getY(i)*scale.y,z=p.getZ(i)*scale.z;
   const nx=Math.abs(n.getX(i)),ny=Math.abs(n.getY(i)),nz=Math.abs(n.getZ(i));
   let u:number,v:number;
   if(kind==='window'){u=uv.getX(i);v=uv.getY(i);}
   else if(kind==='roof'){
    const end=nx>nz&&nx>.05;
    u=(end?z:x)/2.4;
    // Measure down each slope; opposite pitches retain consistent tile overlap.
    const run=(end?scale.x:scale.z)*.5;
    v=ny<.05?y/3:Math.abs(end?x:z)*Math.hypot(run,scale.y)/Math.max(run,.001)/2.4;
   }else if(kind==='wood'){
    const horizontal=scale.x>scale.y&&scale.x>scale.z;
    u=(horizontal?(nz>nx?y:z):(nz>nx?x:z))/.8;
    v=(horizontal?x:y)/2;
   }else{
    u=(ny>.5||nz>nx?x:z)/3;v=(ny>.5?z:y)/3;
   }
   uv.setXY(i,u+(kind==='window'?0:(index%7)*.137),v);
   let shade=variation;
   if(kind==='wall'){
    const height=p.getY(i)+.5;
    const foot=1-.20*Math.exp(-height*12),eave=1-.15*Math.pow(height,8);
    shade*=foot*eave;
   }
   colors.push(shade,shade,shade);
  }
  g.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));g.applyMatrix4(matrix);parts.push(g);
 }
 if(parts.length){
  const geometry=mergeGeometries(parts)!;parts.forEach(g=>g.dispose());
  const add=(g:THREE.BufferGeometry,borrowed:THREE.Material|THREE.Material[],suffix:string)=>{
   const material=Array.isArray(borrowed)?borrowed.map(m=>m.clone()):borrowed.clone();
   for(const m of [material].flat())if(m instanceof THREE.MeshStandardMaterial)m.vertexColors=true;
   const mesh=new THREE.Mesh(g,material);mesh.name=source.name+suffix;mesh.castShadow=source.castShadow;mesh.receiveShadow=source.receiveShadow;result.add(mesh);
  };
  if(kind==='roof'&&!geometry.index&&gableMaterial){
   const buckets:number[][]=[[],[]],normal=geometry.getAttribute('normal');
   for(let i=0;i<normal.count;i+=3){const bucket=Math.abs(normal.getY(i))<.05?1:0;buckets[bucket].push(i,i+1,i+2);}
   buckets.forEach((indices,index)=>{
    if(!indices.length)return;const part=new THREE.BufferGeometry();
    for(const [name,attribute] of Object.entries(geometry.attributes)){
     const values:number[]=[];for(const i of indices)for(let c=0;c<attribute.itemSize;c++)values.push(attribute.array[i*attribute.itemSize+c]);
     part.setAttribute(name,new THREE.Float32BufferAttribute(values,attribute.itemSize));
    }
    add(part,index?gableMaterial:source.material,index?'-gable-plaster':'-metric');
   });geometry.dispose();
  }else add(geometry,source.material,'-metric');
 }
 if(retained.length){
  const mesh=new THREE.InstancedMesh(source.geometry.clone(),source.material,retained.length);mesh.name=source.name+'-gates';
  retained.forEach((i,j)=>{source.getMatrixAt(i,matrix);mesh.setMatrixAt(j,matrix);});mesh.userData.sourceIds=retained.map(i=>ids[i]);mesh.castShadow=source.castShadow;mesh.receiveShadow=source.receiveShadow;result.add(mesh);
 }
 return result;
}
