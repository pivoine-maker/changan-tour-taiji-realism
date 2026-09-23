import * as THREE from 'three';
import {createTimberBeamGeometry} from './TaijiTimberGeometry';

it('keeps the original long beam envelope on either horizontal axis',()=>{
  for(const size of [[39,.36,.38],[.4,.4,16]] as [number,number,number][]){
    const g=createTimberBeamGeometry(size);g.computeBoundingBox();
    const actual=g.boundingBox!.getSize(new THREE.Vector3());
    size.forEach((v,i)=>expect(actual.getComponent(i)).toBeCloseTo(v,5));
    expect(g.boundingBox!.getCenter(new THREE.Vector3()).length()).toBeLessThan(1e-6);
    expect(g.attributes.position.count/3).toBeLessThan(200);
    const n=g.attributes.normal;
    expect(Array.from(n.array).every(Number.isFinite)).toBe(true);
    expect(Array.from({length:n.count},(_,i)=>Math.abs(n.getX(i))+Math.abs(n.getY(i))+Math.abs(n.getZ(i))).some(v=>v>1.2)).toBe(true);
  }
});
