import { getWorldCenter, westMarketWorld } from '../data/world';
import { questEntities } from '../data/quests';
import { createMapLabelSpecs } from '../data/mapLabels';
import { createAvenueSurfaceSpecs, createQuestMarkerSpecs, getWorldSurfaceLayout, tryCreatePoolReflectionProbe, findNearbyQuestMarker } from './WestMarketScene';

afterEach(() => vi.restoreAllMocks());

describe('west market scene layout', () => {
  it('treats reflection capture failure as an optional HDR fallback', () => {
    vi.spyOn(THREE.CubeCamera.prototype, 'update').mockImplementation(() => {
      throw new Error('reflection capture unavailable');
    });
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const renderer = {
      xr: { enabled: true },
      shadowMap: { needsUpdate: false },
      getRenderTarget: () => null,
      getActiveCubeFace: () => 0,
      getActiveMipmapLevel: () => 0,
      setRenderTarget: () => undefined,
    } as unknown as THREE.WebGLRenderer;
    const water = new THREE.Mesh(new THREE.PlaneGeometry(), new THREE.MeshStandardMaterial());

    let result: ReturnType<typeof tryCreatePoolReflectionProbe>;
    expect(() => { result = tryCreatePoolReflectionProbe(renderer, new THREE.Scene(), water, []); }).not.toThrow();
    expect(result!).toBeUndefined();
    expect((water.material as THREE.MeshStandardMaterial).envMap).toBeNull();
  });
  it('centers the board and walk plane on the asymmetric eastward expansion', () => {
    const layout = getWorldSurfaceLayout(westMarketWorld.bounds);
    const center = getWorldCenter(westMarketWorld.bounds);

    expect(layout.center).toEqual(center);
    expect(layout.board.width).toBe(568);
    expect(layout.board.depth).toBe(596);
    expect(layout.boardSegments).toEqual([
      { x: 194, z: 0, width: 568, depth: 596 }
    ]);
    expect(layout.walkPlane.width).toBe(556);
    expect(layout.walkPlane.depth).toBe(584);
  });

  it('creates visible high-detail surfaces for Zhuque Avenue', () => {
    const [zhuqueAvenue] = createAvenueSurfaceSpecs(westMarketWorld.avenues);

    expect(zhuqueAvenue).toMatchObject({ id: 'zhuque-avenue', x: 194, z: 0, width: 18, depth: 136 });
    expect(zhuqueAvenue.centerStripWidth).toBeGreaterThan(1);
    expect(zhuqueAvenue.drainageChannels).toHaveLength(2);
    expect(zhuqueAvenue.curbs).toHaveLength(2);
  });

  it('creates visible high-detail surfaces for the imperial axis', () => {
    const avenueSurfaces = createAvenueSurfaceSpecs(westMarketWorld.avenues);
    const imperialAxis = avenueSurfaces.find((avenue) => avenue.id === 'imperial-axis');
    const palaceAxis = avenueSurfaces.find((avenue) => avenue.id === 'palace-axis');

    expect(imperialAxis).toMatchObject({ id: 'imperial-axis', x: 194, z: 112, width: 24 });
    expect(imperialAxis?.centerStripWidth).toBeGreaterThan(2);
    expect(imperialAxis?.drainageChannels).toHaveLength(2);
    expect(imperialAxis?.curbs).toHaveLength(2);
    expect(palaceAxis).toMatchObject({ id: 'palace-axis', x: 194, z: 224, depth: 136 });
  });

  it('creates distinct marker specs for quest NPCs and treasures', () => {
    const markers = createQuestMarkerSpecs(questEntities);

    expect(markers).toHaveLength(questEntities.length);
    expect(markers.filter((marker) => marker.kind === 'npc')).toHaveLength(9);
    expect(markers.filter((marker) => marker.kind === 'treasure')).toHaveLength(8);
    expect(markers.find((marker) => marker.id === 'npc-sogdian-merchant')).toMatchObject({
      label: '阿罗罕',
      color: 0x6fb6a8
    });
    expect(markers.find((marker) => marker.id === 'treasure-passage-document')).toMatchObject({
      label: '盖印通关牒',
      color: 0xe3b45d
    });
  });

  it('builds enough place labels for the full overlay', () => {
    const labels = createMapLabelSpecs(westMarketWorld);

    expect(labels.length).toBeGreaterThan(30);
    expect(labels.map((label) => label.kind)).toContain('npc');
    expect(labels.map((label) => label.kind)).toContain('treasure');
    expect(labels.map((label) => label.kind)).toContain('discovery');
  });
});
import * as THREE from 'three';
import { afterEach, vi } from 'vitest';

it('prioritizes the active final treasure over the overlapping archivist', () => {
  const markers = createQuestMarkerSpecs(questEntities);
  const target = questEntities.find(item => item.id.includes('archive-slip'))!;
  expect(target).toBeDefined();
  expect(findNearbyQuestMarker(markers, {x:214,z:260}, target.id)?.id).toBe(target.id);
});
