import * as THREE from 'three';
import {createLiangyiPodium,LIANGYI_PODIUM_TOP} from './TaijiLiangyiPodium';
import {createTaijiSurroundings} from './TaijiArchitecture';
import {createPilotMaterials} from './TaijiPilot';

function materials(){return createPilotMaterials({stone:new THREE.Texture(),roof:new THREE.Texture(),wood:new THREE.Texture(),wall:new THREE.Texture(),earth:new THREE.Texture()});}

it('keeps the exact accepted podium and stair envelope',()=>{
  const group=createLiangyiPodium(new THREE.MeshStandardMaterial());
  const podium=group.getObjectByName('liangyi-profiled-stone') as THREE.Mesh;podium.geometry.computeBoundingBox();
  const box=podium.geometry.boundingBox!;
  expect(box.min.x).toBeCloseTo(-15.5);expect(box.max.x).toBeCloseTo(15.5);
  expect(box.min.z).toBeCloseTo(-7);expect(box.max.z).toBeCloseTo(7);
  expect(box.min.y).toBeCloseTo(.34);expect(box.max.y).toBeCloseTo(LIANGYI_PODIUM_TOP);
  const position=podium.geometry.getAttribute('position');let topMinX=Infinity,topMaxX=-Infinity,topMinZ=Infinity,topMaxZ=-Infinity;
  for(let i=0;i<position.count;i++)if(Math.abs(position.getY(i)-LIANGYI_PODIUM_TOP)<1e-5){topMinX=Math.min(topMinX,position.getX(i));topMaxX=Math.max(topMaxX,position.getX(i));topMinZ=Math.min(topMinZ,position.getZ(i));topMaxZ=Math.max(topMaxZ,position.getZ(i));}
  expect(topMaxX-topMinX).toBeCloseTo(30.29224,4);expect(topMaxZ-topMinZ).toBeCloseTo(13.3578,4);
  const all=new THREE.Box3().setFromObject(group);expect(all.min.x).toBeCloseTo(-15.5);expect(all.max.x).toBeCloseTo(15.5);expect(all.min.z).toBeCloseTo(-9.23);expect(all.max.z).toBeCloseTo(9.23);
});

it('raises only the Liangyi upper assembly by .8m and contacts the new podium top',()=>{
  const root=createTaijiSurroundings(materials());
  const liangyi=root.getObjectByName('refined-liangyi-hall')!;
  const upper=liangyi.getObjectByName('refined-liangyi-hall-upper')!;
  const west=root.getObjectByName('refined-liangyi-west-wing')!.getObjectByName('refined-liangyi-west-wing-upper')!;
  expect(upper.position.y).toBe(.8);expect(west.position.y).toBe(0);
  const podium=liangyi.getObjectByName('liangyi-profiled-stone') as THREE.Mesh;podium.geometry.computeBoundingBox();
  expect(podium.geometry.boundingBox!.max.y).toBeCloseTo(LIANGYI_PODIUM_TOP);
  let lowest=Infinity;upper.traverse(object=>{if(object instanceof THREE.Mesh&&object.name==='taiji-architectural-details'){object.geometry.computeBoundingBox();lowest=Math.min(lowest,object.geometry.boundingBox!.min.y);}});
  expect(lowest+upper.position.y).toBeCloseTo(LIANGYI_PODIUM_TOP,5);
});

it('builds eight monotonic stair tops per side from court level to podium contact',()=>{
  const stairs:THREE.Mesh[]=[];createLiangyiPodium(new THREE.MeshStandardMaterial()).traverse(o=>{if(o instanceof THREE.Mesh&&o.name==='liangyi-stair-tread')stairs.push(o);});
  expect(stairs).toHaveLength(16);
  for(const side of [stairs.slice(0,8),stairs.slice(8)]) {
    const tops=side.map(mesh=>mesh.userData.top as number);
    expect(tops[0]).toBeCloseTo(.43+(LIANGYI_PODIUM_TOP-.43)/8);expect(tops[7]).toBeCloseTo(LIANGYI_PODIUM_TOP);
    for(let i=1;i<tops.length;i++)expect(tops[i]).toBeGreaterThan(tops[i-1]);
  }
  const topFront=stairs.filter(mesh=>mesh.position.z>0)[7];topFront.updateMatrixWorld(true);
  const treadBounds=new THREE.Box3().setFromObject(topFront);
  const independentlyScaledDeckEdge=10.4*14/21.8;
  expect(treadBounds.min.z).toBeCloseTo(6.65);
  expect(treadBounds.min.z).toBeLessThan(independentlyScaledDeckEdge);
  expect(treadBounds.max.z-independentlyScaledDeckEdge).toBeGreaterThan(.25);
});
