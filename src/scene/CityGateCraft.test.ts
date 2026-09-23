import * as THREE from 'three';
import { changanCity } from '../data/changanCity';
import { createHistoricalMaterialLibrary } from './HistoricalAssets';
import { createCityGateCraft } from './CityGateCraft';
import { northGateSourceId } from './TaijiInstanceFilter';

it('crafts only ordinary gates with finite instancing inside the existing roof footprint and budget', () => {
  const root=createCityGateCraft(changanCity,createHistoricalMaterialLibrary());
  const covered=new Set<number>(); let expanded=0;
  root.traverse(object=>{
    if(!(object instanceof THREE.InstancedMesh))return;
    expanded+=(object.geometry.index?.count??object.geometry.attributes.position.count)*object.count;
    for(let i=0;i<object.count;i++){
      const id=object.userData.gateIndices[i] as number, gate=changanCity.gatehouses[id]; covered.add(id);
      expect(northGateSourceId(gate,changanCity.gatehouses)).toBeUndefined();
      const matrix=new THREE.Matrix4(); object.getMatrixAt(i,matrix);
      expect(matrix.elements.every(Number.isFinite)).toBe(true);
      const inverse=new THREE.Matrix4().makeRotationY(-(gate.rotation??0)).multiply(new THREE.Matrix4().makeTranslation(-gate.x,0,-gate.z));
      const bounds=new THREE.Box3().setFromBufferAttribute(object.geometry.attributes.position as THREE.BufferAttribute).applyMatrix4(inverse.multiply(matrix));
      expect(Math.max(Math.abs(bounds.min.x),Math.abs(bounds.max.x))).toBeLessThanOrEqual((gate.width+1.05)/2+.001);
      expect(Math.max(Math.abs(bounds.min.z),Math.abs(bounds.max.z))).toBeLessThanOrEqual((gate.depth+1.05)/2+.001);
      expect(bounds.min.y).toBeGreaterThanOrEqual(0);
      if(object.name.includes('window-shadow'))expect(bounds.min.y).toBeGreaterThan(gate.height+.3+Math.max(1.15,gate.depth*.25));
      // The existing lintel begins at height - .48. No new solid may enter
      // the full passage below it, even trim, foundations, or stair noses.
      const opening=Math.min(gate.width,Math.max(4.8,Math.min(14,gate.width*.6)));
      if(bounds.min.y<gate.height-.48-.001)
        expect(bounds.max.x<=-opening/2+.001 || bounds.min.x>=opening/2-.001).toBe(true);
    }
  });
  expect(covered.size).toBe(3); expect(expanded).toBeGreaterThan(5000); expect(expanded).toBeLessThan(80000);
  expect(root.userData.expandedTriangleVertices).toBe(expanded);
  expect(root.userData.instanceCount).toBe(562);
});

it('supplies exposed upper joinery and masonry without adding roofs or mutating inputs',()=>{
  const before=JSON.stringify(changanCity), materials=createHistoricalMaterialLibrary();
  const root=createCityGateCraft(changanCity,materials);
  expect(JSON.stringify(changanCity)).toBe(before);
  for(const name of ['city-gate-craft-window-shadow','city-gate-craft-window-lattice','city-gate-craft-reveal','city-gate-craft-bracket','city-gate-craft-upper-column'])
    expect(root.getObjectByName(name)).toBeDefined();
  root.traverse(o=>{if(o instanceof THREE.Mesh)expect(Object.values(materials)).toContain(o.material);});
  expect(root.children.every(o=>!o.name.includes('roof'))).toBe(true);
});
