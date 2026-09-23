import * as THREE from 'three';
import type { TaijiLeafPlacement } from './TaijiLeafPlacement';

type Point = readonly [number, number, number];
type MutablePoint = [number, number, number];
const FILL_COUNT = 6000;
const CLUSTER_COUNT = 9;

function distanceSquared(a: Point, b: Point): number {
  return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2 + (a[2] - b[2]) ** 2;
}

function nearestCenter(point: Point, centers: readonly Point[]): number {
  let nearest = 0;
  let distance = Infinity;
  for (let c = 0; c < centers.length; c++) {
    const candidate = distanceSquared(point, centers[c]);
    if (candidate < distance) {
      nearest = c;
      distance = candidate;
    }
  }
  return nearest;
}

// Scrambling prevents an every-other far-LOD subset from selecting just one
// hemisphere of a base-2 Halton sequence.
function sequenceIndex(index: number): number {
  let value = (index + 1) >>> 0;
  value = Math.imul(value ^ (value >>> 16), 0x7feb352d);
  value = Math.imul(value ^ (value >>> 15), 0x846ca68b);
  return ((value ^ (value >>> 16)) >>> 0) + 1;
}

function halton(index: number, base: number): number {
  let result = 0;
  let fraction = 1;
  while (index > 0) {
    fraction /= base;
    result += fraction * (index % base);
    index = Math.floor(index / base);
  }
  return result;
}

/** Fits a source-space canopy once; points are intended for real leaf geometry. */
export function generateCrownVolume(leaves: ReadonlyArray<TaijiLeafPlacement>): readonly Point[] {
  if (leaves.length === 0) throw new Error('Cannot generate a crown from an empty source');
  const minimum: MutablePoint = [Infinity, Infinity, Infinity];
  const maximum: MutablePoint = [-Infinity, -Infinity, -Infinity];
  const samples: Point[] = [];
  for (let i = 0; i < leaves.length; i++) {
    const point = leaves[i].p;
    for (let axis = 0; axis < 3; axis++) {
      minimum[axis] = Math.min(minimum[axis], point[axis]);
      maximum[axis] = Math.max(maximum[axis], point[axis]);
    }
    if (i % 4 === 0) samples.push(point);
  }

  // Updating each sample's nearest distance makes farthest-point seeding O(NK).
  const centers: MutablePoint[] = [[...samples[0]]];
  const nearestDistances = new Float64Array(samples.length).fill(Infinity);
  while (centers.length < Math.min(CLUSTER_COUNT, samples.length)) {
    const latest = centers[centers.length - 1];
    let farthest = 0;
    for (let i = 0; i < samples.length; i++) {
      nearestDistances[i] = Math.min(nearestDistances[i], distanceSquared(samples[i], latest));
      if (nearestDistances[i] > nearestDistances[farthest]) farthest = i;
    }
    if (nearestDistances[farthest] === 0) break;
    centers.push([...samples[farthest]]);
  }

  for (let iteration = 0; iteration < 10; iteration++) {
    const sums: MutablePoint[] = centers.map(() => [0, 0, 0]);
    const counts = new Uint32Array(centers.length);
    for (const point of samples) {
      const c = nearestCenter(point, centers);
      counts[c]++;
      for (let axis = 0; axis < 3; axis++) sums[c][axis] += point[axis];
    }
    for (let c = 0; c < centers.length; c++) {
      if (counts[c] === 0) continue;
      for (let axis = 0; axis < 3; axis++) centers[c][axis] = sums[c][axis] / counts[c];
    }
  }

  // Full-source populations avoid relying on the stride for the fill budget.
  // Welford variance remains stable for very small clouds at nonzero positions.
  const counts = new Uint32Array(centers.length);
  const means: MutablePoint[] = centers.map(() => [0, 0, 0]);
  const moments: MutablePoint[] = centers.map(() => [0, 0, 0]);
  for (const { p } of leaves) {
    const c = nearestCenter(p, centers);
    counts[c]++;
    for (let axis = 0; axis < 3; axis++) {
      const delta = p[axis] - means[c][axis];
      means[c][axis] += delta / counts[c];
      moments[c][axis] += delta * (p[axis] - means[c][axis]);
    }
  }
  const quotas = Array.from(counts, count => FILL_COUNT * count / leaves.length);
  const budgets = quotas.map(Math.floor);
  const remainderOrder = quotas.map((quota, c) => ({ c, remainder: quota - budgets[c] }))
    .sort((a, b) => b.remainder - a.remainder || a.c - b.c);
  const remaining = FILL_COUNT - budgets.reduce((sum, value) => sum + value, 0);
  for (let i = 0; i < remaining; i++) budgets[remainderOrder[i].c]++;

  const points: MutablePoint[] = [];
  for (let c = 0; c < centers.length; c++) {
    if (counts[c] === 0) continue;
    const radii = moments[c].map(moment => Math.max(0.08, 1.5 * Math.sqrt(Math.max(0, moment / counts[c]))));
    for (let i = 0; i < budgets[c]; i++) {
      const sequence = sequenceIndex(points.length);
      const vertical = 2 * halton(sequence, 2) - 1;
      const angle = 2 * Math.PI * halton(sequence, 3);
      const radius = Math.cbrt(halton(sequence, 5));
      const horizontal = Math.sqrt(1 - vertical * vertical);
      const direction = [horizontal * Math.cos(angle), vertical, horizontal * Math.sin(angle)];
      const point: MutablePoint = [0, 0, 0];
      for (let axis = 0; axis < 3; axis++) {
        point[axis] = Math.max(minimum[axis], Math.min(maximum[axis],
          means[c][axis] + radius * radii[axis] * direction[axis]));
      }
      points.push(point);
    }
  }
  return points;
}

/** World-size folded leaf, with only its center transformed by the tree frame. */
export function createCrownLeafMatrix(
  point: Point,
  treeMatrix: THREE.Matrix4,
  baseY: number,
  index: number,
): THREE.Matrix4 {
  const sequence = sequenceIndex(index + 12345);
  const normalY = 0.2 + 0.75 * halton(sequence, 2);
  const yaw = 2 * Math.PI * halton(sequence, 3);
  const horizontal = Math.sqrt(1 - normalY * normalY);
  const normal = new THREE.Vector3(horizontal * Math.cos(yaw), normalY, horizontal * Math.sin(yaw));
  const tangent = new THREE.Vector3(-Math.sin(yaw), 0, Math.cos(yaw))
    .applyAxisAngle(normal, 2 * Math.PI * halton(sequence, 5));
  const widthAxis = new THREE.Vector3().crossVectors(normal, tangent).normalize();
  const length = 0.30 + 0.14 * halton(sequence, 7);
  const width = length * (0.45 + 0.23 * halton(sequence, 11));
  const position = new THREE.Vector3(point[0], point[1] - baseY, point[2]).applyMatrix4(treeMatrix);
  return new THREE.Matrix4().makeBasis(widthAxis, normal, tangent)
    .scale(new THREE.Vector3(width / 0.44, 0.008 / 0.055, length))
    .setPosition(position);
}
