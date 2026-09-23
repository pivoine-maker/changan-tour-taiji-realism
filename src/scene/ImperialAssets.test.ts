import * as THREE from 'three';
import { imperialPrecincts } from '../data/imperialCity';
import { createHistoricalMaterialLibrary } from './HistoricalAssets';
import { createImperialPrecinctSet } from './ImperialAssets';

describe('imperial city 3D assets', () => {
  it('builds monumental palace halls, courtyards, water, and ceremonial details', () => {
    const materials = createHistoricalMaterialLibrary();
    const asset = createImperialPrecinctSet(materials, imperialPrecincts);
    const names: string[] = [];

    asset.traverse((child) => names.push(child.name));

    expect(asset).toBeInstanceOf(THREE.Group);
    expect(names.filter((name) => name.startsWith('imperial-hall-')).length).toBeGreaterThanOrEqual(17);
    expect(names.filter((name) => name === 'palace-podium').length).toBeGreaterThanOrEqual(4);
    expect(names.filter((name) => name === 'imperial-courtyard').length).toBeGreaterThanOrEqual(8);
    expect(names).toContain('inner-garden-pool');
    expect(names.filter((name) => name === 'stone-balustrade-post').length).toBeGreaterThanOrEqual(24);
  });
});
