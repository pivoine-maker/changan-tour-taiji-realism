import { changanCity } from './changanCity';
import { createWardComposition, WARD_EAVE_MARGIN, type WardBounds } from './wardComposition';

const overlaps = (a: WardBounds,b: WardBounds) => a.minX < b.maxX - 1e-8 && a.maxX > b.minX + 1e-8 && a.minZ < b.maxZ - 1e-8 && a.maxZ > b.minZ + 1e-8;
const roofs = (ward: typeof changanCity.wards[number]) => ward.buildings.map(b => ({ minX:b.x-b.width/2-WARD_EAVE_MARGIN,maxX:b.x+b.width/2+WARD_EAVE_MARGIN,minZ:b.z-b.depth/2-WARD_EAVE_MARGIN,maxZ:b.z+b.depth/2+WARD_EAVE_MARGIN }));
describe('regional multi-wing ward compositions',()=>{
  it('is deterministic and supplies all four stable regional families',()=>{
    const families = new Set(changanCity.wards.map(w=>w.character));
    expect(families).toEqual(new Set(['courtyard','artisan','garden','rowhouse']));
    for(const w of changanCity.wards) expect(createWardComposition(w.bounds,w.row,w.column)).toEqual({character:w.character,buildings:w.buildings,courts:w.courts,trees:w.trees});
  });
  it('varies dimensions and heights within each regional family',()=>{
    for(const family of ['courtyard','artisan','garden','rowhouse']){
      const wards=changanCity.wards.filter(w=>w.character===family);
      const buildings=wards.flatMap(w=>w.buildings);
      expect(new Set(buildings.map(b=>b.depth.toFixed(3))).size,family+' depths').toBeGreaterThan(8);
      expect(new Set(buildings.map(b=>b.height.toFixed(3))).size,family+' heights').toBeGreaterThan(8);
      const halls=wards.flatMap(w=>w.buildings.filter((_,i)=>i%(w.buildings.length/4)===0).map(b=>b.width/((w.bounds.maxX-w.bounds.minX)/2-5.2)));
      expect(new Set(halls.map(r=>r.toFixed(3))).size,family+' hall widths').toBeGreaterThan(4);
    }
  });
  it('uses spatial location as well as grid indices for compound variation',()=>{
    const a={minX:250,maxX:300,minZ:40,maxZ:100};
    const b={...a,minX:251,maxX:301};
    const first=createWardComposition(a,3,4),second=createWardComposition(b,3,4);
    expect(second.character).toBe(first.character);
    expect(second.buildings.map(x=>[x.width,x.depth,x.height])).not.toEqual(first.buildings.map(x=>[x.width,x.depth,x.height]));
  });
  it('retains the full city inventory',()=>{
    expect(changanCity.wards.length).toBe(82);
    expect(changanCity.wards.reduce((n,w)=>n+w.buildings.length,0)).toBe(756);
    expect(changanCity.wards.reduce((n,w)=>n+(w.courts?.length??0),0)).toBe(328);
    expect(changanCity.wards.reduce((n,w)=>n+w.trees.length,0)).toBe(204);
  });
  it('keeps ordinary roofs and court surfaces off the full 18m Zhuque axis',()=>{
    for(const ward of changanCity.wards){
      // Rendered avenue is x185..203; also retain half a metre of clearance.
      expect(ward.bounds.maxX<=184.5 || ward.bounds.minX>=203.5,ward.id).toBe(true);
      for(const roof of roofs(ward))expect(roof.maxX<=184.5 || roof.minX>=203.5,ward.id).toBe(true);
      for(const court of ward.courts??[])expect(court.bounds.maxX<=184.5 || court.bounds.minX>=203.5,ward.id).toBe(true);
    }
  });
  it('packs broad wards as multiple wings with bounded complexity',()=>{
    for(const w of changanCity.wards.filter(w=>w.bounds.maxX-w.bounds.minX>=32 && w.bounds.maxZ-w.bounds.minZ>=40)){
      expect(w.buildings.length,w.id).toBeGreaterThanOrEqual(8);
      expect(w.buildings.length,w.id).toBeLessThanOrEqual(12);
      expect(w.courts?.length,w.id).toBe(4);
    }
  });
  it('keeps every eave within its plot and clear of the six metre cross across spatial variants',()=>{
    const variants=changanCity.wards.flatMap(w=>[w,...[1,7,19].map(offset=>({...w,...createWardComposition(w.bounds,w.row+offset,w.column+offset)}))]);
    for(const w of variants){
      const cx=(w.bounds.minX+w.bounds.maxX)/2,cz=(w.bounds.minZ+w.bounds.maxZ)/2;
      const boxes=roofs(w);
      for(const [i,b] of boxes.entries()){
        expect(b.minX).toBeGreaterThanOrEqual(w.bounds.minX);expect(b.maxX).toBeLessThanOrEqual(w.bounds.maxX);
        expect(b.minZ).toBeGreaterThanOrEqual(w.bounds.minZ);expect(b.maxZ).toBeLessThanOrEqual(w.bounds.maxZ);
        expect(b.maxX<=cx-3 || b.minX>=cx+3,w.id).toBe(true);expect(b.maxZ<=cz-3 || b.minZ>=cz+3,w.id).toBe(true);
        for(const other of boxes.slice(i+1))expect(overlaps(b,other),w.id).toBe(false);
      }
      for(const b of w.buildings){expect(b.width).toBeGreaterThanOrEqual(w.bounds.maxX-w.bounds.minX<16?2:3);expect(b.depth).toBeGreaterThanOrEqual(3);expect(b.height).toBeGreaterThan(2);}
      for(const court of w.courts??[]){
        const b=court.bounds;expect(b.maxX-b.minX).toBeGreaterThanOrEqual(2);expect(b.maxZ-b.minZ).toBeGreaterThanOrEqual(2);
        expect(court.x).toBeCloseTo((b.minX+b.maxX)/2);expect(court.z).toBeCloseTo((b.minZ+b.maxZ)/2);expect(court.kind).toBe(w.character);
        expect(b.minX).toBeGreaterThanOrEqual(w.bounds.minX);expect(b.maxX).toBeLessThanOrEqual(w.bounds.maxX);expect(b.minZ).toBeGreaterThanOrEqual(w.bounds.minZ);expect(b.maxZ).toBeLessThanOrEqual(w.bounds.maxZ);
        expect(b.maxX<=cx-3 || b.minX>=cx+3,w.id).toBe(true);expect(b.maxZ<=cz-3 || b.minZ>=cz+3,w.id).toBe(true);
        for(const roof of boxes)expect(overlaps(b,roof),w.id).toBe(false);
      }
      for(const tree of w.trees)expect(w.courts?.some(c=>tree.x>c.bounds.minX&&tree.x<c.bounds.maxX&&tree.z>c.bounds.minZ&&tree.z<c.bounds.maxZ),w.id).toBe(true);
    }
  });
});
