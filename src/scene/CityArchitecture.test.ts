import * as THREE from 'three';
import { createCityRoofGeometry, createCityCrownGeometry, createCityArchitecture } from './CityArchitecture';
import { createFullCitySet } from './FullCityAssets';
import { createHistoricalMaterialLibrary } from './HistoricalAssets';
import { changanCity } from '../data/changanCity';
import { createGatePassageSegments, createWardWallSegments } from '../data/cityLayout';

function expandedVertices(root: THREE.Object3D) {
  let total=0; root.traverse(o=>{if(o instanceof THREE.Mesh)total+=o.geometry.getAttribute('position').count*(o instanceof THREE.InstancedMesh?o.count:1);}); return total;
}

describe('whole city realistic architecture',()=>{
  it('uses closed bounded hip and gable shells with raised ridges',()=>{
    for(const type of ['hip','gable'] as const){
      const geometry=createCityRoofGeometry(type); geometry.computeBoundingBox();
      expect(geometry.boundingBox!.min.x).toBeCloseTo(-.5);expect(geometry.boundingBox!.max.x).toBeCloseTo(.5);
      expect(geometry.boundingBox!.min.z).toBeCloseTo(-.5);expect(geometry.boundingBox!.max.z).toBeCloseTo(.5);
      expect(geometry.boundingBox!.max.y).toBeCloseTo(1);
      const counts=new Map<string,number>();const p=geometry.getAttribute('position');const idx=geometry.index;
      for(let n=0;n<(idx?.count??p.count);n+=3){const v=[0,1,2].map(i=>{const j=idx?idx.getX(n+i):n+i;return [p.getX(j),p.getY(j),p.getZ(j)].map(x=>x.toFixed(5)).join(',');});for(let i=0;i<3;i++){const key=[v[i],v[(i+1)%3]].sort().join('|');counts.set(key,(counts.get(key)??0)+1);}}
      expect([...counts.values()].every(n=>n===2)).toBe(true);
      const normals=geometry.getAttribute('normal');for(let i=0;i<p.count;i++){if(p.getY(i)>0)expect(normals.getY(i)).toBeGreaterThanOrEqual(0);}
    }
  });
  it('owns distinct restrained wall tones while preserving the caller palette and textures',()=>{
    const materials=createHistoricalMaterialLibrary();
    const before=Object.values(materials).map(m=>({material:m,color:m.color.getHex(),map:m.map}));
    const tones=['sand','clay','umber','dark'] as const;
    const buildings=tones.flatMap(tone=>[0,1].map(i=>({...changanCity.wards[0].buildings[0],tone,x:i*20})));
    const root=createCityArchitecture(materials,{...changanCity,wards:[{...changanCity.wards[0],buildings}],gatehouses:[]});
    const colors=new Set<number>();
    tones.forEach((tone)=>{
      const mesh=root.getObjectByName('city-wall-'+tone) as THREE.InstancedMesh;
      const material=mesh.material as THREE.MeshStandardMaterial;
      const source=tone==='sand'?materials.plaster:tone==='dark'?materials.wallDark:materials.wall;
      expect(mesh.count).toBe(2);expect(material).not.toBe(source);colors.add(material.color.getHex());
      expect(material.map).toBe(source.map);expect(material.name).toBe('city-owned-wall-'+tone);
    });
    expect(colors.size).toBe(4);
    before.forEach(({material,color,map})=>{expect(material.color.getHex()).toBe(color);expect(material.map).toBe(map);});
  });
  it('aligns skinny wing ridges with their long axis without changing the wall footprint',()=>{
    for(const rotation of [0,.31,Math.PI/2]){
      const building={...changanCity.wards[0].buildings[0],x:12,z:24,width:3.4,depth:14,height:3,rotation,roof:'hip' as const};
      const city={...changanCity,wards:[{...changanCity.wards[0],buildings:[building]}],gatehouses:[]};
      const root=createCityArchitecture(createHistoricalMaterialLibrary(),city);
      const roof=root.getObjectByName('city-roof-hip') as THREE.InstancedMesh;
      const matrix=new THREE.Matrix4();roof.getMatrixAt(0,matrix);
      const scale=new THREE.Vector3().setFromMatrixScale(matrix);
      expect(scale.x).toBeCloseTo(15.05);expect(scale.z).toBeCloseTo(4.45);expect(scale.y).toBeCloseTo(1.15);
      const ridgeAxis=new THREE.Vector3().setFromMatrixColumn(matrix,0).normalize();
      const originalLongAxis=new THREE.Vector3(Math.sin(rotation),0,Math.cos(rotation));
      expect(Math.abs(ridgeAxis.dot(originalLongAxis))).toBeCloseTo(1);
      const wall=root.getObjectByName('city-wall-'+building.tone) as THREE.InstancedMesh;
      wall.getMatrixAt(0,matrix);wall.geometry.computeBoundingBox();
      const actual=wall.geometry.boundingBox!.clone().applyMatrix4(matrix);
      const original=new THREE.Box3(new THREE.Vector3(-1.7,-1.5,-7),new THREE.Vector3(1.7,1.5,7)).applyMatrix4(new THREE.Matrix4().makeTranslation(12,1.78,24).multiply(new THREE.Matrix4().makeRotationY(rotation)));
      for(const axis of ['x','y','z'] as const){expect(actual.min[axis]).toBeCloseTo(original.min[axis]);expect(actual.max[axis]).toBeCloseTo(original.max[axis]);}
      expect(building.width).toBe(3.4);expect(building.depth).toBe(14);
    }
  });
  it('fills coherent crown volume with deterministic textured leaf cards at the old vertex cost',()=>{
    const a=createCityCrownGeometry(),b=createCityCrownGeometry();a.computeBoundingBox();
    expect(a.getAttribute('position').count).toBe(288);
    expect(a.index!.count).toBe(432);
    expect(Array.from(a.getAttribute('position').array)).toEqual(Array.from(b.getAttribute('position').array));
    const size=a.boundingBox!.getSize(new THREE.Vector3());
    expect(size.x).toBeGreaterThan(2.5);expect(size.z).toBeGreaterThan(2.5);expect(size.y).toBeGreaterThan(2);
    const uv=a.getAttribute('uv');expect(new Set(Array.from(uv.array))).toEqual(new Set([0,1]));
    a.dispose();b.dispose();
  });
  it('covers every supplied building with one roof system and stays within geometry budget',()=>{
    const materials=createHistoricalMaterialLibrary();const classic=createFullCitySet(materials,changanCity);
    const real=createFullCitySet(materials,changanCity,{realistic:true});
    expect(real.getObjectByName('ordinary-ward-roof-slopes')).toBeUndefined();
    expect(real.getObjectByName('full-city-building-roof-clay')).toBeUndefined();
    expect(real.getObjectByName('city-realistic-architecture')?.userData.buildingCount).toBe(changanCity.wards.reduce((n,w)=>n+w.buildings.length,0)+changanCity.gatehouses.length);
    expect(real.getObjectByName('city-tree-leaf-clusters')).toBeInstanceOf(THREE.InstancedMesh);
    const architecture=real.getObjectByName('city-realistic-architecture')!;
    const roofCount=architecture.userData.buildingCount;
    expect((architecture.getObjectByName('city-roof-tile-course') as THREE.InstancedMesh).count).toBe(roofCount*4);
    // Articulation is large enough to read at district scale, yet cheaper than old lattice/cylinder detail.
    expect(expandedVertices(architecture)/roofCount).toBeLessThan(1150);
    expect(expandedVertices(real)-expandedVertices(classic)).toBeLessThanOrEqual(400_000);
    const gateLayers:THREE.InstancedMesh[]=[];real.traverse(o=>{if(o instanceof THREE.InstancedMesh&&(o.userData.sourceIds as string[]|undefined)?.includes('full-city-gatehouse:north'))gateLayers.push(o);});expect(gateLayers.length).toBeGreaterThan(3);
  });
  it('renders the canonical gate wings and wall openings without solid doorway columns',()=>{
    const asset=createFullCitySet(createHistoricalMaterialLibrary(),changanCity,{realistic:true});
    const wings=asset.getObjectByName('city-gate-wing') as THREE.InstancedMesh;
    const expected=changanCity.gatehouses.flatMap(g=>createGatePassageSegments(g));expect(wings.count).toBe(expected.length);
    const matrix=new THREE.Matrix4(),position=new THREE.Vector3(),scale=new THREE.Vector3(),rotation=new THREE.Quaternion();
    expected.forEach((w,i)=>{wings.getMatrixAt(i,matrix);matrix.decompose(position,rotation,scale);expect(position.x).toBeCloseTo(w.x);expect(position.z).toBeCloseTo(w.z);expect(scale.x).toBeCloseTo(w.width);expect(scale.z).toBeCloseTo(w.depth);});
    const walls=asset.getObjectByName('full-city-ward-walls-bodies') as THREE.InstancedMesh;
    expect(walls.count).toBe(changanCity.wards.flatMap(w=>createWardWallSegments(w.bounds)).length);
    const primaryRoofs=['city-roof-hip','city-roof-gable'].map(n=>asset.getObjectByName(n) as THREE.InstancedMesh).reduce((n,m)=>n+(m?.count??0),0);
    expect(primaryRoofs).toBe(changanCity.wards.flatMap(w=>w.buildings).length+changanCity.gatehouses.length);
    const columns=asset.getObjectByName('city-timber-column') as THREE.InstancedMesh;const ids=columns.userData.sourceIds as (string|null)[];
    const north=changanCity.gatehouses.find(g=>g.z>280)!;
    ids.forEach((id,i)=>{if(id!=='full-city-gatehouse:north')return;columns.getMatrixAt(i,matrix);position.setFromMatrixPosition(matrix);expect(Math.abs(position.x-north.x)).toBeGreaterThan(Math.min(14,north.width*.6)/2);});
  });

});

it('keeps ordinary gate upper rooms above the lower roof ridge',()=>{
 const root=createCityArchitecture(createHistoricalMaterialLibrary(),changanCity);
 const upper=root.getObjectByName('city-tower-upper') as THREE.InstancedMesh;
 const matrix=new THREE.Matrix4();upper.getMatrixAt(0,matrix);
 const bottom=matrix.elements[13]-new THREE.Vector3().setFromMatrixScale(matrix).y/2;
 const gate=changanCity.gatehouses[0];
 expect(bottom).toBeGreaterThan(gate.height+.3+Math.max(1.15,gate.depth*.25));
});
