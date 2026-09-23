import * as THREE from 'three';
/** World-space sun shadows are independent of the viewing camera.
 * Refresh after camera settling only to account for canopy LOD changes.
 */
export class ShadowRefresh {
  private camera?:THREE.Matrix4;
  private actor?:THREE.Matrix4;
  private lastCameraMotion=0;
  private pending=false;
  update(camera:THREE.Matrix4,actor:THREE.Matrix4,now:number):boolean {
    const actorChanged=!this.actor||!this.actor.equals(actor);
    if(!this.camera||!this.camera.equals(camera)){this.camera=camera.clone();this.lastCameraMotion=now;this.pending=true;}
    if(actorChanged)this.actor=actor.clone();
    const settled=this.pending&&now-this.lastCameraMotion>=150;
    if(settled)this.pending=false;
    return actorChanged||settled;
  }
}
