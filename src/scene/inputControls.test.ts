import {
  createKeyboardMoveState,
  getKeyboardMoveIntent,
  moveWithRoadSnap,
  resolveCollision,
  zoomCameraDistance
} from './inputControls';

describe('input controls', () => {
  it('tracks WASD key state and exposes movement intent', () => {
    const state = createKeyboardMoveState();
    state.setKey('KeyW', true);
    state.setKey('KeyD', true);

    expect(getKeyboardMoveIntent(state)).toEqual({ forward: 1, turn: 1, active: true });

    state.setKey('KeyW', false);
    state.setKey('KeyD', false);
    state.setKey('KeyS', true);
    state.setKey('KeyA', true);

    expect(getKeyboardMoveIntent(state)).toEqual({ forward: -1, turn: -1, active: true });
  });

  it('moves along traveler heading while snapping to the nearest road corridor', () => {
    const result = moveWithRoadSnap(
      { x: 194, z: 80, heading: 0 },
      { forward: 1, turn: 0, active: true },
      1,
      [{ id: 'road', x: 194, z: 96 }]
    );

    expect(result.x).toBe(194);
    expect(result.z).toBeGreaterThan(80);
    expect(result.z).toBeLessThanOrEqual(96);
    expect(result.heading).toBeCloseTo(0);
  });

  it('turns in place without drifting when no forward input is active', () => {
    const result = moveWithRoadSnap(
      { x: 194, z: 80, heading: 0 },
      { forward: 0, turn: 1, active: true },
      1,
      [{ id: 'road', x: 194, z: 80 }]
    );

    expect(result.x).toBe(194);
    expect(result.z).toBe(80);
    expect(result.heading).toBeGreaterThan(0);
  });

  it('blocks normal walking before entering a wall obstacle', () => {
    const result = resolveCollision(
      { x: 0, z: 0 },
      { x: 0, z: 10 },
      [{ x: 0, z: 6, width: 12, depth: 2 }],
      false
    );

    expect(result.x).toBe(0);
    expect(result.z).toBeLessThan(5);
    expect(result.z).toBeGreaterThan(3.5);
  });

  it('lets the traveler phase through obstacles while phase mode is active', () => {
    const result = resolveCollision(
      { x: 0, z: 0 },
      { x: 0, z: 10 },
      [{ x: 0, z: 6, width: 12, depth: 2 }],
      true
    );

    expect(result).toEqual({ x: 0, z: 10 });
  });

  it('releases road snapping while phasing for unrestricted movement', () => {
    const result = moveWithRoadSnap(
      { x: 0, z: 0, heading: Math.PI / 2 },
      { forward: 1, turn: 0, active: true },
      1,
      [
        { id: 'south', x: 0, z: -20 },
        { id: 'north', x: 0, z: 20 }
      ],
      [{ from: 'south', to: 'north' }],
      [{ x: 5, z: 0, width: 2, depth: 10 }],
      true
    );

    expect(result.x).toBeCloseTo(10);
    expect(result.z).toBeCloseTo(0);
  });

  it('zooms camera distance by button direction using the existing clamp', () => {
    expect(zoomCameraDistance(100, 'in')).toBe(78);
    expect(zoomCameraDistance(100, 'out')).toBe(122);
    expect(zoomCameraDistance(20, 'in')).toBe(18);
  });
});
