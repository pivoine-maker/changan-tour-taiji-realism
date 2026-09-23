import * as THREE from 'three';
import { createPathTraceEnvironment } from './PathTraceEnvironment';

function source(width=256,height=128) {
  return new THREE.DataTexture(new Float32Array(width*height*4),width,height,THREE.RGBAFormat,THREE.FloatType);
}

function integrate(texture:THREE.DataTexture, intensity:number, normal:THREE.Vector3, rotation=new THREE.Euler()) {
  const {width,height}=texture.image;
  const data=texture.image.data!;
  const sum=new THREE.Vector3(),direction=new THREE.Vector3();
  for(let y=0;y<height;y++) {
    const phi=Math.PI*(1-(y+.5)/height);
    const solidAngle=2*Math.PI/width*(Math.cos(Math.PI*(1-(y+1)/height))-Math.cos(Math.PI*(1-y/height)));
    for(let x=0;x<width;x++) {
      const theta=2*Math.PI*((x+.5)/width-.5);
      direction.set(Math.sin(phi)*Math.cos(theta),Math.cos(phi),Math.sin(phi)*Math.sin(theta)).applyEuler(rotation);
      const weight=Math.max(0,direction.dot(normal))*solidAngle*intensity;
      const i=(y*width+x)*4;
      sum.addScaledVector(new THREE.Vector3(Number(data[i]),Number(data[i+1]),Number(data[i+2])),weight);
    }
  }
  return sum;
}

it('reproduces raster hemisphere irradiance by numerical cosine integration, including full rotation',()=>{
  const light=new THREE.HemisphereLight(0xcbdbe8,0xc9b99d,.95);
  light.position.set(1,2,-.4);light.updateMatrixWorld();
  const rotation=new THREE.Euler(.7,-.4,.3);
  const result=createPathTraceEnvironment(source(),[light],.85,rotation);
  for(const normal of [new THREE.Vector3(0,1,0),new THREE.Vector3(1,0,0),new THREE.Vector3(0,-1,0)]) {
    const color=light.groundColor.clone().lerp(light.color,.5+.5*normal.dot(light.position.clone().normalize())).multiplyScalar(light.intensity);
    const actual=integrate(result.texture,result.environmentIntensity,normal,rotation);
    expect(actual.x).toBeCloseTo(color.r,3);expect(actual.y).toBeCloseTo(color.g,3);expect(actual.z).toBeCloseTo(color.b,3);
  }
});

it('decodes half floats, normalizes flipped rows, and independently owns pixels and disposal',()=>{
  const pixels=new Uint16Array([1,2,3,1,4,5,6,1].map(THREE.DataUtils.toHalfFloat));
  const hdr=new THREE.DataTexture(pixels,1,2,THREE.RGBAFormat,THREE.HalfFloatType);hdr.flipY=true;
  const before=pixels.slice();let disposed=false;hdr.addEventListener('dispose',()=>{disposed=true;});
  const result=createPathTraceEnvironment(hdr,[],.85,new THREE.Euler());
  expect(result.texture.image.data).toEqual(new Float32Array([4,5,6,1,1,2,3,1]));
  expect(result.texture.type).toBe(THREE.FloatType);expect(result.texture.flipY).toBe(false);
  expect(result.texture.source).not.toBe(hdr.source);expect(result.environmentIntensity).toBe(.85);
  result.texture.image.data![0]=99;result.texture.dispose();
  expect(pixels).toEqual(before);expect(hdr.flipY).toBe(true);expect(disposed).toBe(false);
});

it('preserves float HDR radiance and adds multiple existing lights without rescaling HDR',()=>{
  const hdr=source(1,2);hdr.image.data!.fill(2);
  const light=new THREE.HemisphereLight(0xffffff,0xffffff,.6);
  const result=createPathTraceEnvironment(hdr,[light,light],.4,new THREE.Euler());
  expect(result.texture.image.data![0]).toBeCloseTo(2+1.2/(Math.PI*.4),6);
  expect(hdr.image.data![0]).toBe(2);
});

it('keeps hemisphere illumination when the existing HDR intensity is zero',()=>{
  const hdr=source();hdr.image.data!.fill(20);
  const light=new THREE.HemisphereLight(0xffffff,0xffffff,.7);
  const result=createPathTraceEnvironment(hdr,[light],0,new THREE.Euler());
  expect(result.environmentIntensity).toBe(1);
  expect(integrate(result.texture,1,new THREE.Vector3(0,1,0)).y).toBeCloseTo(.7,3);
});
