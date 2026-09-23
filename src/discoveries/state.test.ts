import { westMarketWorld } from '../data/world';
import {
  createDiscoveryState,
  findTriggeredDiscovery,
  loadDiscoveredIds,
  resetDiscoveredIds,
  saveDiscoveredIds
} from './state';

describe('discovery state', () => {
  let storage: Storage;

  beforeEach(() => {
    storage = createMemoryStorage();
  });

  it('starts with no discoveries', () => {
    expect(createDiscoveryState(storage).getDiscoveredIds()).toEqual([]);
  });

  it('records a discovery once', () => {
    const state = createDiscoveryState(storage);

    expect(state.discover('west-gate')).toBe(true);
    expect(state.discover('west-gate')).toBe(false);
    expect(state.getDiscoveredIds()).toEqual(['west-gate']);
  });

  it('round-trips discovered ids through localStorage', () => {
    saveDiscoveredIds(storage, ['west-gate', 'ward-gate']);

    expect(loadDiscoveredIds(storage)).toEqual(['west-gate', 'ward-gate']);
  });

  it('clears persisted discoveries', () => {
    saveDiscoveredIds(storage, ['west-gate']);
    resetDiscoveredIds(storage);

    expect(loadDiscoveredIds(storage)).toEqual([]);
  });

  it('detects a landmark inside trigger radius only', () => {
    expect(findTriggeredDiscovery({ x: -36, z: 0 }, westMarketWorld.landmarks)?.discoveryId).toBe(
      'west-gate'
    );
    expect(findTriggeredDiscovery({ x: -36, z: 12 }, westMarketWorld.landmarks)).toBeNull();
  });
});

function createMemoryStorage(): Storage {
  const values = new Map<string, string>();

  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => Array.from(values.keys())[index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value)
  };
}
