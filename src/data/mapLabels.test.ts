import { discoveries } from './discoveries';
import { createMapLabelSpecs } from './mapLabels';
import { questNpcs, questTreasures } from './quests';
import { westMarketWorld } from './world';

describe('map label specs', () => {
  const labels = createMapLabelSpecs(westMarketWorld);

  it('includes districts, avenues, imperial precincts, quests, and discoveries', () => {
    expect(labels.some((label) => label.kind === 'district' && label.label === '西市')).toBe(true);
    expect(labels.some((label) => label.kind === 'avenue' && label.label === '朱雀大街')).toBe(true);
    expect(labels.some((label) => label.kind === 'palace' && label.label === '太极宫')).toBe(true);
    expect(labels.filter((label) => label.kind === 'npc')).toHaveLength(questNpcs.length);
    expect(labels.filter((label) => label.kind === 'treasure')).toHaveLength(questTreasures.length);
    expect(labels.filter((label) => label.source === 'discovery')).toHaveLength(discoveries.length);
  });

  it('includes individual imperial halls as concrete place names', () => {
    expect(labels.some((label) => label.id === 'palace-hall-chengtian-gate' && label.label === '承天门')).toBe(true);
    expect(labels.some((label) => label.id === 'palace-hall-taiji-hall' && label.label === '太极殿')).toBe(true);
    expect(labels.some((label) => label.id === 'palace-hall-liangyi-hall' && label.label === '两仪殿')).toBe(true);
  });

  it('uses stable ids and density priorities for detailed labels', () => {
    expect(labels.find((label) => label.id === 'npc-npc-sogdian-merchant')).toMatchObject({
      label: '阿罗罕',
      kind: 'npc',
      minDistance: 0,
      maxDistance: 260,
      priority: 88
    });
    expect(labels.find((label) => label.id === 'treasure-passage-document')).toMatchObject({
      label: '盖印通关牒',
      kind: 'treasure',
      maxDistance: 230
    });
  });

  it('keeps label ids unique', () => {
    expect(new Set(labels.map((label) => label.id)).size).toBe(labels.length);
  });
});
