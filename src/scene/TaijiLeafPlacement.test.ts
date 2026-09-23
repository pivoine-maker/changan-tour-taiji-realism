import * as THREE from 'three';
import { calculateLeafFrame } from './TaijiLeafPlacement';

const columnLength = (matrix: THREE.Matrix4, column: 0 | 1 | 2): number => {
  const offset = column * 4;
  return Math.hypot(matrix.elements[offset], matrix.elements[offset + 1], matrix.elements[offset + 2]);
};

it('preserves authored position and dimensions under an identity tree transform', () => {
  const frame = calculateLeafFrame(
    { p: [1, 3, 4], n: [0, 1, 0], t: [0, 0, 1], d: [0.1, 0.04, 0.0055] },
    new THREE.Matrix4(),
    1,
    1,
  );
  const position = new THREE.Vector3().setFromMatrixPosition(frame);
  expect(position.toArray()).toEqual([1, 2, 4]);
  expect(columnLength(frame, 0) * 0.44).toBeCloseTo(0.04);
  expect(columnLength(frame, 1) * 0.055).toBeCloseTo(0.0055);
  expect(columnLength(frame, 2)).toBeCloseTo(0.1);
  expect(frame.determinant()).toBeGreaterThan(0);
});

it('applies tree rotation and nonuniform scale to position and physical leaf dimensions', () => {
  const treeMatrix = new THREE.Matrix4().compose(
    new THREE.Vector3(10, 2, -4),
    new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 2),
    new THREE.Vector3(2, 3, 4),
  );
  const frame = calculateLeafFrame(
    { p: [1, 2, 3], n: [0, 1, 0], t: [0, 0, 1], d: [0.05, 0.02, 0.004] },
    treeMatrix,
    1,
    1,
  );
  const expectedPosition = new THREE.Vector3(1, 1, 3).applyMatrix4(treeMatrix);
  expect(new THREE.Vector3().setFromMatrixPosition(frame).distanceTo(expectedPosition)).toBeLessThan(1e-7);
  expect(columnLength(frame, 2)).toBeCloseTo(0.2);
  expect(columnLength(frame, 0) * 0.44).toBeCloseTo(0.05);
  const leafLengthAxis = new THREE.Vector3().setFromMatrixColumn(frame, 2).normalize();
  expect(leafLengthAxis.x).toBeCloseTo(1);
  expect(leafLengthAxis.y).toBeCloseTo(0);
  expect(leafLengthAxis.z).toBeCloseTo(0);
});

it('compensates linear leaf size for retained sampling density within realistic clamps', () => {
  const sparse = calculateLeafFrame(
    { p: [0, 0, 0], n: [0, 1, 0], t: [0, 0, 1], d: [0.1, 0.04, 0.006] },
    new THREE.Matrix4(),
    0,
    0.25,
  );
  expect(columnLength(sparse, 2)).toBeCloseTo(0.2);
  expect(columnLength(sparse, 0) * 0.44).toBeCloseTo(0.08);

  const anomalous = calculateLeafFrame(
    { p: [0, 0, 0], n: [0, 1, 0], t: [0, 0, 1], d: [4, 0.001, 0.001] },
    new THREE.Matrix4(),
    0,
    0.01,
  );
  const length = columnLength(anomalous, 2);
  const width = columnLength(anomalous, 0) * 0.44;
  expect(length).toBeCloseTo(0.32);
  expect(width / length).toBeGreaterThanOrEqual(0.25);
  expect(width / length).toBeLessThanOrEqual(0.8);
});

it('repairs zero or parallel PCA directions into a finite right-handed frame', () => {
  for (const leaf of [
    { p: [0, 0, 0], n: [0, 0, 0], t: [0, 0, 0], d: [0.08, 0.03, 0.004] },
    { p: [0, 0, 0], n: [0, 1, 0], t: [0, 2, 0], d: [0.08, 0.03, 0.004] },
  ] as const) {
    const frame = calculateLeafFrame(leaf, new THREE.Matrix4(), 0, 16_000 / 30_250);
    expect(frame.elements.every(Number.isFinite)).toBe(true);
    expect(frame.determinant()).toBeGreaterThan(0);
    for (const column of [0, 1, 2] as const) expect(columnLength(frame, column)).toBeGreaterThan(0);
  }
});
