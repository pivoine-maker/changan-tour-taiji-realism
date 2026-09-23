import * as THREE from 'three';

type Point = readonly [number, number, number];
type UV = readonly [number, number];

const TOP_Y = 0.06;
const SIDE_TOP_Y = 0.04;
const BOTTOM_Y = -0.06;
const HALF_SIZE = 0.5;
const BEVEL = 0.02;

export function createPavingSlabGeometry(): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];

  const addQuad = (points: readonly [Point, Point, Point, Point], normal: Point, faceUVs?: readonly [UV, UV, UV, UV]): void => {
    const start = positions.length / 3;
    const mappedUVs = faceUVs ?? [[0, 0], [1, 0], [1, 1], [0, 1]];
    for (let corner = 0; corner < 4; corner += 1) {
      positions.push(...points[corner]);
      normals.push(...normal);
      uvs.push(...mappedUVs[corner]);
    }
    indices.push(start, start + 1, start + 2, start, start + 2, start + 3);
  };

  const inset = HALF_SIZE - BEVEL;
  const top: readonly Point[] = [
    [-inset, TOP_Y, -inset],
    [-inset, TOP_Y, inset],
    [inset, TOP_Y, inset],
    [inset, TOP_Y, -inset],
  ];
  const outerTop: readonly Point[] = [
    [-HALF_SIZE, SIDE_TOP_Y, -HALF_SIZE],
    [-HALF_SIZE, SIDE_TOP_Y, HALF_SIZE],
    [HALF_SIZE, SIDE_TOP_Y, HALF_SIZE],
    [HALF_SIZE, SIDE_TOP_Y, -HALF_SIZE],
  ];
  const bottom: readonly Point[] = [
    [-HALF_SIZE, BOTTOM_Y, -HALF_SIZE],
    [-HALF_SIZE, BOTTOM_Y, HALF_SIZE],
    [HALF_SIZE, BOTTOM_Y, HALF_SIZE],
    [HALF_SIZE, BOTTOM_Y, -HALF_SIZE],
  ];

  addQuad(
    [top[0], top[1], top[2], top[3]],
    [0, 1, 0],
    [[0, 0], [0, 1], [1, 1], [1, 0]],
  );

  const inverseSqrt2 = Math.SQRT1_2;
  const bevelNormals: readonly Point[] = [
    [-inverseSqrt2, inverseSqrt2, 0],
    [0, inverseSqrt2, inverseSqrt2],
    [inverseSqrt2, inverseSqrt2, 0],
    [0, inverseSqrt2, -inverseSqrt2],
  ];
  const sideNormals: readonly Point[] = [
    [-1, 0, 0],
    [0, 0, 1],
    [1, 0, 0],
    [0, 0, -1],
  ];

  for (let side = 0; side < 4; side += 1) {
    const next = (side + 1) % 4;
    addQuad([top[side], outerTop[side], outerTop[next], top[next]], bevelNormals[side]);
    addQuad([outerTop[side], bottom[side], bottom[next], outerTop[next]], sideNormals[side]);
  }

  addQuad([bottom[0], bottom[3], bottom[2], bottom[1]], [0, -1, 0]);

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  return geometry;
}
