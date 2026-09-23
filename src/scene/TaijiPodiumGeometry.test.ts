import * as THREE from 'three';
import { createTaijiPodiumGeometry } from './TaijiPodiumGeometry';

it('matches the exact podium footprint and vertical profile bounds', () => {
  const geometry = createTaijiPodiumGeometry();
  geometry.computeBoundingBox();
  const box = geometry.boundingBox!;
  expect(box.min.x).toBeCloseTo(-21.9);
  expect(box.max.x).toBeCloseTo(21.9);
  expect(box.min.z).toBeCloseTo(-10.9);
  expect(box.max.z).toBeCloseTo(10.9);
  expect(box.min.y).toBeCloseTo(0.28);
  expect(box.max.y).toBeCloseTo(2.07);
});

it('has a closed flat top with upward normals', () => {
  const geometry = createTaijiPodiumGeometry();
  const position = geometry.getAttribute('position');
  const normal = geometry.getAttribute('normal');
  let topVertices = 0;
  let bottomVertices = 0;
  for (let index = 0; index < position.count; index += 1) {
    if (normal.getY(index) > 0.999) {
      topVertices += 1;
      expect(position.getY(index)).toBeCloseTo(2.07);
    }
    if (normal.getY(index) < -0.999) {
      bottomVertices += 1;
      expect(position.getY(index)).toBeCloseTo(0.28);
    }
  }
  expect(topVertices).toBeGreaterThan(0);
  expect(bottomVertices).toBeGreaterThan(0);
});

it('returns finite owned indexed attributes within the triangle budget', () => {
  const first = createTaijiPodiumGeometry();
  const second = createTaijiPodiumGeometry();
  const position = first.getAttribute('position');
  const normal = first.getAttribute('normal');
  const uv = first.getAttribute('uv');
  expect(first.index).not.toBeNull();
  expect(first.index!.count / 3).toBeLessThanOrEqual(400);
  expect(Math.max(...Array.from(first.index!.array))).toBeLessThan(position.count);
  for (const attribute of [position, normal, uv]) {
    expect(attribute).toBeInstanceOf(THREE.BufferAttribute);
    expect(Array.from(attribute.array).every(Number.isFinite)).toBe(true);
  }
  expect(first.index).not.toBe(second.index);
  expect(position).not.toBe(second.getAttribute('position'));
  expect(normal).not.toBe(second.getAttribute('normal'));
  expect(uv).not.toBe(second.getAttribute('uv'));
});
