import type { Point2, RoadEdge, RoadNode } from '../data/world';

export function distance2(a: Point2, b: Point2): number {
  const dx = a.x - b.x;
  const dz = a.z - b.z;

  return dx * dx + dz * dz;
}

export function findNearestNode(point: Point2, nodes: RoadNode[]): RoadNode | null {
  let nearest: RoadNode | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;

  for (const node of nodes) {
    const candidateDistance = distance2(point, node);
    if (candidateDistance < nearestDistance) {
      nearest = node;
      nearestDistance = candidateDistance;
    }
  }

  return nearest;
}

export function findPath(
  startId: string,
  goalId: string,
  nodes: RoadNode[],
  edges: RoadEdge[]
): RoadNode[] | null {
  const nodeById = new Map(nodes.map((node) => [node.id, node]));

  if (!nodeById.has(startId) || !nodeById.has(goalId)) {
    return null;
  }

  const adjacency = new Map<string, string[]>();
  for (const node of nodes) {
    adjacency.set(node.id, []);
  }
  for (const edge of edges) {
    adjacency.get(edge.from)?.push(edge.to);
    adjacency.get(edge.to)?.push(edge.from);
  }

  const unvisited = new Set(nodes.map((node) => node.id));
  const distances = new Map<string, number>();
  const previous = new Map<string, string>();

  for (const node of nodes) {
    distances.set(node.id, Number.POSITIVE_INFINITY);
  }
  distances.set(startId, 0);

  while (unvisited.size > 0) {
    const currentId = findClosestUnvisited(unvisited, distances);
    if (!currentId) {
      break;
    }
    if (currentId === goalId) {
      return reconstructPath(goalId, previous, nodeById);
    }

    unvisited.delete(currentId);
    const current = nodeById.get(currentId);
    if (!current) {
      continue;
    }

    for (const neighborId of adjacency.get(currentId) ?? []) {
      if (!unvisited.has(neighborId)) {
        continue;
      }
      const neighbor = nodeById.get(neighborId);
      if (!neighbor) {
        continue;
      }

      const candidate = (distances.get(currentId) ?? Number.POSITIVE_INFINITY) + Math.sqrt(distance2(current, neighbor));
      if (candidate < (distances.get(neighborId) ?? Number.POSITIVE_INFINITY)) {
        distances.set(neighborId, candidate);
        previous.set(neighborId, currentId);
      }
    }
  }

  return null;
}

function findClosestUnvisited(unvisited: Set<string>, distances: Map<string, number>): string | null {
  let closest: string | null = null;
  let closestDistance = Number.POSITIVE_INFINITY;

  for (const id of unvisited) {
    const candidateDistance = distances.get(id) ?? Number.POSITIVE_INFINITY;
    if (candidateDistance < closestDistance) {
      closest = id;
      closestDistance = candidateDistance;
    }
  }

  return closest;
}

function reconstructPath(goalId: string, previous: Map<string, string>, nodeById: Map<string, RoadNode>): RoadNode[] {
  const path: RoadNode[] = [];
  let cursor: string | undefined = goalId;

  while (cursor) {
    const node = nodeById.get(cursor);
    if (!node) {
      break;
    }
    path.unshift(node);
    cursor = previous.get(cursor);
  }

  return path;
}
