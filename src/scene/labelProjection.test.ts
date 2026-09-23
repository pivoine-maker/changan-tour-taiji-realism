import { getLabelVisibility, rectanglesOverlap } from './labelProjection';

describe('label projection helpers', () => {
  it('shows detailed labels only in their distance band', () => {
    expect(getLabelVisibility({ distance: 180, minDistance: 0, maxDistance: 260, isInFront: true })).toBe('visible');
    expect(getLabelVisibility({ distance: 500, minDistance: 0, maxDistance: 260, isInFront: true })).toBe('hidden');
  });

  it('hides labels behind the camera', () => {
    expect(getLabelVisibility({ distance: 120, minDistance: 0, maxDistance: 260, isInFront: false })).toBe('hidden');
  });

  it('detects overlapping label rectangles', () => {
    expect(rectanglesOverlap({ x: 10, y: 10, width: 80, height: 28 }, { x: 70, y: 20, width: 90, height: 28 })).toBe(true);
    expect(rectanglesOverlap({ x: 10, y: 10, width: 80, height: 28 }, { x: 140, y: 20, width: 90, height: 28 })).toBe(false);
  });
});
