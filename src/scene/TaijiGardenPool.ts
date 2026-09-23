import * as THREE from 'three';

export interface RectXZ {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export interface TaijiGardenPoolMaterials {
  stone: THREE.Material;
  earth: THREE.Material;
  water: THREE.Material;
}

export const GARDEN_POOL_OUTER: Readonly<RectXZ> = {
  minX: 182.1, maxX: 205.9, minZ: 267.6, maxZ: 276.4,
};

export const GARDEN_POOL_INNER: Readonly<RectXZ> = {
  minX: 183, maxX: 205, minZ: 268.5, maxZ: 275.5,
};

export const GARDEN_PATH_RECTS: ReadonlyArray<Readonly<RectXZ>> = [
  { minX: 154, maxX: 234, minZ: 274.3, maxZ: 277.7 },
  { minX: 192.3, maxX: 195.7, minZ: 265, maxZ: 287 },
];

const EARTH_BOUNDS: Readonly<RectXZ> = {
  minX: 138, maxX: 250, minZ: 156, maxZ: 288,
};

function area(rect: Readonly<RectXZ>): number {
  return (rect.maxX - rect.minX) * (rect.maxZ - rect.minZ);
}

function intersectionArea(a: Readonly<RectXZ>, b: Readonly<RectXZ>): number {
  return Math.max(0, Math.min(a.maxX, b.maxX) - Math.max(a.minX, b.minX))
    * Math.max(0, Math.min(a.maxZ, b.maxZ) - Math.max(a.minZ, b.minZ));
}

export function gardenPathUnionArea(): number {
  const [horizontal, vertical] = GARDEN_PATH_RECTS;
  return area(horizontal) + area(vertical) - intersectionArea(horizontal, vertical);
}

function contains(rect: Readonly<RectXZ>, x: number, z: number): boolean {
  return x >= rect.minX && x <= rect.maxX && z >= rect.minZ && z <= rect.maxZ;
}

/** A closed world-coordinate box with continuous three-metre masonry UV scale. */
function createWorldBox(
  rect: Readonly<RectXZ>,
  bottom: number,
  top: number,
  uvOriginX = 194,
  uvOriginZ = 272,
): THREE.BoxGeometry {
  const geometry = new THREE.BoxGeometry(
    rect.maxX - rect.minX,
    top - bottom,
    rect.maxZ - rect.minZ,
  );
  geometry.translate(
    (rect.minX + rect.maxX) / 2,
    (bottom + top) / 2,
    (rect.minZ + rect.maxZ) / 2,
  );

  const position = geometry.getAttribute('position');
  const normal = geometry.getAttribute('normal');
  const uv = geometry.getAttribute('uv');
  for (let vertex = 0; vertex < position.count; vertex += 1) {
    const x = position.getX(vertex);
    const y = position.getY(vertex);
    const z = position.getZ(vertex);
    if (Math.abs(normal.getY(vertex)) > 0.9) {
      uv.setXY(vertex, (x - uvOriginX) / 3, (z - uvOriginZ) / 3);
    } else if (Math.abs(normal.getX(vertex)) > 0.9) {
      uv.setXY(vertex, (z - uvOriginZ) / 3, y / 3);
    } else {
      uv.setXY(vertex, (x - uvOriginX) / 3, y / 3);
    }
  }
  uv.needsUpdate = true;
  return geometry;
}

function addBox(
  group: THREE.Group,
  name: string,
  rect: Readonly<RectXZ>,
  bottom: number,
  top: number,
  material: THREE.Material,
  uvOriginX = 194,
  uvOriginZ = 272,
): void {
  const mesh = new THREE.Mesh(createWorldBox(rect, bottom, top, uvOriginX, uvOriginZ), material);
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
}

function addEarthAroundPool(group: THREE.Group, material: THREE.Material): void {
  const rectangles: RectXZ[] = [
    { minX: EARTH_BOUNDS.minX, maxX: GARDEN_POOL_OUTER.minX, minZ: EARTH_BOUNDS.minZ, maxZ: EARTH_BOUNDS.maxZ },
    { minX: GARDEN_POOL_OUTER.maxX, maxX: EARTH_BOUNDS.maxX, minZ: EARTH_BOUNDS.minZ, maxZ: EARTH_BOUNDS.maxZ },
    { minX: GARDEN_POOL_OUTER.minX, maxX: GARDEN_POOL_OUTER.maxX, minZ: EARTH_BOUNDS.minZ, maxZ: GARDEN_POOL_OUTER.minZ },
    { minX: GARDEN_POOL_OUTER.minX, maxX: GARDEN_POOL_OUTER.maxX, minZ: GARDEN_POOL_OUTER.maxZ, maxZ: EARTH_BOUNDS.maxZ },
  ];
  for (const rectangle of rectangles) {
    addBox(group, 'garden-pool-earth', rectangle, 0.3075, 0.3425, material, 194, 222);
  }
}

function addCrossPaths(group: THREE.Group, material: THREE.Material): void {
  const rectangles: RectXZ[] = [
    GARDEN_PATH_RECTS[0],
    {
      minX: GARDEN_PATH_RECTS[1].minX,
      maxX: GARDEN_PATH_RECTS[1].maxX,
      minZ: GARDEN_PATH_RECTS[1].minZ,
      maxZ: GARDEN_PATH_RECTS[0].minZ,
    },
    {
      minX: GARDEN_PATH_RECTS[1].minX,
      maxX: GARDEN_PATH_RECTS[1].maxX,
      minZ: GARDEN_PATH_RECTS[0].maxZ,
      maxZ: GARDEN_PATH_RECTS[1].maxZ,
    },
  ];
  for (const rectangle of rectangles) {
    addBox(group, 'garden-pool-path', rectangle, 0.345, 0.405, material, 194, 276);
  }
}

function addPartitionedRim(group: THREE.Group, material: THREE.Material): void {
  const xs = [182.1, 183, 192.3, 195.7, 205, 205.9];
  const zs = [267.6, 268.5, 274.3, 275.5, 276.4];
  for (let ix = 0; ix < xs.length - 1; ix += 1) {
    for (let iz = 0; iz < zs.length - 1; iz += 1) {
      const rect = { minX: xs[ix], maxX: xs[ix + 1], minZ: zs[iz], maxZ: zs[iz + 1] };
      const x = (rect.minX + rect.maxX) / 2;
      const z = (rect.minZ + rect.maxZ) / 2;
      if (contains(GARDEN_POOL_INNER, x, z)) continue;
      const underPath = GARDEN_PATH_RECTS.some((path) => contains(path, x, z));
      addBox(
        group,
        underPath ? 'garden-pool-rim-under-path' : 'garden-pool-rim',
        rect,
        0.305,
        underPath ? 0.345 : 0.405,
        material,
      );
    }
  }
}

/**
 * Builds world-coordinate garden ground and a shallow reflecting pool. Materials
 * are borrowed; every returned geometry and buffer is owned by the group.
 */
export function createTaijiGardenPool(materials: TaijiGardenPoolMaterials): THREE.Group {
  const group = new THREE.Group();
  group.name = 'taiji-garden-pool';

  addEarthAroundPool(group, materials.earth);
  addBox(group, 'garden-pool-bed', GARDEN_POOL_INNER, 0.305, 0.315, materials.earth);
  addPartitionedRim(group, materials.stone);
  addCrossPaths(group, materials.stone);

  const waterGeometry = new THREE.PlaneGeometry(
    GARDEN_POOL_INNER.maxX - GARDEN_POOL_INNER.minX,
    GARDEN_POOL_INNER.maxZ - GARDEN_POOL_INNER.minZ,
  );
  waterGeometry.rotateX(-Math.PI / 2);
  waterGeometry.translate(194, 0.335, 272);
  const water = new THREE.Mesh(waterGeometry, materials.water);
  water.name = 'garden-pool-water';
  water.castShadow = false;
  water.receiveShadow = true;
  group.add(water);

  return group;
}
