import * as THREE from 'three';
import {fitDirectionalShadowToBounds,TAIJI_SHADOW_BOUNDS} from './TaijiShadowFrustum';

it.each([0,60])('contains every palace and office bounds corner with %s degree daylight turn',(turn)=>{
  const light=new THREE.DirectionalLight();light.position.set(82.7,122.6,317.2);light.target.position.set(194,0,205);
  light.position.sub(light.target.position).applyAxisAngle(new THREE.Vector3(0,1,0),THREE.MathUtils.degToRad(turn)).add(light.target.position);
  const position=light.position.clone(),target=light.target.position.clone();
  const camera=fitDirectionalShadowToBounds(light);
  camera.updateMatrixWorld(true);
  const point=new THREE.Vector3();
  for(const x of [120,270])for(const y of [0,22])for(const z of [95,298]){
    point.set(x,y,z).project(camera);
    expect(point.x).toBeGreaterThanOrEqual(-1);expect(point.x).toBeLessThanOrEqual(1);
    expect(point.y).toBeGreaterThanOrEqual(-1);expect(point.y).toBeLessThanOrEqual(1);
    expect(point.z).toBeGreaterThanOrEqual(-1);expect(point.z).toBeLessThanOrEqual(1);
  }
  expect(light.position).toEqual(position);expect(light.target.position).toEqual(target);
  expect(camera.left).toBeLessThan(camera.right);expect(camera.bottom).toBeLessThan(camera.top);
  expect(camera.near).toBeGreaterThan(0);expect(camera.far).toBeGreaterThan(camera.near);
});

it('does not mutate the requested world bounds',()=>{
  const before=TAIJI_SHADOW_BOUNDS.clone();
  fitDirectionalShadowToBounds(new THREE.DirectionalLight(),TAIJI_SHADOW_BOUNDS,5);
  expect(TAIJI_SHADOW_BOUNDS).toEqual(before);
});
