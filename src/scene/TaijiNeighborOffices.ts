import type {ImperialHall} from '../data/imperialCity';
import {imperialPrecincts} from '../data/imperialCity';

export const TAIJI_NEIGHBOR_OFFICE_IDS = [
  'west-chancellery','east-chancellery','west-ministry','east-ministry',
  'west-office-annex-south','west-office-annex-north','east-office-annex-south','east-office-annex-north'
] as const;

export function getTaijiNeighborOffices(): ImperialHall[] {
  const precinct=imperialPrecincts.find(item=>item.id==='imperial-city-axis');
  if(!precinct)throw new Error('Missing imperial-city-axis precinct');
  const targets=new Set<string>(TAIJI_NEIGHBOR_OFFICE_IDS);
  return [...precinct.halls,...precinct.annexes].filter(hall=>targets.has(hall.id));
}

export function officeRoofFrame(hall:ImperialHall) {
  const depthIsLong=hall.depth>hall.width;
  return {
    width:(depthIsLong?hall.depth+1.2:hall.width+1.4),
    depth:(depthIsLong?hall.width+1.4:hall.depth+1.2),
    rotation:(hall.rotation??0)+(depthIsLong?Math.PI/2:0)
  };
}
