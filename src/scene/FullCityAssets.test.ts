import * as THREE from 'three';
import { changanCity } from '../data/changanCity';
import { createFullCitySet } from './FullCityAssets';
import { createHistoricalMaterialLibrary } from './HistoricalAssets';

describe('full city background assets', () => {
  it('renders wards with instancing instead of hundreds of standalone buildings', () => {
    const asset = createFullCitySet(createHistoricalMaterialLibrary(), changanCity);
    const instances: THREE.InstancedMesh[] = [];
    const names: string[] = [];

    asset.traverse((child) => {
      names.push(child.name);
      if (child instanceof THREE.InstancedMesh) {
        instances.push(child);
      }
    });

    expect(names).toContain('full-changan-city');
    expect(names).toContain('outer-city-wall');
    expect(names).toEqual(expect.arrayContaining([
      'full-city-ordinary-ward-details',
      'ordinary-ward-inner-lanes',
      'ordinary-ward-courtyard-paving',
      'ordinary-ward-foundations',
      'ordinary-ward-roof-slopes',
      'ordinary-ward-roof-ridges',
      'ordinary-ward-eaves',
      'ordinary-ward-timber-columns',
      'ordinary-ward-door-panels',
      'ordinary-ward-window-panels',
      'ordinary-ward-well-rings',
      'ordinary-ward-well-roofs',
      'ordinary-ward-stall-counters',
      'ordinary-ward-stall-awnings',
      'ordinary-ward-resident-bodies',
      'ordinary-ward-resident-heads',
      'ordinary-ward-cargo-stacks',
      'ordinary-ward-pottery-jars',
      'ordinary-ward-banners'
    ]));
    // Large old carts cannot fit the new courts; canopy/ground planting replaces old shrub balls.
    expect(instances.length).toBeGreaterThanOrEqual(20);
    expect(instances.reduce((total, mesh) => total + mesh.count, 0)).toBeGreaterThanOrEqual(7000);
  });

  it('keeps ordinary ward enrichment out of the West Market core', () => {
    const asset = createFullCitySet(createHistoricalMaterialLibrary(), changanCity);
    const detailRoot = asset.getObjectByName('full-city-ordinary-ward-details');
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();

    expect(detailRoot).toBeInstanceOf(THREE.Group);
    detailRoot?.traverse((child) => {
      if (!(child instanceof THREE.InstancedMesh)) {
        return;
      }

      for (let index = 0; index < child.count; index += 1) {
        child.getMatrixAt(index, matrix);
        position.setFromMatrixPosition(matrix);
        const insideWestMarketCore = position.x >= -42 && position.x <= 42 && position.z >= -34 && position.z <= 34;
        expect(insideWestMarketCore, `${child.name} instance ${index}`).toBe(false);
      }
    });
  });
});
