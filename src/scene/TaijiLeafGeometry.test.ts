import * as THREE from 'three';
import {calculateFarLeafAreaScale,calculateLeafPlanformArea,createTaijiFarLeafGeometry,createTaijiLeafGeometry,FAR_LEAF_RETENTION_STRIDE} from './TaijiLeafGeometry';
it('provides a folded owned leaf with upward-facing finite normals and physical proportions',()=>{
  const a=createTaijiLeafGeometry(),b=createTaijiLeafGeometry();
  expect(a.index).not.toBeNull();expect(a.getAttribute('uv').count).toBe(a.getAttribute('position').count);
  a.computeBoundingBox();const size=a.boundingBox!.getSize(new THREE.Vector3());
  expect(size.z).toBeCloseTo(1);expect(size.x).toBeLessThan(.5);expect(size.y).toBeGreaterThan(.025);
  const normal=a.getAttribute('normal');for(let i=0;i<normal.count;i++){expect(Number.isFinite(normal.getX(i))).toBe(true);expect(normal.getY(i)).toBeGreaterThan(.7);}
  expect(a.getAttribute('position').array).not.toBe(b.getAttribute('position').array);
});

it('preserves aggregate blade planform at the unchanged half-count far LOD',()=>{
  const near=createTaijiLeafGeometry(),far=createTaijiFarLeafGeometry();
  const scale=calculateFarLeafAreaScale(near,far);
  const nearAggregate=calculateLeafPlanformArea(near);
  const farAggregate=calculateLeafPlanformArea(far)*scale*scale/FAR_LEAF_RETENTION_STRIDE;
  expect(scale).toBeGreaterThan(1.5);expect(scale).toBeLessThan(1.7);
  expect(farAggregate).toBeCloseTo(nearAggregate,6);
  expect(far.getAttribute('position').count).toBe(4);expect(far.getIndex()!.count).toBe(6);
});

it('compacts the existing distant silhouette without changing rendered attribute corners',()=>{
  const near=createTaijiLeafGeometry(),far=createTaijiFarLeafGeometry();
  const oldFarIndices=[0,2,3,0,3,4];
  expect(far.getAttribute('position').count).toBe(4);
  expect(Array.from(far.index!.array)).toEqual([0,1,2,0,2,3]);
  for(const name of ['position','normal','uv']) {
    const nearAttribute=near.getAttribute(name),farAttribute=far.getAttribute(name);
    const nearCorners=oldFarIndices.flatMap(vertex=>Array.from({length:nearAttribute.itemSize},(_,component)=>nearAttribute.getComponent(vertex,component)));
    const farCorners=Array.from(far.index!.array).flatMap(vertex=>Array.from({length:farAttribute.itemSize},(_,component)=>farAttribute.getComponent(vertex,component)));
    expect(farCorners).toEqual(nearCorners);
    expect(farAttribute.array).not.toBe(nearAttribute.array);
  }
});

it('removes more than one million expanded far-canopy vertices at the current tree budget',()=>{
  const treeCount=46,farInstancesPerTree=Math.ceil(16_000/2);
  const previousVertices=7*farInstancesPerTree*treeCount;
  const compactVertices=createTaijiFarLeafGeometry().getAttribute('position').count*farInstancesPerTree*treeCount;
  expect(previousVertices-compactVertices).toBe(1_104_000);
});
