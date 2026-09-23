import { createGatePassageSegments, createWardWallSegments } from '../data/cityLayout';
import type { ChanganCityModel } from '../data/changanCity';
import type { BuildingBlock, WallSegment, WorldModel } from '../data/world';
import type { MovementObstacle } from './inputControls';


export function createMovementObstacles(world: WorldModel, city: ChanganCityModel): MovementObstacle[] {
  return [
    ...world.walls.map(toWallObstacle),
    ...world.buildings.map((building, index) => toBuildingObstacle(building, `market-building-${index}`)),
    ...createOrdinaryWardWallObstacles(city),
    ...city.wards.flatMap((ward) => ward.buildings.map((building, index) => toBuildingObstacle(building, `ordinary-building-${ward.id}-${index}`))),
    ...city.gatehouses.flatMap((building, index) => createGatePassageSegments(building).map((wing, side) => ({ ...wing, id: `city-gatehouse-${index}-wing-${side}` }))),
    ...world.imperialPrecincts.flatMap((precinct) => [
      ...precinct.halls.flatMap((hall) => hall.role === 'gate' ? createPassableGateObstacles(hall) : [toBuildingObstacle(hall, `imperial-hall-${hall.id}`)]),
      ...precinct.annexes.map((hall) => toBuildingObstacle(hall, `imperial-hall-${hall.id}`))
    ])
  ];
}

function toWallObstacle(wall: WallSegment, index: number): MovementObstacle {
  return {
    id: `wall-${index}`,
    x: wall.x,
    z: wall.z,
    width: wall.width,
    depth: wall.depth
  };
}

function toBuildingObstacle(building: BuildingBlock, id: string): MovementObstacle {
  return {
    id,
    x: building.x,
    z: building.z,
    width: building.width,
    depth: building.depth,
    rotation: building.rotation
  };
}

function createOrdinaryWardWallObstacles(city: ChanganCityModel): MovementObstacle[] {
  return city.wards.flatMap((ward) => createWardWallSegments(ward.bounds)
    .map((wall, index) => ({ ...wall, id: `ordinary-wall-${ward.id}-${index}` })));
}

function createPassableGateObstacles(gate: BuildingBlock & { id: string }): MovementObstacle[] {
  return createGatePassageSegments(gate, Math.min(14, gate.width * 0.38))
    .map((wall, index) => ({ ...wall, id: `imperial-hall-${gate.id}-wing-${index === 0 ? 'west' : 'east'}` }));
}
