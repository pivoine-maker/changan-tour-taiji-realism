import * as THREE from 'three';
import { boundaryTreePositions, createBoundaryGroundGeometry } from './TaijiBoundaryLandscape';

const CROSS_STREETS = [172, 228, 276];

it('places two deterministic tree lines outside palace walls and clear of roads', () => {
  expect(boundaryTreePositions).toHaveLength(22);
  const zs = [160, 181, 190, 201, 212, 221, 240, 250, 260, 267, 283];
  expect(boundaryTreePositions.slice(0, 11).map((position) => position[1])).toEqual(zs);
  expect(boundaryTreePositions.slice(11).map((position) => position[1])).toEqual(zs);
  for (const [x, z] of boundaryTreePositions) {
    const onLeft = x >= 131 && x <= 133;
    const onRight = x >= 257 && x <= 261;
    expect(onLeft || onRight).toBe(true);
    expect(Math.abs(x - 126)).toBeGreaterThan(4);
    expect(Math.abs(x - 270)).toBeGreaterThan(4);
    expect(onLeft ? 138 - x : x - 250).toBeGreaterThanOrEqual(5);
    for (const roadZ of CROSS_STREETS) expect(Math.abs(z - roadZ)).toBeGreaterThan(2.2);
  }
});

it('creates exact boundary strips with open crossing-road gaps', () => {
  const geometry = createBoundaryGroundGeometry();
  geometry.computeBoundingBox();
  const box = geometry.boundingBox!;
  expect(box.min.x).toBeCloseTo(129);
  expect(box.max.x).toBeCloseTo(267);
  expect(box.min.z).toBeCloseTo(156);
  expect(box.max.z).toBeCloseTo(288);
  expect(box.min.y).toBeCloseTo(0.265);
  expect(box.max.y).toBeCloseTo(0.265);

  const position = geometry.getAttribute('position');
  const index = geometry.index!;
  for (let triangle = 0; triangle < index.count; triangle += 3) {
    const zs = [0, 1, 2].map((corner) => position.getZ(index.getX(triangle + corner)));
    for (const roadZ of CROSS_STREETS) {
      expect(Math.min(...zs) < roadZ - 2.2 && Math.max(...zs) > roadZ + 2.2).toBe(false);
      expect(zs.every((z) => Math.abs(z - roadZ) >= 2.2 - 1e-4)).toBe(true);
    }
  }
});

it('provides finite indexed upward-facing geometry, tiled UVs, and mild color variation', () => {
  const geometry = createBoundaryGroundGeometry();
  const position = geometry.getAttribute('position');
  const normal = geometry.getAttribute('normal');
  const uv = geometry.getAttribute('uv');
  const color = geometry.getAttribute('color');
  expect(geometry.index).not.toBeNull();
  expect(geometry.index!.count / 3).toBeLessThan(3000);
  expect(Math.max(...Array.from(geometry.index!.array))).toBeLessThan(position.count);
  expect(Math.min(...Array.from(geometry.index!.array))).toBeGreaterThanOrEqual(0);
  for (const attribute of [position, normal, uv, color]) {
    expect(attribute).toBeInstanceOf(THREE.BufferAttribute);
    expect(Array.from(attribute.array).every(Number.isFinite)).toBe(true);
  }
  for (let vertex = 0; vertex < normal.count; vertex += 1) {
    expect([normal.getX(vertex), normal.getY(vertex), normal.getZ(vertex)]).toEqual([0, 1, 0]);
    expect(uv.getX(vertex)).toBeCloseTo(position.getX(vertex) / 2.51);
    expect(uv.getY(vertex)).toBeCloseTo(position.getZ(vertex) / 2.51);
  }
  const tones = Array.from(color.array);
  expect(Math.min(...tones)).toBeGreaterThanOrEqual(0.88);
  expect(Math.max(...tones)).toBeLessThanOrEqual(1);
  expect(Math.max(...tones) - Math.min(...tones)).toBeGreaterThan(0.08);
});

it('returns independently owned geometry buffers', () => {
  const first = createBoundaryGroundGeometry();
  const second = createBoundaryGroundGeometry();
  for (const name of ['position', 'normal', 'uv', 'color']) {
    expect(first.getAttribute(name).array).not.toBe(second.getAttribute(name).array);
  }
  expect(first.index!.array).not.toBe(second.index!.array);
});
