import { westMarketWorld, type RoadEdge, type RoadNode } from '../data/world';
import { findNearestNode, findPath } from './pathfinding';

const nodes: RoadNode[] = [
  { id: 'a', x: 0, z: 0 },
  { id: 'b', x: 10, z: 0 },
  { id: 'c', x: 20, z: 0 },
  { id: 'd', x: 20, z: 10 },
  { id: 'isolated', x: -50, z: -50 }
];

const edges: RoadEdge[] = [
  { from: 'a', to: 'b' },
  { from: 'b', to: 'c' },
  { from: 'c', to: 'd' }
];

describe('pathfinding', () => {
  it('finds the nearest road node', () => {
    expect(findNearestNode({ x: 11, z: 1 }, nodes)?.id).toBe('b');
  });

  it('finds a connected route between nodes', () => {
    const path = findPath('a', 'd', nodes, edges);

    expect(path?.map((node) => node.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  it('returns null for disconnected nodes', () => {
    expect(findPath('a', 'isolated', nodes, edges)).toBeNull();
  });

  it('routes through the west market world graph', () => {
    const path = findPath('n--34-0', 'n--20--24', westMarketWorld.roadNodes, westMarketWorld.roadEdges);

    expect(path?.[0]?.id).toBe('n--34-0');
    expect(path?.at(-1)?.id).toBe('n--20--24');
    expect(path?.length).toBeGreaterThan(2);
  });

  it('routes continuously from the west market to Zhuque Avenue', () => {
    const path = findPath('n--34-0', 'n-194-0', westMarketWorld.roadNodes, westMarketWorld.roadEdges);

    expect(path?.[0]?.id).toBe('n--34-0');
    expect(path?.at(-1)?.id).toBe('n-194-0');
    expect(path?.length).toBeGreaterThan(8);
  });

  it('routes continuously from the west market into the Taiji Palace inner court', () => {
    const path = findPath('n--34-0', 'n-194-276', westMarketWorld.roadNodes, westMarketWorld.roadEdges);

    expect(path?.[0]?.id).toBe('n--34-0');
    expect(path?.at(-1)?.id).toBe('n-194-276');
    expect(path?.map((node) => node.id)).toContain('n-194-156');
    expect(path?.map((node) => node.id)).not.toContain('n-194-204');
    expect(path?.some((node) => (node.x === 174 || node.x === 214) && node.z === 204)).toBe(true);
    expect(path?.length).toBeGreaterThan(20);
  });
});
