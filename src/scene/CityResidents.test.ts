import * as THREE from 'three';
import { createCityResidents } from './CityResidents';
import { createHistoricalMaterialLibrary } from './HistoricalAssets';

function sources(count=209) {
  const materials=createHistoricalMaterialLibrary();
  const body=new THREE.InstancedMesh(new THREE.ConeGeometry(1,1,8),materials.fabricIndigo,count);
  const head=new THREE.InstancedMesh(new THREE.SphereGeometry(1),materials.skin,count);
  const matrix=new THREE.Matrix4();
  for(let i=0;i<count;i++) {
    body.setMatrixAt(i,matrix.compose(new THREE.Vector3(i*3,1.16,0),new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),i*.83),new THREE.Vector3(.42,1.4,.42)));
    head.setMatrixAt(i,matrix.makeScale(.28,.33,.28).setPosition(i*3,2.07,0));
  }
  return {body,head,materials};
}

it('keeps all resident pairs finite, within their original footprint and triangle budget',()=>{
  const {body,head,materials}=sources(); const result=createCityResidents(body,head,materials);
  expect(result.group.userData.residentCount).toBe(209);
  let expanded=0;const matrix=new THREE.Matrix4(),v=new THREE.Vector3();
  result.group.traverse(obj=>{if(!(obj instanceof THREE.InstancedMesh))return;
    expect(obj.count).toBe(209);expanded+=(obj.geometry.index?.count??obj.geometry.attributes.position.count)*obj.count;
    for(let i=0;i<obj.count;i++){obj.getMatrixAt(i,matrix);const p=obj.geometry.attributes.position;
      for(let j=0;j<p.count;j++){v.fromBufferAttribute(p,j).applyMatrix4(matrix);expect(Number.isFinite(v.x+v.y+v.z)).toBe(true);expect(Math.hypot(v.x-i*3,v.z)).toBeLessThanOrEqual(.421);expect(v.y).toBeGreaterThanOrEqual(.459);expect(v.y).toBeLessThanOrEqual(2.4);}
    }
  });
  expect(expanded).toBeLessThan(150000);expect(expanded).toBe(145464);
  const heads=result.group.getObjectByName('city-resident-heads') as THREE.InstancedMesh;
  expect(heads.geometry.type).toBe('SphereGeometry');
  const robe=result.group.getObjectByName('city-resident-robes') as THREE.InstancedMesh;
  expect(robe.geometry.attributes.uv.count).toBe(robe.geometry.attributes.position.count);
  expect(new Set(Array.from(robe.geometry.attributes.uv.array)).size).toBeGreaterThan(8);
  result.dispose();
});

it('varies clothing deterministically and never mutates or disposes borrowed resources',()=>{
  const {body,head,materials}=sources(8),before=body.instanceMatrix.array.slice();
  const borrowed=[body.geometry,head.geometry,...Object.values(materials)].map(r=>vi.spyOn(r,'dispose'));
  const a=createCityResidents(body,head,materials),b=createCityResidents(body,head,materials);
  const robe=a.group.getObjectByName('city-resident-robes') as THREE.InstancedMesh;
  expect(Array.from(robe.instanceColor!.array)).toEqual(Array.from((b.group.getObjectByName('city-resident-robes') as THREE.InstancedMesh).instanceColor!.array));
  expect(new Set(Array.from(robe.instanceColor!.array)).size).toBeGreaterThan(3);
  const owned=vi.spyOn(robe.geometry,'dispose');const parent=new THREE.Group();parent.add(a.group);a.dispose();a.dispose();b.dispose();expect(a.group.parent).toBeNull();
  expect(owned).toHaveBeenCalledTimes(1);borrowed.forEach(spy=>expect(spy).not.toHaveBeenCalled());
  expect(body.visible).toBe(true);expect(Array.from(body.instanceMatrix.array)).toEqual(Array.from(before));
});

it('rejects missing pairs instead of silently losing people',()=>{
  const {body,head,materials}=sources(2);head.count=1;
  expect(()=>createCityResidents(body,head,materials)).toThrow(/pair/i);
});
