export interface CameraRig {
  yaw: number;
  pitch: number;
  distance: number;
}

export interface TravelerCameraRig extends CameraRig {
  target: Vector3Like;
}

const DEFAULT_CAMERA: CameraRig = {
  yaw: Math.PI + .12,
  pitch: 1.2,
  distance: 1050
};

export function clampCameraDistance(distance: number): number {
  return Math.min(1200, Math.max(18, distance));
}

export function clampCameraPitch(pitch: number): number {
  return Math.min(1.28, Math.max(0.24, pitch));
}

export function getDefaultCameraRig(): CameraRig {
  return { ...DEFAULT_CAMERA };
}

export function getTravelerCameraRig(traveler: Vector3Like, heading: number): TravelerCameraRig {
  return {
    target: {
      x: traveler.x + Math.sin(heading) * 4.5,
      y: traveler.y + 1.25,
      z: traveler.z + Math.cos(heading) * 4.5
    },
    yaw: heading + Math.PI,
    pitch: 0.34,
    distance: 34
  };
}

export function getNpcCameraRig(npc: Vector3Like): TravelerCameraRig {
  const isWestGateApproach = npc.x <= -32 && Math.abs(npc.z) <= 4;
  return {
    target: {
      x: npc.x,
      y: npc.y + 0.7,
      z: npc.z
    },
    yaw: isWestGateApproach ? -Math.PI / 2 : Math.PI * 0.72,
    pitch: isWestGateApproach ? 0.3 : 0.38,
    distance: isWestGateApproach ? 30 : 42
  };
}

export function getNextNpcIndex(currentIndex: number, total: number): number {
  if (total <= 0) {
    return -1;
  }
  return (currentIndex + 1) % total;
}

export interface FollowState {
  manuallyExploring: boolean;
  followTraveler: boolean;
}

export interface Vector3Like {
  x: number;
  y: number;
  z: number;
}

export function shouldFollowTraveler(state: FollowState): boolean {
  return state.followTraveler && !state.manuallyExploring;
}

export function updateFollowTarget(current: Vector3Like, traveler: Vector3Like, blend: number): Vector3Like {
  return {
    x: current.x + (traveler.x - current.x) * blend,
    y: current.y + (traveler.y - current.y) * blend,
    z: current.z + (traveler.z - current.z) * blend
  };
}

export function panCameraTarget(
  current: Vector3Like,
  deltaX: number,
  deltaY: number,
  yaw: number,
  distance: number
): Vector3Like {
  const scale = Math.max(0.08, distance / 500);
  const rightX = Math.cos(yaw);
  const rightZ = -Math.sin(yaw);
  const forwardX = Math.sin(yaw);
  const forwardZ = Math.cos(yaw);

  return {
    x: current.x - rightX * deltaX * scale + forwardX * deltaY * scale,
    y: current.y,
    z: current.z - rightZ * deltaX * scale + forwardZ * deltaY * scale
  };
}
