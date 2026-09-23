import { discoveries, type DiscoveryId } from './discoveries';
import { questNpcs, questTreasures } from './quests';
import type { ImperialHall } from './imperialCity';
import type { Point2, WorldModel } from './world';
import { changanCity } from './changanCity';

export type MapLabelKind = 'district' | 'avenue' | 'palace' | 'gate' | 'npc' | 'treasure' | 'discovery';
export type MapLabelSource = 'world' | 'quest' | 'discovery';

export interface MapLabelSpec extends Point2 {
  id: string;
  label: string;
  kind: MapLabelKind;
  source: MapLabelSource;
  y: number;
  priority: number;
  minDistance: number;
  maxDistance: number;
}

const discoveryKindById = new Map<DiscoveryId, MapLabelKind>([
  ['west-gate', 'gate'],
  ['zhuque-gate', 'gate'],
  ['chengtian-gate', 'gate'],
  ['taiji-hall', 'palace'],
  ['inner-palace-garden', 'palace']
]);

const hallKindByRole = new Map<ImperialHall['role'], MapLabelKind>([
  ['gate', 'gate'],
  ['audience', 'palace'],
  ['residential', 'palace'],
  ['garden', 'palace'],
  ['office', 'palace']
]);

export function createMapLabelSpecs(world: WorldModel): MapLabelSpec[] {
  const landmarkByDiscoveryId = new Map(world.landmarks.map((landmark) => [landmark.discoveryId, landmark]));
  const labels: MapLabelSpec[] = [
    {
      id: 'district-west-market',
      label: '西市',
      kind: 'district',
      source: 'world',
      x: 0,
      y: 5.8,
      z: 0,
      priority: 100,
      minDistance: 0,
      maxDistance: 900
    },
    ...world.districts.map((district): MapLabelSpec => ({
      id: `district-${district.id}`,
      label: district.label,
      kind: 'district',
      source: 'world',
      x: (district.bounds.minX + district.bounds.maxX) / 2,
      y: 4.8,
      z: (district.bounds.minZ + district.bounds.maxZ) / 2,
      priority: 58,
      minDistance: 0,
      maxDistance: 720
    })),
    ...changanCity.wards.map((ward): MapLabelSpec => ({
      id: `city-${ward.id}`,
      label: ward.label,
      kind: 'district',
      source: 'world',
      x: (ward.bounds.minX + ward.bounds.maxX) / 2,
      y: 3.8,
      z: (ward.bounds.minZ + ward.bounds.maxZ) / 2,
      priority: 34,
      minDistance: 120,
      maxDistance: 430
    })),
    ...world.avenues.map((avenue): MapLabelSpec => ({
      id: `avenue-${avenue.id}`,
      label: avenue.label,
      kind: 'avenue',
      source: 'world',
      x: avenue.x,
      y: 2.6,
      z: avenue.z,
      priority: 86,
      minDistance: 0,
      maxDistance: 860
    })),
    ...world.imperialPrecincts.map((precinct): MapLabelSpec => ({
      id: `palace-${precinct.id}`,
      label: precinct.label,
      kind: 'palace',
      source: 'world',
      x: (precinct.bounds.minX + precinct.bounds.maxX) / 2,
      y: 7.6,
      z: (precinct.bounds.minZ + precinct.bounds.maxZ) / 2,
      priority: precinct.id === 'taiji-palace' ? 98 : 82,
      minDistance: 0,
      maxDistance: 900
    })),
    ...world.imperialPrecincts.flatMap((precinct) => [...precinct.halls, ...precinct.annexes]).map((hall): MapLabelSpec => ({
      id: `palace-hall-${hall.id}`,
      label: hall.label,
      kind: hallKindByRole.get(hall.role) ?? 'palace',
      source: 'world',
      x: hall.x,
      y: hall.height + 2.4,
      z: hall.z,
      priority: hall.role === 'gate' || hall.role === 'audience' ? 94 : 68,
      minDistance: 0,
      maxDistance: hall.role === 'office' ? 360 : 620
    })),
    ...questNpcs.map((npc): MapLabelSpec => ({
      id: `npc-${npc.id}`,
      label: npc.name,
      kind: 'npc',
      source: 'quest',
      x: npc.x,
      y: 4.2,
      z: npc.z,
      priority: 88,
      minDistance: 0,
      maxDistance: 260
    })),
    ...questTreasures.map((treasure): MapLabelSpec => ({
      id: treasure.id,
      label: treasure.name,
      kind: 'treasure',
      source: 'quest',
      x: treasure.x,
      y: 3.8,
      z: treasure.z,
      priority: 78,
      minDistance: 0,
      maxDistance: 230
    })),
    ...discoveries.map((discovery): MapLabelSpec => {
      const landmark = landmarkByDiscoveryId.get(discovery.id);
      return {
        id: `discovery-${discovery.id}`,
        label: discovery.title,
        kind: discoveryKindById.get(discovery.id) ?? 'discovery',
        source: 'discovery',
        x: landmark?.position.x ?? 0,
        y: 4.5,
        z: landmark?.position.z ?? 0,
        priority: discoveryKindById.has(discovery.id) ? 92 : 64,
        minDistance: 0,
        maxDistance: discoveryKindById.has(discovery.id) ? 620 : 300
      };
    })
  ];

  return dedupeLabels(labels);
}

function dedupeLabels(labels: MapLabelSpec[]): MapLabelSpec[] {
  const byId = new Map<string, MapLabelSpec>();
  for (const label of labels) {
    byId.set(label.id, label);
  }
  return [...byId.values()];
}
