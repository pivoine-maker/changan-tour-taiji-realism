import { createApproachTreePositions } from './CityApproachLandscape';
import { changanCity } from '../data/changanCity';
import { westMarketWorld } from '../data/world';
import { createMovementObstacles } from './movementObstacles';
import { createCityNavigation } from '../navigation/cityNavigation';
it('plants southern avenue shoulders clear of crossings, the18m carriageway and collision footprints',()=>{
  const points=createApproachTreePositions(changanCity);
  const navigation=createCityNavigation(changanCity.bounds,createMovementObstacles(westMarketWorld,changanCity));
  expect(points.length).toBeGreaterThan(12);
  for(const point of points){
    expect(point.x<183||point.x>205).toBe(true);
    expect(changanCity.roadZs.every(z=>Math.abs(point.z-z)>5)).toBe(true);
    expect(navigation.isSegmentClear(point,point)).toBe(true);
  }
});
