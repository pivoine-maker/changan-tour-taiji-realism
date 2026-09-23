import type { BuildingBlock, Point2 } from './world';

export type WardCharacter = 'courtyard' | 'artisan' | 'garden' | 'rowhouse';
export interface WardBounds { minX:number; maxX:number; minZ:number; maxZ:number }
export interface WardCourt { bounds:WardBounds; kind:WardCharacter; x:number; z:number }
export interface WardComposition { character:WardCharacter; buildings:BuildingBlock[]; courts:WardCourt[]; trees:Point2[] }
/** Includes the realistic roof fascia and tile lip, not only the wall footprint. */
export const WARD_EAVE_MARGIN = .85;

function characterFor(bounds:WardBounds,row:number,column:number):WardCharacter {
  const seed=(row*31+column*17)%10;
  const x=(bounds.minX+bounds.maxX)/2,z=(bounds.minZ+bounds.maxZ)/2;
  if(bounds.maxX-bounds.minX<32 || bounds.maxZ-bounds.minZ<40) return 'rowhouse';
  if(z>100 && Math.abs(x-194)<170) return seed<7?'courtyard':'garden';
  if(x<140 && Math.abs(z)<170) return seed<7?'artisan':'courtyard';
  if(Math.abs(z)>190 || x>380) return seed<7?'garden':'rowhouse';
  return (['courtyard','artisan','garden','rowhouse'] as const)[seed%4];
}

/** Each compound is mirrored into a quadrant; its open side faces the cross lane.
 * Rectangular wings stay independent, so collision and both render modes agree.
 */
export function createWardComposition(bounds:WardBounds,row:number,column:number):WardComposition {
  const character=characterFor(bounds,row,column);
  const result:WardComposition={character,buildings:[],courts:[],trees:[]};
  const cx=(bounds.minX+bounds.maxX)/2,cz=(bounds.minZ+bounds.maxZ)/2;
  const qw=(bounds.maxX-bounds.minX)/2-3,qd=(bounds.maxZ-bounds.minZ)/2-3;
  const inset=WARD_EAVE_MARGIN+(qw<6?.01:.25),gap=WARD_EAVE_MARGIN*2+.3;
  const w=qw-2*inset,d=qd-2*inset;
  for(const sz of [-1,1])for(const sx of [-1,1]){
    const seed=row*31+column*17+(sz+1)*3+sx+1;
    // Hash the actual compound position, not a repeating row/column modulus.
    // Each channel is independent and bounded; no runtime randomness enters physics.
    const variation=(channel:number)=>{
      let value=Math.imul(Math.round((cx+sx*qw/2)*100),73856093)
        ^Math.imul(Math.round((cz+sz*qd/2)*100),19349663)
        ^Math.imul(row+101*column+channel*1543,83492791);
      value=Math.imul(value^(value>>>16),0x45d9f3b);
      value=Math.imul(value^(value>>>16),0x45d9f3b);
      return ((value^(value>>>16))>>>0)/4294967296;
    };
    // Local zero is the outside corner; larger u/v face the cross lane.
    const ox=cx+sx*(3+qw-inset),oz=cz+sz*(3+qd-inset);
    const point=(u:number,v:number):Point2=>({x:ox-sx*u,z:oz-sz*v});
    let wingIndex=0;
    const building=(u:number,v:number,bw:number,bd:number,main=false)=>{
      const index=wingIndex++;
      result.buildings.push({...point(u+bw/2,v+bd/2),width:bw,depth:bd,
        height:(main?3.1:2.35)+variation(20+index)*.38+(character==='artisan'?.2:0),
        tone:character==='courtyard'?(main?'sand':'umber'):character==='artisan'?(index%2?'umber':'clay'):character==='garden'?(main?'sand':'clay'):(seed%2?'sand':'umber'),
        roof:character==='artisan'&&!main?'flat':character==='rowhouse'&&seed%3===0?'flat':'hip',rotation:sz>0?0:Math.PI});
    };
    const court=(u:number,v:number,cw:number,cd:number)=>{
      if(cw<2 || cd<2)return;
      const a=point(u,v),b=point(u+cw,v+cd),center=point(u+cw/2,v+cd/2);
      result.courts.push({kind:character,...center,bounds:{minX:Math.min(a.x,b.x),maxX:Math.max(a.x,b.x),minZ:Math.min(a.z,b.z),maxZ:Math.max(a.z,b.z)}});
      // Sparse gardens and domestic court trees; never put a tree into a tiny slot.
      if(cw>=4 && cd>=4 && (character==='garden'||seed%2===0))result.trees.push(center);
    };
    if(w<10 || d<14){
      const bd=Math.min(6.8+(seed%2)+variation(1)*.4,d);
      const bw=w-Math.min(w*.08,Math.max(0,w-3))*variation(2);
      building((w-bw)*variation(3),0,bw,bd,true);
      court(0,bd+WARD_EAVE_MARGIN+.2,w,d-bd-WARD_EAVE_MARGIN-.2);
    }else if(character==='courtyard'||character==='artisan'){
      const hallDepth=(character==='artisan'?3.8:4.6)+variation(1)*.7;
      const sideWidth=3+variation(2)*(character==='artisan'?.5:.4);
      const otherWidth=3+variation(3)*(character==='artisan'?.5:.4);
      const sideV=hallDepth+gap;
      const sideDepth=d-sideV-(character==='artisan'?2.1:0);
      const hallWidth=w*(.9+variation(4)*.1);
      building((w-hallWidth)*variation(5),0,hallWidth,hallDepth,true);
      building(0,sideV,sideWidth,Math.max(3,sideDepth-variation(6)*1.4));
      building(w-otherWidth,sideV,otherWidth,Math.max(3,sideDepth-variation(7)*1.4));
      court(sideWidth+WARD_EAVE_MARGIN+.15,sideV,w-sideWidth-otherWidth-2*(WARD_EAVE_MARGIN+.15),d-sideV);
    }else if(character==='garden'){
      const hallDepth=4.3+variation(1)*.8,sideWidth=3.3+variation(2)*.8,sideV=hallDepth+gap;
      const hallWidth=w*(.79+variation(3)*.16);
      building((w-hallWidth)*variation(4),0,hallWidth,hallDepth,true);
      building(0,sideV,sideWidth,Math.min(d-sideV,9.6+variation(5)*2.2));
      court(sideWidth+WARD_EAVE_MARGIN+.2,sideV,w-sideWidth-WARD_EAVE_MARGIN-.2,d-sideV);
    }else{
      const bd=Math.min(5.4+variation(1)*.6,(d-4)/2);
      const frontWidth=w*(.91+variation(2)*.09),rearWidth=w*(.77+variation(3)*.16);
      building((w-frontWidth)*variation(4),0,frontWidth,bd,true);
      building((w-rearWidth)*variation(5),d-bd,rearWidth,bd);
      court(0,bd+WARD_EAVE_MARGIN+.15,w,d-2*bd-2*(WARD_EAVE_MARGIN+.15));
    }
  }
  return result;
}
