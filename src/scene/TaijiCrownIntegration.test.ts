import * as THREE from 'three';
import {vi} from 'vitest';
import {loadTaijiTrees} from './TaijiTrees';
import {calculateLeafPlanformArea} from './TaijiLeafGeometry';
vi.mock('three/addons/loaders/GLTFLoader.js',()=>({GLTFLoader:class {async loadAsync(){const scene=new THREE.Group();scene.add(new THREE.Mesh(new THREE.BoxGeometry(.4,4,.4).translate(0,2,0),new THREE.MeshStandardMaterial()));return {scene};}}}));
it('installs all 46 tree crowns with detailed near and reduced far budgets and disposes them',async()=>{
 const texture=vi.spyOn(THREE.TextureLoader.prototype,'loadAsync').mockImplementation(async()=>new THREE.Texture());
 const leaves=Array.from({length:16000},(_,i)=>({p:[Math.sin(i)*.9,2+(i%101)/50,Math.cos(i*.73)],n:[0,1,0],t:[1,0,0],d:[.05,.025,.003]}));
 vi.stubGlobal('fetch',vi.fn(async()=>({ok:true,json:async()=>({sourceComponents:30250,leaves})})));
 try {
  const result=await loadTaijiTrees();
  const near:THREE.InstancedMesh[]=[],far:THREE.InstancedMesh[]=[];
  result.group.traverse(o=>{if(o.name==='close-leaf-canopy')near.push(o as THREE.InstancedMesh);if(o.name==='distant-leaf-canopy')far.push(o as THREE.InstancedMesh);});
  expect(near).toHaveLength(46);expect(far).toHaveLength(46);
  expect(near.every(m=>m.count===22000)).toBe(true);expect(far.every(m=>m.count===5000)).toBe(true);
  expect(near.every(m=>m.geometry.attributes.position.count*m.count===154000)).toBe(true);
  expect(far.every(m=>m.geometry.attributes.position.count*m.count===20000)).toBe(true);
  const fillArea=(mesh:THREE.InstancedMesh,start:number)=>{
   const matrix=new THREE.Matrix4(),x=new THREE.Vector3(),z=new THREE.Vector3();let area=0;
   for(let i=start;i<mesh.count;i++){mesh.getMatrixAt(i,matrix);x.setFromMatrixColumn(matrix,0);z.setFromMatrixColumn(matrix,2);area+=x.cross(z).length();}
   return area*calculateLeafPlanformArea(mesh.geometry);
  };
  expect(fillArea(far[0],2000)/fillArea(near[0],16000)).toBeCloseTo(1,1);
  const before=near[0].parent!.position.clone();expect(before.x).not.toBe(0);
  expect(Array.from(near[0].instanceMatrix.array).every(Number.isFinite)).toBe(true);
  let disposed=0;near[0].addEventListener('dispose',()=>disposed++);result.dispose();expect(disposed).toBe(1);
 }finally{texture.mockRestore();vi.unstubAllGlobals();}
});
