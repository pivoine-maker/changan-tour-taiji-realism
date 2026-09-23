import type { Avenue, BuildingBlock, DetailAnchor, Point2, WallSegment } from './world';

export type ImperialHallRole = 'gate' | 'audience' | 'residential' | 'garden' | 'office';

export interface ImperialHall extends BuildingBlock {
  id: string;
  label: string;
  role: ImperialHallRole;
}

export interface ImperialCourtyard extends Point2 {
  id: string;
  width: number;
  depth: number;
  surface: 'stone' | 'earth' | 'garden' | 'water';
}

export interface ImperialPrecinct {
  id: 'imperial-city-axis' | 'taiji-palace';
  label: string;
  bounds: {
    minX: number;
    maxX: number;
    minZ: number;
    maxZ: number;
  };
  halls: ImperialHall[];
  annexes: ImperialHall[];
  walls: WallSegment[];
  courtyards: ImperialCourtyard[];
  detailAnchors: DetailAnchor[];
}

export const imperialAvenues: Avenue[] = [
  {
    id: 'imperial-axis',
    label: '皇城中轴',
    orientation: 'north-south',
    x: 194,
    z: 112,
    width: 24,
    depth: 88
  },
  {
    id: 'palace-axis',
    label: '太极宫中轴',
    orientation: 'north-south',
    x: 194,
    z: 224,
    width: 18,
    depth: 136
  }
];

const imperialCityAxis: ImperialPrecinct = {
  id: 'imperial-city-axis',
  label: '皇城中轴',
  bounds: { minX: 138, maxX: 250, minZ: 68, maxZ: 156 },
  halls: [
    createHall('zhuque-gate', '朱雀门', 'gate', 194, 80, 34, 10, 7.6, 'tower'),
    createHall('west-chancellery', '尚书省西署', 'office', 158, 108, 22, 10, 5.4, 'hip'),
    createHall('east-chancellery', '尚书省东署', 'office', 230, 108, 22, 10, 5.4, 'hip'),
    createHall('west-ministry', '皇城西官署', 'office', 158, 136, 24, 10, 5, 'hip'),
    createHall('east-ministry', '皇城东官署', 'office', 230, 136, 24, 10, 5, 'hip')
  ],
  annexes: [
    createHall('west-office-annex-south', '西官署南廊', 'office', 146, 122, 8, 34, 4.2, 'hip', Math.PI / 2),
    createHall('west-office-annex-north', '西官署北廊', 'office', 170, 122, 8, 34, 4.2, 'hip', Math.PI / 2),
    createHall('east-office-annex-south', '东官署南廊', 'office', 218, 122, 8, 34, 4.2, 'hip', Math.PI / 2),
    createHall('east-office-annex-north', '东官署北廊', 'office', 242, 122, 8, 34, 4.2, 'hip', Math.PI / 2)
  ],
  walls: [
    { x: 158, z: 68, width: 40, depth: 1.6, height: 4.4 },
    { x: 230, z: 68, width: 40, depth: 1.6, height: 4.4 },
    { x: 138, z: 112, width: 1.6, depth: 88, height: 4.4 },
    { x: 250, z: 112, width: 1.6, depth: 88, height: 4.4 },
    { x: 158, z: 156, width: 40, depth: 1.6, height: 4.8 },
    { x: 230, z: 156, width: 40, depth: 1.6, height: 4.8 }
  ],
  courtyards: [
    { id: 'zhuque-gate-forecourt', x: 194, z: 78, width: 54, depth: 18, surface: 'stone' },
    { id: 'imperial-processional-way', x: 194, z: 118, width: 28, depth: 62, surface: 'stone' },
    { id: 'west-offices-court', x: 158, z: 122, width: 28, depth: 56, surface: 'earth' },
    { id: 'east-offices-court', x: 230, z: 122, width: 28, depth: 56, surface: 'earth' }
  ],
  detailAnchors: [
    ...createCeremonialPeople([186, 202], [76, 88, 100, 112, 124, 136, 148], 400),
    ...createBanners([180, 208], [76, 92, 108, 124, 140, 150], 440),
    ...createTrees([144, 176, 212, 244], [92, 120, 148], 470)
  ]
};

const taijiPalace: ImperialPrecinct = {
  id: 'taiji-palace',
  label: '太极宫',
  bounds: { minX: 138, maxX: 250, minZ: 156, maxZ: 288 },
  halls: [
    createHall('chengtian-gate', '承天门', 'gate', 194, 164, 40, 11, 8.6, 'tower'),
    createHall('taiji-hall', '太极殿', 'audience', 194, 208, 38, 16, 9.2, 'tower'),
    createHall('liangyi-hall', '两仪殿', 'residential', 194, 248, 30, 13, 7.2, 'hip'),
    createHall('inner-court-garden', '内廷园林正殿', 'garden', 194, 286, 18, 9, 5.8, 'tower')
  ],
  annexes: [
    createHall('front-court-west-gallery', '前朝西廊', 'office', 150, 190, 9, 46, 4.7, 'hip', Math.PI / 2),
    createHall('front-court-east-gallery', '前朝东廊', 'office', 238, 190, 9, 46, 4.7, 'hip', Math.PI / 2),
    createHall('taiji-west-wing', '太极殿西翼', 'office', 158, 218, 20, 9, 5.2, 'hip'),
    createHall('taiji-east-wing', '太极殿东翼', 'office', 230, 218, 20, 9, 5.2, 'hip'),
    createHall('liangyi-west-wing', '两仪殿西翼', 'residential', 158, 252, 18, 9, 4.9, 'hip'),
    createHall('liangyi-east-wing', '两仪殿东翼', 'residential', 230, 252, 18, 9, 4.9, 'hip'),
    createHall('garden-west-pavilion', '内廷西亭', 'garden', 158, 278, 12, 8, 4.8, 'tower'),
    createHall('garden-east-pavilion', '内廷东亭', 'garden', 230, 278, 12, 8, 4.8, 'tower')
  ],
  walls: [
    { x: 158, z: 156, width: 40, depth: 1.8, height: 5.2 },
    { x: 230, z: 156, width: 40, depth: 1.8, height: 5.2 },
    { x: 138, z: 222, width: 1.8, depth: 132, height: 5.2 },
    { x: 250, z: 222, width: 1.8, depth: 132, height: 5.2 },
    { x: 158, z: 288, width: 40, depth: 1.8, height: 5.2 },
    { x: 230, z: 288, width: 40, depth: 1.8, height: 5.2 },
    { x: 160, z: 230, width: 42, depth: 1.3, height: 3.6 },
    { x: 228, z: 230, width: 42, depth: 1.3, height: 3.6 },
    { x: 160, z: 262, width: 42, depth: 1.3, height: 3.4 },
    { x: 228, z: 262, width: 42, depth: 1.3, height: 3.4 }
  ],
  courtyards: [
    { id: 'chengtian-forecourt', x: 194, z: 178, width: 82, depth: 30, surface: 'stone' },
    { id: 'taiji-great-court', x: 194, z: 204, width: 84, depth: 34, surface: 'stone' },
    { id: 'liangyi-court', x: 194, z: 244, width: 74, depth: 24, surface: 'earth' },
    { id: 'inner-garden', x: 194, z: 276, width: 80, depth: 22, surface: 'garden' },
    { id: 'inner-garden-pool', x: 194, z: 272, width: 22, depth: 7, surface: 'water' }
  ],
  detailAnchors: [
    ...createCeremonialPeople([180, 188, 200, 208], [174, 188, 202, 220, 240], 520),
    ...createBanners([146, 176, 212, 242], [164, 196, 228, 254], 570),
    ...createTrees([148, 158, 230, 240], [236, 268, 282], 620),
    { kind: 'tree', x: 178, z: 276, variant: 650 },
    { kind: 'tree', x: 210, z: 276, variant: 651 },
    { kind: 'person', x: 194, z: 272, rotation: Math.PI, variant: 652 },
    { kind: 'person', x: 184, z: 258, rotation: 0.3, variant: 653 },
    { kind: 'person', x: 204, z: 258, rotation: -0.3, variant: 654 }
  ]
};

export const imperialPrecincts: ImperialPrecinct[] = [imperialCityAxis, taijiPalace];
export const imperialWalls = imperialPrecincts.flatMap((precinct) => precinct.walls);
export const imperialDetails = imperialPrecincts.flatMap((precinct) => precinct.detailAnchors);

function createHall(
  id: string,
  label: string,
  role: ImperialHallRole,
  x: number,
  z: number,
  width: number,
  depth: number,
  height: number,
  roof: BuildingBlock['roof'],
  rotation = 0
): ImperialHall {
  return { id, label, role, x, z, width, depth, height, tone: role === 'office' ? 'umber' : 'clay', roof, rotation };
}

function createCeremonialPeople(xs: number[], zs: number[], variantOffset: number): DetailAnchor[] {
  const anchors: DetailAnchor[] = [];
  let variant = variantOffset;
  for (const z of zs) {
    for (const x of xs) {
      anchors.push({ kind: 'person', x, z, rotation: z % 2 === 0 ? 0 : Math.PI, variant });
      variant += 1;
    }
  }
  return anchors;
}

function createBanners(xs: number[], zs: number[], variantOffset: number): DetailAnchor[] {
  const anchors: DetailAnchor[] = [];
  let variant = variantOffset;
  for (const z of zs) {
    for (const x of xs) {
      anchors.push({ kind: 'banner', x, z, rotation: x < 194 ? 0 : Math.PI, variant });
      variant += 1;
    }
  }
  return anchors;
}

function createTrees(xs: number[], zs: number[], variantOffset: number): DetailAnchor[] {
  const anchors: DetailAnchor[] = [];
  let variant = variantOffset;
  for (const z of zs) {
    for (const x of xs) {
      anchors.push({ kind: 'tree', x, z, variant });
      variant += 1;
    }
  }
  return anchors;
}
