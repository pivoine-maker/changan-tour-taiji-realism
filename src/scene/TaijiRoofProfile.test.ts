import { calculateRoofHeight } from './TaijiRoofProfile';
import {TAIJI_UPPER_STOREY_VERTICAL} from './TaijiArchitecture';

it('preserves ridge height for both profiles', () => {
  expect(calculateRoofHeight(8.55, 2.9, 0.5, 0, 'steady-crafted')).toBeCloseTo(11.45);
  expect(calculateRoofHeight(8.55, 2.9, 0.5, 0, 'legacy')).toBeCloseTo(11.45);
});

it('keeps the crafted upper seventy percent on a steady linear slope', () => {
  const base = 8.55;
  const rise = 2.9;
  for (const t of [0, 0.2, 0.45, 0.7]) {
    expect(calculateRoofHeight(base, rise, 0.5, t, 'steady-crafted')).toBeCloseTo(base + rise * (1 - t));
  }
  const firstDrop = calculateRoofHeight(base, rise, 0.5, 0, 'steady-crafted')
    - calculateRoofHeight(base, rise, 0.5, 0.35, 'steady-crafted');
  const secondDrop = calculateRoofHeight(base, rise, 0.5, 0.35, 'steady-crafted')
    - calculateRoofHeight(base, rise, 0.5, 0.7, 'steady-crafted');
  expect(firstDrop).toBeCloseTo(secondDrop);
});

it('concentrates crafted lift in the last thirty percent and emphasizes corners', () => {
  const linear = (t: number) => 8.55 + 2.9 * (1 - t);
  expect(calculateRoofHeight(8.55, 2.9, 0.5, 0.7, 'steady-crafted') - linear(0.7)).toBeCloseTo(0);
  expect(calculateRoofHeight(8.55, 2.9, 0.5, 0.85, 'steady-crafted') - linear(0.85)).toBeCloseTo(0.045);
  expect(calculateRoofHeight(8.55, 2.9, 0.5, 1, 'steady-crafted') - linear(1)).toBeCloseTo(0.18);
  expect(calculateRoofHeight(8.55, 2.9, 0, 1, 'steady-crafted') - linear(1)).toBeCloseTo(0.48);
});

it('leaves the legacy non-crafted height law unchanged', () => {
  const base = 5.8;
  const rise = 1.4;
  const u = 0.17;
  const t = 0.82;
  const expected = base + rise * Math.pow(1 - t, 1.65)
    + (0.24 + 0.65 * Math.pow(Math.abs(u * 2 - 1), 7)) * Math.pow(t, 9);
  expect(calculateRoofHeight(base, rise, u, t, 'legacy')).toBeCloseTo(expected);
});

it('keeps the lower crafted roof intersecting the upper storey nesting zone', () => {
  const tAtUpperWall = 4.9 / (19.2 / 2);
  const y = calculateRoofHeight(8.55, 2.9, 0.5, tAtUpperWall, 'steady-crafted');
  expect(y).toBeGreaterThan(9.35);
  expect(y).toBeLessThan(TAIJI_UPPER_STOREY_VERTICAL.bottom+TAIJI_UPPER_STOREY_VERTICAL.height);
});

it('raises only the upper roof while keeping a continuous slender support body',()=>{
  const upper=TAIJI_UPPER_STOREY_VERTICAL;
  expect(upper.center-upper.height/2).toBeCloseTo(9.35);
  expect(upper.center+upper.height/2).toBeCloseTo(12.95);
  expect(upper.roofBase).toBe(12.9);
  expect(calculateRoofHeight(upper.roofBase,upper.roofRise,.5,0,'steady-crafted')).toBeCloseTo(16.2);
});
