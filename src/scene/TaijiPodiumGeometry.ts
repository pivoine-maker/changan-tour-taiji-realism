import * as THREE from 'three';

type Point = readonly [number, number, number];
type Profile = readonly [y: number, halfX: number, halfZ: number];

const PROFILE: readonly Profile[] = [
  [0.28, 21.9, 10.9],
  [0.48, 21.9, 10.9],
  [0.56, 21.82, 10.82],
  [0.64, 21.48, 10.48],
  [0.73, 21.4, 10.4],
  [1.55, 21.4, 10.4],
  [1.67, 21.53, 10.53],
  [1.79, 21.75, 10.75],
  [1.94, 21.75, 10.75],
  [2.01, 21.4, 10.4],
  [2.07, 21.4, 10.4],
];

const CHAMFER = 0.06;
const UV_METRES = 3;

function ring(profile: Profile): readonly Point[] {
  const [y, halfX, halfZ] = profile;
  return [
    [-halfX + CHAMFER, y, -halfZ],
    [halfX - CHAMFER, y, -halfZ],
    [halfX, y, -halfZ + CHAMFER],
    [halfX, y, halfZ - CHAMFER],
    [halfX - CHAMFER, y, halfZ],
    [-halfX + CHAMFER, y, halfZ],
    [-halfX, y, halfZ - CHAMFER],
    [-halfX, y, -halfZ + CHAMFER],
  ];
}

function distance(a: Point, b: Point): number {
  return Math.hypot(b[0] - a[0], b[2] - a[2]);
}

export function createTaijiPodiumGeometry(): THREE.BufferGeometry {
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const addVertex = (point: Point, u: number, v: number): number => {
    const index = positions.length / 3;
    positions.push(...point);
    uvs.push(u, v);
    return index;
  };

  const rings = PROFILE.map(ring);
  for (let level = 0; level < rings.length - 1; level += 1) {
    const lower = rings[level];
    const upper = rings[level + 1];
    let lowerDistance = 0;
    let upperDistance = 0;
    for (let side = 0; side < 8; side += 1) {
      const next = (side + 1) % 8;
      const start = positions.length / 3;
      addVertex(lower[side], lowerDistance / UV_METRES, PROFILE[level][0] / UV_METRES);
      addVertex(upper[side], upperDistance / UV_METRES, PROFILE[level + 1][0] / UV_METRES);
      lowerDistance += distance(lower[side], lower[next]);
      upperDistance += distance(upper[side], upper[next]);
      addVertex(upper[next], upperDistance / UV_METRES, PROFILE[level + 1][0] / UV_METRES);
      addVertex(lower[next], lowerDistance / UV_METRES, PROFILE[level][0] / UV_METRES);
      indices.push(start, start + 1, start + 2, start, start + 2, start + 3);
    }
  }

  const addCap = (points: readonly Point[], upward: boolean): void => {
    const center: Point = [0, points[0][1], 0];
    for (let side = 0; side < 8; side += 1) {
      const next = (side + 1) % 8;
      const start = positions.length / 3;
      const ordered = upward ? [center, points[next], points[side]] : [center, points[side], points[next]];
      for (const point of ordered) addVertex(point, point[0] / UV_METRES, point[2] / UV_METRES);
      indices.push(start, start + 1, start + 2);
    }
  };
  addCap(rings[0], false);
  addCap(rings[rings.length - 1], true);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}
