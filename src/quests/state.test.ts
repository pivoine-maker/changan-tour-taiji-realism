import { questChapters } from '../data/quests';
import { createQuestState, loadQuestProgress } from './state';

describe('quest state', () => {
  let storage: Storage;

  beforeEach(() => {
    storage = createMemoryStorage();
  });

  it('starts at the first objective of the market chapter', () => {
    const state = createQuestState(storage);

    expect(state.getProgress()).toMatchObject({
      activeChapterId: 'market-passage',
      activeObjectiveIndex: 0,
      completedChapterIds: [],
      treasureIds: [],
      knowledgeIds: []
    });
    expect(state.getCurrentObjective()?.entityId).toBe(questChapters[0].objectives[0].entityId);
  });

  it('unlocks NPC knowledge and advances the active objective', () => {
    const state = createQuestState(storage);
    const result = state.interact('npc-sogdian-merchant');

    expect(result).toMatchObject({ accepted: true, kind: 'npc', unlockedKnowledgeId: 'silk-road-trade' });
    expect(state.getProgress().knowledgeIds).toContain('silk-road-trade');
    expect(state.getProgress().activeObjectiveIndex).toBe(1);
  });

  it('collects a treasure and advances to the next chapter', () => {
    const state = createQuestState(storage);

    state.interact('npc-sogdian-merchant');
    const result = state.interact('treasure-passage-document');

    expect(result).toMatchObject({ accepted: true, kind: 'treasure', collectedTreasureId: 'passage-document' });
    expect(state.getProgress()).toMatchObject({
      activeChapterId: 'ward-curfew',
      activeObjectiveIndex: 0,
      completedChapterIds: ['market-passage'],
      treasureIds: ['passage-document']
    });
    expect(loadQuestProgress(storage).activeChapterId).toBe('ward-curfew');
  });

  it('resumes legacy four-chapter completion at the first new chapter', () => {
    storage.setItem('tang-changan-west-market.quests.v1', JSON.stringify({
      activeChapterId: null,
      activeObjectiveIndex: 0,
      completedChapterIds: ['market-passage', 'ward-curfew', 'zhuque-axis', 'palace-ritual'],
      treasureIds: ['passage-document', 'ward-key', 'zhuque-token', 'palace-standard'],
      knowledgeIds: ['silk-road-trade', 'ward-curfew-order', 'tang-roof-craft', 'zhuque-ritual-traffic', 'taiji-palace-ritual']
    }));

    expect(loadQuestProgress(storage)).toMatchObject({
      activeChapterId: 'southern-gate-survey',
      activeObjectiveIndex: 0
    });
  });

  it('ignores inactive entities and clears all progress on reset', () => {
    const state = createQuestState(storage);

    expect(state.interact('npc-ward-elder')).toMatchObject({ accepted: false });
    state.interact('npc-sogdian-merchant');
    state.reset();

    expect(state.getProgress()).toMatchObject({
      activeChapterId: 'market-passage',
      activeObjectiveIndex: 0,
      completedChapterIds: [],
      treasureIds: [],
      knowledgeIds: []
    });
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
