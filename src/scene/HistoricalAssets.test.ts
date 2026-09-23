import * as THREE from 'three';
import type { BuildingBlock } from '../data/world';
import {
  createHistoricalMaterialLibrary,
  createMarketDetailSet,
  createTangBuilding
} from './HistoricalAssets';

const building: BuildingBlock = {
  x: 0,
  z: 0,
  width: 10,
  depth: 7,
  height: 4,
  tone: 'clay',
  roof: 'hip'
};

describe('historical 3D assets', () => {
  it('creates PBR materials with color, roughness, and bump textures', () => {
    const materials = createHistoricalMaterialLibrary();

    expect(materials.wall).toBeInstanceOf(THREE.MeshStandardMaterial);
    expect(materials.wall.map).toBeInstanceOf(THREE.DataTexture);
    expect(materials.wall.roughnessMap).toBeInstanceOf(THREE.DataTexture);
    expect(materials.wall.bumpMap).toBeInstanceOf(THREE.DataTexture);
    expect(materials.roofTile.map).toBeInstanceOf(THREE.DataTexture);
    expect(materials.wood.roughness).toBeGreaterThan(0.5);
  });

  it('builds a detailed Tang structure instead of a single primitive', () => {
    const materials = createHistoricalMaterialLibrary();
    const asset = createTangBuilding(building, materials, 2);
    const names: string[] = [];

    asset.traverse((child) => names.push(child.name));

    expect(asset.children.length).toBeGreaterThan(8);
    expect(names.filter((name) => name === 'roof-tile-row').length).toBeGreaterThanOrEqual(12);
    expect(names.filter((name) => name === 'timber-column').length).toBeGreaterThanOrEqual(4);
    expect(names.filter((name) => name === 'lattice-window').length).toBeGreaterThanOrEqual(2);
    expect(names.filter((name) => name === 'bracket-set').length).toBeGreaterThanOrEqual(4);
  });

  it('creates dense market props with stalls, cargo, people, trees, and a cart', () => {
    const materials = createHistoricalMaterialLibrary();
    const details = createMarketDetailSet(materials);
    const names: string[] = [];

    details.traverse((child) => names.push(child.name));

    expect(names.filter((name) => name === 'market-stall').length).toBeGreaterThanOrEqual(5);
    expect(names.filter((name) => name === 'cargo-cluster').length).toBeGreaterThanOrEqual(5);
    expect(names.filter((name) => name === 'market-person').length).toBeGreaterThanOrEqual(10);
    expect(names.filter((name) => name === 'courtyard-tree').length).toBeGreaterThanOrEqual(4);
    expect(names).toContain('merchant-cart');
  });
});
