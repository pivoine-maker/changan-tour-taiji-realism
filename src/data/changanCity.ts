import { createOuterWallSegments, subtractReservedRegions } from './cityLayout';
import type { BuildingBlock, Point2, WallSegment } from './world';
import { createWardComposition, type WardCharacter, type WardCourt } from './wardComposition';

export interface CityWard {
  id: string;
  label: string;
  row: number;
  column: number;
  bounds: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  };
  buildings: BuildingBlock[];
  trees: Point2[];
  character?: WardCharacter;
  courts?: WardCourt[];
}

export interface ChanganCityModel {
  bounds: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  };
  roadXs: number[];
  roadZs: number[];
  wards: CityWard[];
  outerWalls: WallSegment[];
  gatehouses: BuildingBlock[];
}

const bounds = { minX: -84, maxX: 472, minZ: -292, maxZ: 292 };
const roadXs = [-66, -18, 30, 78, 126, 174, 194, 222, 270, 318, 366, 414, 454];
const roadZs = [-276, -220, -164, -108, -52, 4, 60, 116, 172, 228, 276];

export const changanCity: ChanganCityModel = {
  bounds,
  roadXs,
  roadZs,
  wards: createWards(),
  outerWalls: createOuterWalls(),
  gatehouses: createGatehouses()
};

function createWards(): CityWard[] {
  const wards: CityWard[] = [];
  for (let row = 0; row < roadZs.length - 1; row += 1) {
    for (let column = 0; column < roadXs.length - 1; column += 1) {
      const minX = roadXs[column] + 3.2;
      const maxX = roadXs[column + 1] - 3.2;
      const minZ = roadZs[row] + 3.2;
      const maxZ = roadZs[row + 1] - 3.2;
      const baseId = `ward-${row + 1}-${column + 1}`;
      const plot = { minX, maxX, minZ, maxZ };
      const parts = subtractReservedRegions(plot);
      const unchanged = parts.length === 1 && parts[0].minX === minX && parts[0].maxX === maxX
        && parts[0].minZ === minZ && parts[0].maxZ === maxZ;
      parts.forEach((part, partIndex) => {
        // Residual plots must hold four real buildings, eaves, and a 6m cross lane.
        // Retain existing narrow full cells; do not invent tiny houses in new slivers.
        if (!unchanged && (part.maxX - part.minX < 16 || part.maxZ - part.minZ < 20)) return;
        const id = unchanged ? baseId : `${baseId}-part-${partIndex + 1}`;
        wards.push({
          id,
          label: `长安坊区 ${row + 1}-${column + 1}${parts.length > 1 ? ` · ${partIndex + 1}` : ''}`,
          row,
          column,
          bounds: part,
          ...createWardComposition(part, row, column)
        });
      });
    }
  }
  return wards;
}

function createOuterWalls(): WallSegment[] {
  return createOuterWallSegments(bounds);
}

function createGatehouses(): BuildingBlock[] {
  return [
    { x: 194, z: bounds.minZ + 5, width: 26, depth: 8, height: 7.5, tone: 'dark', roof: 'tower' },
    { x: 194, z: bounds.maxZ - 5, width: 26, depth: 8, height: 7.5, tone: 'dark', roof: 'tower' },
    { x: bounds.minX + 5, z: -36, width: 22, depth: 8, height: 7.2, tone: 'dark', roof: 'tower', rotation: Math.PI / 2 },
    { x: bounds.maxX - 5, z: -36, width: 22, depth: 8, height: 7.2, tone: 'dark', roof: 'tower', rotation: Math.PI / 2 }
  ];
}
