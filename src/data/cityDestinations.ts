import { changanCity } from './changanCity';
import type { Point2 } from './world';

export interface CityDestination {
  id: string;
  label: string;
  target: Point2;
  targetY: number;
  yaw: number;
  pitch: number;
  distance: number;
}

// Tour locations describe this interpretive model, not unverified historical landmarks.
export const cityDestinations: readonly CityDestination[] = [
  { id: 'overview', label: '全城总览', target: { x: (changanCity.bounds.minX + changanCity.bounds.maxX) / 2, z: 0 }, targetY: 0, yaw: Math.PI + 0.12, pitch: 1.2, distance: 1050 },
  { id: 'west-market', label: '西市', target: { x: 0, z: 0 }, targetY: 1, yaw: -0.72, pitch: 0.72, distance: 110 },
  { id: 'west-wards', label: '西部坊区', target: { x: 30, z: 120 }, targetY: 1, yaw: -0.65, pitch: 0.72, distance: 140 },
  { id: 'south-gate', label: '南城门', target: { x: 194, z: -270 }, targetY: 2, yaw: -0.45, pitch: 0.65, distance: 115 },
  { id: 'south-wards', label: '南部坊区', target: { x: 110, z: -180 }, targetY: 1, yaw: -0.65, pitch: 0.72, distance: 135 },
  { id: 'east-south-wards', label: '东南坊区', target: { x: 330, z: -80 }, targetY: 1, yaw: -0.65, pitch: 0.72, distance: 135 },
  { id: 'east-north-wards', label: '东北坊区', target: { x: 330, z: 120 }, targetY: 1, yaw: -0.65, pitch: 0.72, distance: 135 },
  { id: 'zhuque-axis', label: '朱雀大街', target: { x: 194, z: 30 }, targetY: 1, yaw: -0.3, pitch: 0.68, distance: 125 },
  { id: 'imperial-city', label: '皇城中轴', target: { x: 194, z: 110 }, targetY: 2, yaw: -0.55, pitch: 0.68, distance: 130 },
  { id: 'taiji-palace', label: '太极宫', target: { x: 194, z: 208 }, targetY: 4, yaw: -0.62, pitch: 0.61, distance: 110 },
  { id: 'north-garden', label: '内廷园林', target: { x: 194, z: 275 }, targetY: 2, yaw: -0.55, pitch: 0.68, distance: 105 }
];
