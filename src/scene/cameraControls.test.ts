import {
  clampCameraDistance,
  clampCameraPitch,
  getTravelerCameraRig,
  getNpcCameraRig,
  getNextNpcIndex,
  getDefaultCameraRig,
  panCameraTarget,
  shouldFollowTraveler,
  updateFollowTarget
} from './cameraControls';

describe('camera controls', () => {
  it('allows a ground-level inspection zoom', () => {
    expect(clampCameraDistance(8)).toBe(18);
    expect(clampCameraDistance(30)).toBe(30);
    expect(clampCameraDistance(1400)).toBe(1200);
  });

  it('keeps pitch usable from low walking view to overhead view', () => {
    expect(clampCameraPitch(0.12)).toBe(0.24);
    expect(clampCameraPitch(1.4)).toBe(1.28);
  });

  it('frames the complete city on reset', () => {
    expect(getDefaultCameraRig()).toEqual({ yaw: Math.PI + .12, pitch: 1.2, distance: 1050 });
  });

  it('places the camera behind the traveler for locate mode', () => {
    expect(getTravelerCameraRig({ x: 194, y: 0.9, z: 164 }, 0)).toEqual({
      target: { x: 194, y: 2.15, z: 168.5 },
      yaw: Math.PI,
      pitch: 0.34,
      distance: 34
    });
  });

  it('frames NPCs from a low inspection angle', () => {
    expect(getNpcCameraRig({ x: -25, y: 1.35, z: 8 })).toEqual({
      target: { x: -25, y: 2.05, z: 8 },
      yaw: Math.PI * 0.72,
      pitch: 0.38,
      distance: 42
    });
  });

  it('frames a west-gate NPC through the open gate approach', () => {
    expect(getNpcCameraRig({ x: -34, y: 1.35, z: 0 })).toEqual({
      target: { x: -34, y: 2.05, z: 0 },
      yaw: -Math.PI / 2,
      pitch: 0.3,
      distance: 30
    });
  });

  it('supports hybrid follow mode after manual camera movement', () => {
    expect(shouldFollowTraveler({ manuallyExploring: false, followTraveler: true })).toBe(true);
    expect(shouldFollowTraveler({ manuallyExploring: true, followTraveler: true })).toBe(false);
    expect(shouldFollowTraveler({ manuallyExploring: false, followTraveler: false })).toBe(false);
  });

  it('cycles NPC index with wrapping', () => {
    expect(getNextNpcIndex(-1, 5)).toBe(0);
    expect(getNextNpcIndex(0, 5)).toBe(1);
    expect(getNextNpcIndex(4, 5)).toBe(0);
    expect(getNextNpcIndex(0, 0)).toBe(-1);
  });

  it('smoothly blends target toward traveler while following', () => {
    expect(updateFollowTarget({ x: 0, y: 0, z: 0 }, { x: 20, y: 1.2, z: -10 }, 0.25)).toEqual({
      x: 5,
      y: 0.3,
      z: -2.5
    });
  });

  it('pans the observation target relative to camera yaw', () => {
    const panned = panCameraTarget({ x: 0, y: 0, z: 0 }, 20, -10, 0, 100);

    expect(panned.x).toBeCloseTo(-4);
    expect(panned.y).toBe(0);
    expect(panned.z).toBeCloseTo(-2);
  });
});
