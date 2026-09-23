import { changanCity } from './changanCity';

describe('full Chang’an background model', () => {
  it('fills the available outer city without duplicating reserved precincts', () => {
    expect(changanCity.wards.length).toBeGreaterThan(60);
    expect(changanCity.wards.flatMap((ward) => ward.buildings).length).toBeGreaterThanOrEqual(250);

    for (const ward of changanCity.wards) {
      expect(ward.bounds.minX).toBeGreaterThanOrEqual(changanCity.bounds.minX);
      expect(ward.bounds.maxX).toBeLessThanOrEqual(changanCity.bounds.maxX);
      expect(ward.bounds.minZ).toBeGreaterThanOrEqual(changanCity.bounds.minZ);
      expect(ward.bounds.maxZ).toBeLessThanOrEqual(changanCity.bounds.maxZ);
    }
  });

  it('centers the full city on Zhuque Avenue and surrounds it with walls', () => {
    expect(changanCity.bounds).toEqual({ minX: -84, maxX: 472, minZ: -292, maxZ: 292 });
    expect((changanCity.bounds.minX + changanCity.bounds.maxX) / 2).toBe(194);
    expect(changanCity.outerWalls.length).toBeGreaterThanOrEqual(8);
    expect(changanCity.roadXs).toContain(194);
    expect(changanCity.roadZs[0]).toBeLessThanOrEqual(-270);
    expect(changanCity.roadZs.at(-1)).toBeGreaterThanOrEqual(270);
  });
});


describe('coherent city footprints', () => {
  it('keeps generated wards outside the bespoke western and imperial footprints', () => {
    const reserved = [
      { minX: -84, maxX: 188, minZ: -68, maxZ: 68 },
      { minX: 138, maxX: 250, minZ: 68, maxZ: 288 }
    ];
    for (const ward of changanCity.wards) {
      for (const area of reserved) {
        const intersects = ward.bounds.minX < area.maxX && ward.bounds.maxX > area.minX
          && ward.bounds.minZ < area.maxZ && ward.bounds.maxZ > area.minZ;
        expect(intersects, ward.id).toBe(false);
      }
    }
  });

  it('keeps each building inside its ward and clear of both central walking lanes', () => {
    for (const ward of changanCity.wards) {
      const cx = (ward.bounds.minX + ward.bounds.maxX) / 2;
      const cz = (ward.bounds.minZ + ward.bounds.maxZ) / 2;
      for (const building of ward.buildings) {
        expect(building.x - building.width / 2, ward.id).toBeGreaterThan(ward.bounds.minX);
        expect(building.x + building.width / 2, ward.id).toBeLessThan(ward.bounds.maxX);
        expect(building.z - building.depth / 2, ward.id).toBeGreaterThan(ward.bounds.minZ);
        expect(building.z + building.depth / 2, ward.id).toBeLessThan(ward.bounds.maxZ);
        expect(Math.abs(building.x - cx) - building.width / 2, ward.id).toBeGreaterThanOrEqual(3);
        expect(Math.abs(building.z - cz) - building.depth / 2, ward.id).toBeGreaterThanOrEqual(3);
      }
    }
  });
});

describe('usable residual plots beside bespoke districts', () => {
  it('fills the north and south strips left by partially reserved western blocks', () => {
    for (const point of [{ x: 50, z: 90 }, { x: 50, z: -90 }, { x: -40, z: 90 }]) {
      const plot = changanCity.wards.find((ward) => point.x > ward.bounds.minX && point.x < ward.bounds.maxX
        && point.z > ward.bounds.minZ && point.z < ward.bounds.maxZ);
      expect(plot, JSON.stringify(point)).toBeDefined();
      expect(plot!.buildings.length).toBeGreaterThanOrEqual(4);
      expect(plot!.buildings.length).toBeLessThanOrEqual(12);
      expect(plot!.id).toMatch(/^ward-\d+-\d+-part-\d+$/);
      for (const building of plot!.buildings) {
        expect(building.width).toBeGreaterThanOrEqual(3);
        expect(building.depth).toBeGreaterThanOrEqual(3);
      }
    }
  });

  it('gives every retained residual a distinct id and disjoint footprint', () => {
    const plots = changanCity.wards;
    expect(new Set(plots.map((plot) => plot.id)).size).toBe(plots.length);
    expect(plots.some((plot) => plot.id.includes('-part-'))).toBe(true);
    for (let i = 0; i < plots.length; i++) {
      for (let j = i + 1; j < plots.length; j++) {
        const a = plots[i].bounds, b = plots[j].bounds;
        expect(a.minX < b.maxX && a.maxX > b.minX && a.minZ < b.maxZ && a.maxZ > b.minZ,
          `${plots[i].id} / ${plots[j].id}`).toBe(false);
      }
    }
  });
});

it('orients side gates across the wall with a shallow passage depth',()=>{
 for(const gate of changanCity.gatehouses.filter(g=>g.rotation)){expect(gate.width).toBeGreaterThan(gate.depth);expect(gate.depth).toBe(8);}
});
