import type { BuildingBlock, WallSegment } from './world';

export interface CityBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

export const WEST_MARKET_BOUNDS: CityBounds = { minX: -40, maxX: 40, minZ: -31, maxZ: 31 };

/** Bespoke models and the full-width ceremonial avenue own these footprints. */
export const RESERVED_CITY_REGIONS: readonly { id: string; bounds: CityBounds }[] = [
  { id: 'western-districts', bounds: { minX: -84, maxX: 188, minZ: -68, maxZ: 68 } },
  { id: 'imperial-precincts', bounds: { minX: 138, maxX: 250, minZ: 68, maxZ: 288 } },
  // FullCityAssets draws the 18m Zhuque avenue around x194 for the entire city.
  // Keep the existing setback; narrow remnants cannot house a six metre cross.
  { id: 'zhuque-avenue', bounds: { minX: 185, maxX: 203, minZ: -292, maxZ: 292 } }
];

export const WARD_GATE_WIDTH = 6;
export const WARD_WALL_HEIGHT = 1.15;
export const WARD_WALL_DEPTH = 0.72;

export function overlapsReservedRegion(bounds: CityBounds): boolean {
  return RESERVED_CITY_REGIONS.some(({ bounds: area }) => bounds.minX < area.maxX
    && bounds.maxX > area.minX && bounds.minZ < area.maxZ && bounds.maxZ > area.minZ);
}

/** Keep the usable remainder of a road cell rather than discard the whole cell.
 * The 3.2m setback also leaves room to walk between new and bespoke boundary walls.
 * Order is deterministic so clipped part suffixes remain stable.
 */
export function subtractReservedRegions(bounds: CityBounds, setback = 3.2): CityBounds[] {
  let plots = [{ ...bounds }];
  for (const region of RESERVED_CITY_REGIONS) {
    const cut = {
      minX: region.bounds.minX - setback, maxX: region.bounds.maxX + setback,
      minZ: region.bounds.minZ - setback, maxZ: region.bounds.maxZ + setback
    };
    plots = plots.flatMap((plot) => subtractRectangle(plot, cut));
  }
  return plots;
}

function subtractRectangle(plot: CityBounds, cut: CityBounds): CityBounds[] {
  const minX = Math.max(plot.minX, cut.minX), maxX = Math.min(plot.maxX, cut.maxX);
  const minZ = Math.max(plot.minZ, cut.minZ), maxZ = Math.min(plot.maxZ, cut.maxZ);
  if (minX >= maxX || minZ >= maxZ) return [plot];
  return [
    { minX: plot.minX, maxX: plot.maxX, minZ: plot.minZ, maxZ: minZ },
    { minX: plot.minX, maxX: plot.maxX, minZ: maxZ, maxZ: plot.maxZ },
    { minX: plot.minX, maxX: minX, minZ, maxZ },
    { minX: maxX, maxX: plot.maxX, minZ, maxZ }
  ].filter((part) => part.maxX > part.minX && part.maxZ > part.minZ);
}

/** Four actual passages, aligned with the two inner walking lanes. */
export function createWardWallSegments(bounds: CityBounds): WallSegment[] {
  const cx = (bounds.minX + bounds.maxX) / 2;
  const cz = (bounds.minZ + bounds.maxZ) / 2;
  return [
    ...splitHorizontal(bounds.minX, bounds.maxX, bounds.minZ, cx, WARD_GATE_WIDTH, WARD_WALL_DEPTH, WARD_WALL_HEIGHT),
    ...splitHorizontal(bounds.minX, bounds.maxX, bounds.maxZ, cx, WARD_GATE_WIDTH, WARD_WALL_DEPTH, WARD_WALL_HEIGHT),
    ...splitVertical(bounds.minZ, bounds.maxZ, bounds.minX, cz, WARD_GATE_WIDTH, WARD_WALL_DEPTH, WARD_WALL_HEIGHT),
    ...splitVertical(bounds.minZ, bounds.maxZ, bounds.maxX, cz, WARD_GATE_WIDTH, WARD_WALL_DEPTH, WARD_WALL_HEIGHT)
  ];
}

/** Existing outer gates: north/south on the central axis, west/east at z=-36. */
export function createOuterWallSegments(bounds: CityBounds): WallSegment[] {
  const axis = (bounds.minX + bounds.maxX) / 2;
  return [
    ...splitHorizontal(bounds.minX, bounds.maxX, bounds.minZ, axis, 14, 2.4, 5.8),
    ...splitHorizontal(bounds.minX, bounds.maxX, bounds.maxZ, axis, 14, 2.4, 5.8),
    ...splitVertical(bounds.minZ, bounds.maxZ, bounds.minX, -36, 10, 2.4, 5.8),
    ...splitVertical(bounds.minZ, bounds.maxZ, bounds.maxX, -36, 10, 2.4, 5.8)
  ];
}

/** Solid gate wings in world axes. Gate rotations in the model are right angles. */
export function createGatePassageSegments(gate: BuildingBlock, openingWidth = Math.min(14, gate.width * 0.6)): WallSegment[] {
  const opening = Math.min(gate.width, Math.max(4.8, openingWidth));
  const wing = (gate.width - opening) / 2;
  if (wing <= 0) return [];
  const rotation = gate.rotation ?? 0;
  const c = Math.cos(rotation), s = Math.sin(rotation);
  return [-1, 1].map((side) => {
    const offset = side * (opening / 2 + wing / 2);
    return {
      x: gate.x + c * offset,
      z: gate.z + s * offset,
      width: Math.abs(c) * wing + Math.abs(s) * gate.depth,
      depth: Math.abs(s) * wing + Math.abs(c) * gate.depth,
      height: gate.height
    };
  });
}

function splitHorizontal(min: number, max: number, z: number, gate: number, gap: number, depth: number, height: number): WallSegment[] {
  return [[min, gate - gap / 2], [gate + gap / 2, max]].filter(([a, b]) => b > a)
    .map(([a, b]) => ({ x: (a + b) / 2, z, width: b - a, depth, height }));
}

function splitVertical(min: number, max: number, x: number, gate: number, gap: number, depth: number, height: number): WallSegment[] {
  return splitHorizontal(min, max, x, gate, gap, depth, height)
    .map((segment) => ({ x, z: segment.x, width: depth, depth: segment.width, height }));
}
