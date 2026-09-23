import { zoomCameraTarget } from './zoomFocus';
it('keeps a remote city tour centered during repeated close wheel zooms',()=>{
 let target={x:194,y:2,z:-270};
 for(const distance of [44,32,18,18])target=zoomCameraTarget(target,{x:-52,y:1.2,z:-22},distance,false);
 expect(target).toEqual({x:194,y:2,z:-270});
});
it('retains close traveler focus only while following that traveler',()=>{
 const start={x:10,y:2,z:20},traveler={x:0,y:1.2,z:0};
 expect(zoomCameraTarget(start,traveler,80,true)).toEqual(start);
 const close=zoomCameraTarget(start,traveler,18,true);expect(close.x).toBeGreaterThan(0);expect(close.x).toBeLessThan(start.x);
});
