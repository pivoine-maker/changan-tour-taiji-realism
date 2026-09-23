import { createWardWallSegments, WEST_MARKET_BOUNDS as MARKET_CORE } from './cityLayout';
import type { DiscoveryId } from './discoveries';
import { changanCity } from './changanCity';
import {
  imperialAvenues,
  imperialDetails,
  imperialPrecincts,
  imperialWalls,
  type ImperialPrecinct
} from './imperialCity';

export interface Point2 {
  x: number;
  z: number;
}

export interface RoadNode extends Point2 {
  id: string;
}

export interface RoadEdge {
  from: string;
  to: string;
}

export interface Landmark {
  discoveryId: DiscoveryId;
  position: Point2;
  triggerRadius: number;
}

export interface BuildingBlock extends Point2 {
  width: number;
  depth: number;
  height: number;
  tone: 'clay' | 'umber' | 'sand' | 'dark';
  roof: 'hip' | 'flat' | 'tower';
  rotation?: number;
}

export interface WallSegment extends Point2 {
  width: number;
  depth: number;
  height: number;
}

export interface DetailAnchor extends Point2 {
  kind: 'stall' | 'cargo' | 'person' | 'tree' | 'cart' | 'camel' | 'banner';
  rotation?: number;
  variant: number;
}

export interface CityDistrict {
  id: string;
  label: string;
  bounds: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  };
  buildings: BuildingBlock[];
  walls: WallSegment[];
  detailAnchors: DetailAnchor[];
}

export interface Avenue extends Point2 {
  id: string;
  label: string;
  orientation: 'north-south' | 'east-west';
  width: number;
  depth: number;
}

export interface WorldModel {
  bounds: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  };
  roadNodes: RoadNode[];
  roadEdges: RoadEdge[];
  landmarks: Landmark[];
  buildings: BuildingBlock[];
  walls: WallSegment[];
  detailAnchors: DetailAnchor[];
  districts: CityDistrict[];
  avenues: Avenue[];
  imperialPrecincts: ImperialPrecinct[];
}

export function getWorldCenter(bounds: WorldModel['bounds']): Point2 {
  return {
    x: (bounds.minX + bounds.maxX) / 2,
    z: (bounds.minZ + bounds.maxZ) / 2
  };
}

const fullCityColumns = changanCity.roadXs;
const fullCityRows = changanCity.roadZs;
const horizontalNodes = [-78, -62, -46, -34, -20, 0, 20, 34, 46, 62, 78, 94, 110, 126, 142, 158, 174, 194];
const cityRows = [-64, -48, -32, -24, -12, 0, 12, 24, 32, 48, 64];
const imperialColumns = [142, 158, 174, 194, 214, 230, 246];
const imperialRows = [80, 96, 112, 128, 144, 156, 172, 188, 204, 220, 236, 252, 268, 276];
const blockedImperialNodes = new Set(['n-194-204', 'n-194-236', 'n-194-252']);

const roadNodes: RoadNode[] = dedupeRoadNodes([
  ...fullCityRows.flatMap((z) => fullCityColumns.map((x) => ({ id: `n-${x}-${z}`, x, z }))),
  ...cityRows.flatMap((z) => horizontalNodes.map((x) => ({ id: `n-${x}-${z}`, x, z }))),
  ...imperialRows.flatMap((z) => imperialColumns
    .map((x) => ({ id: `n-${x}-${z}`, x, z }))
    .filter((node) => !blockedImperialNodes.has(node.id)))
]);

const roadEdges: RoadEdge[] = [];

for (const z of fullCityRows) {
  for (let column = 0; column < fullCityColumns.length - 1; column += 1) {
    const midpointX = (fullCityColumns[column] + fullCityColumns[column + 1]) / 2;
    if (z >= 156 && midpointX >= 138 && midpointX <= 250) {
      continue;
    }
    roadEdges.push({
      from: `n-${fullCityColumns[column]}-${z}`,
      to: `n-${fullCityColumns[column + 1]}-${z}`
    });
  }
}

for (const x of fullCityColumns) {
  for (let row = 0; row < fullCityRows.length - 1; row += 1) {
    const midpointZ = (fullCityRows[row] + fullCityRows[row + 1]) / 2;
    if (x >= 138 && x <= 250 && midpointZ >= 156) {
      continue;
    }
    roadEdges.push({
      from: `n-${x}-${fullCityRows[row]}`,
      to: `n-${x}-${fullCityRows[row + 1]}`
    });
  }
}

for (const z of cityRows) {
  for (let column = 0; column < horizontalNodes.length - 1; column += 1) {
    roadEdges.push({
      from: `n-${horizontalNodes[column]}-${z}`,
      to: `n-${horizontalNodes[column + 1]}-${z}`
    });
  }
}

for (const x of horizontalNodes) {
  for (let row = 0; row < cityRows.length - 1; row += 1) {
    roadEdges.push({
      from: `n-${x}-${cityRows[row]}`,
      to: `n-${x}-${cityRows[row + 1]}`
    });
  }
}


for (const z of imperialRows) {
  for (let column = 0; column < imperialColumns.length - 1; column += 1) {
    const from = `n-${imperialColumns[column]}-${z}`;
    const to = `n-${imperialColumns[column + 1]}-${z}`;
    if (!blockedImperialNodes.has(from) && !blockedImperialNodes.has(to)) {
      roadEdges.push({ from, to });
    }
  }
}

for (const x of imperialColumns) {
  for (let row = 0; row < imperialRows.length - 1; row += 1) {
    const from = `n-${x}-${imperialRows[row]}`;
    const to = `n-${x}-${imperialRows[row + 1]}`;
    if (!blockedImperialNodes.has(from) && !blockedImperialNodes.has(to)) {
      roadEdges.push({ from, to });
    }
  }
}

roadEdges.push({ from: 'n-194-60', to: 'n-194-80' });
roadEdges.push({ from: 'n-194-64', to: 'n-194-80' });
roadEdges.push({ from: 'n-194-64', to: 'n-194-60' });
roadEdges.push({ from: 'n-194--64', to: 'n-194--52' });
roadEdges.push({ from: 'n--78--64', to: 'n--66--52' });

function dedupeRoadNodes(nodes: RoadNode[]): RoadNode[] {
  return Array.from(new Map(nodes.map((node) => [node.id, node])).values());
}

const marketBuildings: BuildingBlock[] = [
  { x: -27, z: -18, width: 8, depth: 6, height: 3.8, tone: 'umber', roof: 'hip' },
  { x: -27, z: -8, width: 9, depth: 5, height: 3.3, tone: 'clay', roof: 'hip' },
  { x: -27, z: 8, width: 9, depth: 5, height: 3.7, tone: 'clay', roof: 'hip' },
  { x: -27, z: 18, width: 8, depth: 6, height: 3.2, tone: 'sand', roof: 'flat' },
  { x: -11, z: -19, width: 11, depth: 6, height: 4.4, tone: 'dark', roof: 'hip' },
  { x: -11, z: -8, width: 10, depth: 5, height: 3.4, tone: 'clay', roof: 'hip' },
  { x: -11, z: 8, width: 10, depth: 5, height: 4.1, tone: 'umber', roof: 'hip' },
  { x: -11, z: 19, width: 11, depth: 6, height: 3.3, tone: 'sand', roof: 'flat' },
  { x: 10, z: -19, width: 11, depth: 6, height: 4.8, tone: 'clay', roof: 'tower' },
  { x: 10, z: -8, width: 11, depth: 5, height: 3.5, tone: 'umber', roof: 'hip' },
  { x: 10, z: 8, width: 11, depth: 5, height: 3.6, tone: 'clay', roof: 'hip' },
  { x: 10, z: 19, width: 11, depth: 6, height: 3.3, tone: 'sand', roof: 'flat' },
  { x: 27, z: -19, width: 9, depth: 6, height: 3.5, tone: 'umber', roof: 'hip' },
  { x: 27, z: -8, width: 9, depth: 5, height: 3.2, tone: 'sand', roof: 'flat' },
  { x: 27, z: 8, width: 9, depth: 5, height: 3.8, tone: 'clay', roof: 'hip' },
  { x: 27, z: 19, width: 9, depth: 6, height: 3.4, tone: 'umber', roof: 'hip' }
];

const marketWalls: WallSegment[] = [
  { x: 0, z: -30, width: 76, depth: 1.2, height: 2.4 },
  { x: 0, z: 30, width: 76, depth: 1.2, height: 2.4 },
  { x: -39, z: -17, width: 1.2, depth: 24, height: 2.4 },
  { x: -39, z: 17, width: 1.2, depth: 24, height: 2.4 },
  { x: 39, z: -17, width: 1.2, depth: 24, height: 2.4 },
  { x: 39, z: 17, width: 1.2, depth: 24, height: 2.4 },
  { x: 31, z: 27.5, width: 13, depth: 1, height: 2.8 }
];

const marketDetails: DetailAnchor[] = [
  { kind: 'stall', x: -27, z: -3, rotation: 0, variant: 0 },
  { kind: 'stall', x: -25, z: 3, rotation: Math.PI, variant: 1 },
  { kind: 'stall', x: -11, z: 2.7, rotation: Math.PI, variant: 2 },
  { kind: 'stall', x: 9, z: 2.8, rotation: Math.PI, variant: 3 },
  { kind: 'stall', x: 27, z: 2.8, rotation: Math.PI, variant: 4 },
  { kind: 'stall', x: 24.5, z: -2.8, rotation: 0, variant: 5 },
  { kind: 'stall', x: 8.5, z: -2.8, rotation: 0, variant: 6 },
  { kind: 'cargo', x: -32, z: -6.3, variant: 0 },
  { kind: 'cargo', x: -20.5, z: 7.3, variant: 1 },
  { kind: 'cargo', x: -4.5, z: -7.2, variant: 2 },
  { kind: 'cargo', x: 4.5, z: 7.1, variant: 3 },
  { kind: 'cargo', x: 20.5, z: -7.2, variant: 4 },
  { kind: 'cargo', x: 32, z: 7.1, variant: 5 },
  { kind: 'cart', x: -33, z: 8.2, rotation: Math.PI * 0.08, variant: 0 },
  { kind: 'camel', x: -34, z: 13.5, rotation: -0.25, variant: 0 },
  ...createPeopleAlongStreet(-33, 29, [-3, 3], 0),
  ...createTreeLine([-34, -17, 2, 34], [-25, 25], 30),
  ...createBanners([-36, -20, 0, 20, 35], [-5.5, 5.5], 60)
];

const districts: CityDistrict[] = [
  createDistrict('northwest', '怀远坊北片', -82, -6, 6, 68, 0),
  createDistrict('northeast', '群贤坊北片', 6, 82, 6, 68, 1),
  createDistrict('southwest', '怀远坊南片', -82, -6, -68, -6, 2),
  createDistrict('southeast', '群贤坊南片', 6, 82, -68, -6, 3),
  createDistrict('east-corridor-northwest', '东向街廊北一坊', 84, 136, 6, 68, 4),
  createDistrict('east-corridor-northeast', '朱雀大街西北坊', 138, 188, 6, 68, 5),
  createDistrict('east-corridor-southwest', '东向街廊南一坊', 84, 136, -68, -6, 6),
  createDistrict('east-corridor-southeast', '朱雀大街西南坊', 138, 188, -68, -6, 7)
];

const avenues: Avenue[] = [
  {
    id: 'zhuque-avenue',
    label: '朱雀大街',
    orientation: 'north-south',
    x: 194,
    z: 0,
    width: 18,
    depth: 136
  },
  ...imperialAvenues
];

const avenueDetails: DetailAnchor[] = [
  ...createTreeLine([186, 202], [-56, -40, -24, -8, 8, 24, 40, 56], 220),
  ...createBanners([184, 204], [-48, -24, 0, 24, 48], 260),
  ...createPeopleAlongStreet(184, 204, [-54, -36, -18, 0, 18, 36, 54], 300),
  { kind: 'cart', x: 190, z: -38, rotation: Math.PI / 2, variant: 310 },
  { kind: 'cart', x: 198, z: 36, rotation: -Math.PI / 2, variant: 311 },
  { kind: 'camel', x: 186, z: 12, rotation: Math.PI / 2, variant: 312 }
];

const districtBuildings = districts.flatMap((district) => district.buildings);
const districtWalls = districts.flatMap((district) => district.walls);
const districtDetails = districts.flatMap((district) => district.detailAnchors);

export const westMarketWorld: WorldModel = {
  bounds: changanCity.bounds,
  roadNodes,
  roadEdges,
  buildings: [...marketBuildings, ...districtBuildings],
  walls: [...changanCity.outerWalls, ...marketWalls, ...districtWalls, ...imperialWalls],
  detailAnchors: [...marketDetails, ...districtDetails, ...avenueDetails, ...imperialDetails],
  districts,
  avenues,
  imperialPrecincts,
  landmarks: [
    { discoveryId: 'west-gate', position: { x: -36, z: 0 }, triggerRadius: 5.5 },
    { discoveryId: 'market-office', position: { x: -11, z: -18 }, triggerRadius: 5 },
    { discoveryId: 'sogdian-inn', position: { x: -11, z: 8 }, triggerRadius: 5 },
    { discoveryId: 'temple-quarter', position: { x: 10, z: -19 }, triggerRadius: 5 },
    { discoveryId: 'ward-gate', position: { x: 34, z: 24 }, triggerRadius: 5 },
    { discoveryId: 'zhuque-gate', position: { x: 194, z: 80 }, triggerRadius: 7 },
    { discoveryId: 'imperial-offices', position: { x: 158, z: 122 }, triggerRadius: 7 },
    { discoveryId: 'chengtian-gate', position: { x: 194, z: 164 }, triggerRadius: 7 },
    { discoveryId: 'taiji-hall', position: { x: 194, z: 196 }, triggerRadius: 8 },
    { discoveryId: 'inner-palace-garden', position: { x: 194, z: 276 }, triggerRadius: 8 },
    { discoveryId: 'mingde-gate-axis', position: { x: 194, z: -276 }, triggerRadius: 10 },
    { discoveryId: 'city-wall-rampart', position: { x: 174, z: -276 }, triggerRadius: 8 },
    { discoveryId: 'canal-culvert', position: { x: 78, z: -164 }, triggerRadius: 8 },
    { discoveryId: 'well-yard', position: { x: 30, z: -108 }, triggerRadius: 8 },
    { discoveryId: 'east-ward-residence', position: { x: 366, z: 60 }, triggerRadius: 9 },
    { discoveryId: 'roof-tile-kiln-trace', position: { x: 414, z: 116 }, triggerRadius: 9 },
    { discoveryId: 'palace-archive-court', position: { x: 214, z: 252 }, triggerRadius: 8 },
    { discoveryId: 'imperial-service-lane', position: { x: 214, z: 268 }, triggerRadius: 8 }
  ]
};

function createDistrict(
  id: string,
  label: string,
  minX: number,
  maxX: number,
  minZ: number,
  maxZ: number,
  variant: number
): CityDistrict {
  const centerX = (minX + maxX) / 2;
  const centerZ = (minZ + maxZ) / 2;
  const width = maxX - minX;
  const depth = maxZ - minZ;
  const buildings: BuildingBlock[] = [];
  const detailAnchors: DetailAnchor[] = [];
  const tones: BuildingBlock['tone'][] = ['clay', 'umber', 'sand', 'dark'];
  const roofs: BuildingBlock['roof'][] = ['hip', 'hip', 'flat', 'tower'];

  for (let row = 0; row < 3; row += 1) {
    for (let column = 0; column < 4; column += 1) {
      const x = minX + 11 + column * (width - 22) / 3;
      const z = minZ + 10 + row * (depth - 20) / 2;
      const index = row * 4 + column + variant;
      buildings.push({
        x,
        z,
        width: 8 + (index % 3) * 1.3,
        depth: 5.8 + (index % 2) * 1.1,
        height: 3.1 + (index % 4) * 0.35,
        tone: tones[index % tones.length],
        roof: roofs[index % roofs.length],
        rotation: (index % 2) * Math.PI
      });
      detailAnchors.push({ kind: index % 3 === 0 ? 'cargo' : 'person', x: x + 5.2, z: z - 3.8, rotation: index * 0.4, variant: index });
    }
  }

  detailAnchors.push(...createTreeLine([minX + 7, centerX, maxX - 7], [minZ + 7, maxZ - 7], variant * 20));
  detailAnchors.push(...createBanners([minX + 12, centerX, maxX - 12], [centerZ], variant * 30));
  detailAnchors.push({ kind: 'cart', x: centerX - 12, z: centerZ, rotation: variant * 0.55, variant });
  detailAnchors.push({ kind: 'stall', x: centerX + 12, z: centerZ, rotation: Math.PI * (variant % 2), variant });
  detailAnchors.push({ kind: 'person', x: centerX, z: centerZ + 7, rotation: 0.4, variant: variant + 40 });

  return {
    id,
    label,
    bounds: { minX, maxX, minZ, maxZ },
    buildings: buildings.filter((building) => !intersectsMarketCore(building)),
    walls: createWardWallSegments({ minX, maxX, minZ, maxZ })
      .map((wall) => ({ ...wall, height: 2.1, ...(wall.width > wall.depth ? { depth: 1.1 } : { width: 1.1 }) }))
      .flatMap(clipWallOutsideMarket),
    detailAnchors
  };
}

function createPeopleAlongStreet(
  minX: number,
  maxX: number,
  rows: number[],
  variantOffset: number
): DetailAnchor[] {
  const anchors: DetailAnchor[] = [];
  const count = 9;
  for (let index = 0; index < count; index += 1) {
    const x = minX + (maxX - minX) * index / (count - 1);
    anchors.push({ kind: 'person', x, z: rows[index % rows.length], rotation: index * 0.55, variant: variantOffset + index });
  }
  return anchors;
}

function createTreeLine(xs: number[], zs: number[], variantOffset: number): DetailAnchor[] {
  const anchors: DetailAnchor[] = [];
  let variant = variantOffset;
  for (const x of xs) {
    for (const z of zs) {
      anchors.push({ kind: 'tree', x, z, variant });
      variant += 1;
    }
  }
  return anchors;
}

function createBanners(xs: number[], zs: number[], variantOffset: number): DetailAnchor[] {
  const anchors: DetailAnchor[] = [];
  let variant = variantOffset;
  for (const x of xs) {
    for (const z of zs) {
      anchors.push({ kind: 'banner', x, z, rotation: z > 0 ? Math.PI : 0, variant });
      variant += 1;
    }
  }
  return anchors;
}


// The established market owns its entire walled footprint, including door approaches.

function intersectsMarketCore(rect: { x: number; z: number; width: number; depth: number }): boolean {
  return rect.x - rect.width / 2 < MARKET_CORE.maxX && rect.x + rect.width / 2 > MARKET_CORE.minX
    && rect.z - rect.depth / 2 < MARKET_CORE.maxZ && rect.z + rect.depth / 2 > MARKET_CORE.minZ;
}
function clipWallOutsideMarket(wall: WallSegment): WallSegment[] {
  if (!intersectsMarketCore(wall)) return [wall];
  if (wall.width > wall.depth) {
    return [[wall.x - wall.width / 2, Math.min(wall.x + wall.width / 2, MARKET_CORE.minX)],
      [Math.max(wall.x - wall.width / 2, MARKET_CORE.maxX), wall.x + wall.width / 2]]
      .filter(([a, b]) => b > a).map(([a, b]) => ({ ...wall, x: (a + b) / 2, width: b - a }));
  }
  return [[wall.z - wall.depth / 2, Math.min(wall.z + wall.depth / 2, MARKET_CORE.minZ)],
    [Math.max(wall.z - wall.depth / 2, MARKET_CORE.maxZ), wall.z + wall.depth / 2]]
    .filter(([a, b]) => b > a).map(([a, b]) => ({ ...wall, z: (a + b) / 2, depth: b - a }));
}
