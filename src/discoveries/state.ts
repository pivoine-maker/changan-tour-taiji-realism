import type { DiscoveryId } from '../data/discoveries';
import type { Landmark, Point2 } from '../data/world';
import { distance2 } from '../navigation/pathfinding';

const STORAGE_KEY = 'tang-changan-west-market.discoveries.v1';

export interface DiscoveryState {
  getDiscoveredIds: () => DiscoveryId[];
  discover: (id: DiscoveryId) => boolean;
  reset: () => void;
}

export function loadDiscoveredIds(storage: Storage): DiscoveryId[] {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter((value): value is DiscoveryId => typeof value === 'string');
  } catch {
    return [];
  }
}

export function saveDiscoveredIds(storage: Storage, ids: DiscoveryId[]): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(Array.from(new Set(ids))));
}

export function resetDiscoveredIds(storage: Storage): void {
  storage.removeItem(STORAGE_KEY);
}

export function createDiscoveryState(storage: Storage): DiscoveryState {
  const discovered = new Set<DiscoveryId>(loadDiscoveredIds(storage));

  return {
    getDiscoveredIds: () => Array.from(discovered),
    discover: (id: DiscoveryId) => {
      if (discovered.has(id)) {
        return false;
      }

      discovered.add(id);
      saveDiscoveredIds(storage, Array.from(discovered));
      return true;
    },
    reset: () => {
      discovered.clear();
      resetDiscoveredIds(storage);
    }
  };
}

export function findTriggeredDiscovery(point: Point2, landmarks: Landmark[]): Landmark | null {
  for (const landmark of landmarks) {
    if (distance2(point, landmark.position) <= landmark.triggerRadius * landmark.triggerRadius) {
      return landmark;
    }
  }

  return null;
}
