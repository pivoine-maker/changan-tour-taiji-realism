import * as THREE from 'three';
import { createDougongGeometry } from './TaijiDougong';

it('fits the compact bracket envelope and rests at local y zero', () => {
  const geometry = createDougongGeometry();
  geometry.computeBoundingBox();
  const box = geometry.boundingBox!;
  expect(box.min.y).toBeCloseTo(0);
  expect(box.max.y).toBeGreaterThan(0.85);
  expect(box.max.y).toBeLessThanOrEqual(0.95);
  expect(Math.max(Math.abs(box.min.x), Math.abs(box.max.x))).toBeLessThanOrEqual(1.05);
  expect(Math.max(Math.abs(box.min.z), Math.abs(box.max.z))).toBeLessThanOrEqual(0.65);
});

it('provides finite indexed material-compatible attributes and unit normals', () => {
  const geometry = createDougongGeometry();
  const position = geometry.getAttribute('position');
  const normal = geometry.getAttribute('normal');
  const uv = geometry.getAttribute('uv');
  expect(geometry.index).not.toBeNull();
  expect(position.itemSize).toBe(3);
  expect(normal.itemSize).toBe(3);
  expect(uv.itemSize).toBe(2);
  expect(position.count).toBe(normal.count);
  expect(position.count).toBe(uv.count);
  expect(geometry.index!.count / 3).toBeLessThan(10_000);
  expect(Math.max(...Array.from(geometry.index!.array))).toBeLessThan(position.count);
  for (const attribute of [position, normal, uv]) {
    expect(attribute).toBeInstanceOf(THREE.BufferAttribute);
    expect(Array.from(attribute.array).every(Number.isFinite)).toBe(true);
  }
  for (let index = 0; index < normal.count; index += 1) {
    expect(Math.hypot(normal.getX(index), normal.getY(index), normal.getZ(index))).toBeCloseTo(1);
  }
  expect(Math.min(...Array.from(uv.array))).toBeLessThan(0);
  expect(Math.max(...Array.from(uv.array))).toBeGreaterThan(1);
});

it('returns independently owned buffers on every call', () => {
  const first = createDougongGeometry();
  const second = createDougongGeometry();
  for (const name of ['position', 'normal', 'uv']) {
    expect(first.getAttribute(name)).not.toBe(second.getAttribute(name));
    expect(first.getAttribute(name).array).not.toBe(second.getAttribute(name).array);
  }
  expect(first.index).not.toBe(second.index);
  expect(first.index!.array).not.toBe(second.index!.array);
});

it('contains authored geometry across both perpendicular bracket axes and bearing levels', () => {
  const geometry = createDougongGeometry();
  const position = geometry.getAttribute('position');
  let xArmEnds = 0;
  let zArmEnds = 0;
  let upperBearings = 0;
  for (let index = 0; index < position.count; index += 1) {
    if (Math.abs(position.getX(index)) > 0.88 && position.getY(index) > 0.3) xArmEnds += 1;
    if (Math.abs(position.getZ(index)) > 0.55 && position.getY(index) > 0.55) zArmEnds += 1;
    if (position.getY(index) > 0.86) upperBearings += 1;
  }
  expect(xArmEnds).toBeGreaterThan(0);
  expect(zArmEnds).toBeGreaterThan(0);
  expect(upperBearings).toBeGreaterThan(0);
});

it('faces exposed curved-arm end caps outward on both axes', () => {
  const geometry = createDougongGeometry();
  const position = geometry.getAttribute('position');
  const normal = geometry.getAttribute('normal');
  let xCapVertices = 0;
  let zCapVertices = 0;
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index);
    const z = position.getZ(index);
    if (Math.abs(x) > 0.959 && Math.abs(normal.getX(index)) > 0.999) {
      xCapVertices += 1;
      expect(Math.sign(normal.getX(index))).toBe(Math.sign(x));
    }
    if (Math.abs(z) > 0.619 && Math.abs(normal.getZ(index)) > 0.999) {
      zCapVertices += 1;
      expect(Math.sign(normal.getZ(index))).toBe(Math.sign(z));
    }
  }
  expect(xCapVertices).toBeGreaterThan(0);
  expect(zCapVertices).toBeGreaterThan(0);
});
