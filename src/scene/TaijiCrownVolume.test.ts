import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { createCrownLeafMatrix, generateCrownVolume } from './TaijiCrownVolume';
import type { TaijiLeafPlacement } from './TaijiLeafPlacement';

function leaf(p: readonly [number, number, number]): TaijiLeafPlacement {
  return { p, n: [0, 1, 0], t: [1, 0, 0], d: [0.1, 0.05, 0.01] };
}

const cloud = Array.from({ length: 16000 }, (_, i) => leaf([
  Math.sin(i * 0.37) * 2,
  3 + Math.cos(i * 0.71),
  Math.sin(i * 0.23) * 1.5,
]));

describe('generateCrownVolume', () => {
  it('generates exactly 6000 finite points inside the full source envelope', () => {
    const points = generateCrownVolume(cloud);
    expect(points).toHaveLength(6000);
    const minimum = [0, 1, 2].map(axis => Math.min(...cloud.map(l => l.p[axis])));
    const maximum = [0, 1, 2].map(axis => Math.max(...cloud.map(l => l.p[axis])));
    expect(points.every(p => p.every((v, axis) => Number.isFinite(v)
      && v >= minimum[axis] && v <= maximum[axis]))).toBe(true);
    expect(new Set(points.map(p => p.join(','))).size).toBeGreaterThan(5900);
  });

  it('is deterministic and leaves source placements unchanged', () => {
    const source = cloud.map(l => Object.freeze({ ...l, p: Object.freeze([...l.p]) as typeof l.p }));
    const before = JSON.stringify(source);
    expect(generateCrownVolume(source)).toEqual(generateCrownVolume(source));
    expect(JSON.stringify(source)).toBe(before);
  });

  it('preserves separated crown lobes in proportion to their population', () => {
    const source = Array.from({ length: 9 }, (_, cluster) => Array.from(
      { length: (cluster + 1) * 40 },
      () => leaf([cluster * 2, 4, 0]),
    )).flat();
    const points = generateCrownVolume(source);
    for (let cluster = 0; cluster < 9; cluster++) {
      const count = points.filter(p => Math.abs(p[0] - cluster * 2) < 0.2).length;
      expect(Math.abs(count - 6000 * (cluster + 1) / 45)).toBeLessThanOrEqual(1);
    }
    expect(points.every(p => p[1] === 4 && p[2] === 0)).toBe(true);
  });

  it('supports a single point without producing nonfinite values', () => {
    const points = generateCrownVolume([leaf([2, 5, -3])]);
    expect(points).toHaveLength(6000);
    expect(points.every(p => p[0] === 2 && p[1] === 5 && p[2] === -3)).toBe(true);
  });

  it('rejects an empty source explicitly', () => {
    expect(() => generateCrownVolume([])).toThrow(/empty/i);
  });
});


describe('createCrownLeafMatrix', () => {
  it('retains varied inclinations when far LOD selects every other leaf', () => {
    const inclinations = [0, 1].map(parity => Array.from({ length: 200 }, (_, i) => {
      const matrix = createCrownLeafMatrix([0, 0, 0], new THREE.Matrix4(), 0, i * 2 + parity);
      return new THREE.Vector3().setFromMatrixColumn(matrix, 1).normalize().y;
    }));
    const means = inclinations.map(values => values.reduce((sum, value) => sum + value, 0) / values.length);
    expect(Math.abs(means[0] - means[1])).toBeLessThan(0.1);
  });

  it('transforms only the leaf center through the source tree frame', () => {
    const tree = new THREE.Matrix4().compose(new THREE.Vector3(8, 2, -4),
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), 0.8),
      new THREE.Vector3(2, 3, 4));
    const actual = createCrownLeafMatrix([1, 5, -2], tree, 3, 17);
    const expected = new THREE.Vector3(1, 2, -2).applyMatrix4(tree);
    expect(new THREE.Vector3().setFromMatrixPosition(actual).distanceTo(expected)).toBeLessThan(1e-12);
  });

  it('produces deterministic finite right-handed leaf frames of the specified size', () => {
    const normalYs: number[] = [];
    for (let index = 0; index < 100; index++) {
      const matrix = createCrownLeafMatrix([0, 0, 0], new THREE.Matrix4(), 0, index);
      expect(matrix.elements.every(Number.isFinite)).toBe(true);
      expect(matrix.elements).toEqual(createCrownLeafMatrix([0, 0, 0], new THREE.Matrix4(), 0, index).elements);
      const width = new THREE.Vector3().setFromMatrixColumn(matrix, 0);
      const normal = new THREE.Vector3().setFromMatrixColumn(matrix, 1);
      const tangent = new THREE.Vector3().setFromMatrixColumn(matrix, 2);
      expect(tangent.length()).toBeGreaterThanOrEqual(0.30 - 1e-12);
      expect(tangent.length()).toBeLessThanOrEqual(0.44 + 1e-12);
      const ratio = width.length() * 0.44 / tangent.length();
      expect(ratio).toBeGreaterThanOrEqual(0.45 - 1e-12);
      expect(ratio).toBeLessThanOrEqual(0.68 + 1e-12);
      expect(normal.length() * 0.055).toBeCloseTo(0.008, 12);
      width.normalize(); normal.normalize(); tangent.normalize();
      expect(Math.abs(width.dot(normal))).toBeLessThan(1e-12);
      expect(Math.abs(tangent.dot(normal))).toBeLessThan(1e-12);
      expect(new THREE.Vector3().crossVectors(normal, tangent).distanceTo(width)).toBeLessThan(1e-12);
      expect(matrix.determinant()).toBeGreaterThan(0);
      normalYs.push(normal.y);
    }
    expect(Math.min(...normalYs)).toBeGreaterThanOrEqual(0.2);
    expect(Math.max(...normalYs)).toBeLessThanOrEqual(0.95);
    expect(Math.max(...normalYs) - Math.min(...normalYs)).toBeGreaterThan(0.6);
  });
});
