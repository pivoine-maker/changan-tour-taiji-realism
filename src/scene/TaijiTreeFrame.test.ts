import * as THREE from 'three';
import {calculateTaijiTreeFrame} from './TaijiTreeFrame';

it('uses the exact accepted inner and outer height schedules without moving the trunk base',()=>{
  const sourceHeight=2.75,outerStart=24;
  const inner=calculateTaijiTreeFrame([155,175],0,sourceHeight,.45,outerStart);
  const lastInner=calculateTaijiTreeFrame([210,276],23,sourceHeight,.3425,outerStart);
  const firstOuter=calculateTaijiTreeFrame([131.7,160],24,sourceHeight,.265,outerStart);
  const outerHigh=calculateTaijiTreeFrame([132.4,181],25,sourceHeight,.265,outerStart);
  expect(inner.targetHeight).toBe(6.4);expect(lastInner.targetHeight).toBe(6.4+(23*13%7)*.26);
  expect(firstOuter.targetHeight).toBe(9.8+(24*13%7)*.38);expect(outerHigh.targetHeight).toBe(9.8+(25*13%7)*.38);
  expect(firstOuter.groundPosition.toArray()).toEqual([131.7,.265,160]);
});

it('makes the woody world frame exactly ground translation times the foliage local frame',()=>{
  const frame=calculateTaijiTreeFrame([259.4,267],41,3.2,.265,24);
  const expected=new THREE.Matrix4().makeTranslation(259.4,.265,267).multiply(frame.localMatrix);
  expect(frame.worldMatrix.toArray()).toEqual(expected.toArray());
  const localOrigin=new THREE.Vector3().applyMatrix4(frame.localMatrix).add(frame.groundPosition);
  expect(localOrigin.distanceTo(new THREE.Vector3().setFromMatrixPosition(frame.worldMatrix))).toBeLessThan(1e-10);
});
