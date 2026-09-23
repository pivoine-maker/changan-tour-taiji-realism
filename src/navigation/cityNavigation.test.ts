import { createCityNavigation } from './cityNavigation';
import { westMarketWorld } from '../data/world';
import { changanCity } from '../data/changanCity';
import { questEntities, questChapters, questEntityById } from '../data/quests';
import { createMovementObstacles } from '../scene/movementObstacles';
import { resolveCollision } from '../scene/inputControls';

const obstacles = createMovementObstacles(westMarketWorld, changanCity);
const start = { x: -34, z: 0 };

describe('collision-aware city navigation', () => {
  it('routes around a wall instead of stopping against it', () => {
    const navigation = createCityNavigation({ minX: -20, maxX: 20, minZ: -20, maxZ: 20 }, [
      { x: 0, z: 0, width: 2, depth: 20 }
    ]);
    const route = navigation.findRoute({ x: -10, z: 0 }, { x: 10, z: 0 });
    expect(route).not.toBeNull();
    expect(route!.at(-1)).toEqual({ x: 10, z: 0 });
    for (let i = 1; i < route!.length; i++) expect(navigation.isSegmentClear(route![i - 1], route![i])).toBe(true);
  });

  it('rejects closed destinations, blocked starts, and out-of-bounds requests', () => {
    const navigation = createCityNavigation({ minX: -20, maxX: 20, minZ: -20, maxZ: 20 }, [
      { x: 0, z: 0, width: 2, depth: 40 }
    ]);
    expect(navigation.findRoute({ x: -10, z: 0 }, { x: 10, z: 0 })).toBeNull();
    expect(navigation.findRoute({ x: 0, z: 0 }, { x: 10, z: 0 })).toBeNull();
    expect(navigation.findRoute({ x: -10, z: 0 }, { x: 100, z: 0 })).toBeNull();
  });

  it('does not let diagonal steps clip corners or rotated buildings', () => {
    const navigation = createCityNavigation({ minX: -20, maxX: 20, minZ: -20, maxZ: 20 }, [
      { x: 0, z: 0, width: 14, depth: 2, rotation: Math.PI / 4 }
    ]);
    expect(navigation.isSegmentClear({ x: -8, z: 8 }, { x: 8, z: -8 })).toBe(false);
    expect(navigation.isSegmentClear({ x: 0, z: 0 }, { x: 10, z: 0 })).toBe(false);
    expect(navigation.isSegmentClear({ x: 3, z: -3 }, { x: 4, z: -4 })).toBe(true);
  });

  it('honors an explicit small search budget', () => {
    const navigation = createCityNavigation({ minX: -20, maxX: 20, minZ: -20, maxZ: 20 }, [
      { x: 0, z: 0, width: 2, depth: 20 }
    ], { maxVisited: 1 });
    expect(navigation.findRoute({ x: -10, z: 0 }, { x: 10, z: 0 })).toBeNull();
  });
});

describe('real city interaction accessibility', () => {
  const navigation = createCityNavigation(westMarketWorld.bounds, obstacles);
  const targets = [
    ...questEntities.map((entity) => ({ id: entity.id, point: entity, radius: entity.triggerRadius })),
    ...westMarketWorld.landmarks.map((landmark) => ({ id: landmark.discoveryId, point: landmark.position, radius: landmark.triggerRadius }))
  ];
  it.each(targets)('reaches $id within its real interaction radius without phase mode', ({ point, radius }) => {
    const route = navigation.findRoute(start, point, radius);
    expect(route).not.toBeNull();
    expect(Math.hypot(route!.at(-1)!.x - point.x, route!.at(-1)!.z - point.z)).toBeLessThanOrEqual(radius);
    for (let i = 1; i < route!.length; i++) {
      expect(navigation.isSegmentClear(route![i - 1], route![i])).toBe(true);
      const actual = resolveCollision(route![i - 1], route![i], obstacles, false);
      expect(Math.hypot(actual.x - route![i].x, actual.z - route![i].z)).toBeLessThan(0.001);
    }
  });
});


it('preserves a collision-clear walking itinerary through all eight quest chapters', () => {
  const navigation = createCityNavigation(westMarketWorld.bounds, obstacles);
  let position = start;
  for (const chapter of questChapters) {
    for (const objective of chapter.objectives) {
      const entity = questEntityById.get(objective.entityId)!;
      const route = navigation.findRoute(position, entity, entity.triggerRadius);
      expect(route, objective.id).not.toBeNull();
      for (let i = 1; i < route!.length; i++) {
        const actual = resolveCollision(route![i - 1], route![i], obstacles, false);
        expect(Math.hypot(actual.x - route![i].x, actual.z - route![i].z), objective.id).toBeLessThan(0.001);
      }
      position = route!.at(-1)!;
      expect(Math.hypot(position.x - entity.x, position.z - entity.z), objective.id).toBeLessThanOrEqual(entity.triggerRadius);
    }
  }
});
