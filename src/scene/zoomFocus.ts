import type { Vector3Like } from './cameraControls';
/** Free exploration keeps its selected target; only following mode attracts to the traveler. */
export function zoomCameraTarget(current:Vector3Like,traveler:Vector3Like,distance:number,followTraveler:boolean):Vector3Like {
 const t=followTraveler?Math.min(1,Math.max(0,(45-distance)/27)):0;
 const blend=t*t*(3-2*t)*.45;
 return {x:current.x+(traveler.x-current.x)*blend,y:current.y+(traveler.y-current.y)*blend,z:current.z+(traveler.z-current.z)*blend};
}
