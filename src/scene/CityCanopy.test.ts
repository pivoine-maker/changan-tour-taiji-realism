import * as THREE from 'three';
import { createCityCrownGeometry, createCityTrees } from './CityArchitecture';
import { createHistoricalMaterialLibrary } from './HistoricalAssets';
import { changanCity } from '../data/changanCity';

const trees=changanCity.wards.flatMap(w=>w.trees);
const point=(mesh:THREE.InstancedMesh,index:number,y:number)=>{
  const matrix=new THREE.Matrix4();mesh.getMatrixAt(index,matrix);
  return new THREE.Vector3(0,y,0).applyMatrix4(matrix);
};

describe('city canopy volume and connected branches',()=>{
  it('keeps every transformed foliage vertex finite and within 1.6m of its tree',()=>{
    const a=createCityTrees(createHistoricalMaterialLibrary(),changanCity);
    const b=createCityTrees(createHistoricalMaterialLibrary(),changanCity);
    const leaves=a.getObjectByName('city-tree-leaf-clusters') as THREE.InstancedMesh;
    const other=b.getObjectByName('city-tree-leaf-clusters') as THREE.InstancedMesh;
    expect(Array.from(leaves.instanceMatrix.array)).toEqual(Array.from(other.instanceMatrix.array));
    const reordered=createCityTrees(createHistoricalMaterialLibrary(),{...changanCity,wards:[{...changanCity.wards[0],trees:[...trees].reverse()}]}).getObjectByName('city-tree-leaf-clusters') as THREE.InstancedMesh;
    const p=leaves.geometry.getAttribute('position'),matrix=new THREE.Matrix4(),otherMatrix=new THREE.Matrix4();
    trees.forEach((tree,i)=>{
      leaves.getMatrixAt(i,matrix);reordered.getMatrixAt(trees.length-1-i,otherMatrix);
      expect(matrix.elements).toEqual(otherMatrix.elements);
      for(let j=0;j<p.count;j++){
        const v=new THREE.Vector3().fromBufferAttribute(p,j).applyMatrix4(matrix);
        expect(v.toArray().every(Number.isFinite)).toBe(true);
        expect(Math.hypot(v.x-tree.x,v.z-tree.z)).toBeLessThanOrEqual(1.6);
      }
    });
  });
  it('uses normalized outward, sky-biased foliage normals rather than flat card shading',()=>{
    const geometry=createCityCrownGeometry();
    const p=geometry.getAttribute('position'),n=geometry.getAttribute('normal');
    for(let i=0;i<n.count;i++){
      const normal=new THREE.Vector3().fromBufferAttribute(n,i);
      expect(normal.toArray().every(Number.isFinite)).toBe(true);
      expect(normal.length()).toBeCloseTo(1,5);
      expect(normal.y).toBeGreaterThan(.1);
      expect(normal.x*p.getX(i)+normal.z*p.getZ(i)).toBeGreaterThanOrEqual(-.001);
    }
  });
  it('joins primary branches to the trunk and forks to their parent inside the crown',()=>{
    const root=createCityTrees(createHistoricalMaterialLibrary(),changanCity);
    const branches=root.getObjectByName('city-tree-branches') as THREE.InstancedMesh;
    const forks=root.getObjectByName('city-tree-forks') as THREE.InstancedMesh;
    expect(forks).toBeInstanceOf(THREE.InstancedMesh);
    expect(branches.count).toBe(trees.length*4);expect(forks.count).toBe(trees.length*4);
    trees.forEach((tree,i)=>{
      for(let b=0;b<4;b++){
        const index=i*4+b,start=point(branches,index,-.5),end=point(branches,index,.5);
        expect(Math.hypot(start.x-tree.x,start.z-tree.z)).toBeLessThan(.08);
        expect(start.y).toBeGreaterThan(1.9);expect(start.y).toBeLessThan(2.78);
        expect(end.y).toBeGreaterThan(2.9);expect(end.y).toBeLessThan(3.7);
        const forkStart=point(forks,index,-.5),forkEnd=point(forks,index,.5);
        expect(new THREE.Line3(start,end).closestPointToPoint(forkStart,true,new THREE.Vector3()).distanceTo(forkStart)).toBeLessThan(.001);
        expect(Math.hypot(forkEnd.x-tree.x,forkEnd.z-tree.z)).toBeLessThan(1.2);
        expect(forkEnd.y).toBeGreaterThan(2.65);
      }
    });
  });
});
