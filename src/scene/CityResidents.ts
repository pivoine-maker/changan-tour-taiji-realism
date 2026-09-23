import * as THREE from 'three';
import type { HistoricalMaterialLibrary } from './HistoricalAssets';

/** Local coordinates follow the source batches' parent. Sources stay untouched;
 * the caller controls their visibility and attaches this group to that parent. */
export function createCityResidents(
  bodySource: THREE.InstancedMesh,
  headSource: THREE.InstancedMesh,
  materials: HistoricalMaterialLibrary,
): { group: THREE.Group; dispose: () => void } {
  if(bodySource.count!==headSource.count) throw new Error('Resident body/head pair count mismatch');
  const group=new THREE.Group();group.name='city-residents';group.userData.residentCount=bodySource.count;
  const ownedGeometry=new Set<THREE.BufferGeometry>(),ownedMaterials=new Set<THREE.Material>();
  const own=(geometry:THREE.BufferGeometry)=>{ownedGeometry.add(geometry);return geometry;};
  const clone=(source:THREE.MeshStandardMaterial,neutral=false)=>{
    const material=source.clone();material.roughness=.96;material.metalness=0;
    if(neutral)material.color.set(0xffffff);
    ownedMaterials.add(material);return material;
  };
  const cloth=clone(materials.fabricIndigo,true),skin=clone(materials.skin),dark=clone(materials.charcoal),trim=clone(materials.fabricOchre);
  // Nonzero ring radii retain shoulders and hanging fabric rather than a cone apex.
  const robe=own(rings([[.08,.29,.19],[.50,.25,.16],[.79,.20,.14]],8,true));
  const torso=own(rings([[.71,.20,.14],[1.02,.265,.14]],6));
  const sleeve=own(rings([[-.5,.075,.075],[.5,.105,.09]],6,false,.476));
  const head=own(new THREE.SphereGeometry(1,8,4));
  const small=own(new THREE.OctahedronGeometry(1,0));
  const box=own(new THREE.BoxGeometry(1,1,1));
  type Part={name:string;geometry:THREE.BufferGeometry;material:THREE.MeshStandardMaterial;position:[number,number,number];scale:[number,number,number];rotation?:number;clothing?:boolean};
  const parts:Part[]=[
    {name:'robes',geometry:robe,material:cloth,position:[0,0,0],scale:[1,1,1],clothing:true},
    {name:'torsos',geometry:torso,material:cloth,position:[0,0,0],scale:[1,1,1],clothing:true},
    ...([-1,1] as const).flatMap(side=>[
      {name:`sleeves-${side}`,geometry:sleeve,material:cloth,position:[side*.255,.83,0] as [number,number,number],scale:[1,.34,1] as [number,number,number],rotation:side*.10,clothing:true},
      {name:`hands-${side}`,geometry:small,material:skin,position:[side*.272,.626,.01] as [number,number,number],scale:[.042,.068,.045] as [number,number,number]},
      {name:`shoes-${side}`,geometry:box,material:dark,position:[side*.115,.035,.035] as [number,number,number],scale:[.13,.07,.235] as [number,number,number]},
    ]),
    {name:'heads',geometry:head,material:skin,position:[0,1.155,.006],scale:[.125,.137,.124]},
    {name:'noses',geometry:small,material:skin,position:[0,1.155,.119],scale:[.022,.03,.037]},
    {name:'hair',geometry:small,material:dark,position:[0,1.249,-.02],scale:[.135,.074,.125]},
    {name:'belts',geometry:box,material:dark,position:[0,.76,.008],scale:[.415,.037,.294]},
    {name:'collars',geometry:box,material:trim,position:[-.033,.965,.131],scale:[.037,.16,.018],rotation:-.46},
  ];
  const palette=['#777367','#646f75','#82745c','#706653','#7b675f','#5f6861'].map(c=>new THREE.Color(c));
  const sourceMatrix=new THREE.Matrix4(),base=new THREE.Matrix4(),local=new THREE.Matrix4(),matrix=new THREE.Matrix4();
  const position=new THREE.Vector3(),rotation=new THREE.Quaternion(),scale=new THREE.Vector3(),axis=new THREE.Vector3(0,0,1);
  for(const part of parts){
    const mesh=new THREE.InstancedMesh(part.geometry,part.material,bodySource.count);mesh.name=`city-resident-${part.name}`;
    mesh.castShadow=true;mesh.receiveShadow=true;
    local.compose(new THREE.Vector3(...part.position),new THREE.Quaternion().setFromAxisAngle(axis,part.rotation??0),new THREE.Vector3(...part.scale));
    for(let i=0;i<bodySource.count;i++){
      bodySource.getMatrixAt(i,sourceMatrix);sourceMatrix.decompose(position,rotation,scale);
      if(![...position.toArray(),...scale.toArray(),...rotation.toArray()].every(Number.isFinite)||Math.min(scale.x,scale.y,scale.z)<=0)throw new Error('Invalid resident transform');
      // Cone source bottom is the ground anchor. Height variation is preserved.
      position.add(new THREE.Vector3(0,-scale.y/2,0).applyQuaternion(rotation));
      base.compose(position,rotation,new THREE.Vector3(scale.x/.42,scale.y,scale.z/.42));
      mesh.setMatrixAt(i,matrix.multiplyMatrices(base,local));
      if(part.clothing)mesh.setColorAt(i,palette[(i*7+Math.floor(i/3))%palette.length]);
    }
    mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;
    mesh.computeBoundingBox();mesh.computeBoundingSphere();group.add(mesh);
  }
  let disposed=false;
  return {group,dispose:()=>{if(disposed)return;disposed=true;group.removeFromParent();group.traverse(obj=>{if(obj instanceof THREE.InstancedMesh)obj.dispose();});ownedGeometry.forEach(g=>g.dispose());ownedMaterials.forEach(m=>m.dispose());}};
}

/** Compact indexed fabric surface, with alternating shallow vertical folds. */
function rings(profile:number[][],segments:number,folds=false,verticalScale=1.4):THREE.BufferGeometry {
  const vertices:number[]=[],uvs:number[]=[],indices:number[]=[];
  const stride=segments+1;
  // Two fabric repeats per world unit at the nominal 1.4 m body height.
  // Sleeves supply their actual vertical scale to retain the same weave size.
  const widest=profile.reduce((best,r)=>r[1]+r[2]>best[1]+best[2]?r:best);
  const circumference=Math.PI*(3*(widest[1]+widest[2])-Math.sqrt((3*widest[1]+widest[2])*(widest[1]+3*widest[2])));
  profile.forEach(([y,rx,rz],ring)=>{
    for(let j=0;j<=segments;j++){
      const angle=j/segments*Math.PI*2,fold=folds&&j%2===1?1-(.055*(1-ring/(profile.length+1))):1;
      vertices.push(Math.cos(angle)*rx*fold,y,Math.sin(angle)*rz*fold);
      uvs.push(j/segments*circumference*2,y*verticalScale*2);
    }
  });
  for(let r=0;r<profile.length-1;r++)for(let j=0;j<segments;j++){
    const a=r*stride+j,b=a+1,c=a+stride,d=b+stride;
    indices.push(a,c,b,b,c,d);
  }
  for(let j=1;j<segments-1;j++){
    indices.push(0,j,j+1);const top=(profile.length-1)*stride;indices.push(top,top+j+1,top+j);
  }
  const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geometry.setIndex(indices);geometry.computeVertexNormals();
  const normals=geometry.attributes.normal,n=new THREE.Vector3(),other=new THREE.Vector3();
  for(let r=0;r<profile.length;r++){
    const first=r*stride,last=first+segments;n.fromBufferAttribute(normals,first).add(other.fromBufferAttribute(normals,last)).normalize();normals.setXYZ(first,n.x,n.y,n.z);normals.setXYZ(last,n.x,n.y,n.z);
  }
  return geometry;
}
