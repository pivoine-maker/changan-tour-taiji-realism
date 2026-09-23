import { changanCity } from '../data/changanCity';
import { westMarketWorld } from '../data/world';
import { createMovementObstacles } from './movementObstacles';

describe('movement obstacles', () => {
  it('covers walls, ordinary buildings, and imperial halls', () => {
    const obstacles = createMovementObstacles(westMarketWorld, changanCity);

    expect(obstacles.length).toBeGreaterThan(700);
    expect(obstacles.some((obstacle) => obstacle.id === 'wall-0')).toBe(true);
    expect(obstacles.some((obstacle) => obstacle.id?.startsWith('ordinary-building-'))).toBe(true);
    expect(obstacles.some((obstacle) => obstacle.id === 'imperial-hall-taiji-hall')).toBe(true);
  });

  it('keeps imperial gate openings free for ordinary walking', () => {
    const obstacles = createMovementObstacles(westMarketWorld, changanCity);
    const blocksChengtianOpening = obstacles.some((obstacle) =>
      Math.abs(obstacle.x - 194) <= obstacle.width / 2 + 1 &&
      Math.abs(obstacle.z - 164) <= obstacle.depth / 2 + 1
    );

    expect(blocksChengtianOpening).toBe(false);
  });
});

describe('city wall passages', () => {
  it('allows ordinary walking through every ward center gate', () => {
    const obstacles = createMovementObstacles(westMarketWorld, changanCity);
    for (const ward of changanCity.wards) {
      const x = (ward.bounds.minX + ward.bounds.maxX) / 2;
      const z = (ward.bounds.minZ + ward.bounds.maxZ) / 2;
      const walls = obstacles.filter((obstacle) => obstacle.id?.startsWith(`ordinary-wall-${ward.id}-`));
      for (const point of [{ x, z: ward.bounds.minZ }, { x, z: ward.bounds.maxZ }, { x: ward.bounds.minX, z }, { x: ward.bounds.maxX, z }]) {
        expect(walls.some((wall) => Math.abs(point.x - wall.x) <= wall.width / 2 + 1.1 && Math.abs(point.z - wall.z) <= wall.depth / 2 + 1.1), ward.id).toBe(false);
      }
    }
  });

  it('leaves a passage through the southern city gatehouse', () => {
    const obstacles = createMovementObstacles(westMarketWorld, changanCity);
    expect(obstacles.some((wall) => Math.abs(194 - wall.x) <= wall.width / 2 + 1.1 && Math.abs(-287 - wall.z) <= wall.depth / 2 + 1.1)).toBe(false);
  });
});
