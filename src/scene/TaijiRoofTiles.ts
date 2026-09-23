import * as THREE from 'three';

export type RoofTileKind = 'cover' | 'pan' | 'end';

type Point = readonly [number, number, number];
type UV = readonly [number, number];

class TileMeshBuilder {
  readonly positions: number[] = [];
  readonly uvs: number[] = [];
  readonly indices: number[] = [];

  vertex(point: Point, uv: UV): number {
    const index = this.positions.length / 3;
    this.positions.push(point[0], point[1], point[2]);
    this.uvs.push(uv[0], uv[1]);
    return index;
  }

  triangle(a: Point, b: Point, c: Point, uvA: UV, uvB: UV, uvC: UV): void {
    const start = this.positions.length / 3;
    this.vertex(a, uvA);
    this.vertex(b, uvB);
    this.vertex(c, uvC);
    this.indices.push(start, start + 1, start + 2);
  }

  quad(a: Point, b: Point, c: Point, d: Point): void {
    const start = this.positions.length / 3;
    this.vertex(a, [0, 0]);
    this.vertex(b, [1, 0]);
    this.vertex(c, [1, 1]);
    this.vertex(d, [0, 1]);
    this.indices.push(start, start + 1, start + 2, start, start + 2, start + 3);
  }

  geometry(): THREE.BufferGeometry {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(this.positions, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(this.uvs, 2));
    geometry.setIndex(this.indices);
    geometry.computeVertexNormals();
    return geometry;
  }
}

function coverPoint(theta: number, z: number, inner: boolean): Point {
  const taper = z < -0.32
    ? THREE.MathUtils.lerp(0.94, 1, (z + 0.5) / 0.18)
    : z > 0.32
      ? THREE.MathUtils.lerp(1, 1.1, (z - 0.32) / 0.18)
      : 1;
  const radius = 0.105 * taper - (inner ? 0.018 : 0);
  return [Math.cos(theta) * radius, Math.sin(theta) * radius, z];
}

function createCoverTile(): THREE.BufferGeometry {
  const positions: number[] = [];
  const normals: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  const radialSegments = 14;
  const zRings = [-0.5, -0.32, 0.32, 0.5];

  const vertex = (point: Point, normal: Point, uv: UV): number => {
    const index = positions.length / 3;
    positions.push(...point);
    normals.push(...normal);
    uvs.push(...uv);
    return index;
  };
  const quad = (a: number, b: number, c: number, d: number): void => {
    indices.push(a, b, c, a, c, d);
  };

  const outerStart = positions.length / 3;
  for (const z of zRings) {
    for (let segment = 0; segment <= radialSegments; segment += 1) {
      const theta = segment / radialSegments * Math.PI;
      vertex(coverPoint(theta, z, false), [Math.cos(theta), Math.sin(theta), 0], [segment / radialSegments, z + 0.5]);
    }
  }
  const innerStart = positions.length / 3;
  for (const z of zRings) {
    for (let segment = 0; segment <= radialSegments; segment += 1) {
      const theta = segment / radialSegments * Math.PI;
      vertex(coverPoint(theta, z, true), [-Math.cos(theta), -Math.sin(theta), 0], [segment / radialSegments, z + 0.5]);
    }
  }

  const ringWidth = radialSegments + 1;
  for (let ringIndex = 0; ringIndex < zRings.length - 1; ringIndex += 1) {
    for (let segment = 0; segment < radialSegments; segment += 1) {
      const outerA = outerStart + ringIndex * ringWidth + segment;
      const outerB = outerA + 1;
      const outerD = outerA + ringWidth;
      quad(outerA, outerB, outerD + 1, outerD);
      const innerA = innerStart + ringIndex * ringWidth + segment;
      const innerB = innerA + 1;
      const innerD = innerA + ringWidth;
      quad(innerA, innerD, innerD + 1, innerB);
    }
  }

  for (const z of [-0.5, 0.5]) {
    const capOuter: number[] = [];
    const capInner: number[] = [];
    for (let segment = 0; segment <= radialSegments; segment += 1) {
      const theta = segment / radialSegments * Math.PI;
      const normal: Point = [0, 0, z < 0 ? -1 : 1];
      capOuter.push(vertex(coverPoint(theta, z, false), normal, [segment / radialSegments, 1]));
      capInner.push(vertex(coverPoint(theta, z, true), normal, [segment / radialSegments, 0]));
    }
    for (let segment = 0; segment < radialSegments; segment += 1) {
      if (z < 0) quad(capInner[segment], capInner[segment + 1], capOuter[segment + 1], capOuter[segment]);
      else quad(capInner[segment], capOuter[segment], capOuter[segment + 1], capInner[segment + 1]);
    }
  }

  for (const theta of [0, Math.PI]) {
    const sideOuter: number[] = [];
    const sideInner: number[] = [];
    for (const z of zRings) {
      sideOuter.push(vertex(coverPoint(theta, z, false), [0, -1, 0], [z + 0.5, 1]));
      sideInner.push(vertex(coverPoint(theta, z, true), [0, -1, 0], [z + 0.5, 0]));
    }
    for (let ringIndex = 0; ringIndex < zRings.length - 1; ringIndex += 1) {
      if (theta === 0) {
        quad(sideInner[ringIndex], sideOuter[ringIndex], sideOuter[ringIndex + 1], sideInner[ringIndex + 1]);
      } else {
        quad(sideInner[ringIndex], sideInner[ringIndex + 1], sideOuter[ringIndex + 1], sideOuter[ringIndex]);
      }
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  return geometry;
}

function panPoint(x: number, z: number, lower: boolean): Point {
  const normalizedX = x / 0.17;
  const top = -0.035 * (1 - normalizedX * normalizedX);
  return [x, top - (lower ? 0.016 : 0), z];
}

function createPanTile(): THREE.BufferGeometry {
  const builder = new TileMeshBuilder();
  const crossSegments = 12;
  const xs = Array.from({ length: crossSegments + 1 }, (_, index) => -0.17 + 0.34 * index / crossSegments);

  for (let segment = 0; segment < crossSegments; segment += 1) {
    const x0 = xs[segment];
    const x1 = xs[segment + 1];
    builder.quad(panPoint(x0, -0.5, false), panPoint(x0, 0.5, false), panPoint(x1, 0.5, false), panPoint(x1, -0.5, false));
    builder.quad(panPoint(x0, -0.5, true), panPoint(x1, -0.5, true), panPoint(x1, 0.5, true), panPoint(x0, 0.5, true));
    builder.quad(panPoint(x0, -0.5, true), panPoint(x0, -0.5, false), panPoint(x1, -0.5, false), panPoint(x1, -0.5, true));
    builder.quad(panPoint(x0, 0.5, true), panPoint(x1, 0.5, true), panPoint(x1, 0.5, false), panPoint(x0, 0.5, false));
  }
  for (const x of [-0.17, 0.17]) {
    if (x < 0) {
      builder.quad(panPoint(x, -0.5, true), panPoint(x, 0.5, true), panPoint(x, 0.5, false), panPoint(x, -0.5, false));
    } else {
      builder.quad(panPoint(x, -0.5, true), panPoint(x, -0.5, false), panPoint(x, 0.5, false), panPoint(x, 0.5, true));
    }
  }
  return builder.geometry();
}

function polar(radius: number, angle: number, z: number): Point {
  return [Math.cos(angle) * radius, Math.sin(angle) * radius, z];
}

function discUV(point: Point): UV {
  return [point[0] / 0.24 + 0.5, point[1] / 0.24 + 0.5];
}

function createEndTile(): THREE.BufferGeometry {
  const builder = new TileMeshBuilder();
  const segments = 32;
  const rings = [
    { radius: 0.04, z: 0.0125 },
    { radius: 0.095, z: 0.0125 },
    { radius: 0.108, z: 0.0185 },
    { radius: 0.12, z: 0.0125 },
  ];

  for (let segment = 0; segment < segments; segment += 1) {
    const a = segment / segments * Math.PI * 2;
    const b = (segment + 1) / segments * Math.PI * 2;
    const center: Point = [0, 0, 0.0125];
    const innerA = polar(rings[0].radius, a, rings[0].z);
    const innerB = polar(rings[0].radius, b, rings[0].z);
    builder.triangle(center, innerA, innerB, discUV(center), discUV(innerA), discUV(innerB));
    for (let ring = 0; ring < rings.length - 1; ring += 1) {
      const current = rings[ring];
      const next = rings[ring + 1];
      builder.quad(
        polar(current.radius, a, current.z),
        polar(next.radius, a, next.z),
        polar(next.radius, b, next.z),
        polar(current.radius, b, current.z),
      );
    }

    const backCenter: Point = [0, 0, -0.0125];
    const backA = polar(0.12, a, -0.0125);
    const backB = polar(0.12, b, -0.0125);
    builder.triangle(backCenter, backB, backA, discUV(backCenter), discUV(backB), discUV(backA));
    builder.quad(backA, polar(0.12, b, -0.0125), polar(0.12, b, 0.0125), polar(0.12, a, 0.0125));
  }

  const petalSegments = 10;
  for (let petal = 0; petal < 8; petal += 1) {
    const angle = petal / 8 * Math.PI * 2;
    const center = polar(0.061, angle, 0.0215);
    for (let segment = 0; segment < petalSegments; segment += 1) {
      const a = segment / petalSegments * Math.PI * 2;
      const b = (segment + 1) / petalSegments * Math.PI * 2;
      const boundary = (phase: number): Point => {
        const radial = 0.027 * Math.cos(phase);
        const lateral = 0.012 * Math.sin(phase);
        return [
          center[0] + Math.cos(angle) * radial - Math.sin(angle) * lateral,
          center[1] + Math.sin(angle) * radial + Math.cos(angle) * lateral,
          0.014,
        ];
      };
      const pointA = boundary(a);
      const pointB = boundary(b);
      builder.triangle(center, pointA, pointB, discUV(center), discUV(pointA), discUV(pointB));
    }
  }
  return builder.geometry();
}

export function createRoofTileGeometry(kind: RoofTileKind): THREE.BufferGeometry {
  switch (kind) {
    case 'cover': return createCoverTile();
    case 'pan': return createPanTile();
    case 'end': return createEndTile();
  }
}
