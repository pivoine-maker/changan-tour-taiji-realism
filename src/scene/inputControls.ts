import type { RoadEdge, RoadNode } from '../data/world';
import { clampCameraDistance } from './cameraControls';

const MOVEMENT_CODES = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD']);
const WALK_SPEED = 10;
const TURN_SPEED = 1.9;
const TRAVELER_COLLISION_RADIUS = 1.1;
const COLLISION_BACKOFF = 0.15;

export interface KeyboardMoveState {
  setKey: (code: string, pressed: boolean) => boolean;
  isPressed: (code: string) => boolean;
  clear: () => void;
}

export interface MoveIntent {
  forward: -1 | 0 | 1;
  turn: -1 | 0 | 1;
  active: boolean;
}

export interface TravelerPose {
  x: number;
  z: number;
  heading: number;
}

export interface MovementObstacle {
  id?: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  rotation?: number;
}

export function createKeyboardMoveState(): KeyboardMoveState {
  const pressedCodes = new Set<string>();
  return {
    setKey(code, pressed) {
      if (!MOVEMENT_CODES.has(code)) {
        return false;
      }
      if (pressed) {
        pressedCodes.add(code);
      } else {
        pressedCodes.delete(code);
      }
      return true;
    },
    isPressed: (code) => pressedCodes.has(code),
    clear: () => pressedCodes.clear()
  };
}

export function getKeyboardMoveIntent(state: KeyboardMoveState): MoveIntent {
  const forward = Number(state.isPressed('KeyW')) - Number(state.isPressed('KeyS'));
  const turn = Number(state.isPressed('KeyD')) - Number(state.isPressed('KeyA'));
  return {
    forward: Math.sign(forward) as MoveIntent['forward'],
    turn: Math.sign(turn) as MoveIntent['turn'],
    active: forward !== 0 || turn !== 0
  };
}

export function moveWithRoadSnap(
  pose: TravelerPose,
  intent: MoveIntent,
  delta: number,
  nodes: RoadNode[],
  edges: RoadEdge[] = [],
  obstacles: MovementObstacle[] = [],
  phaseThrough = false
): TravelerPose {
  const heading = normalizeAngle(pose.heading + intent.turn * TURN_SPEED * delta);
  if (intent.forward === 0) {
    return { ...pose, heading };
  }

  const distance = intent.forward * WALK_SPEED * delta;
  const desired = {
    x: pose.x + Math.sin(heading) * distance,
    z: pose.z + Math.cos(heading) * distance
  };
  if (phaseThrough) {
    return { ...desired, heading };
  }

  const snapped = snapToRoad(desired, nodes, edges);
  const resolved = resolveCollision(pose, snapped, obstacles, false);
  return { ...resolved, heading };
}

export function resolveCollision(
  from: { x: number; z: number },
  desired: { x: number; z: number },
  obstacles: MovementObstacle[],
  phaseThrough: boolean
): { x: number; z: number } {
  if (phaseThrough || obstacles.length === 0) {
    return desired;
  }

  const dx = desired.x - from.x;
  const dz = desired.z - from.z;
  const movementLength = Math.hypot(dx, dz);
  if (movementLength === 0) {
    return desired;
  }

  let firstCollision = Number.POSITIVE_INFINITY;
  for (const obstacle of obstacles) {
    const collision = getSegmentObstacleEntry(from, desired, obstacle, TRAVELER_COLLISION_RADIUS);
    if (collision !== null && collision < firstCollision) {
      firstCollision = collision;
    }
  }

  if (firstCollision === Number.POSITIVE_INFINITY) {
    return desired;
  }

  const safeT = Math.max(0, firstCollision - COLLISION_BACKOFF / movementLength);
  return {
    x: from.x + dx * safeT,
    z: from.z + dz * safeT
  };
}

export function zoomCameraDistance(distance: number, direction: 'in' | 'out'): number {
  return clampCameraDistance(distance + (direction === 'in' ? -22 : 22));
}

function snapToRoad(
  point: { x: number; z: number },
  nodes: RoadNode[],
  edges: RoadEdge[]
): { x: number; z: number } {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  let nearestPoint = point;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const edge of edges) {
    const from = nodeById.get(edge.from);
    const to = nodeById.get(edge.to);
    if (!from || !to) {
      continue;
    }
    const candidate = projectPointToSegment(point, from, to);
    const candidateDistance = squaredDistance(point, candidate);
    if (candidateDistance < nearestDistance) {
      nearestPoint = candidate;
      nearestDistance = candidateDistance;
    }
  }

  if (nearestDistance < Number.POSITIVE_INFINITY) {
    return nearestPoint;
  }

  let nearestNode: RoadNode | undefined;
  for (const node of nodes) {
    const candidateDistance = squaredDistance(point, node);
    if (candidateDistance < nearestDistance) {
      nearestNode = node;
      nearestDistance = candidateDistance;
    }
  }

  if (!nearestNode) {
    return point;
  }

  const correction = Math.min(0.35, Math.sqrt(nearestDistance) / 40);
  return {
    x: point.x + (nearestNode.x - point.x) * correction,
    z: point.z + (nearestNode.z - point.z) * correction
  };
}

function projectPointToSegment(
  point: { x: number; z: number },
  from: { x: number; z: number },
  to: { x: number; z: number }
): { x: number; z: number } {
  const dx = to.x - from.x;
  const dz = to.z - from.z;
  const lengthSquared = dx * dx + dz * dz;
  if (lengthSquared === 0) {
    return { x: from.x, z: from.z };
  }
  const projection = ((point.x - from.x) * dx + (point.z - from.z) * dz) / lengthSquared;
  const t = Math.max(0, Math.min(1, projection));
  return { x: from.x + dx * t, z: from.z + dz * t };
}

function getSegmentObstacleEntry(
  from: { x: number; z: number },
  to: { x: number; z: number },
  obstacle: MovementObstacle,
  radius: number
): number | null {
  const localFrom = toObstacleLocalPoint(from, obstacle);
  const localTo = toObstacleLocalPoint(to, obstacle);
  const halfWidth = obstacle.width / 2 + radius;
  const halfDepth = obstacle.depth / 2 + radius;

  if (isInsideExpandedObstacle(localFrom, halfWidth, halfDepth)) {
    return null;
  }

  const dx = localTo.x - localFrom.x;
  const dz = localTo.z - localFrom.z;
  let entry = 0;
  let exit = 1;

  const clippedX = clipSegmentAxis(localFrom.x, dx, -halfWidth, halfWidth, entry, exit);
  if (!clippedX) {
    return null;
  }
  entry = clippedX.entry;
  exit = clippedX.exit;

  const clippedZ = clipSegmentAxis(localFrom.z, dz, -halfDepth, halfDepth, entry, exit);
  if (!clippedZ) {
    return null;
  }

  return clippedZ.entry >= 0 && clippedZ.entry <= 1 ? clippedZ.entry : null;
}

function clipSegmentAxis(
  start: number,
  delta: number,
  min: number,
  max: number,
  entry: number,
  exit: number
): { entry: number; exit: number } | null {
  if (Math.abs(delta) < 0.000001) {
    return start < min || start > max ? null : { entry, exit };
  }

  const t1 = (min - start) / delta;
  const t2 = (max - start) / delta;
  const nextEntry = Math.max(entry, Math.min(t1, t2));
  const nextExit = Math.min(exit, Math.max(t1, t2));
  return nextEntry > nextExit ? null : { entry: nextEntry, exit: nextExit };
}

function toObstacleLocalPoint(
  point: { x: number; z: number },
  obstacle: MovementObstacle
): { x: number; z: number } {
  const rotation = -(obstacle.rotation ?? 0);
  const dx = point.x - obstacle.x;
  const dz = point.z - obstacle.z;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  return {
    x: dx * cos - dz * sin,
    z: dx * sin + dz * cos
  };
}

function isInsideExpandedObstacle(point: { x: number; z: number }, halfWidth: number, halfDepth: number): boolean {
  return Math.abs(point.x) <= halfWidth && Math.abs(point.z) <= halfDepth;
}

function squaredDistance(a: { x: number; z: number }, b: { x: number; z: number }): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;
  return dx * dx + dz * dz;
}

function normalizeAngle(angle: number): number {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}
