import { discoveries } from './discoveries';
import { westMarketWorld } from './world';

describe('discovery archive data', () => {
  it('defines discovery cards from the market route through Taiji Palace', () => {
    expect(discoveries).toHaveLength(18);

    for (const discovery of discoveries) {
      expect(discovery.id).toMatch(/^[a-z0-9-]+$/);
      expect(discovery.title.length).toBeGreaterThan(0);
      expect(discovery.guide.length).toBeGreaterThan(20);
      expect(discovery.evidence.confirmed.length).toBeGreaterThan(0);
      expect(discovery.evidence.interpretation.length).toBeGreaterThan(0);
      expect(discovery.evidence.uncertain.length).toBeGreaterThan(0);
      expect(discovery.sources.length).toBeGreaterThan(0);
    }
  });

  it('adds imperial discoveries for the complete palace walk', () => {
    expect(discoveries.map((discovery) => discovery.id)).toEqual(expect.arrayContaining([
      'zhuque-gate',
      'imperial-offices',
      'chengtian-gate',
      'taiji-hall',
      'inner-palace-garden'
    ]));
  });

  it('adds southern city, waterworks, ward-life, and archive discoveries', () => {
    expect(discoveries.map((discovery) => discovery.id)).toEqual(expect.arrayContaining([
      'mingde-gate-axis',
      'city-wall-rampart',
      'canal-culvert',
      'well-yard',
      'east-ward-residence',
      'roof-tile-kiln-trace',
      'palace-archive-court',
      'imperial-service-lane'
    ]));
  });

  it('has a matching landmark for every discovery card', () => {
    const landmarkIds = new Set(westMarketWorld.landmarks.map((landmark) => landmark.discoveryId));

    expect(discoveries.map((discovery) => discovery.id).sort()).toEqual(
      Array.from(landmarkIds).sort()
    );
  });
});
