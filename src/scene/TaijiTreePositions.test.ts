import {taijiGardenTreePositions} from './TaijiTreePositions';
import {imperialPrecincts} from '../data/imperialCity';

it('keeps garden trunks inside the precinct and clear of architecture, pond and central passage',()=>{
  const precinct=imperialPrecincts.find(p=>p.id==='taiji-palace')!;
  const exclusions=[...precinct.halls,...precinct.annexes].filter(h=>h.z>260);
  for(const [x,z] of taijiGardenTreePositions){
    expect(x).toBeGreaterThan(precinct.bounds.minX+3);expect(x).toBeLessThan(precinct.bounds.maxX-3);
    expect(z).toBeGreaterThan(263);expect(z).toBeLessThan(precinct.bounds.maxZ-3);
    expect(Math.abs(x-194)).toBeGreaterThan(12);
    for(const h of exclusions){
      const dx=Math.max(0,Math.abs(x-h.x)-h.width/2),dz=Math.max(0,Math.abs(z-h.z)-h.depth/2);
      expect(Math.hypot(dx,dz)).toBeGreaterThan(3);
    }
    const pool=precinct.courtyards.find(c=>c.id==='inner-garden-pool')!;
    expect(Math.abs(x-pool.x)).toBeGreaterThan(pool.width/2+2);
  }
});
