import * as THREE from 'three';
import { createRoofTileGeometry } from './TaijiRoofTiles';

function expectValidGeometry(geometry: THREE.BufferGeometry): void {
  const position = geometry.getAttribute('position');
  const normal = geometry.getAttribute('normal');
  const uv = geometry.getAttribute('uv');
  expect(geometry.index).not.toBeNull();
  expect(position).toBeInstanceOf(THREE.BufferAttribute);
  expect(normal).toBeInstanceOf(THREE.BufferAttribute);
  expect(uv).toBeInstanceOf(THREE.BufferAttribute);
  expect(position.count).toBe(normal.count);
  expect(position.count).toBe(uv.count);
  expect(geometry.index!.count / 3).toBeLessThan(1000);
  for (const attribute of [position, normal, uv]) {
    expect(Array.from(attribute.array).every(Number.isFinite)).toBe(true);
  }
  for (let index = 0; index < normal.count; index += 1) {
    const length = Math.hypot(normal.getX(index), normal.getY(index), normal.getZ(index));
    expect(length).toBeGreaterThan(0.8);
    expect(length).toBeLessThan(1.2);
  }
}

it.each(['cover', 'pan', 'end'] as const)('%s tile has owned indexed position, normal, and UV buffers', (kind) => {
  const first = createRoofTileGeometry(kind);
  const second = createRoofTileGeometry(kind);
  expectValidGeometry(first);
  expect(first.getAttribute('position')).not.toBe(second.getAttribute('position'));
  expect(first.index).not.toBe(second.index);
});

it('creates a thin crowned cover shell with taper and a downstream overlap lip', () => {
  const geometry = createRoofTileGeometry('cover');
  geometry.computeBoundingBox();
  const box = geometry.boundingBox!;

  expect(box.min.z).toBeCloseTo(-0.5);
  expect(box.max.z).toBeCloseTo(0.5);
  expect(box.max.x - box.min.x).toBeGreaterThan(0.2);
  expect(box.max.x - box.min.x).toBeLessThan(0.25);
  expect(box.max.y).toBeGreaterThan(0.1);
  expect(box.min.y).toBeCloseTo(0, 5);

  const position = geometry.getAttribute('position');
  let frontRadius = 0;
  let lipRadius = 0;
  for (let index = 0; index < position.count; index += 1) {
    const radius = Math.hypot(position.getX(index), position.getY(index));
    if (position.getZ(index) < -0.49) frontRadius = Math.max(frontRadius, radius);
    if (position.getZ(index) > 0.49) lipRadius = Math.max(lipRadius, radius);
  }
    expect(lipRadius).toBeGreaterThan(frontRadius + 0.01);
});

it('uses a continuous smooth cover grid with monotonic tile-wide UVs', () => {
  const geometry = createRoofTileGeometry('cover');
  const position = geometry.getAttribute('position');
  const normal = geometry.getAttribute('normal');
  const uv = geometry.getAttribute('uv');
  expect(position.count).toBeLessThanOrEqual(220);

  const ring: Array<{ theta: number; u: number; radialAlignment: number; v: number }> = [];
  for (let index = 0; index < position.count; index += 1) {
    const x = position.getX(index);
    const y = position.getY(index);
    const radialLength = Math.hypot(x, y);
    const radialAlignment = radialLength > 0
      ? (x * normal.getX(index) + y * normal.getY(index)) / radialLength
      : 0;
    if (Math.abs(position.getZ(index) + 0.32) < 1e-5 && radialAlignment > 0.99) {
      ring.push({ theta: Math.atan2(y, x), u: uv.getX(index), radialAlignment, v: uv.getY(index) });
    }
  }
  ring.sort((a, b) => a.theta - b.theta);
  expect(ring).toHaveLength(15);
  expect(ring[0].u).toBeCloseTo(0);
  expect(ring[ring.length - 1].u).toBeCloseTo(1);
  expect(ring.every((vertex, index) => index === 0 || vertex.u > ring[index - 1].u)).toBe(true);
  expect(ring.every((vertex) => vertex.radialAlignment > 0.999 && Math.abs(vertex.v - 0.18) < 1e-5)).toBe(true);
});

it('creates a closed shallow pan shell with a nonzero open valley profile', () => {
  const geometry = createRoofTileGeometry('pan');
  geometry.computeBoundingBox();
  const box = geometry.boundingBox!;
  expect(box.min.z).toBeCloseTo(-0.5);
  expect(box.max.z).toBeCloseTo(0.5);
  expect(box.max.x - box.min.x).toBeCloseTo(0.34, 3);
  expect(box.min.y).toBeLessThan(-0.045);
  expect(box.max.y).toBeCloseTo(0, 5);

  const position = geometry.getAttribute('position');
  const centerHeights: number[] = [];
  const edgeHeights: number[] = [];
  for (let index = 0; index < position.count; index += 1) {
    if (Math.abs(position.getZ(index)) < 0.49) continue;
    if (Math.abs(position.getX(index)) < 0.001) centerHeights.push(position.getY(index));
    if (Math.abs(position.getX(index)) > 0.16) edgeHeights.push(position.getY(index));
  }
  expect(Math.max(...centerHeights)).toBeLessThan(Math.max(...edgeHeights) - 0.025);
});

it('creates a vertical end disc with concentric molded rim and eight raised petals', () => {
  const geometry = createRoofTileGeometry('end');
  geometry.computeBoundingBox();
  const box = geometry.boundingBox!;
  expect(box.max.x - box.min.x).toBeCloseTo(0.24, 3);
  expect(box.max.y - box.min.y).toBeCloseTo(0.24, 3);
  expect(box.max.z - box.min.z).toBeGreaterThanOrEqual(0.025);
  expect(box.max.z - box.min.z).toBeLessThan(0.04);

  const position = geometry.getAttribute('position');
  let raisedPetalTips = 0;
  for (let index = 0; index < position.count; index += 1) {
    const radius = Math.hypot(position.getX(index), position.getY(index));
    if (radius > 0.045 && radius < 0.085 && position.getZ(index) > 0.016) raisedPetalTips += 1;
  }
  expect(raisedPetalTips).toBeGreaterThanOrEqual(8);
  expect(geometry.getAttribute('normal').getZ(0)).toBeGreaterThan(0);
});
