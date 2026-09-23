import * as THREE from 'three';

export const boundaryTreePositions: ReadonlyArray<readonly [number, number]> = [
  [131.7, 160], [132.4, 181], [131.3, 190], [132.7, 201], [131.9, 212], [132.2, 221],
  [131.5, 240], [132.8, 250], [131.6, 260], [132.3, 267], [131.2, 283],
  [258.4, 160], [259.2, 181], [257.8, 190], [260.1, 201], [258.7, 212], [259.6, 221],
  [257.5, 240], [260.4, 250], [258.1, 260], [259.4, 267], [260.7, 283],
];

const Y = 0.265;
const TILE_SIZE = 2.51;
const TARGET_SEGMENT = 2.5;
const X_STRIPS: ReadonlyArray<readonly [number, number]> = [[129, 136], [252, 267]];
const Z_INTERVALS: ReadonlyArray<readonly [number, number]> = [
  [156, 169.8],
  [174.2, 225.8],
  [230.2, 273.8],
  [278.2, 288],
];

function toneAt(x: number, z: number): number {
  const broad = 0.5 + 0.5 * Math.sin(x * 0.173 + Math.sin(z * 0.071) * 1.7);
  const secondary = 0.5 + 0.5 * Math.sin(z * 0.119 - x * 0.047);
  return THREE.MathUtils.clamp(0.88 + 0.085 * broad + 0.035 * secondary, 0.88, 1);
}

/** Creates flat, road-clipped planting ground along both outer palace verges. */
export function createBoundaryGroundGeometry(): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];

  for (const [minX, maxX] of X_STRIPS) {
    for (const [minZ, maxZ] of Z_INTERVALS) {
      const columns = Math.max(1, Math.ceil((maxX - minX) / TARGET_SEGMENT));
      const rows = Math.max(1, Math.ceil((maxZ - minZ) / TARGET_SEGMENT));
      const offset = positions.length / 3;
      for (let row = 0; row <= rows; row += 1) {
        const z = THREE.MathUtils.lerp(minZ, maxZ, row / rows);
        for (let column = 0; column <= columns; column += 1) {
          const x = THREE.MathUtils.lerp(minX, maxX, column / columns);
          const tone = toneAt(x, z);
          positions.push(x, Y, z);
          normals.push(0, 1, 0);
          uvs.push(x / TILE_SIZE, z / TILE_SIZE);
          colors.push(tone, tone, tone);
        }
      }
      const stride = columns + 1;
      for (let row = 0; row < rows; row += 1) {
        for (let column = 0; column < columns; column += 1) {
          const a = offset + row * stride + column;
          const b = a + 1;
          const c = a + stride;
          const d = c + 1;
          indices.push(a, c, b, b, c, d);
        }
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  return geometry;
}
