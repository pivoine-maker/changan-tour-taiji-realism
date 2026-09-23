import { cityDestinations } from './cityDestinations';
import { changanCity } from './changanCity';

describe('city tour destinations', () => {
  it('covers every modeled direction with bounded, unique camera targets', () => {
    expect(new Set(cityDestinations.map(d => d.id)).size).toBe(cityDestinations.length);
    expect(cityDestinations.map(d => d.id)).toEqual(expect.arrayContaining([
      'overview', 'west-market', 'west-wards', 'south-gate', 'south-wards',
      'east-south-wards', 'east-north-wards', 'zhuque-axis', 'imperial-city', 'taiji-palace', 'north-garden'
    ]));
    for (const destination of cityDestinations) {
      expect(destination.target.x).toBeGreaterThanOrEqual(changanCity.bounds.minX);
      expect(destination.target.x).toBeLessThanOrEqual(changanCity.bounds.maxX);
      expect(destination.target.z).toBeGreaterThanOrEqual(changanCity.bounds.minZ);
      expect(destination.target.z).toBeLessThanOrEqual(changanCity.bounds.maxZ);
      expect([destination.targetY, destination.yaw, destination.pitch, destination.distance].every(Number.isFinite)).toBe(true);
      expect(destination.distance).toBeGreaterThan(0);
    }
  });
});
