import * as THREE from 'three';
import { createCourtSurfaceSpecs, createCityCourtyardEnvironment } from './CityCourtyardEnvironment';
import { changanCity } from '../data/changanCity';
import { createHistoricalMaterialLibrary } from './HistoricalAssets';

it('grounds every available courtyard with distinct regional treatments without crossing its clear envelope', () => {
  const specs = createCourtSurfaceSpecs(changanCity);
  expect(new Set(specs.map(s=>s.wardId)).size).toBe(changanCity.wards.length);
  expect(new Set(specs.map(s=>s.kind)).size).toBe(4);
  expect(specs.some(s=>s.material==='garden')).toBe(true);
  for (const spec of specs) {
    const court=changanCity.wards.find(w=>w.id===spec.wardId)!.courts![spec.courtIndex];
    expect(spec.width).toBeGreaterThan(0);expect(spec.depth).toBeGreaterThan(0);
    expect(spec.x-spec.width/2).toBeGreaterThanOrEqual(court.bounds.minX-.001);
    expect(spec.x+spec.width/2).toBeLessThanOrEqual(court.bounds.maxX+.001);
    expect(spec.z-spec.depth/2).toBeGreaterThanOrEqual(court.bounds.minZ-.001);
    expect(spec.z+spec.depth/2).toBeLessThanOrEqual(court.bounds.maxZ+.001);
    expect(spec.y).toBeLessThan(.25);
  }
});
it('batches courtyard surfaces and owns only its materials/geometries',()=>{
  const base=createHistoricalMaterialLibrary();const borrowed=new THREE.Texture();const spy=vi.spyOn(borrowed,'dispose');
  const result=createCityCourtyardEnvironment(changanCity,base,{earth:borrowed,stone:borrowed,wood:borrowed,roof:borrowed,wall:borrowed,landscapeColor:borrowed});
  let meshes=0,vertices=0;result.group.traverse(o=>{if(o instanceof THREE.Mesh){meshes++;vertices+=o.geometry.getAttribute('position').count;}});
  expect(meshes).toBeLessThanOrEqual(8);expect(vertices).toBeLessThan(30000);
  result.dispose();expect(spy).not.toHaveBeenCalled();
});
