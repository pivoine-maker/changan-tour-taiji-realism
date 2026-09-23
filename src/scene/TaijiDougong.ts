import * as THREE from 'three';

type Point = readonly [number, number, number];
type UV = readonly [number, number];

const UV_SCALE = 0.5;

class DougongBuilder {
  readonly positions: number[] = [];
  readonly normals: number[] = [];
  readonly uvs: number[] = [];
  readonly indices: number[] = [];

  private faceNormal(a: Point, b: Point, c: Point): Point {
    const ab = new THREE.Vector3(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    const ac = new THREE.Vector3(c[0] - a[0], c[1] - a[1], c[2] - a[2]);
    const normal = ab.cross(ac).normalize();
    return [normal.x, normal.y, normal.z];
  }

  quad(points: readonly [Point, Point, Point, Point], faceUVs?: readonly [UV, UV, UV, UV]): void {
    const start = this.positions.length / 3;
    const normal = this.faceNormal(points[0], points[1], points[2]);
    const mapped = faceUVs ?? [[0, 0], [1, 0], [1, 1], [0, 1]];
    for (let corner = 0; corner < 4; corner += 1) {
      this.positions.push(...points[corner]);
      this.normals.push(...normal);
      this.uvs.push(...mapped[corner]);
    }
    this.indices.push(start, start + 1, start + 2, start, start + 2, start + 3);
  }

  triangle(points: readonly [Point, Point, Point], faceUVs: readonly [UV, UV, UV]): void {
    const start = this.positions.length / 3;
    const normal = this.faceNormal(points[0], points[1], points[2]);
    for (let corner = 0; corner < 3; corner += 1) {
      this.positions.push(...points[corner]);
      this.normals.push(...normal);
      this.uvs.push(...faceUVs[corner]);
    }
    this.indices.push(start, start + 1, start + 2);
  }

  geometry(): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(this.normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(this.uvs, 2));
    geometry.setIndex(this.indices);
    return geometry;
  }
}

function chamferedRing(centerX: number, y: number, centerZ: number, halfX: number, halfZ: number, chamfer: number): readonly Point[] {
  return [
    [centerX - halfX + chamfer, y, centerZ - halfZ],
    [centerX + halfX - chamfer, y, centerZ - halfZ],
    [centerX + halfX, y, centerZ - halfZ + chamfer],
    [centerX + halfX, y, centerZ + halfZ - chamfer],
    [centerX + halfX - chamfer, y, centerZ + halfZ],
    [centerX - halfX + chamfer, y, centerZ + halfZ],
    [centerX - halfX, y, centerZ + halfZ - chamfer],
    [centerX - halfX, y, centerZ - halfZ + chamfer],
  ];
}

function addBearingBlock(
  builder: DougongBuilder,
  center: Point,
  size: Point,
  topScale = 1,
  chamfer = 0.025,
): void {
  const bottom = chamferedRing(center[0], center[1] - size[1] / 2, center[2], size[0] / 2, size[2] / 2, chamfer);
  const top = chamferedRing(
    center[0], center[1] + size[1] / 2, center[2],
    size[0] / 2 * topScale, size[2] / 2 * topScale, chamfer,
  );
  let perimeter = 0;
  for (let side = 0; side < 8; side += 1) {
    const next = (side + 1) % 8;
    const edge = Math.hypot(bottom[next][0] - bottom[side][0], bottom[next][2] - bottom[side][2]);
    builder.quad(
      [bottom[side], top[side], top[next], bottom[next]],
      [
        [perimeter / UV_SCALE, bottom[side][1] / UV_SCALE],
        [perimeter / UV_SCALE, top[side][1] / UV_SCALE],
        [(perimeter + edge) / UV_SCALE, top[next][1] / UV_SCALE],
        [(perimeter + edge) / UV_SCALE, bottom[next][1] / UV_SCALE],
      ],
    );
    perimeter += edge;
  }
  const bottomCenter: Point = [center[0], bottom[0][1], center[2]];
  const topCenter: Point = [center[0], top[0][1], center[2]];
  const planarUV = (point: Point): UV => [point[0] / UV_SCALE, point[2] / UV_SCALE];
  for (let side = 0; side < 8; side += 1) {
    const next = (side + 1) % 8;
    builder.triangle([bottomCenter, bottom[side], bottom[next]], [planarUV(bottomCenter), planarUV(bottom[side]), planarUV(bottom[next])]);
    builder.triangle([topCenter, top[next], top[side]], [planarUV(topCenter), planarUV(top[next]), planarUV(top[side])]);
  }
}

function beamRing(axis: 'x' | 'z', coordinate: number, fixed: number, centerY: number, halfWidth: number, halfHeight: number): readonly Point[] {
  const chamfer = 0.025;
  const crossSection: ReadonlyArray<readonly [number, number]> = [
    [-halfWidth + chamfer, -halfHeight],
    [halfWidth - chamfer, -halfHeight],
    [halfWidth, -halfHeight + chamfer],
    [halfWidth, halfHeight - chamfer],
    [halfWidth - chamfer, halfHeight],
    [-halfWidth + chamfer, halfHeight],
    [-halfWidth, halfHeight - chamfer],
    [-halfWidth, -halfHeight + chamfer],
  ];
  return crossSection.map(([horizontal, vertical]) => axis === 'x'
    ? [coordinate, centerY + vertical, fixed + horizontal]
    : [fixed - horizontal, centerY + vertical, coordinate]);
}

function addCurvedArm(
  builder: DougongBuilder,
  axis: 'x' | 'z',
  fixed: number,
  halfLength: number,
  centerY: number,
  endRise: number,
  width: number,
  height: number,
): void {
  const stations = 8;
  const rings: Array<readonly Point[]> = [];
  for (let station = 0; station <= stations; station += 1) {
    const coordinate = -halfLength + 2 * halfLength * station / stations;
    const rise = endRise * Math.pow(Math.abs(coordinate) / halfLength, 1.7);
    rings.push(beamRing(axis, coordinate, fixed, centerY + rise, width / 2, height / 2));
  }
  for (let station = 0; station < stations; station += 1) {
    for (let face = 0; face < 8; face += 1) {
      const next = (face + 1) % 8;
      const u0 = station / stations * halfLength * 2 / UV_SCALE;
      const u1 = (station + 1) / stations * halfLength * 2 / UV_SCALE;
      builder.quad(
        [rings[station][face], rings[station + 1][face], rings[station + 1][next], rings[station][next]],
        [[u0, face / 8], [u1, face / 8], [u1, (face + 1) / 8], [u0, (face + 1) / 8]],
      );
    }
  }
  for (const [ringIndex, reverse] of [[0, true], [rings.length - 1, false]] as const) {
    const points = rings[ringIndex];
    const center: Point = axis === 'x'
      ? [points.reduce((sum, point) => sum + point[0], 0) / 8, points.reduce((sum, point) => sum + point[1], 0) / 8, fixed]
      : [fixed, points.reduce((sum, point) => sum + point[1], 0) / 8, points.reduce((sum, point) => sum + point[2], 0) / 8];
    for (let face = 0; face < 8; face += 1) {
      const next = (face + 1) % 8;
      const ordered: [Point, Point, Point] = reverse
        ? [center, points[face], points[next]]
        : [center, points[next], points[face]];
      builder.triangle(ordered, [[0.5, 0.5], [0, 0], [1, 0]]);
    }
  }
}

/** Creates a compact self-authored timber bracket cluster for the Taiji hall. */
export function createDougongGeometry(): THREE.BufferGeometry {
  const builder = new DougongBuilder();
  addBearingBlock(builder, [0, 0.15, 0], [0.76, 0.3, 0.64], 0.82, 0.035);
  addCurvedArm(builder, 'x', 0, 0.96, 0.38, 0.1, 0.28, 0.2);
  for (const x of [-0.78, 0.78]) {
    addBearingBlock(builder, [x, 0.6, 0], [0.32, 0.22, 0.38], 0.9);
    addCurvedArm(builder, 'z', x, 0.62, 0.7, 0.07, 0.28, 0.17);
    for (const z of [-0.47, 0.47]) {
      addBearingBlock(builder, [x, 0.86, z], [0.32, 0.18, 0.3], 0.88);
    }
  }
  return builder.geometry();
}
