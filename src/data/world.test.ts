import { getWorldCenter, westMarketWorld } from './world';

describe('west market world model', () => {
  it('uses unique road node ids', () => {
    const ids = westMarketWorld.roadNodes.map((node) => node.id);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('only connects road edges to existing nodes', () => {
    const ids = new Set(westMarketWorld.roadNodes.map((node) => node.id));

    for (const edge of westMarketWorld.roadEdges) {
      expect(ids.has(edge.from)).toBe(true);
      expect(ids.has(edge.to)).toBe(true);
    }
  });

  it('defines discoverable landmarks from the market to Taiji Palace', () => {
    expect(westMarketWorld.landmarks).toHaveLength(18);

    for (const landmark of westMarketWorld.landmarks) {
      expect(landmark.position.x).toBeGreaterThanOrEqual(westMarketWorld.bounds.minX);
      expect(landmark.position.x).toBeLessThanOrEqual(westMarketWorld.bounds.maxX);
      expect(landmark.position.z).toBeGreaterThanOrEqual(westMarketWorld.bounds.minZ);
      expect(landmark.position.z).toBeLessThanOrEqual(westMarketWorld.bounds.maxZ);
      expect(landmark.triggerRadius).toBeGreaterThan(0);
    }
  });

  it('keeps high-detail districts around the market and along the eastern corridor', () => {
    expect(westMarketWorld.bounds.minX).toBeLessThanOrEqual(-80);
    expect(westMarketWorld.bounds.maxX).toBeGreaterThanOrEqual(204);
    expect(westMarketWorld.bounds.minZ).toBeLessThanOrEqual(-64);
    expect(westMarketWorld.bounds.maxZ).toBeGreaterThanOrEqual(64);
    expect(westMarketWorld.districts).toHaveLength(8);

    for (const district of westMarketWorld.districts) {
      expect(district.buildings.length).toBeGreaterThanOrEqual(10);
      expect(district.walls.length).toBeGreaterThanOrEqual(4);
      expect(district.detailAnchors.length).toBeGreaterThanOrEqual(10);
    }
  });

  it('adds the imperial city and complete Taiji Palace precinct north of Zhuque Avenue', () => {
    expect(westMarketWorld.bounds.maxZ).toBeGreaterThanOrEqual(292);
    expect(westMarketWorld.bounds.maxX).toBeGreaterThanOrEqual(250);
    expect(westMarketWorld.imperialPrecincts.map((precinct) => precinct.id)).toEqual([
      'imperial-city-axis',
      'taiji-palace'
    ]);

    const taijiPalace = westMarketWorld.imperialPrecincts.find((precinct) => precinct.id === 'taiji-palace');
    expect(taijiPalace?.halls.map((hall) => hall.id)).toEqual([
      'chengtian-gate',
      'taiji-hall',
      'liangyi-hall',
      'inner-court-garden'
    ]);
    expect(taijiPalace?.walls.length).toBeGreaterThanOrEqual(8);
    expect(taijiPalace?.detailAnchors.length).toBeGreaterThanOrEqual(28);

    const gardenHall = taijiPalace?.halls.find((hall) => hall.id === 'inner-court-garden');
    const gardenPool = taijiPalace?.courtyards.find((courtyard) => courtyard.id === 'inner-garden-pool');
    expect((gardenHall?.z ?? 0) - (gardenHall?.depth ?? 0) / 2).toBeGreaterThan(
      (gardenPool?.z ?? 0) + (gardenPool?.depth ?? 0) / 2
    );
  });

  it('extends roads across the full expanded canvas', () => {
    const westNode = westMarketWorld.roadNodes.find((node) => node.x <= -74 && node.z === 0);
    const eastNode = westMarketWorld.roadNodes.find((node) => node.x >= 194 && node.z === 0);
    const northNode = westMarketWorld.roadNodes.find((node) => node.z >= 60 && node.x === 0);
    const southNode = westMarketWorld.roadNodes.find((node) => node.z <= -60 && node.x === 0);

    expect(westNode).toBeDefined();
    expect(eastNode).toBeDefined();
    expect(northNode).toBeDefined();
    expect(southNode).toBeDefined();
  });

  it('defines Zhuque Avenue as a monumental north-south boulevard', () => {
    const zhuqueAvenue = westMarketWorld.avenues.find((avenue) => avenue.id === 'zhuque-avenue');

    expect(zhuqueAvenue).toMatchObject({
      orientation: 'north-south',
      width: 18,
      x: 194
    });
    expect(zhuqueAvenue?.depth).toBeGreaterThanOrEqual(136);
  });

  it('continues Zhuque Avenue through the imperial and palace axes', () => {
    const zhuqueAvenue = westMarketWorld.avenues.find((avenue) => avenue.id === 'zhuque-avenue');
    const imperialAxis = westMarketWorld.avenues.find((avenue) => avenue.id === 'imperial-axis');
    const palaceAxis = westMarketWorld.avenues.find((avenue) => avenue.id === 'palace-axis');

    expect(zhuqueAvenue).toMatchObject({ x: 194, z: 0, depth: 136 });
    expect(imperialAxis).toMatchObject({ orientation: 'north-south', x: 194, z: 112, width: 24, depth: 88 });
    expect(palaceAxis).toMatchObject({ orientation: 'north-south', x: 194, z: 224, width: 18, depth: 136 });
  });

  it('centers the asymmetric canvas between the market and Taiji Palace', () => {
    expect(getWorldCenter(westMarketWorld.bounds)).toEqual({ x: 194, z: 0 });
  });

  it('connects the detailed route to all four sides of Chang’an', () => {
    expect(westMarketWorld.bounds).toEqual({ minX: -84, maxX: 472, minZ: -292, maxZ: 292 });
    expect(westMarketWorld.roadNodes.some((node) => node.x >= 454 && node.z >= 270)).toBe(true);
    expect(westMarketWorld.roadNodes.some((node) => node.x <= -66 && node.z <= -270)).toBe(true);
  });
});


describe('bespoke market ownership', () => {
  it('keeps ordinary district buildings and boundary walls outside the market core', () => {
    for (const district of westMarketWorld.districts) {
      for (const rect of [...district.buildings, ...district.walls]) {
        expect(rect.x - rect.width / 2 < 40 && rect.x + rect.width / 2 > -40
          && rect.z - rect.depth / 2 < 31 && rect.z + rect.depth / 2 > -31, district.id).toBe(false);
      }
    }
  });
});
