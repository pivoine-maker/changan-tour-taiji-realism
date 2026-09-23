import * as THREE from 'three';
import {
  GARDEN_PATH_RECTS,
  GARDEN_POOL_INNER,
  GARDEN_POOL_OUTER,
  createTaijiGardenPool,
  gardenPathUnionArea,
} from './TaijiGardenPool';

const materials = () => ({
  stone: new THREE.MeshStandardMaterial(),
  earth: new THREE.MeshStandardMaterial(),
  water: new THREE.MeshPhysicalMaterial(),
});

function meshesNamed(group: THREE.Group, name: string): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = [];
  group.traverse((object) => {
    if (object instanceof THREE.Mesh && object.name === name) meshes.push(object);
  });
  return meshes;
}

function bounds(mesh: THREE.Mesh): THREE.Box3 {
  mesh.geometry.computeBoundingBox();
  return mesh.geometry.boundingBox!.clone();
}

function overlap(a0: number, a1: number, b0: number, b1: number): number {
  return Math.max(0, Math.min(a1, b1) - Math.max(a0, b0));
}

it('cuts an exact pool opening from four non-overlapping world-space earth slabs', () => {
  const group = createTaijiGardenPool(materials());
  const earth = meshesNamed(group, 'garden-pool-earth');
  expect(group.matrix.equals(new THREE.Matrix4())).toBe(true);
  expect(earth).toHaveLength(4);

  let area = 0;
  for (const mesh of earth) {
    const box = bounds(mesh);
    expect(box.min.y).toBeCloseTo(0.3075);
    expect(box.max.y).toBeCloseTo(0.3425);
    expect(overlap(box.min.x, box.max.x, GARDEN_POOL_OUTER.minX, GARDEN_POOL_OUTER.maxX)
      * overlap(box.min.z, box.max.z, GARDEN_POOL_OUTER.minZ, GARDEN_POOL_OUTER.maxZ)).toBeCloseTo(0);
    area += (box.max.x - box.min.x) * (box.max.z - box.min.z);

    const position = mesh.geometry.getAttribute('position');
    const normal = mesh.geometry.getAttribute('normal');
    const uv = mesh.geometry.getAttribute('uv');
    for (let i = 0; i < position.count; i += 1) {
      if (normal.getY(i) > 0.9) {
        expect(uv.getX(i)).toBeCloseTo((position.getX(i) - 194) / 3);
        expect(uv.getY(i)).toBeCloseTo((position.getZ(i) - 222) / 3);
      }
    }
  }
  expect(area).toBeCloseTo(112 * 132 - 23.8 * 8.8);
});

it('creates the full shallow water surface and bed below the bridge boards', () => {
  const group = createTaijiGardenPool(materials());
  const water = meshesNamed(group, 'garden-pool-water')[0];
  const bed = meshesNamed(group, 'garden-pool-bed')[0];
  const waterBox = bounds(water);
  const bedBox = bounds(bed);

  expect([waterBox.min.x, waterBox.max.x, waterBox.min.z, waterBox.max.z]).toEqual([
    GARDEN_POOL_INNER.minX, GARDEN_POOL_INNER.maxX,
    GARDEN_POOL_INNER.minZ, GARDEN_POOL_INNER.maxZ,
  ]);
  expect(waterBox.min.y).toBeCloseTo(0.335);
  expect(waterBox.max.y).toBeCloseTo(0.335);
  expect(bedBox.min.y).toBeCloseTo(0.305);
  expect(bedBox.max.y).toBeCloseTo(0.315);
  expect(0.335 - bedBox.max.y).toBeCloseTo(0.02);
  expect(waterBox.max.y).toBeLessThan(0.345);
  const normal = water.geometry.getAttribute('normal');
  for (let i = 0; i < normal.count; i += 1) expect(normal.getY(i)).toBeCloseTo(1);
});

it('partitions the rim around the inner opening and lowers only bridge-covered pieces', () => {
  const group = createTaijiGardenPool(materials());
  const regular = meshesNamed(group, 'garden-pool-rim');
  const underPath = meshesNamed(group, 'garden-pool-rim-under-path');
  expect(regular.length).toBeGreaterThan(0);
  expect(underPath.length).toBeGreaterThan(0);

  for (const mesh of [...regular, ...underPath]) {
    const box = bounds(mesh);
    expect(box.min.y).toBeCloseTo(0.305);
    expect(box.min.x).toBeGreaterThanOrEqual(GARDEN_POOL_OUTER.minX);
    expect(box.max.x).toBeLessThanOrEqual(GARDEN_POOL_OUTER.maxX);
    expect(box.min.z).toBeGreaterThanOrEqual(GARDEN_POOL_OUTER.minZ);
    expect(box.max.z).toBeLessThanOrEqual(GARDEN_POOL_OUTER.maxZ);
    expect(overlap(box.min.x, box.max.x, GARDEN_POOL_INNER.minX, GARDEN_POOL_INNER.maxX)
      * overlap(box.min.z, box.max.z, GARDEN_POOL_INNER.minZ, GARDEN_POOL_INNER.maxZ)).toBeCloseTo(0);
  }
  for (const mesh of regular) {
    const box = bounds(mesh);
    expect(box.max.y).toBeCloseTo(0.405);
    for (const path of GARDEN_PATH_RECTS) {
      expect(overlap(box.min.x, box.max.x, path.minX, path.maxX)
        * overlap(box.min.z, box.max.z, path.minZ, path.maxZ)).toBeCloseTo(0);
    }
  }
  for (const mesh of underPath) expect(bounds(mesh).max.y).toBeCloseTo(0.345);
});

it('builds the existing cross path as three non-overlapping boxes with preserved UV phase', () => {
  const group = createTaijiGardenPool(materials());
  const paths = meshesNamed(group, 'garden-pool-path');
  expect(paths).toHaveLength(3);
  let actualArea = 0;
  paths.forEach((path, index) => {
    const box = bounds(path);
    expect(box.min.y).toBeCloseTo(0.345);
    expect(box.max.y).toBeCloseTo(0.405);
    actualArea += (box.max.x - box.min.x) * (box.max.z - box.min.z);
    for (let otherIndex = index + 1; otherIndex < paths.length; otherIndex += 1) {
      const other = bounds(paths[otherIndex]);
      expect(overlap(box.min.x, box.max.x, other.min.x, other.max.x)
        * overlap(box.min.z, box.max.z, other.min.z, other.max.z)).toBeCloseTo(0);
    }
    const position = path.geometry.getAttribute('position');
    const normal = path.geometry.getAttribute('normal');
    const uv = path.geometry.getAttribute('uv');
    for (let vertex = 0; vertex < position.count; vertex += 1) {
      if (normal.getY(vertex) > 0.9) {
        expect(uv.getX(vertex)).toBeCloseTo((position.getX(vertex) - 194) / 3);
        expect(uv.getY(vertex)).toBeCloseTo((position.getZ(vertex) - 276) / 3);
      }
    }
  });
  expect(actualArea).toBeCloseTo(335.24);
  expect(gardenPathUnionArea()).toBeCloseTo(335.24);
});

it('sets masonry shadow flags and keeps water receive-only', () => {
  const group = createTaijiGardenPool(materials());
  group.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    expect(object.receiveShadow).toBe(true);
    expect(object.castShadow).toBe(object.name !== 'garden-pool-water');
  });
});

it('returns finite independently owned geometry while borrowing supplied materials', () => {
  const shared = materials();
  const first = createTaijiGardenPool(shared);
  const second = createTaijiGardenPool(shared);
  const firstMeshes: THREE.Mesh[] = [];
  const secondMeshes: THREE.Mesh[] = [];
  first.traverse((object) => { if (object instanceof THREE.Mesh) firstMeshes.push(object); });
  second.traverse((object) => { if (object instanceof THREE.Mesh) secondMeshes.push(object); });
  expect(firstMeshes).toHaveLength(secondMeshes.length);
  firstMeshes.forEach((mesh, index) => {
    expect(mesh.geometry).not.toBe(secondMeshes[index].geometry);
    expect(mesh.material).toBe(secondMeshes[index].material);
    for (const attributeName of Object.keys(mesh.geometry.attributes)) {
      const attribute = mesh.geometry.getAttribute(attributeName);
      expect(Array.from(attribute.array).every(Number.isFinite)).toBe(true);
    }
    expect(Math.max(...Array.from(mesh.geometry.index!.array))).toBeLessThan(mesh.geometry.getAttribute('position').count);
  });
});
