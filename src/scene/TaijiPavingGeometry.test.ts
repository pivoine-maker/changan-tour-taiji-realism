import * as THREE from 'three';
import { createPavingSlabGeometry } from './TaijiPavingGeometry';

it('creates an exact unit by 0.12 by unit closed slab', () => {
  const geometry = createPavingSlabGeometry();
  geometry.computeBoundingBox();
  expect(geometry.boundingBox!.min.x).toBeCloseTo(-0.5);
  expect(geometry.boundingBox!.min.y).toBeCloseTo(-0.06);
  expect(geometry.boundingBox!.min.z).toBeCloseTo(-0.5);
  expect(geometry.boundingBox!.max.x).toBeCloseTo(0.5);
  expect(geometry.boundingBox!.max.y).toBeCloseTo(0.06);
  expect(geometry.boundingBox!.max.z).toBeCloseTo(0.5);
});

it('has a flat upward top with normalized top UVs', () => {
  const geometry = createPavingSlabGeometry();
  const position = geometry.getAttribute('position');
  const normal = geometry.getAttribute('normal');
  const uv = geometry.getAttribute('uv');
  const topIndices: number[] = [];
  for (let index = 0; index < position.count; index += 1) {
    if (Math.abs(position.getY(index) - 0.06) < 1e-6 && normal.getY(index) > 0.999) topIndices.push(index);
  }
  expect(topIndices).toHaveLength(4);
  for (const index of topIndices) expect(position.getY(index)).toBeCloseTo(0.06);
  expect(topIndices.map((index) => [uv.getX(index), uv.getY(index)])).toEqual([
    [0, 0], [0, 1], [1, 1], [1, 0],
  ]);
});

it('uses finite owned indexed buffers within the triangle budget', () => {
  const first = createPavingSlabGeometry();
  const second = createPavingSlabGeometry();
  const position = first.getAttribute('position');
  const normal = first.getAttribute('normal');
  const uv = first.getAttribute('uv');
  expect(first.index).not.toBeNull();
  expect(first.index!.count / 3).toBeLessThanOrEqual(40);
  expect(Math.max(...Array.from(first.index!.array))).toBeLessThan(position.count);
  expect(Math.min(...Array.from(first.index!.array))).toBeGreaterThanOrEqual(0);
  for (const attribute of [position, normal, uv]) {
    expect(attribute).toBeInstanceOf(THREE.BufferAttribute);
    expect(Array.from(attribute.array).every(Number.isFinite)).toBe(true);
  }
  expect(position).not.toBe(second.getAttribute('position'));
  expect(normal).not.toBe(second.getAttribute('normal'));
  expect(uv).not.toBe(second.getAttribute('uv'));
  expect(first.index).not.toBe(second.index);
});

it('faces vertical sides outward and the bottom downward', () => {
  const geometry = createPavingSlabGeometry();
  const position = geometry.getAttribute('position');
  const normal = geometry.getAttribute('normal');
  let sideVertices = 0;
  let bottomVertices = 0;
  for (let index = 0; index < position.count; index += 1) {
    if (normal.getY(index) < -0.999) {
      bottomVertices += 1;
      expect(position.getY(index)).toBeCloseTo(-0.06);
    } else if (Math.abs(normal.getY(index)) < 0.001) {
      sideVertices += 1;
      const outward = position.getX(index) * normal.getX(index) + position.getZ(index) * normal.getZ(index);
      expect(outward).toBeGreaterThan(0);
    }
  }
  expect(sideVertices).toBe(16);
  expect(bottomVertices).toBe(4);
});
