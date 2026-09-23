import { questChapters, questEntityById, questNpcs, questTreasures } from './quests';
import { westMarketWorld } from './world';
import { distance2, findNearestNode } from '../navigation/pathfinding';

describe('quest content', () => {
  it('defines eight connected chapters with resolvable objectives', () => {
    expect(questChapters).toHaveLength(8);
    expect(questChapters.map((chapter) => chapter.id)).toEqual([
      'market-passage',
      'ward-curfew',
      'zhuque-axis',
      'palace-ritual',
      'southern-gate-survey',
      'canal-waterworks',
      'eastern-ward-life',
      'inner-palace-record'
    ]);

    for (const chapter of questChapters) {
      expect(chapter.objectives.length).toBeGreaterThanOrEqual(2);
      for (const objective of chapter.objectives) {
        expect(questEntityById.has(objective.entityId)).toBe(true);
      }
    }
  });

  it('defines nine historical NPCs and eight collectible treasures', () => {
    expect(questNpcs).toHaveLength(9);
    expect(questTreasures).toHaveLength(8);

    for (const npc of questNpcs) {
      expect(npc.dialogue.length).toBeGreaterThanOrEqual(2);
      expect(npc.knowledge.confirmed.length).toBeGreaterThan(20);
      expect(npc.knowledge.interpretation.length).toBeGreaterThan(20);
      expect(npc.knowledge.uncertain.length).toBeGreaterThan(20);
    }
  });

  it('adds new route guides across south gates, waterworks, eastern wards, and inner palace records', () => {
    expect(questNpcs.map((npc) => npc.id)).toEqual(expect.arrayContaining([
      'npc-city-gate-guard',
      'npc-waterworks-clerk',
      'npc-eastern-ward-scribe',
      'npc-palace-archivist'
    ]));
    expect(questTreasures.map((treasure) => treasure.id)).toEqual(expect.arrayContaining([
      'treasure-gate-tally',
      'treasure-canal-rubbing',
      'treasure-ward-ledger',
      'treasure-archive-slip'
    ]));
  });

  it('places the first NPC in the open west gate approach', () => {
    expect(questNpcs[0]).toMatchObject({
      id: 'npc-sogdian-merchant',
      x: -46,
      z: 0
    });
  });

  it('keeps every quest entity within interaction range of the road graph', () => {
    for (const entity of questEntityById.values()) {
      const nearest = findNearestNode(entity, westMarketWorld.roadNodes);
      expect(nearest).not.toBeNull();
      expect(distance2(entity, nearest!), entity.name).toBeLessThanOrEqual(entity.triggerRadius ** 2);
    }
  });
});
