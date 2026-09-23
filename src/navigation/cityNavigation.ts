import type { CityBounds } from '../data/cityLayout';
import type { Point2 } from '../data/world';
import type { MovementObstacle } from '../scene/inputControls';

export interface CityNavigationOptions {
  cellSize?: number;
  maxVisited?: number;
}
export interface CityNavigation {
  /** Starts at the actual traveler pose; the last waypoint is inside arrivalRadius. */
  findRoute(start: Point2, target: Point2, arrivalRadius?: number): Point2[] | null;
  isSegmentClear(from: Point2, to: Point2): boolean;
}

// Slightly exceeds the walker's 1.1m radius to avoid contact/rounding disagreement.
const CLEARANCE = 1.12;
const BIN_SIZE = 24;
const DIRECTIONS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]];

/** Reusable spatial collision index and lazily sampled walking grid. No scene dependency. */
export function createCityNavigation(bounds: CityBounds, obstacles: MovementObstacle[], options: CityNavigationOptions = {}): CityNavigation {
  const step = Math.min(8, Math.max(1, options.cellSize ?? 2));
  const columns = Math.floor((bounds.maxX - bounds.minX) / step) + 1;
  const rows = Math.floor((bounds.maxZ - bounds.minZ) / step) + 1;
  const size = columns * rows;
  const maxVisited = Math.max(1, Math.min(size, options.maxVisited ?? 100000));
  const bins = new Map<string, number[]>();
  const cachedFree = new Uint8Array(size);
  const prepared = obstacles.map((obstacle) => {
    const c = Math.cos(obstacle.rotation ?? 0), s = -Math.sin(obstacle.rotation ?? 0);
    const hx = obstacle.width / 2 + CLEARANCE, hz = obstacle.depth / 2 + CLEARANCE;
    return { ...obstacle, c, s, hx, hz };
  });
  prepared.forEach((obstacle, index) => {
    const dx = Math.abs(obstacle.c) * obstacle.hx + Math.abs(obstacle.s) * obstacle.hz;
    const dz = Math.abs(obstacle.s) * obstacle.hx + Math.abs(obstacle.c) * obstacle.hz;
    for (let bx = Math.floor((obstacle.x - dx) / BIN_SIZE); bx <= Math.floor((obstacle.x + dx) / BIN_SIZE); bx++) {
      for (let bz = Math.floor((obstacle.z - dz) / BIN_SIZE); bz <= Math.floor((obstacle.z + dz) / BIN_SIZE); bz++) {
        const key = `${bx},${bz}`;
        const bin = bins.get(key);
        if (bin) bin.push(index); else bins.set(key, [index]);
      }
    }
  });

  function inBounds(point: Point2): boolean {
    return Number.isFinite(point.x) && Number.isFinite(point.z) && point.x >= bounds.minX
      && point.x <= bounds.maxX && point.z >= bounds.minZ && point.z <= bounds.maxZ;
  }

  function isSegmentClear(from: Point2, to: Point2): boolean {
    if (!inBounds(from) || !inBounds(to)) return false;
    const seen = new Set<number>();
    for (let bx = Math.floor(Math.min(from.x, to.x) / BIN_SIZE); bx <= Math.floor(Math.max(from.x, to.x) / BIN_SIZE); bx++) {
      for (let bz = Math.floor(Math.min(from.z, to.z) / BIN_SIZE); bz <= Math.floor(Math.max(from.z, to.z) / BIN_SIZE); bz++) {
        for (const index of bins.get(`${bx},${bz}`) ?? []) {
          if (seen.has(index)) continue;
          seen.add(index);
          const obstacle = prepared[index];
          const ax = from.x - obstacle.x, az = from.z - obstacle.z;
          const bx = to.x - obstacle.x, bz = to.z - obstacle.z;
          const localA = { x: ax * obstacle.c - az * obstacle.s, z: ax * obstacle.s + az * obstacle.c };
          const localB = { x: bx * obstacle.c - bz * obstacle.s, z: bx * obstacle.s + bz * obstacle.c };
          // Match inputControls' local-coordinate convention, including arbitrary rotations.
          if (intersectsBox(localA, localB, obstacle.hx, obstacle.hz)) return false;
        }
      }
    }
    return true;
  }

  function pointFor(id: number): Point2 {
    return { x: bounds.minX + id % columns * step, z: bounds.minZ + Math.floor(id / columns) * step };
  }
  function free(id: number): boolean {
    if (cachedFree[id] === 0) {
      const point = pointFor(id);
      cachedFree[id] = isSegmentClear(point, point) ? 1 : 2;
    }
    return cachedFree[id] === 1;
  }

  function findRoute(start: Point2, target: Point2, arrivalRadius = 0): Point2[] | null {
    if (!inBounds(start) || !inBounds(target) || !Number.isFinite(arrivalRadius) || arrivalRadius < 0
      || !isSegmentClear(start, start)) return null;
    if (distance(start, target) <= arrivalRadius) return [{ ...start }];
    if (isSegmentClear(start, target)) return [{ ...start }, { x: target.x, z: target.z }];
    const costs = new Float64Array(size).fill(Infinity);
    const previous = new Int32Array(size).fill(-1);
    const closed = new Uint8Array(size);
    const open = new MinHeap();
    const sx = Math.round((start.x - bounds.minX) / step), sz = Math.round((start.z - bounds.minZ) / step);
    const heuristic = (point: Point2): number => Math.max(0, distance(point, target) - arrivalRadius);
    for (let dz = -2; dz <= 2; dz++) {
      for (let dx = -2; dx <= 2; dx++) {
        const x = sx + dx, z = sz + dz;
        if (x < 0 || x >= columns || z < 0 || z >= rows) continue;
        const id = z * columns + x, point = pointFor(id);
        if (!free(id) || !isSegmentClear(start, point)) continue;
        costs[id] = distance(start, point);
        open.push({ id, score: costs[id] + heuristic(point) });
      }
    }
    let visited = 0;
    while (open.length && visited < maxVisited) {
      const id = open.pop()!.id;
      if (closed[id]) continue;
      closed[id] = 1;
      visited++;
      const point = pointFor(id);
      const toTarget = distance(point, target);
      const reached = toTarget <= arrivalRadius;
      const exactFinish = arrivalRadius === 0 && toTarget <= step * 1.5 && isSegmentClear(point, target);
      if (reached || exactFinish) {
        const route: Point2[] = [];
        let cursor = id;
        while (cursor !== -1) {
          route.push(pointFor(cursor));
          cursor = previous[cursor];
        }
        route.reverse();
        route.unshift({ ...start });
        if (exactFinish && toTarget > 0) route.push({ x: target.x, z: target.z });
        return simplify(route);
      }
      const x = id % columns, z = Math.floor(id / columns);
      for (const [dx, dz] of DIRECTIONS) {
        const nx = x + dx, nz = z + dz;
        if (nx < 0 || nx >= columns || nz < 0 || nz >= rows) continue;
        const next = nz * columns + nx;
        if (closed[next] || !free(next)) continue;
        const nextPoint = pointFor(next);
        const cost = costs[id] + step * (dx !== 0 && dz !== 0 ? Math.SQRT2 : 1);
        if (cost >= costs[next] || !isSegmentClear(point, nextPoint)) continue;
        costs[next] = cost;
        previous[next] = id;
        open.push({ id: next, score: cost + heuristic(nextPoint) });
      }
    }
    return null;
  }

  function simplify(route: Point2[]): Point2[] {
    if (route.length < 3) return route;
    const simplified = [route[0]];
    let anchor = 0;
    while (anchor < route.length - 1) {
      let furthest = anchor + 1;
      while (furthest + 1 < route.length && isSegmentClear(route[anchor], route[furthest + 1])) furthest++;
      simplified.push(route[furthest]);
      anchor = furthest;
    }
    return simplified;
  }
  return { findRoute, isSegmentClear };
}

function distance(a: Point2, b: Point2): number { return Math.hypot(a.x - b.x, a.z - b.z); }

function intersectsBox(a: Point2, b: Point2, hx: number, hz: number): boolean {
  let entry = 0, exit = 1;
  for (const [start, delta, half] of [[a.x, b.x - a.x, hx], [a.z, b.z - a.z, hz]]) {
    if (Math.abs(delta) < 1e-9) {
      if (start < -half || start > half) return false;
    } else {
      const first = (-half - start) / delta, last = (half - start) / delta;
      entry = Math.max(entry, Math.min(first, last));
      exit = Math.min(exit, Math.max(first, last));
      if (entry > exit) return false;
    }
  }
  return true;
}

interface HeapEntry { id: number; score: number }
class MinHeap {
  private values: HeapEntry[] = [];
  get length(): number { return this.values.length; }
  push(value: HeapEntry): void {
    let index = this.values.length;
    this.values.push(value);
    while (index > 0) {
      const parent = (index - 1) >> 1;
      if (this.values[parent].score <= value.score) break;
      this.values[index] = this.values[parent];
      index = parent;
    }
    this.values[index] = value;
  }
  pop(): HeapEntry | undefined {
    const first = this.values[0], last = this.values.pop();
    if (!this.values.length || !last) return first;
    let index = 0;
    while (index * 2 + 1 < this.values.length) {
      let child = index * 2 + 1;
      if (child + 1 < this.values.length && this.values[child + 1].score < this.values[child].score) child++;
      if (this.values[child].score >= last.score) break;
      this.values[index] = this.values[child];
      index = child;
    }
    this.values[index] = last;
    return first;
  }
}
